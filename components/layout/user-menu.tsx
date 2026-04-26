'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function UserMenu() {
  const [email, setEmail] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setEmail(user.email)
    })
  }, [supabase])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    if (!open) return

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  const handleSignOut = useCallback(async () => {
    setOpen(false)
    await supabase.auth.signOut()
    router.replace('/login')
    router.refresh()
  }, [router, supabase])

  const initials = email ? email.slice(0, 2).toUpperCase() : '?'

  return (
    <div className="tn-user-menu" ref={menuRef}>
      <button
        type="button"
        className="tn-avatar"
        onClick={() => setOpen((value) => !value)}
        aria-label="User menu"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="tn-avatar-initials">{initials}</span>
      </button>

      {open && (
        <div className="tn-user-dropdown" role="menu">
          <div className="tn-user-dropdown-header">
            <User size={14} />
            <span className="tn-user-dropdown-email">
              {email ?? 'Unknown user'}
            </span>
          </div>
          <div className="tn-user-dropdown-divider" />
          <button
            type="button"
            className="tn-user-dropdown-item"
            onClick={handleSignOut}
            role="menuitem"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
