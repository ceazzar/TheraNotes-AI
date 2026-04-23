'use client'

import type { UIMessage } from 'ai'
import {
  ChatContainerRoot,
  ChatContainerContent,
  ChatContainerScrollAnchor,
} from '@/components/ui/chat-container'
import {
  Message,
  MessageAvatar,
  MessageContent,
} from '@/components/ui/message'
import { Loader } from '@/components/ui/loader'

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((p) => p.type === 'text')
    .map((p) => p.text)
    .join('')
}

interface ToolInvocationInfo {
  toolName: string
  state: string
  result?: unknown
}

function getToolInvocations(message: UIMessage): ToolInvocationInfo[] {
  return message.parts
    .filter((p) => p.type === 'tool-invocation')
    .map((p) => {
      const invocation = (p as unknown as { toolInvocation: ToolInvocationInfo }).toolInvocation
      return invocation
    })
}

function ToolStatus({ invocation }: { invocation: ToolInvocationInfo }) {
  const { toolName, state, result } = invocation

  const labels: Record<string, string> = {
    generate_report: 'Generating FCA report',
    revise_section: 'Revising section',
    get_report_status: 'Checking report status',
  }

  const label = labels[toolName] ?? toolName

  if (state === 'call' || state === 'partial-call') {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-secondary p-3">
        <Loader variant="typing" size="sm" />
        <span className="text-sm text-muted-foreground">{label}...</span>
      </div>
    )
  }

  if (state === 'result' && result) {
    const r = result as Record<string, unknown>

    if (toolName === 'generate_report' && r.sectionsGenerated) {
      return (
        <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-3 space-y-1">
          <p className="text-sm font-medium text-green-800 dark:text-green-200">
            Report generated — {String(r.sectionsGenerated)}/{String(r.totalSections)} sections
          </p>
          {Array.isArray(r.results) && (
            <ul className="text-xs text-green-700 dark:text-green-300 space-y-0.5">
              {r.results.map((line: string, i: number) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          )}
        </div>
      )
    }

    if (toolName === 'generate_report' && r.error) {
      return (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3">
          <p className="text-sm text-red-800 dark:text-red-200">
            Generation failed: {String(r.error)}
          </p>
        </div>
      )
    }

    if (toolName === 'revise_section' && r.revised) {
      return (
        <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Revised: {String(r.sectionTitle)}
          </p>
        </div>
      )
    }

    return null
  }

  return null
}

interface MessageListProps {
  messages: UIMessage[]
  status: 'submitted' | 'streaming' | 'ready' | 'error'
}

export function MessageList({ messages, status }: MessageListProps) {
  const isGenerating = status === 'submitted' || status === 'streaming'

  if (messages.length === 0 && !isGenerating) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center space-y-2">
          <h2 className="text-lg font-medium text-foreground">
            Start a conversation
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            Paste or describe your clinical notes and I will help generate an
            FCA report section by section.
          </p>
        </div>
      </div>
    )
  }

  return (
    <ChatContainerRoot className="flex-1">
      <ChatContainerContent className="gap-4 p-4 max-w-3xl mx-auto">
        {messages.map((message) => {
          const text = getMessageText(message)
          const toolParts = getToolInvocations(message)
          const hasContent = text || toolParts.length > 0

          if (!hasContent) return null

          return (
            <Message
              key={message.id}
              className={
                message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              }
            >
              <MessageAvatar
                alt={message.role === 'user' ? 'You' : 'AI'}
                fallback={message.role === 'user' ? 'U' : 'AI'}
              />
              <div className="flex flex-col gap-2 min-w-0">
                {text && (
                  <MessageContent
                    markdown={message.role === 'assistant'}
                    className={
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground'
                    }
                  >
                    {text}
                  </MessageContent>
                )}
                {toolParts.map((inv, i) => (
                  <ToolStatus key={i} invocation={inv} />
                ))}
              </div>
            </Message>
          )
        })}
        {isGenerating &&
          messages.length > 0 &&
          messages[messages.length - 1].role === 'user' && (
            <Message>
              <MessageAvatar alt="AI" fallback="AI" />
              <div className="flex items-center gap-2 rounded-lg bg-secondary p-3">
                <Loader variant="typing" size="sm" />
                <span className="text-sm text-muted-foreground">
                  Thinking...
                </span>
              </div>
            </Message>
          )}
        <ChatContainerScrollAnchor />
      </ChatContainerContent>
    </ChatContainerRoot>
  )
}
