import { AppRail } from '@/components/layout/app-rail'
import { ReportList } from '@/components/reports/report-list'

export default function ReportsPage() {
  return (
    <div className="tn-entry-shell">
      <AppRail />
      <main className="tn-app-page-screen">
        <div className="tn-app-page-inner">
          <header className="tn-app-page-header">
            <span className="tn-mode-kicker">Report library</span>
            <h1>Reports</h1>
            <p>
              Resume drafts, review generated reports, and continue the final
              assessment workflow from the saved report workspace.
            </p>
          </header>
          <ReportList />
        </div>
      </main>
    </div>
  )
}
