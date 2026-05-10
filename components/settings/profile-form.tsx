'use client'

/**
 * Profile + Clinic settings form.
 *
 * Single form for two related groups (Clinician + Clinic) because they always
 * save together and a typical OT updates them at the same time. Inline save
 * with explicit "Save changes" button so a clinician sees confirmation
 * (matches expectations for a settings page; an autosave feels invisible
 * here in a way it does not on /generate).
 */

import { useEffect, useMemo, useState } from 'react'
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { fetchProfile, saveProfile, type ClinicianProfile } from '@/lib/profile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type SaveState =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved' }
  | { kind: 'error'; message: string }

const EMPTY: ClinicianProfile = {
  user_id: '',
  display_name: '',
  credentials: '',
  ahpra_registration: '',
  contact_email: '',
  contact_phone: '',
  clinic_name: '',
  clinic_abn: '',
  ndis_provider_number: '',
  clinic_address: '',
}

export function ProfileForm() {
  const supabase = useMemo(() => createClient(), [])
  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<ClinicianProfile>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [save, setSave] = useState<SaveState>({ kind: 'idle' })

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }
        if (cancelled) return
        setUserId(user.id)
        const existing = await fetchProfile(supabase, user.id)
        if (cancelled) return
        if (existing) {
          setProfile({ ...EMPTY, ...existing })
        } else {
          // Pre-fill email from auth as a sensible default for the contact field.
          setProfile({ ...EMPTY, user_id: user.id, contact_email: user.email ?? '' })
        }
      } catch (err) {
        if (cancelled) return
        setSave({
          kind: 'error',
          message: err instanceof Error ? err.message : 'Failed to load profile.',
        })
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [supabase])

  // Reset the "Saved" badge after a few seconds so it doesn't linger.
  useEffect(() => {
    if (save.kind !== 'saved') return
    const timer = setTimeout(() => setSave({ kind: 'idle' }), 2500)
    return () => clearTimeout(timer)
  }, [save])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!userId) return
    setSave({ kind: 'saving' })
    try {
      const { user_id: _omit, ...updates } = profile
      void _omit
      const fresh = await saveProfile(supabase, userId, updates)
      setProfile(fresh)
      setSave({ kind: 'saved' })
    } catch (err) {
      setSave({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Save failed.',
      })
    }
  }

  const update = <K extends keyof ClinicianProfile>(key: K, value: ClinicianProfile[K]) => {
    setProfile((p) => ({ ...p, [key]: value }))
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 size={14} className="animate-spin" /> Loading profile…
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Clinician identity */}
      <fieldset className="space-y-4">
        <legend className="text-base font-medium text-foreground">Clinician details</legend>
        <p className="text-xs text-muted-foreground -mt-2">
          These pre-fill the Assessor fields on every new report.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Label className="block">
            <span className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Display name</span>
            <Input
              value={profile.display_name ?? ''}
              onChange={(e) => update('display_name', e.target.value)}
              placeholder="e.g. Mary Jane Watson"
            />
          </Label>
          <Label className="block">
            <span className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Credentials</span>
            <Input
              value={profile.credentials ?? ''}
              onChange={(e) => update('credentials', e.target.value)}
              placeholder="Occupational Therapist"
            />
          </Label>
          <Label className="block">
            <span className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">AHPRA registration</span>
            <Input
              value={profile.ahpra_registration ?? ''}
              onChange={(e) => update('ahpra_registration', e.target.value)}
              placeholder="OCC0001234"
            />
          </Label>
          <Label className="block">
            <span className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Contact email</span>
            <Input
              type="email"
              value={profile.contact_email ?? ''}
              onChange={(e) => update('contact_email', e.target.value)}
            />
          </Label>
          <Label className="block">
            <span className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Contact phone (optional)</span>
            <Input
              value={profile.contact_phone ?? ''}
              onChange={(e) => update('contact_phone', e.target.value)}
              placeholder="e.g. 03 9123 4567"
            />
          </Label>
        </div>
      </fieldset>

      {/* Clinic / provider */}
      <fieldset className="space-y-4">
        <legend className="text-base font-medium text-foreground">Clinic / provider</legend>
        <p className="text-xs text-muted-foreground -mt-2">
          Appears as the report&rsquo;s provider in the Header section and on
          the DOCX letterhead.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Label className="block sm:col-span-2">
            <span className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Clinic / provider name</span>
            <Input
              value={profile.clinic_name ?? ''}
              onChange={(e) => update('clinic_name', e.target.value)}
              placeholder="e.g. Horizon Health Australia"
            />
          </Label>
          <Label className="block">
            <span className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">ABN (optional)</span>
            <Input
              value={profile.clinic_abn ?? ''}
              onChange={(e) => update('clinic_abn', e.target.value)}
            />
          </Label>
          <Label className="block">
            <span className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">NDIS provider # (optional)</span>
            <Input
              value={profile.ndis_provider_number ?? ''}
              onChange={(e) => update('ndis_provider_number', e.target.value)}
            />
          </Label>
          <Label className="block sm:col-span-2">
            <span className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Clinic address (optional)</span>
            <Input
              value={profile.clinic_address ?? ''}
              onChange={(e) => update('clinic_address', e.target.value)}
              placeholder="Street, suburb, state, postcode"
            />
          </Label>
        </div>
      </fieldset>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={save.kind === 'saving' || !userId}>
          {save.kind === 'saving' ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Saving…
            </>
          ) : (
            'Save changes'
          )}
        </Button>
        {save.kind === 'saved' && (
          <span className="inline-flex items-center gap-1 text-sm text-emerald-700">
            <CheckCircle2 size={14} /> Saved
          </span>
        )}
        {save.kind === 'error' && (
          <span className="inline-flex items-center gap-1 text-sm text-amber-700">
            <AlertTriangle size={14} /> {save.message}
          </span>
        )}
      </div>
    </form>
  )
}
