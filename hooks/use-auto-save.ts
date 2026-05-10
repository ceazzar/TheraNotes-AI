'use client'

import { useRef, useEffect, useCallback, useState } from 'react'

/**
 * Save state. The 'error' state is critical: previously the catch path
 * fell back to 'idle' which renders identically to "saved" on the chip,
 * so the editor lied to the clinician on a Supabase outage.
 * Round-2 NEW-8.
 */
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface UseAutoSaveOptions {
  save: () => Promise<void>
  debounceMs?: number
}

export function useAutoSave({ save, debounceMs = 1500 }: UseAutoSaveOptions) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [lastError, setLastError] = useState<string | null>(null)
  const dirtyRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const saveRef = useRef(save)

  useEffect(() => {
    saveRef.current = save
  }, [save])

  const flush = useCallback(async () => {
    if (!dirtyRef.current) return
    dirtyRef.current = false
    clearTimeout(timerRef.current)
    setSaveStatus('saving')
    setLastError(null)
    try {
      await saveRef.current()
      setSaveStatus('saved')
    } catch (err) {
      // Re-mark dirty so the next markDirty / next attempt picks up the
      // unsaved changes. Surface the error explicitly — never silently
      // fall back to 'idle' (which renders as "Saved" on the footer chip).
      dirtyRef.current = true
      setLastError(err instanceof Error ? err.message : 'Save failed.')
      setSaveStatus('error')
    }
  }, [])

  const markDirty = useCallback(() => {
    dirtyRef.current = true
    // Don't clobber an 'error' status — keep showing the failure until the
    // next save succeeds or fails afresh. Otherwise typing immediately
    // after a failure makes the chip flash to "idle/Saved" misleadingly.
    setSaveStatus((prev) => (prev === 'error' ? prev : 'idle'))
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(flush, debounceMs)
  }, [debounceMs, flush])

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) e.preventDefault()
    }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('beforeunload', onBeforeUnload)
      clearTimeout(timerRef.current)
    }
  }, [flush])

  return { markDirty, flush, saveStatus, lastError }
}
