'use client'

import { useState, useCallback, useRef, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { FileText, ArrowUp, Sparkles, ClipboardPaste } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { TextDotsLoader } from '@/components/ui/loader'
import { FormattedReport } from '@/components/report/formatted-report'
import { ExportButton } from '@/components/report/export-button'
import templateData from '@/lib/template.json'

type SectionTemplate = {
  name: string
  order: number
  auto_generate?: boolean
}

type Sections = Record<string, { title: string; content: string }>

const generatableSections = (templateData.sections as SectionTemplate[])
  .filter(s => !s.auto_generate)
  .sort((a, b) => a.order - b.order)

export default function GeneratePage() {
  const [clinicalNotes, setClinicalNotes] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentSectionName, setCurrentSectionName] = useState('')
  const [completedCount, setCompletedCount] = useState(0)
  const [sections, setSections] = useState<Sections>({})
  const [reportId, setReportId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isCoherenceRunning, setIsCoherenceRunning] = useState(false)
  const [isDone, setIsDone] = useState(false)

  const reportRef = useRef<HTMLDivElement>(null)
  const topRef = useRef<HTMLDivElement>(null)
  const supabase = useMemo(() => createClient(), [])

  const totalSections = generatableSections.length
  const progressPercent = isCoherenceRunning
    ? 95
    : totalSections > 0
      ? Math.round((completedCount / totalSections) * 90)
      : 0

  const handleGenerate = useCallback(async () => {
    if (!clinicalNotes.trim()) return

    setIsGenerating(true)
    setError(null)
    setSections({})
    setCompletedCount(0)
    setReportId(null)
    setIsDone(false)

    try {
      // Create a temporary assessment row with clinical_notes and empty domains
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('You must be logged in to generate reports.')
        setIsGenerating(false)
        return
      }

      const { data: assessment, error: assessmentError } = await supabase
        .from('assessments')
        .insert({
          user_id: user.id,
          participant_name: 'Quick Generate',
          clinical_notes: clinicalNotes,
          domains: {},
          status: 'quick_generate',
        })
        .select('id')
        .single()

      if (assessmentError || !assessment) {
        setError('Failed to create assessment. Please try again.')
        setIsGenerating(false)
        return
      }

      let currentReportId: string | null = null
      const accumulatedSections: Sections = {}

      // Generate each section sequentially
      for (let i = 0; i < generatableSections.length; i++) {
        const section = generatableSections[i]
        setCurrentSectionName(section.name)

        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assessmentId: assessment.id,
            reportId: currentReportId,
            sectionId: section.name,
            clinicalNotes,
          }),
        })

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.error || `Failed to generate "${section.name}"`)
        }

        const data = await response.json()
        currentReportId = data.reportId
        setReportId(data.reportId)

        accumulatedSections[data.sectionId] = {
          title: data.sectionId,
          content: data.content,
        }
        setSections({ ...accumulatedSections })
        setCompletedCount(i + 1)

        // Scroll to report area after first section
        if (i === 0 && reportRef.current) {
          reportRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }

      // Run coherence check
      if (currentReportId) {
        setIsCoherenceRunning(true)
        setCurrentSectionName('Running coherence check...')

        await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'coherence_check',
            reportId: currentReportId,
            clinicalNotes,
          }),
        })
      }

      setIsDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.')
    } finally {
      setIsGenerating(false)
      setIsCoherenceRunning(false)
      setCurrentSectionName('')
    }
  }, [clinicalNotes, supabase])

  const scrollToTop = useCallback(() => {
    topRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const hasSections = Object.keys(sections).length > 0

  return (
    <div className="min-h-screen bg-muted/30">
      <div ref={topRef} />

      {/* Top Section: Input */}
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center gap-2">
            <FileText className="size-7 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              TheraNotes AI
            </h1>
          </div>
          <p className="text-muted-foreground">
            Paste your clinical notes. Get an NDIS-ready FCA report.
          </p>
        </div>

        {/* Input Card */}
        <Card>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clinical-notes">
                <ClipboardPaste className="size-4 text-muted-foreground" />
                Clinical Notes
              </Label>
              <Textarea
                id="clinical-notes"
                placeholder="Paste your clinical notes here... Include participant background, diagnoses, functional observations, assessment results, and any relevant history."
                className="min-h-[200px] resize-y text-sm leading-relaxed"
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                disabled={isGenerating}
              />
            </div>

            <Button
              className="w-full h-10 gap-2 text-sm font-semibold"
              onClick={handleGenerate}
              disabled={isGenerating || !clinicalNotes.trim()}
            >
              {isGenerating ? (
                <>
                  <TextDotsLoader text="Generating" size="sm" className="text-primary-foreground" />
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Generate Report
                </>
              )}
            </Button>

            {/* Error display */}
            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Progress indicator */}
        {isGenerating && (
          <Card className="mt-4">
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">
                    {isCoherenceRunning ? 'Coherence check' : currentSectionName}
                  </span>
                  <Badge variant="secondary">
                    {completedCount}/{totalSections}
                  </Badge>
                </div>
                <Progress value={progressPercent} />
                <div className="flex flex-wrap gap-1.5">
                  {generatableSections.map((s, i) => (
                    <Badge
                      key={s.name}
                      variant={
                        i < completedCount
                          ? 'default'
                          : i === completedCount
                            ? 'outline'
                            : 'secondary'
                      }
                      className={
                        i === completedCount
                          ? 'animate-pulse border-primary/50'
                          : ''
                      }
                    >
                      {s.name.length > 25 ? s.name.slice(0, 22) + '...' : s.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bottom Section: Formatted Report */}
      {hasSections && (
        <div ref={reportRef} className="pb-24">
          {/* Completion banner */}
          {isDone && (
            <div className="mx-auto mb-6 max-w-[800px] px-4">
              <div className="flex items-center justify-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300">
                <Sparkles className="size-4" />
                Report generated successfully. Review the document below and download when ready.
              </div>
            </div>
          )}

          {/* The formatted report */}
          <div className="px-4">
            <FormattedReport sections={sections} />
          </div>

          {/* Sticky footer bar */}
          {isDone && (
            <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
              <div className="mx-auto flex max-w-[800px] items-center justify-between px-6 py-3">
                <Button variant="ghost" size="sm" className="gap-1.5" onClick={scrollToTop}>
                  <ArrowUp className="size-3.5" />
                  Back to top
                </Button>
                <div className="flex items-center gap-3">
                  {reportId && (
                    <Link
                      href={`/report/${reportId}`}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Open in report viewer
                    </Link>
                  )}
                  <ExportButton sections={sections} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Link to structured assessment form */}
      <div className="mx-auto max-w-3xl px-4 pb-32 pt-8 text-center">
        <Link
          href="/assessments"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
        >
          Need more control? Use the structured assessment form &rarr;
        </Link>
      </div>
    </div>
  )
}
