'use client'

import type { UIMessage } from 'ai'
import { Sparkles } from 'lucide-react'

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((p) => p.type === 'text')
    .map((p) => p.text)
    .join('')
}

interface MessageListProps {
  messages: UIMessage[]
  status: 'submitted' | 'streaming' | 'ready' | 'error'
}

export function MessageList({ messages, status }: MessageListProps) {
  const isGenerating = status === 'submitted' || status === 'streaming'

  if (messages.length === 0 && !isGenerating) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center space-y-4 max-w-[380px]">
          <div className="mx-auto flex h-[60px] w-[60px] items-center justify-center rounded-2xl bg-gradient-to-br from-[#0F172A] to-[#1E293B] text-[#60A5FA] shadow-[0_8px_24px_-8px_rgba(15,23,42,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]">
            <Sparkles className="size-[26px]" />
          </div>
          <div>
            <h2 className="text-[22px] font-semibold tracking-tight text-[#0F172A]">
              Ready when you are
            </h2>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#64748B]">
              Paste your clinical notes, upload a transcript, or dictate your
              session. I&apos;ll generate an NDIS-compliant FCA draft.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
      {messages.map((message) => {
        const text = getMessageText(message)
        if (!text) return null

        if (message.role === 'user') {
          return (
            <div key={message.id} className="flex justify-end">
              <div className="max-w-[88%]">
                <div className="rounded-[14px_14px_4px_14px] bg-[#2563EB] px-3.5 py-3 text-[13.5px] leading-relaxed text-white shadow-[0_1px_2px_rgba(37,99,235,0.2)]">
                  {text}
                </div>
              </div>
            </div>
          )
        }

        return (
          <div key={message.id} className="flex gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#0F172A] to-[#1E293B] text-[#60A5FA] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <Sparkles className="size-3" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="mb-1 text-[11.5px] font-medium text-[#64748B]">
                TheraNotes AI
              </div>
              <div className="text-[13.5px] leading-[1.6] text-[#0F172A]">
                {text}
              </div>
            </div>
          </div>
        )
      })}

      {isGenerating &&
        messages.length > 0 &&
        messages[messages.length - 1].role === 'user' && (
          <div className="flex gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#0F172A] to-[#1E293B] text-[#60A5FA]">
              <Sparkles className="size-3" />
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-[#F1F5F9] px-3 py-2">
              <div
                className="h-4 w-4 rounded-full border-2 border-[#3B82F6]"
                style={{
                  borderTopColor: 'transparent',
                  animation: 'tn-spin 0.8s linear infinite',
                }}
              />
              <span className="text-[12.5px] text-[#64748B]">Thinking…</span>
            </div>
          </div>
        )}
    </div>
  )
}
