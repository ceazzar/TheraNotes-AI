'use client'

import { useRef, useEffect, useCallback, useState } from 'react'

interface UseAutoSaveOptions {
  save: () => Promise<void>
  debounceMs?: number
}

export function useAutoSave({ save, debounceMs = 1500 }: UseAutoSaveOptions) {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const dirtyRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const saveRef = useRef(save)
  saveRef.current = save

  const flush = useCallback(async () => {
    if (!dirtyRef.current) return
    dirtyRef.current = false
    clearTimeout(timerRef.current)
    setSaveStatus('saving')
    try {
      await saveRef.current()
      setSaveStatus('saved')
    } catch {
      dirtyRef.current = true
      setSaveStatus('idle')
    }
  }, [])

  const markDirty = useCallback(() => {
    dirtyRef.current = true
    setSaveStatus('idle')
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

  return { markDirty, flush, saveStatus }
}
