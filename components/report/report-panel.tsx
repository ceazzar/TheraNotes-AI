'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ReportSection } from './report-section'
import { ExportButton } from './export-button'
import { FileText } from 'lucide-react'

type Sections = Record<string, { title: string; content: string }>

interface ReportPanelProps {
  sessionId: string | null
}

export function ReportPanel({ sessionId }: ReportPanelProps) {
  const [reportId, setReportId] = useState<string | null>(null)
  const [sections, setSections] = useState<Sections>({})
  const [status, setStatus] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

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

  useEffect(() => {
    fetchReport()
    const interval = setInterval(fetchReport, 3000)
    return () => clearInterval(interval)
  }, [fetchReport])

  const handleRevise = useCallback(
    (sectionId: string) => {
      // In the chat-first view, revision is handled by the revision chat panel
      // This is a no-op placeholder — the standalone report view at /report/[id] handles this
      console.log('Revise requested for section:', sectionId)
    },
    []
  )

  const handleEdit = useCallback(
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
    <div className="flex h-full flex-col overflow-hidden">
      {/* Report content area */}
      <div className="flex-1 overflow-y-auto p-5 md:p-7">
        <div className="mx-auto max-w-[820px]">
          {!sessionId && (
            <EmptyReportPlaceholder message="Select or create a session to view the report." />
          )}

          {sessionId && !hasSections && (
            <EmptyReportPlaceholder message="Sections generate one-by-one as I analyze your notes. You can edit any paragraph, revise with AI, or regenerate a full section." />
          )}

          {hasSections && (
            <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              {/* Report header */}
              <div className="px-8 pt-8 md:px-12 md:pt-10">
                <div className="flex items-start justify-between mb-1.5">
                  <div>
                    <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#2563EB] mb-1.5">
                      NDIS · Functional Capacity Assessment
                    </div>
                    <h1
                      className="text-[28px] md:text-[32px] font-bold leading-[1.15] tracking-tight text-[#0F172A]"
                      style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                    >
                      Functional Capacity
                      <br />
                      Assessment Report
                    </h1>
                  </div>
                  <div className="flex items-center gap-2">
                    {status && (
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium ${
                          status === 'ready'
                            ? 'bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]'
                            : 'bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE]'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            status === 'ready' ? 'bg-[#22C55E]' : 'bg-[#3B82F6]'
                          }`}
                          style={
                            status !== 'ready'
                              ? { animation: 'tn-pulse 1.4s ease-in-out infinite' }
                              : undefined
                          }
                        />
                        {status === 'ready'
                          ? 'Ready for review'
                          : status === 'generating'
                            ? 'Generating'
                            : status}
                      </span>
                    )}
                    <ExportButton sections={sections} />
                  </div>
                </div>
              </div>

              {/* Sections */}
              <div className="px-8 pb-10 md:px-12 md:pb-12">
                {sectionEntries.map(([sectionId, section]) => (
                  <ReportSection
                    key={sectionId}
                    sectionId={sectionId}
                    title={section.title}
                    content={section.content}
                    onRevise={handleRevise}
                    onEdit={handleEdit}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function EmptyReportPlaceholder({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="max-w-[460px] rounded-2xl border-2 border-dashed border-[#E2E8F0] bg-white px-10 py-14 text-center">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB]">
          <FileText className="size-[22px]" />
        </div>
        <h3
          className="mb-1.5 text-lg font-semibold tracking-tight text-[#0F172A]"
          style={{ fontFamily: "Georgia, serif" }}
        >
          Your FCA report will appear here
        </h3>
        <p className="text-[13px] leading-relaxed text-[#64748B]">{message}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-1.5">
          {[
            'Background',
            'Self-Care',
            'Productivity',
            'Leisure',
            'Mobility',
            'Cognition',
            'Goals',
          ].map((s) => (
            <span
              key={s}
              className="rounded-full border border-[#E2E8F0] bg-[#F1F5F9] px-2.5 py-1 text-[11.5px] text-[#64748B]"
            >
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
