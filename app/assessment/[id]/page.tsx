import { AssessmentForm } from '@/components/assessment/assessment-form'

export default async function AssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return <AssessmentForm assessmentId={id} />
}
