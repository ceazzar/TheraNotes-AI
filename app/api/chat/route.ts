import { NextRequest } from 'next/server'
import { streamText, stepCountIs, convertToModelMessages, tool } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { SYSTEM_PROMPT } from '@/lib/ai/system-prompt'
import { generateSection, runCoherenceCheck } from '@/lib/ai/generate'
import { reviseSection } from '@/lib/ai/revise'
import template from '@/lib/template.json'

export const maxDuration = 300

interface SectionTemplate {
  name: string
  order: number
  phase: string
  auto_generate?: boolean
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { messages, sessionId } = await request.json()

  const { data: report } = await supabase
    .from('reports')
    .select('id, sections, status')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const sectionList = template.sections
    .filter((s: SectionTemplate) => !s.auto_generate)
    .map((s: SectionTemplate) => `- ${s.name}`)
    .join('\n')

  const contextPrompt = `${SYSTEM_PROMPT}\n\nAvailable report sections:\n${sectionList}\n\n${
    report
      ? `Current report status: ${report.status}. Sections completed: ${Object.keys(report.sections as object).length}/${template.sections.length}`
      : 'No report started yet for this session.'
  }`

  const modelMessages = await convertToModelMessages(messages)
  const serviceSupabase = await createServiceClient()
  const userId = user.id

  const result = streamText({
    model: openai('gpt-4o'),
    system: contextPrompt,
    messages: modelMessages,
    tools: {
      generate_report: tool({
        description:
          'Generate an FCA report from the clinical notes gathered in the conversation. Call this when the user has provided enough clinical information to start report generation.',
        inputSchema: z.object({
          clinicalNotes: z
            .string()
            .describe('The full clinical notes gathered from the conversation'),
          questionnaireData: z
            .string()
            .optional()
            .describe('Any questionnaire data if provided'),
        }),
        execute: async ({ clinicalNotes, questionnaireData }) => {
          try {

            const { data: newReport, error: reportError } = await serviceSupabase
              .from('reports')
              .insert({
                session_id: sessionId,
                user_id: userId,
                status: 'generating',
                sections: {},
              })
              .select('id')
              .single()

            if (!newReport) return { error: `Failed to create report: ${reportError?.message || 'unknown'}` }

            const reportId = newReport.id
            const generatableSections = template.sections.filter(
              (s: SectionTemplate) => !s.auto_generate
            )
            const completedSections: Record<string, { title: string; content: string }> = {}
            const sectionResults: string[] = []

            for (const section of generatableSections) {
              try {
                const previousSections: Record<string, string> = {}
                for (const [key, val] of Object.entries(completedSections)) {
                  previousSections[key] = val.content
                }

                const genResult = await generateSection({
                  sectionId: section.name,
                  clinicalNotes,
                  userId,
                  previousSections,
                  questionnaireData,
                })

                completedSections[genResult.sectionId] = {
                  title: genResult.title,
                  content: genResult.content,
                }

                await serviceSupabase
                  .from('reports')
                  .update({ sections: completedSections })
                  .eq('id', reportId)

                sectionResults.push(
                  `✓ ${genResult.title}${genResult.insufficientData ? ' [some data gaps flagged]' : ''}`
                )
              } catch (sectionErr) {
                const msg = sectionErr instanceof Error ? sectionErr.message : String(sectionErr)
                sectionResults.push(`✗ ${section.name}: ${msg}`)
              }
            }

            await serviceSupabase
              .from('reports')
              .update({ status: 'ready' })
              .eq('id', reportId)

            return {
              reportId,
              sectionsGenerated: Object.keys(completedSections).length,
              totalSections: generatableSections.length,
              results: sectionResults,
              status: 'ready',
            }
          } catch (err) {
            const msg = err instanceof Error ? `${err.message}\n${err.stack}` : String(err)
            return { error: `Generation failed: ${msg}` }
          }
        },
      }),

      revise_section: tool({
        description:
          'Revise a specific section of the generated report based on user feedback.',
        inputSchema: z.object({
          sectionId: z
            .string()
            .describe('The section name/ID to revise'),
          feedback: z
            .string()
            .describe(
              'The user feedback describing what to change'
            ),
        }),
        execute: async ({ sectionId: targetId, feedback }) => {

          const { data: currentReport } = await serviceSupabase
            .from('reports')
            .select('id, sections')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (!currentReport)
            return { error: 'No report found for this session' }

          const sections = currentReport.sections as Record<
            string,
            { title: string; content: string }
          >
          const targetSection = sections[targetId]
          if (!targetSection)
            return {
              error: `Section "${targetId}" not found in report`,
              availableSections: Object.keys(sections),
            }

          const fullReportContext = Object.entries(sections)
            .map(([, s]) => `## ${s.title}\n\n${s.content}`)
            .join('\n\n')

          const revResult = await reviseSection({
            sectionId: targetId,
            sectionName: targetSection.title,
            currentContent: targetSection.content,
            feedback,
            fullReportContext,
            userId,
            clinicalNotes: '',
          })

          const updatedSections = {
            ...sections,
            [targetId]: {
              title: targetSection.title,
              content: revResult.revisedContent,
            },
          }
          await serviceSupabase
            .from('reports')
            .update({ sections: updatedSections })
            .eq('id', currentReport.id)

          return {
            sectionId: targetId,
            revised: true,
            sectionTitle: targetSection.title,
          }
        },
      }),

      get_report_status: tool({
        description:
          'Check the current status of the report being generated.',
        inputSchema: z.object({}),
        execute: async () => {
          const { data: currentReport } = await serviceSupabase
            .from('reports')
            .select('id, sections, status')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (!currentReport)
            return {
              status: 'no_report',
              message:
                'No report has been started for this session yet.',
            }

          const sections = currentReport.sections as Record<
            string,
            unknown
          >
          const totalSections = template.sections.filter(
            (s: SectionTemplate) => !s.auto_generate
          ).length

          return {
            status: currentReport.status,
            sectionsCompleted: Object.keys(sections).length,
            totalSections,
            sectionNames: Object.keys(sections),
          }
        },
      }),
    },
    stopWhen: stepCountIs(5),
    onFinish: async ({ text }) => {
      if (text) {
        await serviceSupabase.from('messages').insert({
          session_id: sessionId,
          role: 'assistant',
          content: text,
        })
      }
    },
  })

  return result.toUIMessageStreamResponse()
}
