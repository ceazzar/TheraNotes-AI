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
 * PHI hygiene:
 * - 24h TTL: drafts older than the TTL are dropped on mount.
 * - Per-user key: drafts do not restore across different authenticated users.
 * - The caller may provide `redact` for highly sensitive deployments, but the
 *   default /generate experience preserves the full intake so refreshes do not
 *   wipe participant details mid-session.
 * - Schema v=2; older entries are silently discarded.
 *
 * Design choices:
 * - Debounced 400ms — typing feels instant, save fires once user pauses.
 * - Per-user key — drafts don't leak between accounts on shared machines.
 * - clear() must be called on successful submit so the next visit starts fresh.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

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
  /** Called after a successful local save. */
  onSave?: (savedAt: Date) => void
  /** Skip restore (e.g., if state is mid-generation). Defaults to false. */
  skipRestore?: boolean
  /** Debounce in ms. Defaults to 400. */
  debounceMs?: number
  /** Drop drafts older than this. Defaults to 24h. */
  ttlMs?: number
  /**
   * Optional redactor — called with the current state immediately before
   * persistence. Return a copy with PHI / sensitive fields zeroed out.
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
  onSave,
}: UseFormDraftOptions<T>): { clear: () => void; ready: boolean } {
  const restoredKeyRef = useRef<string | null>(null)
  const [readyKey, setReadyKey] = useState<string | null>(null)
  const onRestoreRef = useRef(onRestore)
  const onSaveRef = useRef(onSave)
  const redactRef = useRef(redact)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const key = userId ? `${storageKey}:${userId}` : null
  const ready = Boolean(key && readyKey === key)

  useEffect(() => {
    onRestoreRef.current = onRestore
  }, [onRestore])

  useEffect(() => {
    onSaveRef.current = onSave
  }, [onSave])

  useEffect(() => {
    redactRef.current = redact
  }, [redact])

  // Restore once on mount (and again if userId becomes known).
  useEffect(() => {
    if (skipRestore || restoredKeyRef.current === key) return
    if (!key) return
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(key)
      if (!raw) {
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
      restoredKeyRef.current = key
      queueMicrotask(() => {
        setReadyKey((current) => (current === key ? current : key))
      })
    }
  }, [key, skipRestore, ttlMs])

  // Save on every state change (debounced). Don't save until restore has run
  // — otherwise we'd race-overwrite the saved draft with empty initial state.
  useEffect(() => {
    if (!key || restoredKeyRef.current !== key) return
    if (typeof window === 'undefined') return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      try {
        // Apply caller-supplied redaction (e.g. strip participant name /
        // NDIS# / DOB / address) so PHI doesn't sit in localStorage.
        const safeState = redactRef.current ? redactRef.current(state) : state
        const savedAt = new Date()
        const payload: StoredDraft<T> = {
          state: safeState,
          savedAt: savedAt.toISOString(),
          v: 2,
        }
        window.localStorage.setItem(key, JSON.stringify(payload))
        onSaveRef.current?.(savedAt)
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

  return { clear, ready }
}
