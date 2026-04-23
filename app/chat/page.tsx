'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { createClient } from '@/lib/supabase/client'
import { SessionSidebar } from '@/components/chat/session-sidebar'
import { MessageList } from '@/components/chat/message-list'
import { ChatInput } from '@/components/chat/chat-input'
import { ReportPanel } from '@/components/report/report-panel'

export default function ChatPage() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const supabase = useMemo(() => createClient(), [])

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        body: { sessionId },
      }),
    [sessionId]
  )

  const { messages, sendMessage, status, setMessages } = useChat({
    transport,
  })

  const isGenerating = status === 'submitted' || status === 'streaming'

  const createSession = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('sessions')
      .insert({ user_id: user.id, title: 'New Session' })
      .select('id')
      .single()

    if (data) {
      setSessionId(data.id)
      setMessages([])
      setInput('')
    }
  }, [supabase, setMessages])

  const loadSession = useCallback(
    async (id: string) => {
      setSessionId(id)
      setInput('')

      const { data: msgData } = await supabase
        .from('messages')
        .select('id, role, content, created_at')
        .eq('session_id', id)
        .order('created_at', { ascending: true })

      if (msgData) {
        setMessages(
          msgData.map((m) => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            parts: [{ type: 'text' as const, text: m.content }],
          }))
        )
      }
    },
    [supabase, setMessages]
  )

  // Load the most recent session on first mount
  useEffect(() => {
    if (!sessionId) {
      ;(async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return

        const { data: sessions } = await supabase
          .from('sessions')
          .select('id')
          .order('created_at', { ascending: false })
          .limit(1)

        if (sessions && sessions.length > 0) {
          loadSession(sessions[0].id)
        }
      })()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onSubmit = useCallback(async () => {
    if (!input.trim()) return

    let activeSessionId = sessionId
    if (!activeSessionId) {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('sessions')
        .insert({ user_id: user.id, title: input.slice(0, 60) })
        .select('id')
        .single()

      if (data) {
        activeSessionId = data.id
        setSessionId(data.id)
      }
    }

    if (!activeSessionId) return

    // Save user message to DB
    await supabase.from('messages').insert({
      session_id: activeSessionId,
      role: 'user',
      content: input,
    })

    const text = input
    setInput('')
    sendMessage({ text })
  }, [input, sessionId, supabase, sendMessage])

  return (
    <>
      <SessionSidebar
        currentSessionId={sessionId}
        onSelectSession={loadSession}
        onNewSession={createSession}
      />
      <div className="flex flex-1 flex-col min-w-0">
        <MessageList messages={messages} status={status} />
        <ChatInput
          value={input}
          onChange={setInput}
          onSubmit={onSubmit}
          isLoading={isGenerating}
        />
      </div>
      <ReportPanel sessionId={sessionId} />
    </>
  )
}
