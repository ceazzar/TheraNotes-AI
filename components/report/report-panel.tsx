'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ReportSection } from './report-section'
import { ExportButton } from './export-button'
import { Loader } from '@/components/ui/loader'

type Sections = Record<string, { title: string; content: string }>

interface ReportPanelProps {
  sessionId: string | null
}

export function ReportPanel({ sessionId }: ReportPanelProps) {
  const [reportId, setReportId] = useState<string | null>(null)
  const [sections, setSections] = useState<Sections>({})
  const [status, setStatus] = useState<string | null>(null)
  const [revisingSection, setRevisingSection] = useState<string | null>(null)
  const supabase = createClient()

  const fetchReport = useCallback(async () => {
    if (!sessionId) return

    const { data } = await supabase
      .from('reports')
      .select('id, sections, status')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (data) {
      setReportId(data.id)
      setSections((data.sections as Sections) || {})
      setStatus(data.status)
    } else {
      setReportId(null)
      setSections({})
      setStatus(null)
    }
  }, [sessionId, supabase])

  // Poll for report updates every 3 seconds
  useEffect(() => {
    fetchReport()
    const interval = setInterval(fetchReport, 3000)
    return () => clearInterval(interval)
  }, [fetchReport])

  const handleRevise = useCallback(
    async (sectionId: string, feedback: string) => {
      if (!reportId) return
      setRevisingSection(sectionId)

      try {
        const res = await fetch('/api/revise', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reportId, sectionId, feedback }),
        })

        if (res.ok) {
          const data = await res.json()
          setSections((prev) => ({
            ...prev,
            [sectionId]: {
              ...prev[sectionId],
              content: data.revisedContent,
            },
          }))
        }
      } finally {
        setRevisingSection(null)
      }
    },
    [reportId]
  )

  const handleDirectEdit = useCallback(
    async (sectionId: string, newContent: string) => {
      if (!reportId) return

      const updatedSections = {
        ...sections,
        [sectionId]: { ...sections[sectionId], content: newContent },
      }

      setSections(updatedSections)
      await supabase
        .from('reports')
        .update({ sections: updatedSections })
        .eq('id', reportId)
    },
    [reportId, sections, supabase]
  )

  const sectionEntries = Object.entries(sections)
  const hasSections = sectionEntries.length > 0

  return (
    <div className="flex h-full w-80 shrink-0 flex-col border-l border-border bg-muted/20">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h2 className="text-sm font-semibold">Report</h2>
          {status && (
            <span className="text-xs text-muted-foreground capitalize">
              {status}
            </span>
          )}
        </div>
        {hasSections && <ExportButton sections={sections} />}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!sessionId && (
          <p className="text-sm text-muted-foreground text-center mt-8">
            Select or create a session to view the report.
          </p>
        )}

        {sessionId && !hasSections && (
          <div className="text-center mt-8 space-y-2">
            <p className="text-sm text-muted-foreground">
              Report will appear here as sections are generated...
            </p>
            {status === 'generating' && (
              <div className="flex justify-center">
                <Loader variant="typing" size="sm" />
              </div>
            )}
          </div>
        )}

        {sectionEntries.map(([sectionId, section]) => (
          <ReportSection
            key={sectionId}
            sectionId={sectionId}
            title={section.title}
            content={section.content}
            reportId={reportId!}
            onRevise={handleRevise}
            onDirectEdit={handleDirectEdit}
            isRevising={revisingSection === sectionId}
          />
        ))}
      </div>
    </div>
  )
}
