'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ReportCard } from './report-card'

interface ReportRow {
  id: string
  status: string
  sections: Record<string, { title: string; content: string }> | null
  created_at: string
  updated_at: string
  assessment_id: string | null
  planner_review: { flags?: unknown[] } | null
  assessments: { participant_name: string | null }[] | { participant_name: string | null } | null
}

export function ReportList() {
  const [reports, setReports] = useState<ReportRow[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('reports')
        .select('id, status, sections, created_at, updated_at, assessment_id, planner_review, assessments(participant_name)')
        .order('updated_at', { ascending: false })

      if (!error && data) {
        setReports(data as unknown as ReportRow[])
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">Loading reports...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Your Reports</h2>
      </div>

      {reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 px-4">
          <p className="text-sm text-muted-foreground text-center">
            No reports yet. Generate your first report from the{' '}
            <a href="/generate" className="underline hover:text-foreground">Generate</a> page.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((r) => (
            <ReportCard
              key={r.id}
              id={r.id}
              status={r.status}
              participantName={
                Array.isArray(r.assessments)
                  ? r.assessments[0]?.participant_name ?? null
                  : r.assessments?.participant_name ?? null
              }
              sectionCount={r.sections ? Object.keys(r.sections).length : 0}
              flagCount={r.planner_review?.flags?.length ?? 0}
              updatedAt={r.updated_at}
              onClick={() => router.push(`/report/${r.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
