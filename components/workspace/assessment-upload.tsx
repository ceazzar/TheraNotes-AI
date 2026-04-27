'use client'

import { useState, useCallback } from 'react'
import { Upload, FileText, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AssessmentUploadProps {
  reportId: string
  hasSectionD: boolean
  onGenerated: () => void
}

export function AssessmentUpload({ reportId, hasSectionD, onGenerated }: AssessmentUploadProps) {
  const [files, setFiles] = useState<File[]>([])
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState<string | null>(null)

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
      setError(null)
    }
  }, [])

  const handleGenerate = useCallback(async () => {
    if (files.length === 0) {
      setError('Upload at least one assessment result file (PDF, DOCX, or TXT).')
      return
    }

    setGenerating(true)
    setError(null)

    try {
      // Parse uploaded files to extract text
      setCurrentStep('Reading assessment files...')
      const texts: string[] = []
      for (const file of files) {
        const text = await file.text()
        texts.push(`--- ${file.name} ---\n${text}`)
      }
      const questionnaireData = texts.join('\n\n')

      // Generate Part D
      setCurrentStep('Generating Part D: Assessment Findings...')
      const resD = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId,
          sectionId: 'Part D: Assessment Findings',
          questionnaireData,
        }),
      })

      if (!resD.ok) {
        const err = await resD.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to generate Part D')
      }

      // Generate Part E
      setCurrentStep('Generating Part E: Summary & Recommendations...')
      const resE = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId,
          sectionId: 'Part E: Summary & Recommendations',
          questionnaireData,
        }),
      })

      if (!resE.ok) {
        const err = await resE.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to generate Part E')
      }

      // Run coherence check across full report
      setCurrentStep('Running coherence check...')
      await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'coherence_check',
          reportId,
        }),
      })

      setCurrentStep(null)
      onGenerated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate sections')
    } finally {
      setGenerating(false)
      setCurrentStep(null)
    }
  }, [files, reportId, onGenerated])

  if (hasSectionD) {
    return (
      <div className="tn-assessment-upload tn-assessment-done">
        <CheckCircle2 size={16} style={{ color: 'var(--tn-ok)' }} />
        <span className="text-sm" style={{ color: 'var(--tn-muted-1)' }}>
          Parts D &amp; E generated from assessment data
        </span>
      </div>
    )
  }

  return (
    <div className="tn-assessment-upload">
      <div className="tn-assessment-header">
        <FileText size={16} />
        <div>
          <h4 className="text-sm font-medium">Standardised Assessments</h4>
          <p className="text-xs" style={{ color: 'var(--tn-muted-1)' }}>
            Upload WHODAS, Sensory Profile, or other assessment results to generate Parts D &amp; E
          </p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="tn-assessment-files">
          {files.map((f, i) => (
            <div key={i} className="text-xs" style={{ color: 'var(--tn-muted-1)' }}>
              {f.name}
            </div>
          ))}
        </div>
      )}

      <div className="tn-assessment-actions">
        <label className="tn-upload-label">
          <Upload size={14} />
          <span>{files.length > 0 ? 'Change files' : 'Upload results'}</span>
          <input
            type="file"
            multiple
            accept=".pdf,.docx,.doc,.txt,.md"
            onChange={handleFileChange}
            className="sr-only"
          />
        </label>

        {files.length > 0 && (
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {currentStep || 'Generating...'}
              </>
            ) : (
              'Generate Parts D & E'
            )}
          </Button>
        )}
      </div>

      {error && (
        <p className="text-xs" style={{ color: 'var(--tn-crit)' }}>{error}</p>
      )}
    </div>
  )
}
