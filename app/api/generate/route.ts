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
      .from('reports')
      .select('sections')
      .eq('id', body.reportId)
      .eq('user_id', user.id)
      .single()
    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

    const fullReport = Object.entries(report.sections as Record<string, { title: string; content: string }>)
      .map(([, s]) => `## ${s.title}\n\n${s.content}`).join('\n\n')

    try {
      const coherenceResult = await runCoherenceCheck({ fullReport, clinicalNotes: body.clinicalNotes ?? '', userId: user.id, reportId: body.reportId })
      await supabase
        .from('reports')
        .update({ coherence_result: coherenceResult, status: 'ready' })
        .eq('id', body.reportId)
        .eq('user_id', user.id)
      return NextResponse.json({ coherenceResult })
    } catch (err) {
      await supabase
        .from('reports')
        .update({ status: 'failed' })
        .eq('id', body.reportId)
        .eq('user_id', user.id)

      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Failed to run coherence check' },
        { status: 500 }
      )
    }
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
      .from('assessments')
      .select('*')
      .eq('id', assessmentId)
      .eq('user_id', user.id)
      .single()
    if (assessmentError || !assessmentRow) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
    }
    assessment = assessmentRow as Assessment
  }

  if (!currentReportId) {
    let sessionIdForReport = sessionId as string | undefined

    if (assessment && !sessionIdForReport) {
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          user_id: user.id,
          title: assessment.participant_name
            ? `${assessment.participant_name} FCA`
            : 'Quick Generate FCA',
          status: 'active',
        })
        .select('id')
        .single()

      if (sessionError || !session) {
        return NextResponse.json(
          { error: sessionError?.message || 'Failed to create session' },
          { status: 500 }
        )
      }

      sessionIdForReport = session.id
    }

    if (!sessionIdForReport) {
      return NextResponse.json(
        { error: 'sessionId is required when assessmentId is not provided' },
        { status: 400 }
      )
    }

    const insertPayload = {
      session_id: sessionIdForReport,
      user_id: user.id,
      status: 'generating',
      ...(assessment ? { assessment_id: assessmentId } : {}),
    }

    const { data: newReport, error: reportError } = await supabase
      .from('reports').insert(insertPayload)
      .select('id').single()

    if (reportError || !newReport) {
      return NextResponse.json(
        { error: reportError?.message || 'Failed to create report' },
        { status: 500 }
      )
    }

    currentReportId = newReport.id

    await supabase
      .from('sessions')
      .update({ report_id: currentReportId })
      .eq('id', sessionIdForReport)
      .eq('user_id', user.id)
  }

  const { data: report } = await supabase
    .from('reports')
    .select('sections')
    .eq('id', currentReportId)
    .eq('user_id', user.id)
    .single()
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

  let result
  try {
    result = await generateSection({
      sectionId,
      ...(assessment ? { assessment } : { clinicalNotes: (clinicalNotes ?? '') + correctionContext }),
      userId: user.id,
      reportId: currentReportId,
      assessmentId: assessmentId ?? undefined,
      previousSections,
      questionnaireData,
      correctionContext: assessment ? correctionContext : undefined,
    })
  } catch (err) {
    await supabase
      .from('reports')
      .update({ status: 'failed' })
      .eq('id', currentReportId)
      .eq('user_id', user.id)

    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate section' },
      { status: 500 }
    )
  }

  const updatedSections = {
    ...existingSections,
    [result.sectionId]: { title: result.title, content: result.content },
  }
  await supabase
    .from('reports')
    .update({ sections: updatedSections })
    .eq('id', currentReportId)
    .eq('user_id', user.id)

  return NextResponse.json({
    reportId: currentReportId, sectionId: result.sectionId,
    content: result.content, insufficientData: result.insufficientData,
  })
}
