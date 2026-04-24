'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { AssessmentCard } from '@/components/assessments/assessment-card'
import { Plus } from 'lucide-react'

interface AssessmentRow {
  id: string
  title: string | null
  status: string
  updated_at: string
  domain_status: Record<string, string>
}

export function AssessmentList() {
  const [assessments, setAssessments] = useState<AssessmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('assessments')
        .select('id, title, status, updated_at, domain_status')
        .order('updated_at', { ascending: false })

      if (!error && data) {
        setAssessments(data as AssessmentRow[])
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleNewAssessment() {
    setCreating(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setCreating(false)
      return
    }

    const { data, error } = await supabase
      .from('assessments')
      .insert({ user_id: user.id })
      .select('id')
      .single()

    if (!error && data) {
      router.push(`/assessment/${data.id}`)
    }
    setCreating(false)
  }

  async function handleCardClick(assessment: AssessmentRow) {
    if (assessment.status === 'complete') {
      const { data: report } = await supabase
        .from('reports')
        .select('id')
        .eq('assessment_id', assessment.id)
        .single()

      if (report) {
        router.push(`/report/${report.id}`)
        return
      }
    }
    router.push(`/assessment/${assessment.id}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">Loading assessments...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Your Assessments</h2>
        <Button onClick={handleNewAssessment} disabled={creating}>
          <Plus className="size-4" data-icon="inline-start" />
          {creating ? 'Creating...' : 'New Assessment'}
        </Button>
      </div>

      {assessments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 px-4">
          <p className="text-sm text-muted-foreground text-center">
            No assessments yet. Click &apos;New Assessment&apos; to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assessments.map((a) => (
            <AssessmentCard
              key={a.id}
              id={a.id}
              title={a.title}
              status={a.status}
              updatedAt={a.updated_at}
              domainStatus={a.domain_status ?? {}}
              onClick={() => handleCardClick(a)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
