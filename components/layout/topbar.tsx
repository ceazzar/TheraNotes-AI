'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sparkles } from 'lucide-react'

const navItems = [
  { label: 'Generate', href: '/generate' },
  { label: 'Reports', href: '/assessments' },
  { label: 'Clients', href: '#' },
  { label: 'Settings', href: '/settings' },
]

export function Topbar() {
  const pathname = usePathname()

  return (
    <header className="tn-topbar">
      {/* Brand */}
      <Link href="/generate" className="tn-brand">
        <span className="tn-brand-mark">
          <Sparkles size={16} />
        </span>
        TheraNotes
      </Link>

      {/* Nav links */}
      <nav className="tn-nav">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href === '/generate' && pathname === '/')
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

      {/* Right side */}
      <div className="tn-nav-right">
        <button className="tn-btn tn-btn-outline tn-btn-sm">Upgrade</button>
        <div className="tn-avatar" aria-label="User avatar" />
      </div>
    </header>
  )
}
