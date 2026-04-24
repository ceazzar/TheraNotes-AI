import Link from 'next/link'
import { AssessmentList } from '@/components/assessments/assessment-list'
import { Settings } from 'lucide-react'

export default function AssessmentsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-4">
          <h1 className="text-xl font-semibold tracking-tight">
            TheraNotes AI
          </h1>
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Settings className="size-4" />
            Settings
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <AssessmentList />
      </main>
    </div>
  )
}
