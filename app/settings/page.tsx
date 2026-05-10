'use client'

import { useState, useCallback } from 'react'
import { ExemplarUpload } from '@/components/settings/exemplar-upload'
import { ExemplarList } from '@/components/settings/exemplar-list'
import { ProfileForm } from '@/components/settings/profile-form'
import { Topbar } from '@/components/layout/topbar'

export default function SettingsPage() {
  const [refreshKey, setRefreshKey] = useState(0)

  const handleUploadComplete = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <Topbar />
      <div className="max-w-3xl mx-auto py-10 px-4">
        <div className="space-y-1 mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Profile, clinic details, and exemplar library.
          </p>
        </div>

        <div className="space-y-12">
          <section>
            <div className="space-y-1 mb-4">
              <h2 className="text-lg font-medium">Profile</h2>
              <p className="text-sm text-muted-foreground">
                Identity and clinic details that pre-fill every report you generate.
              </p>
            </div>
            <ProfileForm />
          </section>

          <section className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-medium">Upload exemplar</h2>
              <p className="text-sm text-muted-foreground">
                Upload completed FCA reports as exemplars. These will be chunked,
                embedded, and used as style references during report generation.
              </p>
            </div>
            <ExemplarUpload onUploadComplete={handleUploadComplete} />
          </section>

          <section className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-medium">Uploaded exemplars</h2>
              <p className="text-sm text-muted-foreground">
                The reports the AI references when generating your style.
              </p>
            </div>
            <ExemplarList refreshKey={refreshKey} />
          </section>
        </div>
      </div>
    </div>
  )
}
