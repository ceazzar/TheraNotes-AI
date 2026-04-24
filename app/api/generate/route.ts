import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateSection, runCoherenceCheck, type Assessment } from '@/lib/ai/generate'

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
  // Accepts either:
  //   - assessmentId (hybrid path) — loads structured assessment, extracts domain data per section
  //   - sessionId + clinicalNotes (legacy path) — passes raw notes directly
  const { assessmentId, sessionId, reportId, sectionId, clinicalNotes, questionnaireData } = body
  let currentReportId = reportId

  // Load assessment if assessmentId is provided (hybrid path)
  let assessment: Assessment | undefined
  if (assessmentId) {
    const { data: assessmentRow, error: assessmentError } = await supabase
      .from('assessments').select('*').eq('id', assessmentId).single()
    if (assessmentError || !assessmentRow) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
    }
    assessment = assessmentRow as Assessment
  }

  if (!currentReportId) {
    // Hybrid path: link report to assessment; legacy path: link to session
    const insertPayload = assessment
      ? { assessment_id: assessmentId, user_id: user.id, status: 'generating' }
      : { session_id: sessionId, user_id: user.id, status: 'generating' }
    const { data: newReport } = await supabase
      .from('reports').insert(insertPayload)
      .select('id').single()
    currentReportId = newReport!.id
  }

  const { data: report } = await supabase.from('reports').select('sections').eq('id', currentReportId).single()
  const existingSections = (report?.sections ?? {}) as Record<string, { title: string; content: string }>
  const previousSections: Record<string, string> = {}
  for (const [key, val] of Object.entries(existingSections)) previousSections[key] = val.content

  // Query past corrections for this user and section type to inform generation
  let correctionContext = ''
  const { data: corrections } = await supabase
    .from('corrections')
    .select('original_text, revised_text, feedback')
    .eq('user_id', user.id)
    .eq('section', sectionId)
    .order('created_at', { ascending: false })
    .limit(5)

  if (corrections && corrections.length > 0) {
    const patterns = corrections.map((c, i) =>
      `${i + 1}. Feedback: "${c.feedback}"\n   Before: "${c.original_text.slice(0, 200)}..."\n   After: "${c.revised_text.slice(0, 200)}..."`
    ).join('\n')
    correctionContext = `\n\nPATTERNS TO AVOID (based on past clinician corrections for this section):\n${patterns}\n\nApply these corrections proactively — do not repeat the same issues.`
  }

  const result = await generateSection({
    sectionId,
    ...(assessment ? { assessment } : { clinicalNotes: (clinicalNotes ?? '') + correctionContext }),
    userId: user.id,
    previousSections,
    questionnaireData,
    correctionContext: assessment ? correctionContext : undefined,
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
