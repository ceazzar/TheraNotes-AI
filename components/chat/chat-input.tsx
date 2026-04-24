'use client'

import { useRef } from 'react'
import { Send, Paperclip, Mic, FileText } from 'lucide-react'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  isLoading: boolean
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  isLoading,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSubmit()
    }
  }

  const adjustHeight = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }

  return (
    <div className="shrink-0 border-t border-[#E2E8F0] bg-white px-5 py-3.5">
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_0_0_3px_rgba(59,130,246,0.06)] focus-within:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_0_0_3px_rgba(59,130,246,0.12)] transition-shadow">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            adjustHeight()
          }}
          onKeyDown={handleKeyDown}
          placeholder="Paste clinical notes, dictate, or ask a follow-up…"
          disabled={isLoading}
          rows={2}
          className="w-full resize-none border-0 bg-transparent px-1.5 py-1 text-[13.5px] leading-relaxed text-[#0F172A] outline-none placeholder:text-[#94A3B8]"
          style={{ minHeight: 48 }}
        />
        <div className="mt-1 flex items-center gap-1.5 border-t border-[#F1F5F9] pt-2">
          <button
            className="flex h-7 w-7 items-center justify-center rounded-md text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#475569] transition-colors"
            title="Attach notes file"
          >
            <Paperclip className="size-[15px]" />
          </button>
          <button
            className="flex h-7 w-7 items-center justify-center rounded-md text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#475569] transition-colors"
            title="Voice record"
          >
            <Mic className="size-[15px]" />
          </button>
          <button
            className="flex h-7 w-7 items-center justify-center rounded-md text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#475569] transition-colors"
            title="Templates"
          >
            <FileText className="size-[15px]" />
          </button>
          <div className="flex-1" />
          <span className="hidden sm:inline text-[11px] text-[#94A3B8]">
            <kbd className="rounded border border-[#E2E8F0] bg-[#F1F5F9] px-1.5 py-0.5 font-mono text-[10px] text-[#64748B]">
              ⌘
            </kbd>{' '}
            <kbd className="rounded border border-[#E2E8F0] bg-[#F1F5F9] px-1.5 py-0.5 font-mono text-[10px] text-[#64748B]">
              ↵
            </kbd>{' '}
            to send
          </span>
          <button
            onClick={(e) => {
              e.preventDefault()
              onSubmit()
            }}
            disabled={isLoading || !value.trim()}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2563EB] text-white transition-colors hover:bg-[#1D4ED8] disabled:bg-[#CBD5E1] disabled:cursor-not-allowed"
          >
            <Send className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
