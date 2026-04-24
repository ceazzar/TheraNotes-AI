'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'rounded-full border-[var(--tn-line)] bg-[var(--tn-bg-raised)]',
            'text-[var(--tn-ink)] text-[13px] font-medium',
            'hover:border-[var(--tn-muted-3)]'
          )}
        >
          Upgrade
        </Button>
        <div className="tn-avatar" aria-label="User avatar" />
      </div>
    </header>
  )
}
