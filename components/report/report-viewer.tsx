'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ReportSection } from './report-section'
import { PlannerFlags } from './planner-flags'
import { ExportButton } from './export-button'
import { RevisionChat } from './revision-chat'

type Sections = Record<
  string,
  { title: string; content: string; insufficientData?: boolean }
>

interface PlannerFlag {
  sectionId: string
  severity: 'critical' | 'warning' | 'suggestion'
  issue: string
  recommendation: string
  ndisRationale: string
}

interface PlannerReview {
  flags?: PlannerFlag[]
  reviewed_at?: string
}

interface Report {
  id: string
  sections: Sections
  status: string
  assessment_id: string | null
  insufficient_data_flags: string[] | null
  planner_review: PlannerReview | null
}

interface ReportViewerProps {
  reportId: string
}

export function ReportViewer({ reportId }: ReportViewerProps) {
  const [report, setReport] = useState<Report | null>(null)
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  const fetchReport = useCallback(async (): Promise<Report | null> => {
    const { data } = await supabase
      .from('reports')
      .select('id, sections, status, assessment_id, insufficient_data_flags, planner_review')
      .eq('id', reportId)
      .single()

    if (!data) return null

    const sections = { ...((data.sections as Sections) || {}) }
    const flags = (data.insufficient_data_flags as string[]) || []

    // Mark sections with insufficient data
    for (const flag of flags) {
      if (sections[flag]) {
        sections[flag] = { ...sections[flag], insufficientData: true }
      }
    }

    return {
      id: data.id,
      sections,
      status: data.status,
      assessment_id: data.assessment_id,
      insufficient_data_flags: data.insufficient_data_flags,
      planner_review: (data.planner_review as PlannerReview) ?? null,
    }
  }, [reportId, supabase])

  useEffect(() => {
    let isActive = true
    const refresh = () => {
      void fetchReport().then((nextReport) => {
        if (isActive && nextReport) setReport(nextReport)
      })
    }

    refresh()
    const interval = setInterval(refresh, 3000)
    return () => {
      isActive = false
      clearInterval(interval)
    }
  }, [fetchReport])

  const handleRevise = useCallback((sectionId: string) => {
    setActiveSectionId(sectionId)
  }, [])

  const handleEdit = useCallback(
    async (sectionId: string, content: string) => {
      if (!report) return

      const updatedSections = {
        ...report.sections,
        [sectionId]: { ...report.sections[sectionId], content },
      }

      setReport((prev) =>
        prev ? { ...prev, sections: updatedSections } : prev
      )

      await supabase
        .from('reports')
        .update({ sections: updatedSections })
        .eq('id', reportId)
    },
    [report, reportId, supabase]
  )

  const activeSectionTitle = activeSectionId
    ? report?.sections[activeSectionId]?.title ?? null
    : null

  const sectionEntries = report ? Object.entries(report.sections) : []

  const statusVariant =
    report?.status === 'ready'
      ? 'secondary'
      : report?.status === 'failed'
        ? 'destructive'
        : 'default'

  const statusLabel =
    report?.status === 'ready'
      ? 'Ready for review'
      : report?.status === 'generating'
        ? 'Generating...'
        : report?.status === 'draft'
          ? 'Draft'
          : report?.status === 'failed'
            ? 'Failed'
            : report?.status ?? 'Loading...'

  return (
    <div className="flex h-screen">
      {/* Left: Report sections */}
      <div className="flex flex-1 flex-col overflow-hidden" style={{ flexBasis: '65%' }}>
        {/* Header */}
        <div className="border-b border-border bg-background px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="size-5 text-primary" />
              <h1 className="text-lg font-semibold text-foreground">
                FCA Report
              </h1>
              {report && (
                <Badge variant={statusVariant}>{statusLabel}</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/reports"
                className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'gap-1.5')}
              >
                <ArrowLeft className="size-3.5" />
                Back to Reports
              </Link>
              {report && sectionEntries.length > 0 && (
                <ExportButton sections={report.sections} />
              )}
            </div>
          </div>
        </div>

        {/* Sections */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {!report && (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground">
                Loading report...
              </p>
            </div>
          )}

          {report && sectionEntries.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground">
                No sections generated yet.
              </p>
            </div>
          )}

          {sectionEntries.map(([sectionId, section]) => (
            <div key={sectionId}>
              <ReportSection
                sectionId={sectionId}
                title={section.title}
                content={section.content}
                insufficientData={section.insufficientData}
                onRevise={handleRevise}
                onEdit={handleEdit}
              />
              {report?.planner_review?.flags && (
                <PlannerFlags
                  flags={report.planner_review.flags}
                  sectionId={sectionId}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Right: Revision chat */}
      <div className="w-[35%] border-l border-border">
        {report ? (
          <RevisionChat
            reportId={report.id}
            activeSectionId={activeSectionId}
            activeSectionTitle={activeSectionTitle}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        )}
      </div>
    </div>
  )
}
