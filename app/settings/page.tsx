'use client'

import { useState, useCallback } from 'react'
import { ExemplarUpload } from '@/components/settings/exemplar-upload'
import { ExemplarList } from '@/components/settings/exemplar-list'
import { ArrowLeft } from 'lucide-react'

export default function SettingsPage() {
  const [refreshKey, setRefreshKey] = useState(0)

  const handleUploadComplete = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto py-10 px-4">
        <div className="space-y-1 mb-8">
          <a
            href="/generate"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="size-3.5" />
            Back to Generate
          </a>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your exemplar reports for RAG-powered generation.
          </p>
        </div>

        <div className="space-y-8">
          <section className="space-y-4">
            <h2 className="text-lg font-medium">Upload Exemplar</h2>
            <p className="text-sm text-muted-foreground">
              Upload completed FCA reports as exemplars. These will be chunked,
              embedded, and used as style references during report generation.
            </p>
            <ExemplarUpload onUploadComplete={handleUploadComplete} />
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-medium">Uploaded Exemplars</h2>
            <ExemplarList refreshKey={refreshKey} />
          </section>
        </div>
      </div>
    </div>
  )
}
