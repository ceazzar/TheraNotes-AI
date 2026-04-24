'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { createClient } from '@/lib/supabase/client'
import { SessionSidebar } from '@/components/chat/session-sidebar'
import { MessageList } from '@/components/chat/message-list'
import { ChatInput } from '@/components/chat/chat-input'
import { ReportPanel } from '@/components/report/report-panel'
import { Menu, FileText, MessageSquare, Sparkles } from 'lucide-react'
import template from '@/lib/template.json'

interface SectionTemplate {
  name: string
  auto_generate?: boolean
}

export default function ChatPage() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)
  const [mobileTab, setMobileTab] = useState<'chat' | 'report'>('chat')
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [generationStatus, setGenerationStatus] = useState('')
  const supabase = useMemo(() => createClient(), [])
  const lastUserMessageRef = useRef<string>('')

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

  const triggerGeneration = useCallback(
    async (sid: string, clinicalNotes: string) => {
      setIsGeneratingReport(true)
      setGenerationStatus('Starting report generation...')

      try {
        const sections = (template.sections as SectionTemplate[]).filter(
          (s) => !s.auto_generate
        )
        let reportId: string | null = null

        for (let i = 0; i < sections.length; i++) {
          const section = sections[i]
          setGenerationStatus(
            `Generating section ${i + 1}/${sections.length}: ${section.name}...`
          )

          const res: Response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: sid,
              reportId,
              sectionId: section.name,
              clinicalNotes,
            }),
          })

          if (res.ok) {
            const data: { reportId: string } = await res.json()
            reportId = data.reportId
          }
        }

        setGenerationStatus('Report complete!')
      } catch {
        setGenerationStatus('Generation encountered an error')
      } finally {
        setTimeout(() => {
          setIsGeneratingReport(false)
          setGenerationStatus('')
        }, 3000)
      }
    },
    []
  )

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
      setShowMobileSidebar(false)
    }
  }, [supabase, setMessages])

  const loadSession = useCallback(
    async (id: string) => {
      setSessionId(id)
      setInput('')
      setShowMobileSidebar(false)

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

    lastUserMessageRef.current = input

    const lowerInput = input.toLowerCase()
    const wantsGeneration =
      lowerInput.includes('generate') ||
      lowerInput.includes('create the report') ||
      lowerInput.includes('write the report') ||
      lowerInput.includes('produce the report')

    const text = input
    setInput('')
    sendMessage({ text })

    if (wantsGeneration && activeSessionId) {
      triggerGeneration(activeSessionId, input)
    }
  }, [input, sessionId, supabase, sendMessage, triggerGeneration])

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex md:hidden items-center justify-between p-3 border-b border-[#E2E8F0] bg-white shrink-0 w-full absolute top-0 left-0 right-0 z-30">
        <button
          onClick={() => setShowMobileSidebar(!showMobileSidebar)}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F1F5F9]"
        >
          <Menu className="size-4" />
        </button>
        <div className="flex-1 min-w-0 px-3">
          <div className="text-[13px] font-semibold text-[#0F172A] truncate text-center">
            TheraNotes AI
          </div>
          {isGeneratingReport && (
            <div className="flex items-center justify-center gap-1 text-[10.5px] text-[#3B82F6]">
              <span className="h-[5px] w-[5px] rounded-full bg-[#3B82F6] animate-pulse" />
              Generating
            </div>
          )}
        </div>
        {/* Mobile tabs */}
        <div className="flex rounded-lg border border-[#E2E8F0] overflow-hidden">
          <button
            onClick={() => setMobileTab('chat')}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium ${
              mobileTab === 'chat'
                ? 'bg-[#0F172A] text-white'
                : 'bg-white text-[#64748B]'
            }`}
          >
            <MessageSquare className="size-3" />
            Chat
          </button>
          <button
            onClick={() => setMobileTab('report')}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium ${
              mobileTab === 'report'
                ? 'bg-[#0F172A] text-white'
                : 'bg-white text-[#64748B]'
            }`}
          >
            <FileText className="size-3" />
            Report
          </button>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {showMobileSidebar && (
        <div className="absolute inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowMobileSidebar(false)}
          />
          <div className="relative z-10 h-full w-[268px]">
            <SessionSidebar
              currentSessionId={sessionId}
              onSelectSession={loadSession}
              onNewSession={createSession}
            />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <SessionSidebar
          currentSessionId={sessionId}
          onSelectSession={loadSession}
          onNewSession={createSession}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Main content area */}
      <div className="flex flex-1 flex-col min-w-0 md:flex-row">
        {/* Chat panel — 40% on desktop */}
        <div
          className={`flex flex-col border-r border-[#E2E8F0] ${
            mobileTab === 'report' ? 'hidden md:flex' : 'flex'
          } md:w-[40%] md:min-w-[380px] pt-[52px] md:pt-0`}
          style={{ background: '#FAF9F5' }}
        >
          {/* Chat sub-header */}
          <div className="hidden md:flex items-center gap-2 border-b border-[#E2E8F0] bg-white px-5 py-2.5 text-xs text-[#64748B]">
            <MessageSquare className="size-[13px]" />
            <span className="flex-1 font-medium">Conversation</span>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            <MessageList messages={messages} status={status} />
            {isGeneratingReport && generationStatus && (
              <div className="mx-4 mb-2 flex items-center gap-2 rounded-lg border border-[#DBEAFE] bg-[#EFF6FF] p-3 text-[12.5px] font-medium text-[#2563EB]">
                <div
                  className="h-4 w-4 shrink-0 rounded-full border-2 border-[#3B82F6]"
                  style={{
                    borderTopColor: 'transparent',
                    animation: 'tn-spin 0.8s linear infinite',
                  }}
                />
                {generationStatus}
              </div>
            )}
            <ChatInput
              value={input}
              onChange={setInput}
              onSubmit={onSubmit}
              isLoading={isGenerating || isGeneratingReport}
            />
          </div>
        </div>

        {/* Report panel — 60% on desktop */}
        <div
          className={`flex-1 overflow-hidden ${
            mobileTab === 'chat' ? 'hidden md:block' : 'block'
          } pt-[52px] md:pt-0`}
          style={{ background: '#F5F4F0' }}
        >
          <ReportPanel sessionId={sessionId} />
        </div>
      </div>

      {/* Mobile floating AI button (visible on report tab) */}
      {mobileTab === 'report' && (
        <button
          onClick={() => setMobileTab('chat')}
          className="fixed bottom-6 right-4 z-40 md:hidden flex items-center gap-2 rounded-full border-0 px-5 py-3 text-[13.5px] font-medium text-white shadow-[0_10px_25px_-5px_rgba(15,23,42,0.4),inset_0_1px_0_rgba(255,255,255,0.1)]"
          style={{ background: '#0F172A' }}
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-[#3B82F6] to-[#2563EB]">
            <Sparkles className="size-3 text-white" />
          </div>
          Ask AI
        </button>
      )}
    </>
  )
}
