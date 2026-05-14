import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runCoherenceCheck } from '@/lib/ai/generate'
import {
  orderedReportSectionEntries,
  reportSectionsToMarkdown,
  type ReportSectionRecord,
} from '@/lib/report-sections'

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL
const AGENT_API_KEY = process.env.AGENT_API_KEY

export const maxDuration = 300

interface PlannerFlag {
  sectionId: string
  severity: 'critical' | 'warning' | 'suggestion'
  issue: string
  recommendation: string
  ndisRationale: string
}

function inferSectionId(text: string, sectionNames: string[]): string {
  const normalised = text.toLowerCase()
  const direct = sectionNames.find((section) =>
    normalised.includes(section.toLowerCase()),
  )
  if (direct) return direct
  if (/goal|recommendation|summary/i.test(text)) {
    return 'Part E: Summary & Recommendations'
  }
  if (/standardised|standardized|whodas|sensory|assessment finding/i.test(text)) {
    return 'Part D: Assessment Findings'
  }
  if (/process|date|method|interview|collateral|structure/i.test(text)) {
    return 'Assessment Process'
  }
  if (/support|carer|home|diagnosis|background/i.test(text)) {
    return 'Part A: About The Participant'
  }
  return sectionNames[0] ?? 'Report Overview'
}

function parseCoherenceFlags(
  coherenceResult: string,
  sectionNames: string[],
): PlannerFlag[] {
  if (/^No contradictions found/i.test(coherenceResult.trim())) return []

  const numberedItems = coherenceResult
    .split(/\n(?=\d+\.\s)/)
    .map((item) => item.trim())
    .filter((item) => /^\d+\.\s/.test(item))

  const items = numberedItems.length > 0 ? numberedItems : [coherenceResult.trim()]

  return items.map((item) => {
    const titleMatch = item.match(/^\d+\.\s+\*\*([^*]+)\*\*/)
    const title = titleMatch?.[1]?.trim() || item.split('\n')[0].replace(/^\d+\.\s*/, '').trim()
    const recommendationMatch = item.match(/Recommendation:\s*([\s\S]+)$/im)
    const recommendation = recommendationMatch?.[1]?.trim() ||
      'Review the highlighted wording and align terminology, section references, or recommendations before export.'
    const severity: PlannerFlag['severity'] = /contradict|conflict|does not match|inconsistent/i.test(item)
      ? 'warning'
      : 'suggestion'

    return {
      sectionId: inferSectionId(`${title}\n${item}`, sectionNames),
      severity,
      issue: title || 'Planner review finding',
      recommendation,
      ndisRationale: item,
    }
  })
}

async function runLocalPlannerReview({
  reportId,
  userId,
  sections,
}: {
  reportId: string
  userId: string
  sections: ReportSectionRecord
}) {
  const fullReport = reportSectionsToMarkdown(sections)
  const sectionNames = orderedReportSectionEntries(sections).map(
    ([name, section]) => section.title || name,
  )
  const coherenceResult = await runCoherenceCheck({
    fullReport,
    clinicalNotes: '',
    userId,
    reportId,
  })
  return {
    source: 'local_coherence',
    coherenceResult,
    flags: parseCoherenceFlags(coherenceResult, sectionNames),
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { reportId } = await request.json()

  const { data: report } = await supabase
    .from('reports')
    .select('id, sections')
    .eq('id', reportId)
    .eq('user_id', user.id)
    .single()

  if (!report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  const persistPlannerReview = async (data: {
    flags?: unknown[]
    source?: string
    coherenceResult?: string
    fallbackReason?: string
  }) => {
    await supabase
      .from('reports')
      .update({
        planner_review: {
          flags: data.flags ?? [],
          reviewed_at: new Date().toISOString(),
          source: data.source,
          fallback_reason: data.fallbackReason,
          coherence_result: data.coherenceResult,
        },
      })
      .eq('id', reportId)
      .eq('user_id', user.id)
  }

  const runFallbackReview = async (fallbackReason: string) => {
    const data = await runLocalPlannerReview({
      reportId,
      userId: user.id,
      sections: (report.sections as ReportSectionRecord) ?? {},
    })
    await persistPlannerReview({ ...data, fallbackReason })
    return NextResponse.json({ ...data, fallbackReason })
  }

  if (!AGENT_SERVICE_URL || !AGENT_API_KEY) {
    return runFallbackReview('agent_service_not_configured')
  }

  let res: Response
  try {
    res = await fetch(`${AGENT_SERVICE_URL}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AGENT_API_KEY}`,
      },
      body: JSON.stringify({ report_id: reportId, user_id: user.id }),
    })
  } catch {
    return runFallbackReview('agent_service_unavailable')
  }

  if (!res.ok) {
    return runFallbackReview(`agent_service_http_${res.status}`)
  }

  const data = await res.json().catch(() => ({}))

  if (!Array.isArray(data.flags) || data.flags.length === 0) {
    return runFallbackReview('agent_service_returned_no_flags')
  }

  await persistPlannerReview({ flags: data.flags, source: 'agent_service' })

  return NextResponse.json(data, { status: res.status })
}
