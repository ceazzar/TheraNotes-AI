'use client'

/**
 * useFormDraft — localStorage autosave for the /generate intake form.
 *
 * Why: clinician QA review verified `localStorage.length === 0` after
 * navigation away from /generate. A 5-10 minute intake gets wiped on any
 * refresh, tab close, or accidental nav. This hook persists the form state
 * on every change (debounced) and offers an explicit restore so the page
 * can render from server defaults first, then hydrate the draft with a
 * "draft restored" toast.
 *
 * Round-2 NEW-9 — PHI hygiene:
 * - 24h TTL: drafts older than the TTL are dropped on mount.
 * - `redact`: caller-supplied function that strips the most-sensitive
 *   identity fields (participant name, NDIS#, DOB, address) from the
 *   snapshot BEFORE it's written to localStorage. Those fields are
 *   typically retyped from a referral every time, so the autosave doesn't
 *   need to remember them — and on a shared workstation, the next user
 *   shouldn't be able to read them via DevTools.
 * - Schema bumped to v=2; v=1 entries are silently discarded.
 *
 * Design choices:
 * - Debounced 400ms — typing feels instant, save fires once user pauses.
 * - Per-user key — drafts don't leak between accounts on shared machines.
 * - clear() must be called on successful submit so the next visit starts fresh.
 */

import { useCallback, useEffect, useRef } from 'react'

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

interface UseFormDraftOptions<T> {
  /** Stable key prefix; final key becomes `${storageKey}:${userId}`. */
  storageKey: string
  /** Distinguish drafts per user (e.g. Supabase user.id). Pass undefined to disable. */
  userId: string | undefined
  /** Current form state. Saved on every change. */
  state: T
  /** Called once on mount with restored draft + saved-at timestamp, if any. */
  onRestore: (draft: T, savedAt: Date) => void
  /** Skip restore (e.g., if state is mid-generation). Defaults to false. */
  skipRestore?: boolean
  /** Debounce in ms. Defaults to 400. */
  debounceMs?: number
  /** Drop drafts older than this. Defaults to 24h. */
  ttlMs?: number
  /**
   * Optional redactor — called with the current state immediately before
   * persistence. Return a copy with PHI / sensitive fields zeroed out.
   * Identity-class fields (participant name, NDIS#, DOB, address) should
   * always be redacted because they're high-value PII that re-typing from
   * a referral takes seconds.
   */
  redact?: (state: T) => T
}

interface StoredDraft<T> {
  state: T
  savedAt: string
  v: 2
}

export function useFormDraft<T>({
  storageKey,
  userId,
  state,
  onRestore,
  skipRestore = false,
  debounceMs = 400,
  ttlMs = DEFAULT_TTL_MS,
  redact,
}: UseFormDraftOptions<T>): { clear: () => void } {
  const restoredRef = useRef(false)
  const onRestoreRef = useRef(onRestore)
  onRestoreRef.current = onRestore
  const redactRef = useRef(redact)
  redactRef.current = redact
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const key = userId ? `${storageKey}:${userId}` : null

  // Restore once on mount (and again if userId becomes known).
  useEffect(() => {
    if (skipRestore || restoredRef.current || !key) return
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(key)
      if (!raw) {
        restoredRef.current = true
        return
      }
      const parsed = JSON.parse(raw) as StoredDraft<T>
      // Reject anything that isn't the current schema version. v=1 entries
      // were the un-redacted PHI-bearing version; quietly drop them.
      if (!parsed || parsed.v !== 2 || !parsed.state) {
        try { window.localStorage.removeItem(key) } catch {}
        return
      }
      const savedAt = new Date(parsed.savedAt)
      const ageMs = Date.now() - savedAt.getTime()
      if (ageMs > ttlMs) {
        // Drop expired drafts so a clinician returning to a shared
        // workstation a day later doesn't restore stale clinical context.
        try { window.localStorage.removeItem(key) } catch {}
        return
      }
      onRestoreRef.current(parsed.state, savedAt)
    } catch {
      // Corrupt draft — drop it silently.
      try {
        window.localStorage.removeItem(key)
      } catch {}
    } finally {
      restoredRef.current = true
    }
  }, [key, skipRestore, ttlMs])

  // Save on every state change (debounced). Don't save until restore has run
  // — otherwise we'd race-overwrite the saved draft with empty initial state.
  useEffect(() => {
    if (!key || !restoredRef.current) return
    if (typeof window === 'undefined') return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      try {
        // Apply caller-supplied redaction (e.g. strip participant name /
        // NDIS# / DOB / address) so PHI doesn't sit in localStorage.
        const safeState = redactRef.current ? redactRef.current(state) : state
        const payload: StoredDraft<T> = {
          state: safeState,
          savedAt: new Date().toISOString(),
          v: 2,
        }
        window.localStorage.setItem(key, JSON.stringify(payload))
      } catch {
        // Storage quota exceeded or denied — degrade silently.
      }
    }, debounceMs)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [key, state, debounceMs])

  const clear = useCallback(() => {
    if (!key || typeof window === 'undefined') return
    try {
      window.localStorage.removeItem(key)
    } catch {}
  }, [key])

  return { clear }
}
