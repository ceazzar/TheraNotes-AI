'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectItem } from '@/components/ui/select'
import { ReportCard } from './report-card'

const PAGE_SIZE = 24
// When the user is searching, we widen the window so a name on page 5 isn't
// invisible. This keeps the existing paginated-default flow but makes search
// correct at clinic scale (typically <500 reports per clinician). For larger
// datasets the right next step is a true server-side ilike against the
// embedded participant_name; that's deferred until a clinician demands it.
const SEARCH_PAGE_SIZE = 500
type StatusFilter = 'all' | 'draft' | 'generating' | 'ready' | 'failed'

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
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  // Fetch one page at a time. Pagination is intentionally simple — load-more
  // button rather than infinite scroll, because clinicians scan a list rather
  // than browse it; load-more is more discoverable and predictable.
  useEffect(() => {
    let isActive = true
    setLoading(true)

    // Defense-in-depth: require an authenticated user AND filter by user_id
    // explicitly, even though RLS is enforced. This mirrors the workspace
    // fetch pattern shipped in Day-2.5. Without it, a single RLS policy bug
    // would leak across tenants. (Caught as REG-4 in round-2.)
    void supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!isActive) return
      if (!user) {
        setLoading(false)
        return
      }
      // While the user is searching we widen the fetch window so the search
      // covers the whole working set rather than just the first page. This
      // is the difference between "no matches found" (false) and "showing
      // 0 of 500 reports" (honest). Round-2 NEW-5.
      const searching = search.trim().length > 0
      const effectivePageSize = searching ? SEARCH_PAGE_SIZE : PAGE_SIZE
      const from = searching ? 0 : page * effectivePageSize
      const to = from + effectivePageSize - 1
      let query = supabase
        .from('reports')
        .select('id, status, sections, created_at, updated_at, assessment_id, planner_review, assessments(participant_name)')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .range(from, to)
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query
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
          await supabase.from('reports').update({ status: 'failed' }).in('id', staleIds)
        }

        if (!isActive) return
        // When searching we replace the list (single big window). When
        // paginating we append to the existing list as before.
        if (searching) {
          setReports(cleaned)
          setHasMore(false)
        } else {
          setReports((prev) => (page === 0 ? cleaned : [...prev, ...cleaned]))
          setHasMore(cleaned.length === PAGE_SIZE)
        }
      }

      setLoading(false)
    }).catch(() => {
      if (isActive) setLoading(false)
    })

    return () => {
      isActive = false
    }
  }, [supabase, page, statusFilter, search])

  // Reset to page 0 whenever filter or search changes (search switches the
  // fetch into a single big window, so we need to re-fetch when it toggles).
  useEffect(() => {
    setPage(0)
    setReports([])
  }, [statusFilter, search])

  // Client-side search across the loaded page set. For larger datasets a
  // server-side ilike on participant_name would be a follow-up.
  const filteredReports = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return reports
    return reports.filter((r) => {
      const name = Array.isArray(r.assessments)
        ? r.assessments[0]?.participant_name
        : r.assessments?.participant_name
      return name?.toLowerCase().includes(term)
    })
  }, [reports, search])

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-medium">Your reports</h2>
        <div className="flex flex-wrap items-center gap-2">
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
          <Link
            href="/generate"
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus size={14} /> New report
          </Link>
        </div>
      </div>

      {/* Search + filter — always visible so a clinician with 50+ reports
          isn't scrolling. Filter is server-side; search is client-side over
          the loaded page (good enough for the per-clinician scale). */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by participant name…"
            className="pl-9"
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
            placeholder="All statuses"
            aria-label="Filter by status"
          >
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="generating">Generating</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </Select>
        </div>
      </div>

      {loading && reports.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-muted-foreground">Loading reports…</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 px-4">
          <p className="text-sm text-muted-foreground text-center">
            {search || statusFilter !== 'all' ? (
              <>No reports match this filter.</>
            ) : (
              <>
                No reports yet. Generate your first report from the{' '}
                <Link href="/generate" className="underline hover:text-foreground">
                  Generate
                </Link>{' '}
                page.
              </>
            )}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredReports.map((r) => (
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
                onClick={() => router.push(`/reports/${r.id}`)}
                onDelete={() => handleDelete(r.id)}
              />
            ))}
          </div>
          {hasMore && !search && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={() => setPage((p) => p + 1)}
              >
                {loading ? 'Loading…' : 'Load more'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
