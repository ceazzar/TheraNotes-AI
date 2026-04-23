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
          if (!text) return null

          return (
            <Message
              key={message.id}
              className={
                message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              }
            >
              <MessageAvatar
                src={
                  message.role === 'user'
                    ? '/user-avatar.png'
                    : '/assistant-avatar.png'
                }
                alt={message.role === 'user' ? 'You' : 'AI'}
                fallback={message.role === 'user' ? 'U' : 'AI'}
              />
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
            </Message>
          )
        })}
        {isGenerating &&
          !messages.some(
            (m) => m.role === 'assistant' && getMessageText(m)
          ) && (
            <Message>
              <MessageAvatar
                src="/assistant-avatar.png"
                alt="AI"
                fallback="AI"
              />
              <div className="flex items-center gap-2 rounded-lg bg-secondary p-3">
                <Loader variant="typing" size="sm" />
                <span className="text-sm text-muted-foreground">
                  Generating...
                </span>
              </div>
            </Message>
          )}
        <ChatContainerScrollAnchor />
      </ChatContainerContent>
    </ChatContainerRoot>
  )
}
