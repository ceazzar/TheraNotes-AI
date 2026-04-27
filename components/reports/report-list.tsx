'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
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
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    let isActive = true

    Promise.resolve(supabase
      .from('reports')
      .select('id, status, sections, created_at, updated_at, assessment_id, planner_review, assessments(participant_name)')
      .order('updated_at', { ascending: false }))
      .then(async ({ data, error }) => {
        if (!isActive) return

        if (!error && data) {
          const thirtyMinAgo = Date.now() - 30 * 60 * 1000
          const staleIds: string[] = []

          const cleaned = (data as unknown as ReportRow[]).map((report) => {
            if (
              report.status === 'generating' &&
              new Date(report.updated_at).getTime() < thirtyMinAgo
            ) {
              staleIds.push(report.id)
              return { ...report, status: 'failed' }
            }

            return report
          })

          if (staleIds.length > 0) {
            await supabase
              .from('reports')
              .update({ status: 'failed' })
              .in('id', staleIds)
          }

          if (!isActive) return
          setReports(cleaned)
        }

        setLoading(false)
      })
      .catch(() => {
        if (isActive) setLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [supabase])

  const handleDelete = useCallback(async (id: string) => {
    const response = await fetch(`/api/reports/${id}`, { method: 'DELETE' })

    if (response.ok) {
      setReports((previous) => previous.filter((report) => report.id !== id))
    }
  }, [])

  const failedEmptyCount = reports.filter(
    (r) => r.status === 'failed' && (!r.sections || Object.keys(r.sections).length === 0)
  ).length

  const handleClearFailed = useCallback(async () => {
    const toDelete = reports.filter(
      (r) => r.status === 'failed' && (!r.sections || Object.keys(r.sections).length === 0)
    )
    await Promise.all(
      toDelete.map((r) => fetch(`/api/reports/${r.id}`, { method: 'DELETE' }))
    )
    setReports((prev) =>
      prev.filter(
        (r) => !(r.status === 'failed' && (!r.sections || Object.keys(r.sections).length === 0))
      )
    )
  }, [reports])

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
        {failedEmptyCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={handleClearFailed}
          >
            Clear {failedEmptyCount} failed
          </Button>
        )}
      </div>

      {reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 px-4">
          <p className="text-sm text-muted-foreground text-center">
            No reports yet. Generate your first report from the{' '}
            <Link href="/generate" className="underline hover:text-foreground">
              Generate
            </Link>{' '}
            page.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((r) => (
            <ReportCard
              key={r.id}
              status={r.status}
              participantName={
                Array.isArray(r.assessments)
                  ? r.assessments[0]?.participant_name ?? null
                  : r.assessments?.participant_name ?? null
              }
              sectionCount={r.sections ? Object.keys(r.sections).length : 0}
              flagCount={r.planner_review?.flags?.length ?? 0}
              updatedAt={r.updated_at}
              onClick={() => router.push(`/workspace/${r.id}`)}
              onDelete={() => handleDelete(r.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
