'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Bold, Italic, Heading2, List, Sparkles, ArrowRight, X } from 'lucide-react'
import { useEditorRef, useEditorSelection, type PlateEditor } from 'platejs/react'

export function EditorToolbar() {
  const editor = useEditorRef() as PlateEditor & { insertText: (text: string) => void; tf: { toggleMark: (mark: string) => void; toggleBlock: (type: string) => void } }
  const selection = useEditorSelection()
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const [showRefine, setShowRefine] = useState(false)
  const [refineText, setRefineText] = useState('')
  const [isRefining, setIsRefining] = useState(false)
  const [refinedResult, setRefinedResult] = useState<string | null>(null)
  const selectedTextRef = useRef('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!selection) {
      if (!showRefine) setPosition(null)
      return
    }

    const domSelection = window.getSelection()
    if (!domSelection || domSelection.isCollapsed) {
      if (!showRefine) setPosition(null)
      return
    }

    const range = domSelection.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    if (rect.width < 5) {
      if (!showRefine) setPosition(null)
      return
    }

    selectedTextRef.current = domSelection.toString()
    setPosition({
      top: rect.top + window.scrollY - 48,
      left: Math.max(12, rect.left + rect.width / 2 - 140),
    })
  }, [selection, showRefine])

  useEffect(() => {
    if (showRefine) inputRef.current?.focus()
  }, [showRefine])

  const handleRefine = useCallback(async () => {
    const text = selectedTextRef.current
    if (!text || !refineText) return

    setIsRefining(true)
    setRefinedResult(null)

    try {
      const res = await fetch('/api/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedText: text,
          instruction: refineText || 'Improve this text',
        }),
      })

      if (!res.ok || !res.body) throw new Error('Refine failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let result = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        result += decoder.decode(value, { stream: true })
        setRefinedResult(result)
      }
    } catch {
      setRefinedResult(null)
    } finally {
      setIsRefining(false)
    }
  }, [refineText])

  const acceptRefinement = useCallback(() => {
    if (!refinedResult) return
    editor.insertText(refinedResult)
    setRefinedResult(null)
    setShowRefine(false)
    setRefineText('')
    setPosition(null)
  }, [editor, refinedResult])

  const rejectRefinement = useCallback(() => {
    setRefinedResult(null)
    setShowRefine(false)
    setRefineText('')
  }, [])

  if (!position) return null

  // Show refinement result with accept/reject
  if (refinedResult) {
    return (
      <div
        className="tn-refine-result tn-fade-up"
        style={{
          position: 'fixed',
          top: position.top,
          left: position.left,
          zIndex: 60,
          background: 'white',
          border: '1px solid var(--tn-line)',
          borderRadius: 8,
          padding: '12px 16px',
          maxWidth: 500,
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        }}
      >
        <p style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 10 }}>
          {refinedResult}
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            className="tn-btn tn-btn-outline tn-btn-xs"
            onClick={rejectRefinement}
          >
            Reject
          </button>
          <button
            className="tn-btn tn-btn-primary tn-btn-xs"
            onClick={acceptRefinement}
          >
            Accept
          </button>
        </div>
      </div>
    )
  }

  // Show refine input
  if (showRefine) {
    return (
      <div
        className="tn-refine-panel tn-fade-up"
        style={{
          position: 'fixed',
          top: position.top,
          left: position.left,
          zIndex: 60,
        }}
      >
        <Sparkles size={13} className="flex-shrink-0" style={{ color: 'var(--tn-accent)' }} />
        <input
          ref={inputRef}
          className="tn-refine-input"
          placeholder='Improve this text — e.g. "add specific frequency"'
          value={refineText}
          onChange={(e) => setRefineText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRefine()
            if (e.key === 'Escape') {
              setShowRefine(false)
              setRefineText('')
            }
          }}
          disabled={isRefining}
        />
        <button
          className="tn-refine-send"
          onClick={handleRefine}
          disabled={isRefining}
        >
          {isRefining ? '...' : <ArrowRight size={13} />}
        </button>
      </div>
    )
  }

  // Show formatting toolbar
  return (
    <div
      className="tn-sel-toolbar tn-fade-up"
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 60,
      }}
    >
      <button
        className="tn-sel-btn"
        title="Bold"
        onMouseDown={(e) => {
          e.preventDefault()
          editor.tf.toggleMark('bold')
        }}
      >
        <Bold size={14} />
      </button>
      <button
        className="tn-sel-btn"
        title="Italic"
        onMouseDown={(e) => {
          e.preventDefault()
          editor.tf.toggleMark('italic')
        }}
      >
        <Italic size={14} />
      </button>
      <button
        className="tn-sel-btn"
        title="Heading 2"
        onMouseDown={(e) => {
          e.preventDefault()
          editor.tf.toggleBlock('h2')
        }}
      >
        <Heading2 size={14} />
      </button>
      <button
        className="tn-sel-btn"
        title="Bullet List"
        onMouseDown={(e) => {
          e.preventDefault()
          editor.tf.toggleBlock('ul')
        }}
      >
        <List size={14} />
      </button>
      <span className="tn-sel-sep" />
      <button
        className="tn-sel-btn tn-sel-refine"
        title="Refine with AI"
        onMouseDown={(e) => {
          e.preventDefault()
          setShowRefine(true)
        }}
      >
        <Sparkles size={13} /> Refine
      </button>
    </div>
  )
}
