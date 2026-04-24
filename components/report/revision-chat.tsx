'use client'

import { useRef, useEffect } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useMemo } from 'react'
import { Send, MessageSquare } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface RevisionChatProps {
  reportId: string
  activeSectionId: string | null
  activeSectionTitle: string | null
}

export function RevisionChat({
  reportId,
  activeSectionId,
  activeSectionTitle,
}: RevisionChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        body: { reportId, activeSectionId },
      }),
    [reportId, activeSectionId]
  )

  const { messages, input, setInput, sendMessage, status } = useChat({
    transport,
  })

  const isLoading = status === 'submitted' || status === 'streaming'

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage({ text: input })
    setInput('')
  }

  return (
    <div className="flex h-full flex-col bg-muted/30">
      {/* Header */}
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 mb-1">
          <MessageSquare className="size-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">
            Revision Chat
          </span>
        </div>
        {activeSectionId && activeSectionTitle ? (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Focused on:</span>
            <Badge variant="secondary" className="text-xs">
              {activeSectionTitle}
            </Badge>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Click &quot;Revise&quot; on a section to focus the chat
          </p>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <MessageSquare className="size-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              Ask questions about the report or request revisions to specific
              sections.
            </p>
          </div>
        )}
        {messages.map((message) => {
          const isUser = message.role === 'user'
          const text =
            message.parts
              ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
              .map((p) => p.text)
              .join('') || ''

          return (
            <div
              key={message.id}
              className={cn(
                'flex',
                isUser ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                  isUser
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card border border-border text-card-foreground'
                )}
              >
                {text}
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-border px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              activeSectionTitle
                ? `Revise "${activeSectionTitle}"...`
                : 'Ask about the report...'
            }
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !input.trim()}
          >
            <Send className="size-4" />
          </Button>
        </div>
      </form>
    </div>
  )
}
