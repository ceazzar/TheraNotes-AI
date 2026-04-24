'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { DomainSidebar, type DomainKey } from './domain-sidebar'
import { ParticipantDetails } from './participant-details'
import { ClinicalDomain, type ClinicalField } from './clinical-domain'
import { FunctionalDomain } from './functional-domain'
import { StandardizedScores } from './standardized-scores'
import { AlertTriangle, Info, X } from 'lucide-react'
import template from '@/lib/template.json'

interface CompanionSuggestion {
  domain: string
  severity: 'info' | 'warning'
  message: string
  recommendation: string
}

// Domain field definitions for ClinicalDomain usage
const DOMAIN_CONFIGS: Record<
  string,
  { title: string; description: string; fields: ClinicalField[] }
> = {
  primary_diagnosis: {
    title: 'Primary Diagnosis',
    description:
      'Document the primary diagnosis, onset, medical history, and treating professionals.',
    fields: [
      { key: 'diagnosis', label: 'Diagnosis', type: 'text', placeholder: 'Primary diagnosis' },
      { key: 'onset', label: 'Onset', type: 'text', placeholder: 'Date or period of onset' },
      { key: 'medical_history', label: 'Medical History', type: 'textarea', placeholder: 'Relevant medical history and comorbidities' },
      { key: 'medications', label: 'Medications', type: 'textarea', placeholder: 'Current medications and dosages' },
      { key: 'treating_professionals', label: 'Treating Professionals', type: 'textarea', placeholder: 'List of treating professionals and their roles' },
    ],
  },
  social_background: {
    title: 'Social Background',
    description:
      'Capture the participant\'s living situation, cultural background, and social context.',
    fields: [
      { key: 'living_situation', label: 'Living Situation', type: 'textarea', placeholder: 'Current living arrangement and duration' },
      { key: 'family_household', label: 'Family & Household', type: 'textarea', placeholder: 'Family composition and household members' },
      { key: 'cultural_background', label: 'Cultural Background', type: 'text', placeholder: 'Cultural and linguistic background' },
      { key: 'education', label: 'Education', type: 'text', placeholder: 'Education history and qualifications' },
      { key: 'employment', label: 'Employment', type: 'text', placeholder: 'Current employment status' },
    ],
  },
  support_network: {
    title: 'Support Network',
    description:
      'Document formal and informal support services currently accessed by the participant.',
    fields: [
      { key: 'formal_services', label: 'Formal Services', type: 'textarea', placeholder: 'Current formal support services (e.g., NDIS, community services)' },
      { key: 'formal_providers', label: 'Formal Providers', type: 'textarea', placeholder: 'Names and roles of formal service providers' },
      { key: 'informal_family', label: 'Informal Family Support', type: 'textarea', placeholder: 'Family members providing unpaid support' },
      { key: 'informal_community', label: 'Informal Community Support', type: 'textarea', placeholder: 'Community or social network support' },
    ],
  },
  home_environment: {
    title: 'Home Environment',
    description:
      'Assess the physical home environment, accessibility features, and safety considerations.',
    fields: [
      { key: 'dwelling_type', label: 'Dwelling Type', type: 'text', placeholder: 'e.g., House, Apartment, SDA' },
      { key: 'accessibility', label: 'Accessibility', type: 'textarea', placeholder: 'Current accessibility features and barriers' },
      { key: 'modifications', label: 'Modifications', type: 'textarea', placeholder: 'Existing or recommended home modifications' },
      { key: 'safety_concerns', label: 'Safety Concerns', type: 'textarea', placeholder: 'Any identified safety risks in the home' },
    ],
  },
  mental_health: {
    title: 'Mental Health & Psychosocial',
    description:
      'Detailed assessment of mental health status, behavioral patterns, and psychosocial functioning.',
    fields: [
      { key: 'mood_affect', label: 'Mood & Affect', type: 'textarea', placeholder: 'Observed mood, affect, and emotional presentation' },
      { key: 'anxiety', label: 'Anxiety', type: 'textarea', placeholder: 'Anxiety symptoms, triggers, and impact on functioning' },
      { key: 'behavioral_patterns', label: 'Behavioral Patterns', type: 'textarea', placeholder: 'Notable behavioral patterns and presentation' },
      { key: 'coping_strategies', label: 'Coping Strategies', type: 'textarea', placeholder: 'Current coping strategies and effectiveness' },
      { key: 'sleep', label: 'Sleep', type: 'textarea', placeholder: 'Sleep patterns, quality, and impact on daily functioning' },
      { key: 'social_functioning', label: 'Social Functioning', type: 'textarea', placeholder: 'Social engagement, relationships, and community participation' },
    ],
  },
}

// Participant detail fields stored as top-level columns
const PARTICIPANT_FIELDS = [
  'participant_name', 'participant_dob', 'ndis_number', 'referral_source',
  'assessment_dates', 'assessment_location', 'assessor_name', 'assessor_credentials',
] as const

interface AssessmentFormProps {
  assessmentId: string
}

export function AssessmentForm({ assessmentId }: AssessmentFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [activeDomain, setActiveDomain] = useState<DomainKey>('participant_details')

  // Assessment data state
  const [participantData, setParticipantData] = useState<Record<string, string>>({})
  const [primaryDiagnosis, setPrimaryDiagnosis] = useState<Record<string, string>>({})
  const [socialBackground, setSocialBackground] = useState<Record<string, string>>({})
  const [supportNetwork, setSupportNetwork] = useState<Record<string, string>>({})
  const [homeEnvironment, setHomeEnvironment] = useState<Record<string, string>>({})
  const [mentalHealth, setMentalHealth] = useState<Record<string, string>>({})
  const [functionalDomains, setFunctionalDomains] = useState<Record<string, Record<string, string>>>({})
  const [standardizedScores, setStandardizedScores] = useState<Record<string, Record<string, string> | string>>({})
  const [clinicalNotes, setClinicalNotes] = useState('')

  // Companion suggestions state
  const [suggestions, setSuggestions] = useState<CompanionSuggestion[]>([])
  const [checkingReadiness, setCheckingReadiness] = useState(false)

  // Debounce save timer
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load assessment from Supabase
  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('id', assessmentId)
        .single()

      if (error || !data) {
        setLoading(false)
        return
      }

      // Populate participant details from top-level columns
      const pd: Record<string, string> = {}
      for (const f of PARTICIPANT_FIELDS) {
        pd[f] = data[f] ?? ''
      }
      setParticipantData(pd)

      setPrimaryDiagnosis((data.primary_diagnosis as Record<string, string>) ?? {})
      setSocialBackground((data.social_background as Record<string, string>) ?? {})
      setSupportNetwork((data.support_network as Record<string, string>) ?? {})
      setHomeEnvironment((data.home_environment as Record<string, string>) ?? {})
      setMentalHealth((data.mental_health as Record<string, string>) ?? {})
      setFunctionalDomains((data.functional_domains as Record<string, Record<string, string>>) ?? {})
      setStandardizedScores((data.standardized_scores as Record<string, Record<string, string> | string>) ?? {})
      setClinicalNotes((data.clinical_notes as string) ?? '')
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentId])

  // Compute domain status from data
  const computeDomainStatus = useCallback((): Record<string, string> => {
    const status: Record<string, string> = {}

    // Helper: check if a flat record has data
    const flatStatus = (rec: Record<string, string>, minForComplete: number) => {
      const filled = Object.values(rec).filter((v) => v && v.trim().length > 0).length
      if (filled === 0) return 'empty'
      if (filled >= minForComplete) return 'complete'
      return 'partial'
    }

    // Participant details
    status.participant_details = flatStatus(participantData, 5)

    // JSONB domains
    status.primary_diagnosis = flatStatus(primaryDiagnosis, 3)
    status.social_background = flatStatus(socialBackground, 3)
    status.support_network = flatStatus(supportNetwork, 2)
    status.home_environment = flatStatus(homeEnvironment, 2)
    status.mental_health = flatStatus(mentalHealth, 3)

    // Functional domains: check sub-domains
    const fdEntries = Object.values(functionalDomains)
    const fdFilled = fdEntries.filter(
      (sub) => Object.values(sub).filter((v) => v && v.trim().length > 0).length > 0
    ).length
    if (fdFilled === 0) status.functional_domains = 'empty'
    else if (fdFilled >= 4) status.functional_domains = 'complete'
    else status.functional_domains = 'partial'

    // Standardized scores
    const whodas = (standardizedScores.whodas ?? {}) as Record<string, string>
    const sensory = (standardizedScores.sensory ?? {}) as Record<string, string>
    const otherTools = (standardizedScores.other_tools as string) ?? ''
    const scoresFilled =
      Object.values(whodas).filter((v) => v && v.toString().trim().length > 0).length +
      Object.values(sensory).filter((v) => v && v.toString().trim().length > 0).length +
      (otherTools.trim().length > 0 ? 1 : 0)
    if (scoresFilled === 0) status.standardized_scores = 'empty'
    else if (scoresFilled >= 4) status.standardized_scores = 'complete'
    else status.standardized_scores = 'partial'

    // Clinical notes
    status.clinical_notes = clinicalNotes.trim().length > 50 ? 'complete' : clinicalNotes.trim().length > 0 ? 'partial' : 'empty'

    return status
  }, [participantData, primaryDiagnosis, socialBackground, supportNetwork, homeEnvironment, mentalHealth, functionalDomains, standardizedScores, clinicalNotes])

  const domainStatus = computeDomainStatus()

  // Auto-save to Supabase (debounced)
  const debouncedSave = useCallback(
    (updates: Record<string, unknown>) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(async () => {
        const newStatus = computeDomainStatus()
        // Update title based on participant name
        const title = participantData.participant_name
          ? `${participantData.participant_name} - FCA`
          : null
        await supabase
          .from('assessments')
          .update({ ...updates, domain_status: newStatus, title, updated_at: new Date().toISOString() })
          .eq('id', assessmentId)
      }, 800)
    },
    [assessmentId, supabase, computeDomainStatus, participantData.participant_name]
  )

  // Update handlers
  const handleParticipantUpdate = useCallback(
    (field: string, value: string) => {
      setParticipantData((prev) => {
        const next = { ...prev, [field]: value }
        debouncedSave({ [field]: value })
        return next
      })
    },
    [debouncedSave]
  )

  const handleJsonbUpdate = useCallback(
    (
      domainKey: string,
      setter: React.Dispatch<React.SetStateAction<Record<string, string>>>
    ) =>
      (field: string, value: string) => {
        setter((prev) => {
          const next = { ...prev, [field]: value }
          debouncedSave({ [domainKey]: next })
          return next
        })
      },
    [debouncedSave]
  )

  const handleFunctionalUpdate = useCallback(
    (subDomain: string, field: string, value: string) => {
      setFunctionalDomains((prev) => {
        const next = {
          ...prev,
          [subDomain]: { ...(prev[subDomain] ?? {}), [field]: value },
        }
        debouncedSave({ functional_domains: next })
        return next
      })
    },
    [debouncedSave]
  )

  const handleScoresUpdate = useCallback(
    (section: string, field: string, value: string) => {
      setStandardizedScores((prev) => {
        if (section === 'other_tools') {
          const next = { ...prev, other_tools: value }
          debouncedSave({ standardized_scores: next })
          return next
        }
        const sectionData = (prev[section] ?? {}) as Record<string, string>
        const next = { ...prev, [section]: { ...sectionData, [field]: value } }
        debouncedSave({ standardized_scores: next })
        return next
      })
    },
    [debouncedSave]
  )

  const handleClinicalNotesUpdate = useCallback(
    (value: string) => {
      setClinicalNotes(value)
      debouncedSave({ clinical_notes: value })
    },
    [debouncedSave]
  )

  // Companion readiness check handler
  const handleCheckReadiness = useCallback(async () => {
    if (checkingReadiness) return
    setCheckingReadiness(true)
    setSuggestions([])

    try {
      const res: Response = await fetch('/api/companion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessmentId,
          trigger: 'readiness_check',
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setSuggestions(data.suggestions ?? [])
      }
    } catch (error) {
      console.error('Companion check failed:', error)
    } finally {
      setCheckingReadiness(false)
    }
  }, [assessmentId, checkingReadiness])

  // Dismiss a single suggestion
  const dismissSuggestion = useCallback((index: number) => {
    setSuggestions((prev) => prev.filter((_, i) => i !== index))
  }, [])

  // Count complete domains
  const completeCount = Object.values(domainStatus).filter((s) => s === 'complete').length
  const canGenerate = completeCount >= 3

  // Generate report handler
  const handleGenerate = useCallback(async () => {
    if (!canGenerate || generating) return
    setGenerating(true)

    try {
      // Update assessment status
      await supabase
        .from('assessments')
        .update({ status: 'generating' })
        .eq('id', assessmentId)

      // Get generatable sections from template (skip auto_generate ones)
      const sections = template.sections.filter((s) => !s.auto_generate)
      let reportId: string | null = null

      // Generate each section sequentially
      for (const section of sections) {
        const sectionId = section.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_|_$/g, '')

        const res: Response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assessmentId,
            reportId,
            sectionId,
          }),
        })

        if (!res.ok) {
          console.error(`Failed to generate section: ${sectionId}`)
          break
        }

        const data = await res.json()
        reportId = data.reportId
      }

      if (reportId) {
        // Run coherence check
        await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'coherence_check',
            reportId,
            clinicalNotes,
          }),
        })

        // Run NDIS planner review
        await fetch('/api/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reportId }),
        }).catch((err) => {
          // Non-blocking: planner review failure should not prevent navigation
          console.error('Planner review failed:', err)
        })

        // Update assessment status
        await supabase
          .from('assessments')
          .update({ status: 'complete' })
          .eq('id', assessmentId)

        // Navigate to report
        router.push(`/report/${reportId}`)
      }
    } catch (error) {
      console.error('Generation failed:', error)
      await supabase
        .from('assessments')
        .update({ status: 'ready' })
        .eq('id', assessmentId)
    } finally {
      setGenerating(false)
    }
  }, [canGenerate, generating, assessmentId, clinicalNotes, router, supabase])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <p className="text-sm text-muted-foreground">Loading assessment...</p>
      </div>
    )
  }

  // Render the active domain form
  function renderActiveDomain() {
    switch (activeDomain) {
      case 'participant_details':
        return (
          <ParticipantDetails
            data={participantData}
            onUpdate={handleParticipantUpdate}
          />
        )
      case 'primary_diagnosis':
      case 'social_background':
      case 'support_network':
      case 'home_environment':
      case 'mental_health': {
        const config = DOMAIN_CONFIGS[activeDomain]
        const dataMap: Record<string, Record<string, string>> = {
          primary_diagnosis: primaryDiagnosis,
          social_background: socialBackground,
          support_network: supportNetwork,
          home_environment: homeEnvironment,
          mental_health: mentalHealth,
        }
        const setterMap: Record<string, React.Dispatch<React.SetStateAction<Record<string, string>>>> = {
          primary_diagnosis: setPrimaryDiagnosis,
          social_background: setSocialBackground,
          support_network: setSupportNetwork,
          home_environment: setHomeEnvironment,
          mental_health: setMentalHealth,
        }
        return (
          <ClinicalDomain
            title={config.title}
            description={config.description}
            fields={config.fields}
            data={dataMap[activeDomain]}
            onUpdate={handleJsonbUpdate(activeDomain, setterMap[activeDomain])}
          />
        )
      }
      case 'functional_domains':
        return (
          <FunctionalDomain
            data={functionalDomains}
            onUpdate={handleFunctionalUpdate}
          />
        )
      case 'standardized_scores':
        return (
          <StandardizedScores
            data={standardizedScores}
            onUpdate={handleScoresUpdate}
          />
        )
      case 'clinical_notes':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold">Additional Clinical Notes</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Any additional observations, clinical impressions, or notes that don&apos;t fit into the structured domains above.
              </p>
            </div>
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <Label htmlFor="clinical_notes">Clinical Notes</Label>
                  <Textarea
                    id="clinical_notes"
                    value={clinicalNotes}
                    onChange={(e) => handleClinicalNotesUpdate(e.target.value)}
                    placeholder="Enter any additional clinical observations, impressions, contextual information, or notes from interviews and assessments..."
                    className="min-h-64"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <DomainSidebar
        activeDomain={activeDomain}
        onSelectDomain={setActiveDomain}
        domainStatus={domainStatus}
        onGenerate={handleGenerate}
        canGenerate={canGenerate && !generating}
        onCheckReadiness={handleCheckReadiness}
        checkingReadiness={checkingReadiness}
      />
      <div className="flex-1 overflow-y-auto p-8 max-w-3xl">
        {generating ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Generating report sections...</p>
          </div>
        ) : (
          <>
            {suggestions.length > 0 && (
              <div className="space-y-2 mb-6">
                {suggestions.map((suggestion, index) => (
                  <Alert
                    key={`${suggestion.domain}-${index}`}
                    variant={suggestion.severity === 'warning' ? 'warning' : 'info'}
                  >
                    {suggestion.severity === 'warning' ? (
                      <AlertTriangle className="size-4" />
                    ) : (
                      <Info className="size-4" />
                    )}
                    <AlertTitle className="flex items-center justify-between">
                      <span>{suggestion.message}</span>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => dismissSuggestion(index)}
                        className="shrink-0 -mr-1 -mt-0.5"
                      >
                        <X className="size-3" />
                      </Button>
                    </AlertTitle>
                    <AlertDescription>{suggestion.recommendation}</AlertDescription>
                  </Alert>
                ))}
              </div>
            )}
            {renderActiveDomain()}
          </>
        )}
      </div>
    </div>
  )
}
