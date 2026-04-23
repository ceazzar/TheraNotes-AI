import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateSection, runCoherenceCheck } from '@/lib/ai/generate'

export const maxDuration = 300

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  // Coherence check mode
  if (body.action === 'coherence_check') {
    const { data: report } = await supabase
      .from('reports').select('sections').eq('id', body.reportId).single()
    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

    const fullReport = Object.entries(report.sections as Record<string, { title: string; content: string }>)
      .map(([, s]) => `## ${s.title}\n\n${s.content}`).join('\n\n')

    const coherenceResult = await runCoherenceCheck({ fullReport, clinicalNotes: body.clinicalNotes ?? '' })
    await supabase.from('reports').update({ coherence_result: coherenceResult, status: 'ready' }).eq('id', body.reportId)
    return NextResponse.json({ coherenceResult })
  }

  // Per-section generation
  const { sessionId, reportId, sectionId, clinicalNotes, questionnaireData } = body
  let currentReportId = reportId

  if (!currentReportId) {
    const { data: newReport } = await supabase
      .from('reports').insert({ session_id: sessionId, user_id: user.id, status: 'generating' })
      .select('id').single()
    currentReportId = newReport!.id
  }

  const { data: report } = await supabase.from('reports').select('sections').eq('id', currentReportId).single()
  const existingSections = (report?.sections ?? {}) as Record<string, { title: string; content: string }>
  const previousSections: Record<string, string> = {}
  for (const [key, val] of Object.entries(existingSections)) previousSections[key] = val.content

  const result = await generateSection({
    sectionId, clinicalNotes, userId: user.id, previousSections, questionnaireData,
  })

  const updatedSections = {
    ...existingSections,
    [result.sectionId]: { title: result.title, content: result.content },
  }
  await supabase.from('reports').update({ sections: updatedSections }).eq('id', currentReportId)

  return NextResponse.json({
    reportId: currentReportId, sectionId: result.sectionId,
    content: result.content, insufficientData: result.insufficientData,
  })
}
