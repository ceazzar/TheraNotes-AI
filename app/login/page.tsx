'use client'

import { useState, useCallback, useMemo, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Stethoscope, AlertTriangle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * Login page — replaces the stock @supabase/auth-ui-react widget.
 *
 * Why: the visual-craft review flagged the previous widget as the single
 * biggest credibility break — `theme="dark"` rendered against a white page,
 * no brand mark, no clinical-product framing. This component renders a
 * branded two-column layout with the project's tn-* design language and
 * uses Supabase's email/password API directly.
 */

export default function LoginPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      setError(null)
      const trimmedEmail = email.trim()
      if (!trimmedEmail || !password) {
        setError('Email and password are required.')
        return
      }
      setSubmitting(true)
      try {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        })
        if (signInErr) {
          // Map a few common Supabase messages to friendlier copy without
          // leaking detail that could help account enumeration.
          const msg = signInErr.message.toLowerCase()
          if (msg.includes('invalid')) {
            setError('Email or password is incorrect.')
          } else if (msg.includes('email not confirmed')) {
            setError('Please confirm your email before signing in.')
          } else {
            setError(signInErr.message)
          }
          setSubmitting(false)
          return
        }
        router.replace('/generate')
        router.refresh()
      } catch {
        setError('Could not reach the sign-in service. Please try again.')
        setSubmitting(false)
      }
    },
    [email, password, router, supabase],
  )

  return (
    <div className="tn-auth-shell">
      {/* Left: clinical product framing. Hidden on small screens to keep
          the form the primary affordance on mobile. */}
      <aside className="tn-auth-aside" aria-hidden="true">
        <div className="tn-auth-brand">
          <span className="tn-auth-brand-mark">
            <Stethoscope size={18} />
          </span>
          TheraNotes
        </div>
        <h2 className="tn-auth-headline">
          NDIS-grade Functional Capacity Assessments,
          <br />
          drafted in minutes.
        </h2>
        <p className="tn-auth-sub">
          Paste your clinical notes and structured intake. TheraNotes drafts
          all eight report parts in your clinic&rsquo;s voice using your own
          exemplar reports.
        </p>
        <ul className="tn-auth-bullets">
          <li>Database hosted in Supabase ap-southeast-2 (AU). AI processing runs on OpenAI.</li>
          <li>Every draft cites the source notes that produced it.</li>
          <li>Sections gate on intake — Part D waits for WHODAS scores, Part E for participant-stated goals.</li>
        </ul>
      </aside>

      {/* Right: form */}
      <main className="tn-auth-main">
        <div className="tn-auth-card">
          <div className="tn-auth-card-head">
            <span className="tn-auth-brand-mark tn-auth-brand-mark-md">
              <Stethoscope size={16} />
            </span>
            <h1 className="tn-auth-title">Sign in to TheraNotes</h1>
            <p className="tn-auth-card-sub">
              Internal clinician access only.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="tn-auth-form" noValidate>
            <Label className="tn-auth-field">
              <span className="tn-auth-lbl">Email</span>
              <Input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
                placeholder="you@flourishhealth.com.au"
              />
            </Label>

            <Label className="tn-auth-field">
              <span className="tn-auth-lbl">Password</span>
              <Input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
              />
            </Label>

            {error && (
              <div className="tn-auth-error" role="alert">
                <AlertTriangle size={14} />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              className="tn-auth-submit"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

          <p className="tn-auth-footnote">
            Need an account? Ask your practice administrator to invite you.
          </p>
        </div>
      </main>
    </div>
  )
}
