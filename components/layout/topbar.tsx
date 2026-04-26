'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { UserMenu } from './user-menu'

const navItems = [
  { label: 'Generate', href: '/generate' },
  { label: 'Reports', href: '/reports' },
  { label: 'Settings', href: '/settings' },
]

export function Topbar() {
  const pathname = usePathname()

  return (
    <header className="tn-topbar">
      <Link href="/generate" className="tn-brand">
        <span className="tn-brand-mark">
          <Sparkles size={16} />
        </span>
        TheraNotes
      </Link>

      <nav className="tn-nav">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href === '/generate' && pathname === '/') ||
            (item.href === '/reports' && pathname.startsWith('/report'))
          return (
            <Link
              key={item.href}
              href={item.href}
              className="tn-nav-item"
              data-active={isActive ? 'true' : undefined}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="tn-nav-right">
        <UserMenu />
      </div>
    </header>
  )
}
