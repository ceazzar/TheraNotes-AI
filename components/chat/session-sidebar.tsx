'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Session = {
  id: string
  title: string | null
  created_at: string
}

interface SessionSidebarProps {
  currentSessionId: string | null
  onSelectSession: (sessionId: string) => void
  onNewSession: () => void
}

export function SessionSidebar({
  currentSessionId,
  onSelectSession,
  onNewSession,
}: SessionSidebarProps) {
  const [sessions, setSessions] = useState<Session[]>([])
  const supabase = createClient()

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
      .channel('sessions-changes')
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

  return (
    <div className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-muted/30">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-sm font-semibold">Sessions</h2>
        <Button variant="outline" size="sm" onClick={onNewSession}>
          New Chat
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {sessions.length === 0 && (
          <p className="text-xs text-muted-foreground p-2">
            No sessions yet. Start a new chat.
          </p>
        )}
        {sessions.map((session) => (
          <button
            key={session.id}
            onClick={() => onSelectSession(session.id)}
            className={cn(
              'w-full text-left rounded-md px-3 py-2 text-sm transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
              currentSessionId === session.id &&
                'bg-accent text-accent-foreground font-medium'
            )}
          >
            <div className="truncate">
              {session.title || 'Untitled Session'}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {new Date(session.created_at).toLocaleDateString()}
            </div>
          </button>
        ))}
      </div>
      <div className="p-4 border-t border-border">
        <a
          href="/settings"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Settings
        </a>
      </div>
    </div>
  )
}
