'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { createClient } from '@/lib/supabase/client'
import { SessionSidebar } from '@/components/chat/session-sidebar'
import { MessageList } from '@/components/chat/message-list'
import { ChatInput } from '@/components/chat/chat-input'
import { ReportPanel } from '@/components/report/report-panel'
import { Menu, FileText } from 'lucide-react'

export default function ChatPage() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [showSidebar, setShowSidebar] = useState(false)
  const [showReport, setShowReport] = useState(false)
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
      setShowSidebar(false)
    }
  }, [supabase, setMessages])

  const loadSession = useCallback(
    async (id: string) => {
      setSessionId(id)
      setInput('')
      setShowSidebar(false)

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

    await supabase.from('messages').insert({
      session_id: activeSessionId,
      role: 'user',
      content: input,
    })

    // Update session title if it's still "New Session"
    const { data: session } = await supabase
      .from('sessions')
      .select('title')
      .eq('id', activeSessionId)
      .single()

    if (session?.title === 'New Session') {
      await supabase
        .from('sessions')
        .update({ title: input.slice(0, 60) })
        .eq('id', activeSessionId)
    }

    const text = input
    setInput('')
    sendMessage({ text })
  }, [input, sessionId, supabase, sendMessage])

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex md:hidden items-center justify-between p-3 border-b border-border bg-background shrink-0">
        <button
          onClick={() => { setShowSidebar(!showSidebar); setShowReport(false) }}
          className="p-2 rounded-md hover:bg-accent"
        >
          <Menu className="size-5" />
        </button>
        <span className="text-sm font-semibold">TheraNotes AI</span>
        <button
          onClick={() => { setShowReport(!showReport); setShowSidebar(false) }}
          className="p-2 rounded-md hover:bg-accent"
        >
          <FileText className="size-5" />
        </button>
      </div>

      {/* Mobile overlay panels */}
      {showSidebar && (
        <div className="absolute inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowSidebar(false)} />
          <div className="relative z-10 h-full w-72">
            <SessionSidebar
              currentSessionId={sessionId}
              onSelectSession={loadSession}
              onNewSession={createSession}
            />
          </div>
        </div>
      )}

      {showReport && (
        <div className="absolute inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowReport(false)} />
          <div className="relative z-10 h-full w-80 ml-auto">
            <ReportPanel sessionId={sessionId} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <SessionSidebar
          currentSessionId={sessionId}
          onSelectSession={loadSession}
          onNewSession={createSession}
        />
      </div>

      {/* Chat area (always visible) */}
      <div className="flex flex-1 flex-col min-w-0">
        <MessageList messages={messages} status={status} />
        <ChatInput
          value={input}
          onChange={setInput}
          onSubmit={onSubmit}
          isLoading={isGenerating}
        />
      </div>

      {/* Desktop report panel */}
      <div className="hidden md:block">
        <ReportPanel sessionId={sessionId} />
      </div>
    </>
  )
}
