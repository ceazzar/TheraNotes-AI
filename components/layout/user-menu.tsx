'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function UserMenu() {
  const [email, setEmail] = useState<string | null>(null)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setEmail(user.email)
    })
  }, [supabase])

  const handleSignOut = useCallback(async () => {
    // Round-2 NEW-9: clear any in-progress drafts (which may contain PHI)
    // from localStorage on logout. Belt-and-braces alongside the per-key
    // 24h TTL inside useFormDraft.
    if (typeof window !== 'undefined') {
      try {
        const toRemove: string[] = []
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i)
          if (k && k.startsWith('theranotes:')) toRemove.push(k)
        }
        for (const k of toRemove) window.localStorage.removeItem(k)
      } catch {
        // localStorage may be denied (private mode, quota); ignore.
      }
    }
    await supabase.auth.signOut()
    router.replace('/login')
    router.refresh()
  }, [router, supabase])

  const initials = email ? email.slice(0, 2).toUpperCase() : '?'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" aria-label="User menu" />}
      >
        <span className="tn-avatar-initials">{initials}</span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8}>
        {/* DropdownMenuLabel wraps Base UI MenuPrimitive.GroupLabel which requires
            a parent MenuGroup context — without this wrapper, the menu throws
            "MenuGroupRootContext is missing" on open. */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-2 font-normal">
            <User size={14} />
            <span className="text-xs">{email ?? 'Unknown user'}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut size={14} />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
