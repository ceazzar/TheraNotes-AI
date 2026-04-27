import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { reviseSection } from '@/lib/ai/revise'
import { runCoherenceCheck } from '@/lib/ai/generate'

export const maxDuration = 300

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { reportId, sectionId, feedback } = await request.json()
  const { data: report } = await supabase
    .from('reports')
    .select('sections')
    .eq('id', reportId)
    .eq('user_id', user.id)
    .single()
  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

  const sections = report.sections as Record<string, { title: string; content: string }>
  const targetSection = sections[sectionId]
  if (!targetSection) return NextResponse.json({ error: 'Section not found' }, { status: 404 })

  const fullReportContext = Object.entries(sections)
    .map(([, s]) => `## ${s.title}\n\n${s.content}`).join('\n\n')

  const result = await reviseSection({
    sectionId, sectionName: targetSection.title, currentContent: targetSection.content,
    feedback, fullReportContext, userId: user.id, reportId, clinicalNotes: '',
  })

  const updatedSections = { ...sections, [sectionId]: { title: targetSection.title, content: result.revisedContent } }
  await supabase
    .from('reports')
    .update({ sections: updatedSections })
    .eq('id', reportId)
    .eq('user_id', user.id)

  const coherenceResult = await runCoherenceCheck({
    fullReport: Object.entries(updatedSections as Record<string, { title: string; content: string }>)
      .map(([, s]) => `## ${s.title}\n\n${s.content}`).join('\n\n'),
    clinicalNotes: '',
    userId: user.id,
    reportId,
  })
  await supabase
    .from('reports')
    .update({ coherence_result: coherenceResult })
    .eq('id', reportId)
    .eq('user_id', user.id)

  return NextResponse.json({ sectionId, revisedContent: result.revisedContent, coherenceResult })
}
