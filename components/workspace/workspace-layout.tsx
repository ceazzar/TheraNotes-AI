'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { ChevronLeft, Search, Shield } from 'lucide-react'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx'
import { saveAs } from 'file-saver'
import { createClient } from '@/lib/supabase/client'
import { reportToPlate } from '@/lib/editor/report-to-plate'
import { plateToSections } from '@/lib/editor/plate-to-sections'
import { useAutoSave } from '@/hooks/use-auto-save'
import { PlateDocEditor, type PlateEditorHandle } from './plate-editor'
import { TocSidebar } from './toc-sidebar'
import { WorkspaceFooter } from './workspace-footer'
import type { ReportSection, Flag, Participant } from '@/lib/workspace/types'
import type { Value } from 'platejs'

type Sections = Record<string, { title: string; content: string }>

interface Report {
  id: string
  sections: Sections
  status: string
  assessment_id: string | null
  planner_review: { flags?: PlannerFlag[] } | null
}

interface PlannerFlag {
  sectionId: string
  severity: 'critical' | 'warning' | 'suggestion'
  issue: string
  recommendation: string
  ndisRationale: string
  originalText?: string
  refined?: string
}

interface WorkspaceLayoutProps {
  reportId: string
}

export function WorkspaceLayout({ reportId }: WorkspaceLayoutProps) {
  const [report, setReport] = useState<Report | null>(null)
  const [participant, setParticipant] = useState<Participant | null>(null)
  const [loading, setLoading] = useState(true)
  const [plateValue, setPlateValue] = useState<Value | null>(null)
  const [sectionKeys, setSectionKeys] = useState<string[]>([])
  const [tocSections, setTocSections] = useState<ReportSection[]>([])
  const [flags, setFlags] = useState<Flag[]>([])

  const [activeSection, setActiveSection] = useState('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const editorRef = useRef<PlateEditorHandle>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const supabase = useMemo(() => createClient(), [])

  // Fetch report data
  useEffect(() => {
    async function load() {
      const { data: reportData } = await supabase
        .from('reports')
        .select('id, sections, status, assessment_id, planner_review')
        .eq('id', reportId)
        .single()

      if (!reportData) {
        setLoading(false)
        return
      }

      const r: Report = {
        id: reportData.id,
        sections: (reportData.sections as Sections) ?? {},
        status: reportData.status,
        assessment_id: reportData.assessment_id,
        planner_review: reportData.planner_review as Report['planner_review'],
      }
      setReport(r)

      // Convert sections to Plate nodes
      const { value, sectionKeys: keys } = reportToPlate(r.sections)
      setPlateValue(value)
      setSectionKeys(keys)

      // Build TOC sections
      const toc: ReportSection[] = keys.map((key) => ({
        id: key,
        title: r.sections[key]?.title ?? key,
      }))
      setTocSections(toc)

      // Convert planner flags
      const plannerFlags = r.planner_review?.flags ?? []
      const mappedFlags: Flag[] = plannerFlags.map((f, i) => ({
        id: `flag-${i}`,
        sev: f.severity,
        section: f.sectionId,
        title: f.issue,
        desc: f.recommendation,
        fix: f.recommendation,
        rationale: f.ndisRationale,
        refined: f.refined ?? '',
        originalText: f.originalText ?? '',
        resolved: false,
      }))
      setFlags(mappedFlags)

      // Fetch participant info
      if (reportData.assessment_id) {
        const { data: assessment } = await supabase
          .from('assessments')
          .select('participant_name, ndis_number, assessor_name')
          .eq('id', reportData.assessment_id)
          .single()

        if (assessment) {
          setParticipant({
            name: (assessment as Record<string, string>).participant_name ?? 'Participant',
            ndisNumber: (assessment as Record<string, string>).ndis_number ?? '',
            assessor: (assessment as Record<string, string>).assessor_name ?? '',
            reportDate: new Date().toLocaleDateString('en-AU', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            }),
          })
        }
      }

      setLoading(false)
    }
    load()
  }, [reportId, supabase])

  // Auto-save
  const saveToSupabase = useCallback(async () => {
    const editor = editorRef.current?.editor
    if (!editor || !report) return

    const sections = plateToSections(editor.children, sectionKeys, editor)
    await supabase
      .from('reports')
      .update({ sections })
      .eq('id', report.id)
  }, [report, sectionKeys, supabase])

  const { markDirty, saveStatus } = useAutoSave({ save: saveToSupabase })

  // Progress
  const touchedSections = useMemo(
    () => new Set(flags.filter((f) => f.resolved).map((f) => f.section)),
    [flags]
  )
  const progressPct = tocSections.length
    ? Math.round((touchedSections.size / tocSections.length) * 100)
    : 0

  const jumpTo = useCallback((id: string) => {
    const headings = scrollRef.current?.querySelectorAll('h2')
    if (!headings) return
    for (const h of headings) {
      if (h.textContent?.includes(id) || h.textContent === id) {
        h.scrollIntoView({ behavior: 'smooth', block: 'start' })
        break
      }
    }
  }, [])

  const reviewAll = useCallback(() => {
    const first = flags.find((f) => !f.resolved)
    if (first) jumpTo(first.section)
  }, [flags, jumpTo])

  const handleExportDocx = useCallback(async () => {
    const editor = editorRef.current?.editor
    if (!editor) return

    const sections = plateToSections(editor.children, sectionKeys, editor)
    const children: Paragraph[] = [
      new Paragraph({
        text: 'Functional Capacity Assessment Report',
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
    ]

    for (const [, section] of Object.entries(sections)) {
      children.push(
        new Paragraph({
          text: section.title,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 200 },
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
          },
        })
      )
      for (const para of section.content.split('\n\n')) {
        if (!para.trim()) continue
        children.push(
          new Paragraph({
            children: [new TextRun({ text: para.trim(), size: 22 })],
            spacing: { after: 120 },
          })
        )
      }
    }

    const doc = new Document({ sections: [{ children }] })
    const blob = await Packer.toBlob(doc)
    saveAs(blob, `FCA-${participant?.name ?? 'Report'}.docx`)
  }, [sectionKeys, participant])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--tn-bg)' }}>
        <p className="text-sm text-muted-foreground">Loading workspace...</p>
      </div>
    )
  }

  if (!report || !plateValue) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--tn-bg)' }}>
        <p className="text-sm text-muted-foreground">Report not found.</p>
      </div>
    )
  }

  return (
    <div
      className="tn-ws"
      data-sidebar-collapsed={sidebarCollapsed}
      style={{ '--sidebar-w': '280px' } as React.CSSProperties}
    >
      {/* Sidebar */}
      <TocSidebar
        sections={tocSections}
        flags={flags}
        activeSection={activeSection}
        collapsed={sidebarCollapsed}
        touchedSections={touchedSections}
        progressPct={progressPct}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
        onJumpTo={jumpTo}
        onOpenFlag={(id) => jumpTo(id)}
        onReviewAll={reviewAll}
      />

      {/* Main content */}
      <div className="tn-ws-main">
        {/* Topbar breadcrumbs */}
        <div className="tn-ws-topbar">
          <div className="tn-ws-crumbs">
            <button
              className="tn-btn tn-btn-ghost tn-btn-xs"
              style={{ marginRight: 4 }}
              onClick={() => window.history.back()}
            >
              <ChevronLeft size={13} /> Back
            </button>
            <span>Reports</span>
            <span style={{ color: 'var(--tn-muted-3)' }}>/</span>
            <b>FCA &mdash; {participant?.name ?? 'Report'}</b>
            <span
              style={{
                color: 'var(--tn-muted-3)',
                marginLeft: 6,
                fontSize: 12,
              }}
            >
              {report.status === 'ready' ? 'Ready' : 'Draft'} &middot;{' '}
              {participant?.reportDate ?? ''}
            </span>
          </div>
          <div className="tn-ws-top-actions">
            <button className="tn-btn tn-btn-ghost tn-btn-xs">
              <Search size={13} /> Find
            </button>
            <button className="tn-btn tn-btn-ghost tn-btn-xs">
              <Shield size={13} /> NDIS Review
            </button>
          </div>
        </div>

        {/* Paper scroll area */}
        <div className="tn-paper-scroll" ref={scrollRef}>
          <div className="tn-paper">
            <div className="tn-paper-inner">
              <PlateDocEditor
                ref={editorRef}
                initialValue={plateValue}
                onChange={markDirty}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <WorkspaceFooter
          saving={saveStatus === 'saving'}
          onExportDocx={handleExportDocx}
        />
      </div>
    </div>
  )
}
