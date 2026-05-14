'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FileText, Settings, Sparkles } from 'lucide-react'
import { UserMenu } from './user-menu'

const railItems = [
  { href: '/generate', label: 'Create FCA', icon: Sparkles },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/settings', label: 'Settings', icon: Settings },
]

function isActivePath(pathname: string, href: string) {
  if (href === '/generate') return pathname === '/' || pathname === '/generate'
  if (href === '/reports') {
    return pathname.startsWith('/reports') || pathname.startsWith('/workspace')
  }
  return pathname === href
}

export function AppRail() {
  const pathname = usePathname()

  return (
    <aside className="tn-app-rail" aria-label="TheraNotes navigation">
      <Link href="/generate" className="tn-app-mark" aria-label="TheraNotes home">
        T
      </Link>
      <nav className="tn-app-rail-nav">
        {railItems.map((item) => {
          const Icon = item.icon
          const active = isActivePath(pathname, item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className="tn-app-rail-item"
              data-active={active ? 'true' : undefined}
              aria-current={active ? 'page' : undefined}
              aria-label={item.label}
              title={item.label}
            >
              <Icon size={16} />
            </Link>
          )
        })}
      </nav>
      <div className="tn-app-rail-account">
        <UserMenu />
      </div>
    </aside>
  )
}
