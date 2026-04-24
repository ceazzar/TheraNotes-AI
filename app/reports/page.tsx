import { Topbar } from '@/components/layout/topbar'
import { ReportList } from '@/components/reports/report-list'

export default function ReportsPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Topbar />
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <ReportList />
      </main>
    </div>
  )
}
