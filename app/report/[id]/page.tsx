import { ReportViewer } from '@/components/report/report-viewer'

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return <ReportViewer reportId={id} />
}
