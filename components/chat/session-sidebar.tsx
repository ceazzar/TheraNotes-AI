'use client'

import { useEffect, useState, useMemo, useId } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  Plus,
  Search,
  ChevronLeft,
  Settings,
  Sparkles,
} from 'lucide-react'

type Session = {
  id: string
  title: string | null
  created_at: string
}

interface SessionSidebarProps {
  currentSessionId: string | null
  onSelectSession: (sessionId: string) => void
  onNewSession: () => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export function SessionSidebar({
  currentSessionId,
  onSelectSession,
  onNewSession,
  collapsed = false,
  onToggleCollapse,
}: SessionSidebarProps) {
  const [sessions, setSessions] = useState<Session[]>([])
  const supabase = useMemo(() => createClient(), [])
  const instanceId = useId()

  useEffect(() => {
    async function loadSessions() {
      const { data } = await supabase
        .from('sessions')
        .select('id, title, created_at')
        .order('created_at', { ascending: false })

      if (data) setSessions(data)
    }

    loadSessions()

    const channel = supabase
      .channel(`sessions-${instanceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sessions' },
        () => loadSessions()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const todaySessions = sessions.filter((s) => {
    const d = new Date(s.created_at)
    const now = new Date()
    return d.toDateString() === now.toDateString()
  })
  const olderSessions = sessions.filter((s) => {
    const d = new Date(s.created_at)
    const now = new Date()
    return d.toDateString() !== now.toDateString()
  })

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-[#1E293B] transition-all duration-250 ease-in-out shrink-0',
        collapsed ? 'w-16' : 'w-[268px]'
      )}
      style={{ background: '#0F172A', color: '#E2E8F0' }}
    >
      {/* Brand row */}
      <div
        className={cn(
          'flex items-center border-b border-[#1E293B] min-h-[60px]',
          collapsed ? 'justify-center px-0 py-4' : 'justify-between px-4 py-[18px]'
        )}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#3B82F6] to-[#2563EB] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.06),inset_0_1px_0_rgba(255,255,255,0.15)]">
            <Sparkles className="size-3.5" />
          </div>
          {!collapsed && (
            <span className="text-[15px] font-semibold tracking-tight text-[#F8FAFC]">
              TheraNotes{' '}
              <span className="font-medium text-[#60A5FA]">AI</span>
            </span>
          )}
        </div>
        {!collapsed && onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="flex rounded-md p-1 text-[#64748B] hover:text-[#94A3B8]"
          >
            <ChevronLeft className="size-4" />
          </button>
        )}
      </div>

      {/* New session */}
      <div className={cn(collapsed ? 'p-2.5' : 'p-3')}>
        <button
          onClick={onNewSession}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#3B82F6] px-3 py-2 text-[13px] font-medium text-white shadow-[0_1px_2px_rgba(59,130,246,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] hover:bg-[#2563EB] transition-colors"
        >
          <Plus className="size-[15px]" />
          {!collapsed && 'New Session'}
        </button>
      </div>

      {/* Search */}
      {!collapsed && (
        <div className="px-3 pb-3">
          <div className="flex h-8 items-center gap-2 rounded-md border border-[#334155] bg-[#1E293B] px-2.5 text-xs text-[#64748B]">
            <Search className="size-[13px]" />
            <span className="flex-1">Search sessions…</span>
            <kbd className="rounded border border-[#334155] bg-[#0F172A] px-1.5 py-0.5 font-mono text-[10px] text-[#94A3B8]">
              ⌘K
            </kbd>
          </div>
        </div>
      )}

      {/* Today */}
      {!collapsed && todaySessions.length > 0 && (
        <SidebarGroup title="Today" />
      )}
      <div className="px-2 space-y-0.5">
        {todaySessions.map((session) => (
          <SessionItem
            key={session.id}
            session={session}
            active={session.id === currentSessionId}
            collapsed={collapsed}
            onClick={() => onSelectSession(session.id)}
          />
        ))}
      </div>

      {/* Earlier */}
      {!collapsed && olderSessions.length > 0 && (
        <SidebarGroup title="Earlier" />
      )}
      <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
        {olderSessions.map((session) => (
          <SessionItem
            key={session.id}
            session={session}
            active={session.id === currentSessionId}
            collapsed={collapsed}
            onClick={() => onSelectSession(session.id)}
            subtle
          />
        ))}
      </div>

      {/* Footer */}
      <div
        className={cn(
          'flex items-center gap-2.5 border-t border-[#1E293B]',
          collapsed ? 'p-2.5 justify-center' : 'px-3.5 py-3'
        )}
      >
        <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#3B82F6] to-[#1E40AF] text-xs font-semibold text-white">
          U
        </div>
        {!collapsed && (
          <>
            <div className="flex-1 min-w-0">
              <div className="truncate text-[13px] font-medium text-[#F1F5F9]">
                Test User
              </div>
              <div className="text-[11px] text-[#64748B]">Free plan</div>
            </div>
            <a
              href="/settings"
              className="flex rounded p-1 text-[#64748B] hover:text-[#94A3B8] transition-colors"
            >
              <Settings className="size-[15px]" />
            </a>
          </>
        )}
      </div>
    </aside>
  )
}

function SidebarGroup({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-1.5 px-4 pb-1.5 pt-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
      {title}
      <div className="h-px flex-1 bg-[#1E293B]" />
    </div>
  )
}

function SessionItem({
  session,
  active,
  collapsed,
  onClick,
  subtle,
}: {
  session: Session
  active: boolean
  collapsed: boolean
  onClick: () => void
  subtle?: boolean
}) {
  const title = session.title || 'Untitled Session'
  const initials = title
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  if (collapsed) {
    return (
      <button
        onClick={onClick}
        className={cn(
          'mx-auto flex h-11 w-11 items-center justify-center rounded-lg text-xs font-medium transition-colors',
          active
            ? 'border border-[#334155] bg-[#1E293B] text-[#F1F5F9]'
            : 'border border-transparent text-[#94A3B8] hover:bg-[#1E293B]/50'
        )}
      >
        {initials}
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors',
        active
          ? 'border border-[#334155] bg-[#1E293B]'
          : 'border border-transparent hover:bg-[#1E293B]/50'
      )}
    >
      <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-[#3B82F6]" />
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            'truncate text-[13px]',
            active
              ? 'font-medium text-[#F1F5F9]'
              : subtle
                ? 'text-[#94A3B8]'
                : 'text-[#CBD5E1]'
          )}
        >
          {title}
        </div>
      </div>
      <span className="shrink-0 text-[10px] text-[#64748B]">
        {new Date(session.created_at).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        })}
      </span>
    </button>
  )
}
