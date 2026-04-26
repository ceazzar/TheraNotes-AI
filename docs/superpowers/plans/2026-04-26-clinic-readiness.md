# TheraNotes AI - Clinic Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make TheraNotes AI production-ready for daily clinic use by OTs generating NDIS Functional Capacity Assessments.

**Architecture:** All changes are additive to the existing Next.js 16 + Supabase + Plate.js stack. Tasks are ordered by impact: P0 blockers first (auth, error handling), then P1 UX gaps (report lifecycle, deletion, mobile), then P2 polish. Each task produces a self-contained commit.

**Tech Stack:** Next.js 16.2.4 (Turbopack), Supabase Auth + RLS, React 19, Plate.js, shadcn/ui (Base-UI primitives), Tailwind CSS v4, custom `tn-*` design system, Lucide icons.

---

## File Map

| Task | Creates | Modifies |
|------|---------|----------|
| 1. Logout + User Menu | `components/layout/user-menu.tsx` | `components/layout/topbar.tsx`, `app/globals.css` |
| 2. Error Boundaries | `app/error.tsx`, `app/not-found.tsx` | - |
| 3. Report Not Found | - | `components/report/report-viewer.tsx` |
| 4. Workspace Not Found | - | `components/workspace/workspace-layout.tsx` |
| 5. Report Delete RLS | `supabase/migrations/005_reports_delete_policy.sql` | - |
| 6. Report Delete API | `app/api/reports/[id]/route.ts` | - |
| 7. Report Delete UI | - | `components/reports/report-card.tsx`, `components/reports/report-list.tsx`, `app/globals.css` |
| 8. Stale Report Cleanup | - | `components/reports/report-list.tsx` |
| 9. Remove Upgrade Button | - | `components/layout/topbar.tsx` |
| 10. Mobile Form | - | `app/globals.css` |
| 11. Custom 404 Page | - | `app/not-found.tsx` (created in Task 2, refined here) |
| 12. Report Viewer Loading | - | `components/report/report-viewer.tsx` |
| 13. Workspace Loading | - | `components/workspace/workspace-layout.tsx` |

---

## P0 - Hard Blockers

### Task 1: Logout + User Dropdown Menu

The topbar has a placeholder avatar div and no auth awareness. This task adds a dropdown menu with the user's email and a sign-out action. The dropdown uses Base-UI primitives already in the project (no new dependencies).

**Files:**
- Create: `components/layout/user-menu.tsx`
- Modify: `components/layout/topbar.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Create the UserMenu component**

Create `components/layout/user-menu.tsx`:

```tsx
'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut, User } from 'lucide-react'

export function UserMenu() {
  const [email, setEmail] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setEmail(user.email)
    })
  }, [supabase])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }, [supabase, router])

  const initials = email
    ? email.slice(0, 2).toUpperCase()
    : '?'

  return (
    <div className="tn-user-menu" ref={menuRef}>
      <button
        className="tn-avatar"
        onClick={() => setOpen((v) => !v)}
        aria-label="User menu"
        aria-expanded={open}
      >
        <span className="tn-avatar-initials">{initials}</span>
      </button>

      {open && (
        <div className="tn-user-dropdown">
          <div className="tn-user-dropdown-header">
            <User size={14} />
            <span className="tn-user-dropdown-email">{email ?? 'Unknown'}</span>
          </div>
          <div className="tn-user-dropdown-divider" />
          <button className="tn-user-dropdown-item" onClick={handleSignOut}>
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Update the Topbar to use UserMenu**

Replace the static avatar div and remove the Upgrade button in `components/layout/topbar.tsx`:

```tsx
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
```

- [ ] **Step 3: Add UserMenu CSS to globals.css**

Append after the existing `.tn-avatar` block (around line 255) in `app/globals.css`:

```css
.tn-user-menu {
  position: relative;
}
.tn-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #d9d5cc, #bdb8ad);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  padding: 0;
  transition: opacity 0.15s ease;
}
.tn-avatar:hover {
  opacity: 0.8;
}
.tn-avatar-initials {
  font-size: 10px;
  font-weight: 600;
  color: var(--tn-ink);
  letter-spacing: 0.02em;
}
.tn-user-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 200px;
  background: var(--tn-bg-raised);
  border: 1px solid var(--tn-line);
  border-radius: var(--tn-radius);
  box-shadow: var(--tn-shadow-float);
  z-index: 50;
  padding: 4px;
}
.tn-user-dropdown-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  font-size: 13px;
  color: var(--tn-muted-1);
}
.tn-user-dropdown-email {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tn-user-dropdown-divider {
  height: 1px;
  background: var(--tn-line-soft);
  margin: 4px 0;
}
.tn-user-dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  font-size: 13px;
  color: var(--tn-ink);
  background: none;
  border: none;
  border-radius: calc(var(--tn-radius) - 2px);
  cursor: pointer;
  text-align: left;
  transition: background 0.1s ease;
}
.tn-user-dropdown-item:hover {
  background: var(--tn-chip);
}
```

- [ ] **Step 4: Verify in browser**

Run: `npm run dev -- --port 3000`

1. Navigate to `http://localhost:3000/generate`
2. Click the avatar circle in the top-right
3. Verify dropdown shows user email + "Sign out" option
4. Click "Sign out"
5. Verify redirect to `/login`
6. Log back in, verify redirect to `/generate`

- [ ] **Step 5: Commit**

```bash
git add components/layout/user-menu.tsx components/layout/topbar.tsx app/globals.css
git commit -m "feat: add user dropdown menu with sign-out

Replaces the static avatar placeholder in the topbar with a clickable
dropdown showing the user's email and a sign-out action. Removes the
non-functional Upgrade button.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 2: Global Error Boundary + Not Found Page

No `error.tsx` or `not-found.tsx` exist anywhere in the app. Any unhandled React error shows a white screen. Any invalid route shows the default Next.js 404.

**Files:**
- Create: `app/error.tsx`
- Create: `app/not-found.tsx`

- [ ] **Step 1: Create the global error boundary**

Create `app/error.tsx`:

```tsx
'use client'

import { useEffect } from 'react'
import { Sparkles } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Unhandled error:', error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4">
      <Sparkles size={24} className="text-muted-foreground" />
      <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
      <p className="text-sm text-muted-foreground text-center max-w-md">
        An unexpected error occurred. Please try again, or return to the home page
        if the problem persists.
      </p>
      <div className="flex gap-3 mt-2">
        <button
          onClick={reset}
          className="tn-btn tn-btn-primary tn-btn-sm"
        >
          Try again
        </button>
        <a href="/generate" className="tn-btn tn-btn-outline tn-btn-sm">
          Back to Generate
        </a>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create the custom 404 page**

Create `app/not-found.tsx`:

```tsx
import Link from 'next/link'
import { Sparkles } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4">
      <Sparkles size={24} className="text-muted-foreground" />
      <h1 className="text-xl font-semibold text-foreground">Page not found</h1>
      <p className="text-sm text-muted-foreground text-center max-w-md">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link href="/generate" className="tn-btn tn-btn-primary tn-btn-sm mt-2">
        Back to Generate
      </Link>
    </div>
  )
}
```

- [ ] **Step 3: Verify in browser**

1. Navigate to `http://localhost:3000/nonexistent-page` - should show branded 404 with TheraNotes styling, not the default Next.js page
2. Verify "Back to Generate" link works

- [ ] **Step 4: Commit**

```bash
git add app/error.tsx app/not-found.tsx
git commit -m "feat: add global error boundary and branded 404 page

Catches unhandled React errors with a recovery UI instead of a white
screen. Replaces the default Next.js 404 with branded TheraNotes
styling and navigation back to the app.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 3: Report Viewer - Handle Missing Reports

The report viewer polls every 3 seconds but never handles `null` from `fetchReport`. A nonexistent report ID shows "Loading report..." forever.

**Files:**
- Modify: `components/report/report-viewer.tsx:46-94`

- [ ] **Step 1: Add a notFound state and timeout**

In `components/report/report-viewer.tsx`, add a `notFound` state and update the fetch effect to detect missing reports:

Replace the state declarations and effect (lines 47-94) with:

```tsx
export function ReportViewer({ reportId }: ReportViewerProps) {
  const [report, setReport] = useState<Report | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  const fetchReport = useCallback(async (): Promise<Report | null> => {
    const { data } = await supabase
      .from('reports')
      .select('id, sections, status, assessment_id, insufficient_data_flags, planner_review')
      .eq('id', reportId)
      .single()

    if (!data) return null

    const sections = { ...((data.sections as Sections) || {}) }
    const flags = (data.insufficient_data_flags as string[]) || []

    for (const flag of flags) {
      if (sections[flag]) {
        sections[flag] = { ...sections[flag], insufficientData: true }
      }
    }

    return {
      id: data.id,
      sections,
      status: data.status,
      assessment_id: data.assessment_id,
      insufficient_data_flags: data.insufficient_data_flags,
      planner_review: (data.planner_review as PlannerReview) ?? null,
    }
  }, [reportId, supabase])

  useEffect(() => {
    let isActive = true
    let failCount = 0

    const refresh = () => {
      void fetchReport().then((nextReport) => {
        if (!isActive) return
        if (nextReport) {
          setReport(nextReport)
          failCount = 0
        } else {
          failCount++
          if (failCount >= 2) setNotFound(true)
        }
      })
    }

    refresh()
    const interval = setInterval(refresh, 3000)
    return () => {
      isActive = false
      clearInterval(interval)
    }
  }, [fetchReport])
```

- [ ] **Step 2: Add the notFound UI**

Replace the loading state in the sections panel (lines 178-184) with:

```tsx
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {notFound && (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <p className="text-sm text-muted-foreground">
                Report not found or you don&apos;t have access.
              </p>
              <Link
                href="/reports"
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
              >
                <ArrowLeft className="size-3.5" />
                Back to Reports
              </Link>
            </div>
          )}

          {!report && !notFound && (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground">
                Loading report...
              </p>
            </div>
          )}
```

Also update the right sidebar to handle notFound (replace lines 216-228):

```tsx
      <div className="w-[35%] border-l border-border">
        {report ? (
          <RevisionChat
            reportId={report.id}
            activeSectionId={activeSectionId}
            activeSectionTitle={activeSectionTitle}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">
              {notFound ? '' : 'Loading...'}
            </p>
          </div>
        )}
      </div>
```

- [ ] **Step 3: Verify in browser**

1. Navigate to `http://localhost:3000/report/nonexistent-uuid-1234` - should show "Report not found" with back link after ~6 seconds (2 failed polls)
2. Navigate to a valid report - should load normally

- [ ] **Step 4: Commit**

```bash
git add components/report/report-viewer.tsx
git commit -m "fix: show 'not found' instead of infinite loading for missing reports

After two consecutive failed fetch attempts (~6 seconds), the report
viewer now shows a clear 'Report not found' message with a link back
to the reports list instead of spinning forever.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 4: Workspace - Handle Missing Reports

Same problem as the report viewer. The workspace loads once but has no fallback for missing reports. The existing code at line 267 already has a "Report not found" path, but the loading state can get stuck if the fetch returns no data.

**Files:**
- Modify: `components/workspace/workspace-layout.tsx:75-90`

- [ ] **Step 1: Check current workspace loading logic**

Read lines 75-90 of `components/workspace/workspace-layout.tsx`. The existing code already sets `loading = false` when no report is found. Verify the fallback UI at line 267 handles this correctly. The current code:

```tsx
if (!reportData) {
  setLoading(false)
  return
}
```

This sets `loading = false` but `report` stays `null`. Check that the render path handles `loading === false && report === null`.

- [ ] **Step 2: Add explicit notFound state for clarity**

In `components/workspace/workspace-layout.tsx`, add a `notFound` state alongside `loading`:

After the existing `const [loading, setLoading] = useState(true)` line, add:

```tsx
const [notFound, setNotFound] = useState(false)
```

In the load effect, where it currently does `if (!reportData) { setLoading(false); return }`, change to:

```tsx
if (!reportData) {
  setNotFound(true)
  setLoading(false)
  return
}
```

Then update the fallback render (around line 267, where it checks `if (!report)`) to:

```tsx
if (loading) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-sm text-muted-foreground">Loading workspace...</p>
    </div>
  )
}

if (!report || notFound) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3">
      <p className="text-sm text-muted-foreground">
        Report not found or you don&apos;t have access.
      </p>
      <a href="/reports" className="tn-btn tn-btn-outline tn-btn-sm">
        Back to Reports
      </a>
    </div>
  )
}
```

- [ ] **Step 3: Verify in browser**

1. Navigate to `http://localhost:3000/workspace/nonexistent-uuid` - should show "Report not found" with back link, not infinite "Loading workspace..."
2. Navigate to a valid workspace - should load normally with editor content

- [ ] **Step 4: Commit**

```bash
git add components/workspace/workspace-layout.tsx
git commit -m "fix: show 'not found' for invalid workspace URLs

Adds explicit notFound state so missing reports display a clear message
with navigation back to the reports list instead of an infinite loading
spinner.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## P1 - Serious Gaps

### Task 5: Add Reports DELETE RLS Policy

The `reports` table has SELECT, INSERT, UPDATE RLS policies but no DELETE policy. Without this, client-side deletes are silently rejected by Supabase.

**Files:**
- Create: `supabase/migrations/005_reports_delete_policy.sql`

- [ ] **Step 1: Create the migration**

Create `supabase/migrations/005_reports_delete_policy.sql`:

```sql
-- Allow users to delete their own reports.
-- The assessments FK uses ON DELETE CASCADE, so deleting a report
-- also cleans up the linked assessment row.
-- The corrections FK uses ON DELETE SET NULL (report_id becomes NULL).
CREATE POLICY reports_delete ON public.reports
  FOR DELETE USING (user_id = (SELECT auth.uid()));
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/005_reports_delete_policy.sql
git commit -m "feat: add RLS delete policy for reports table

Allows authenticated users to delete their own reports. Required
before the delete UI can function.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

Note: This migration needs to be applied to the Supabase database before the delete UI works. Run via `supabase db push` or apply manually in the Supabase SQL editor.

---

### Task 6: Report Delete API Endpoint

Create a server-side DELETE endpoint so the client can delete reports safely with auth verification.

**Files:**
- Create: `app/api/reports/[id]/route.ts`

- [ ] **Step 1: Create the DELETE endpoint**

Create `app/api/reports/[id]/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: report } = await supabase
    .from('reports')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  const { error } = await supabase
    .from('reports')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ deleted: true })
}
```

- [ ] **Step 2: Verify the endpoint compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/api/reports/\[id\]/route.ts
git commit -m "feat: add DELETE /api/reports/[id] endpoint

Server-side endpoint that verifies ownership via Supabase auth before
deleting. Returns 401/404/500 on failure, {deleted: true} on success.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 7: Report Delete UI (Card Context Menu)

Add a delete action to each report card in the reports list. Uses a simple click-to-delete with a confirmation step (the card shows "Delete?" and requires a second click).

**Files:**
- Modify: `components/reports/report-card.tsx`
- Modify: `components/reports/report-list.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Add onDelete prop to ReportCard**

Replace the full `components/reports/report-card.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { FileText, Trash2 } from 'lucide-react'

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: {
    label: 'Draft',
    className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  },
  generating: {
    label: 'Generating',
    className: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  },
  ready: {
    label: 'Ready',
    className: 'bg-green-500/10 text-green-500 border-green-500/20',
  },
  failed: {
    label: 'Failed',
    className: 'bg-red-500/10 text-red-500 border-red-500/20',
  },
}

interface ReportCardProps {
  status: string
  participantName: string | null
  sectionCount: number
  flagCount: number
  updatedAt: string
  onClick: () => void
  onDelete: () => void
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function ReportCard({
  status,
  participantName,
  sectionCount,
  flagCount,
  updatedAt,
  onClick,
  onDelete,
}: ReportCardProps) {
  const [confirming, setConfirming] = useState(false)
  const config = statusConfig[status] ?? statusConfig.draft

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirming) {
      onDelete()
    } else {
      setConfirming(true)
      setTimeout(() => setConfirming(false), 3000)
    }
  }

  return (
    <div className="tn-report-card-wrap">
      <button
        type="button"
        className="w-full text-left"
        onClick={onClick}
      >
        <Card
          className={cn(
            'transition-colors hover:border-primary/50',
            'py-4'
          )}
        >
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <h3 className="font-medium text-sm leading-snug line-clamp-2">
                  {participantName
                    ? `FCA — ${participantName}`
                    : 'FCA Report'}
                </h3>
              </div>
              <Badge variant="outline" className={cn('shrink-0', config.className)}>
                {config.label}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {sectionCount} {sectionCount === 1 ? 'section' : 'sections'}
                {flagCount > 0 && ` · ${flagCount} flags`}
              </span>
              <span>{formatDate(updatedAt)}</span>
            </div>
          </CardContent>
        </Card>
      </button>
      <button
        type="button"
        className={cn('tn-card-delete', confirming && 'tn-card-delete-confirm')}
        onClick={handleDeleteClick}
        aria-label={confirming ? 'Confirm delete' : 'Delete report'}
      >
        {confirming ? (
          <span className="text-xs">Delete?</span>
        ) : (
          <Trash2 size={13} />
        )}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Add delete handler to ReportList**

Replace the full `components/reports/report-list.tsx`:

```tsx
'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ReportCard } from './report-card'

interface ReportRow {
  id: string
  status: string
  sections: Record<string, { title: string; content: string }> | null
  created_at: string
  updated_at: string
  assessment_id: string | null
  planner_review: { flags?: unknown[] } | null
  assessments: { participant_name: string | null }[] | { participant_name: string | null } | null
}

export function ReportList() {
  const [reports, setReports] = useState<ReportRow[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const loadReports = useCallback(async () => {
    const { data, error } = await supabase
      .from('reports')
      .select('id, status, sections, created_at, updated_at, assessment_id, planner_review, assessments(participant_name)')
      .order('updated_at', { ascending: false })

    if (!error && data) {
      setReports(data as unknown as ReportRow[])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  const handleDelete = useCallback(async (id: string) => {
    const res = await fetch(`/api/reports/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setReports((prev) => prev.filter((r) => r.id !== id))
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">Loading reports...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Your Reports</h2>
      </div>

      {reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 px-4">
          <p className="text-sm text-muted-foreground text-center">
            No reports yet. Generate your first report from the{' '}
            <a href="/generate" className="underline hover:text-foreground">Generate</a> page.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((r) => (
            <ReportCard
              key={r.id}
              status={r.status}
              participantName={
                Array.isArray(r.assessments)
                  ? r.assessments[0]?.participant_name ?? null
                  : r.assessments?.participant_name ?? null
              }
              sectionCount={r.sections ? Object.keys(r.sections).length : 0}
              flagCount={r.planner_review?.flags?.length ?? 0}
              updatedAt={r.updated_at}
              onClick={() => router.push(`/report/${r.id}`)}
              onDelete={() => handleDelete(r.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Add delete button CSS to globals.css**

Append to `app/globals.css`:

```css
/* --- Report card delete --- */
.tn-report-card-wrap {
  position: relative;
}
.tn-card-delete {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--tn-muted-2);
  cursor: pointer;
  opacity: 0;
  transition: all 0.15s ease;
  z-index: 2;
}
.tn-report-card-wrap:hover .tn-card-delete {
  opacity: 1;
}
.tn-card-delete:hover {
  background: var(--tn-crit-bg, hsl(0 80% 96%));
  color: var(--tn-crit);
}
.tn-card-delete-confirm {
  opacity: 1;
  width: auto;
  padding: 0 8px;
  background: var(--tn-crit);
  color: white;
  font-weight: 500;
}
.tn-card-delete-confirm:hover {
  background: var(--tn-crit);
  color: white;
  opacity: 0.9;
}
```

- [ ] **Step 4: Verify in browser**

1. Navigate to `http://localhost:3000/reports`
2. Hover over a report card - trash icon should appear top-right
3. Click trash icon - should change to red "Delete?" confirmation
4. Wait 3 seconds without clicking - should revert to trash icon
5. Click trash, then click "Delete?" - card should disappear from list

- [ ] **Step 5: Commit**

```bash
git add components/reports/report-card.tsx components/reports/report-list.tsx app/globals.css
git commit -m "feat: add delete button to report cards

Hover reveals a trash icon; first click shows 'Delete?' confirmation
that auto-reverts after 3 seconds; second click calls DELETE
/api/reports/[id] and removes the card from the list.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 8: Auto-Expire Stale "Generating" Reports

Reports can get stuck in "Generating" status forever if generation fails without updating the status. This marks reports older than 30 minutes in "generating" status as "failed" when the reports list loads.

**Files:**
- Modify: `components/reports/report-list.tsx`

- [ ] **Step 1: Add stale report cleanup to loadReports**

In `components/reports/report-list.tsx`, update the `loadReports` function to detect and fix stale reports:

After the existing `setReports(data as unknown as ReportRow[])` line, add:

```tsx
const loadReports = useCallback(async () => {
  const { data, error } = await supabase
    .from('reports')
    .select('id, status, sections, created_at, updated_at, assessment_id, planner_review, assessments(participant_name)')
    .order('updated_at', { ascending: false })

  if (!error && data) {
    const thirtyMinAgo = Date.now() - 30 * 60 * 1000
    const staleIds: string[] = []

    const cleaned = (data as unknown as ReportRow[]).map((r) => {
      if (r.status === 'generating' && new Date(r.updated_at).getTime() < thirtyMinAgo) {
        staleIds.push(r.id)
        return { ...r, status: 'failed' }
      }
      return r
    })

    if (staleIds.length > 0) {
      await supabase
        .from('reports')
        .update({ status: 'failed' })
        .in('id', staleIds)
    }

    setReports(cleaned)
  }
  setLoading(false)
}, [supabase])
```

- [ ] **Step 2: Verify in browser**

1. Navigate to `http://localhost:3000/reports`
2. Any reports stuck in "Generating" from more than 30 minutes ago should now show as "Failed"
3. Refresh the page - they should stay "Failed" (persisted to database)

- [ ] **Step 3: Commit**

```bash
git add components/reports/report-list.tsx
git commit -m "fix: auto-expire stale 'generating' reports after 30 minutes

When the reports list loads, any report stuck in 'generating' status
for more than 30 minutes is automatically marked as 'failed'. Prevents
zombie reports from accumulating in the UI.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 9: Remove Non-Functional Upgrade Button

Already handled in Task 1 (Topbar rewrite removes the Upgrade button). This task is a no-op if Task 1 is complete.

- [ ] **Step 1: Verify Upgrade button is gone**

Check that `components/layout/topbar.tsx` no longer contains the Upgrade button (removed in Task 1).

---

### Task 10: Mobile-Responsive Generate Form

The 3-column identity row (Participant/NDIS/Assessor) truncates labels at 375px. Stack to 1 column on mobile.

**Files:**
- Modify: `app/globals.css:434-438`

- [ ] **Step 1: Add a media query for the identity row**

In `app/globals.css`, update the `.tn-identity-row` rule (line 434) to stack on mobile:

Replace:
```css
.tn-identity-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  border-bottom: 1px solid var(--tn-line-soft);
}
```

With:
```css
.tn-identity-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  border-bottom: 1px solid var(--tn-line-soft);
}
@media (max-width: 600px) {
  .tn-identity-row {
    grid-template-columns: 1fr;
  }
  .tn-id-field {
    border-right: none;
    border-bottom: 1px solid var(--tn-line-soft);
  }
  .tn-id-field:last-child {
    border-bottom: none;
  }
}
```

- [ ] **Step 2: Verify in browser**

1. Open `http://localhost:3000/generate`
2. Resize browser to < 600px wide (or use DevTools mobile emulation at 375px)
3. The three identity fields should stack vertically, each with full width
4. Labels should be fully visible, not truncated

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "fix: stack generate form fields on mobile

Adds a media query that switches the 3-column identity row to a
single-column layout below 600px. Prevents label truncation on
mobile devices.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## P2 - Polish

### Task 11: Branded 404 (Already Complete)

Handled in Task 2. The `app/not-found.tsx` created there includes TheraNotes branding and navigation.

- [ ] **Step 1: Verify**

Navigate to `http://localhost:3000/some-random-page`. Should show the branded 404 from Task 2.

---

### Task 12: Report Viewer Loading Skeleton

Replace "Loading report..." text with a visual skeleton that matches the report section layout.

**Files:**
- Modify: `components/report/report-viewer.tsx`

- [ ] **Step 1: Add a skeleton loading state**

In `components/report/report-viewer.tsx`, replace the loading state (the `!report && !notFound` block) with a skeleton:

```tsx
{!report && !notFound && (
  <div className="space-y-8 py-4 animate-pulse">
    {[1, 2, 3].map((i) => (
      <div key={i} className="space-y-3">
        <div className="h-5 w-48 rounded bg-muted" />
        <div className="space-y-2">
          <div className="h-3 w-full rounded bg-muted" />
          <div className="h-3 w-full rounded bg-muted" />
          <div className="h-3 w-3/4 rounded bg-muted" />
        </div>
      </div>
    ))}
  </div>
)}
```

Also update the right sidebar loading state:

```tsx
<div className="flex items-center justify-center h-full">
  <p className="text-sm text-muted-foreground">
    {notFound ? '' : 'Loading...'}
  </p>
</div>
```

- [ ] **Step 2: Verify in browser**

1. Navigate to a valid report URL
2. On initial load, should see 3 animated skeleton blocks instead of plain "Loading report..." text
3. Once loaded, skeletons should be replaced by actual report content

- [ ] **Step 3: Commit**

```bash
git add components/report/report-viewer.tsx
git commit -m "feat: add loading skeleton to report viewer

Replaces 'Loading report...' text with animated skeleton blocks that
match the report section layout for a more polished loading experience.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 13: Workspace Loading Skeleton

Replace "Loading workspace..." text with a skeleton that matches the workspace layout (sidebar + editor area).

**Files:**
- Modify: `components/workspace/workspace-layout.tsx`

- [ ] **Step 1: Replace loading state with skeleton**

In `components/workspace/workspace-layout.tsx`, replace the loading return (the `if (loading)` block) with:

```tsx
if (loading) {
  return (
    <div className="tn-ws animate-pulse">
      <aside className="tn-side">
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-4 rounded bg-muted" style={{ width: `${60 + i * 8}%` }} />
          ))}
        </div>
      </aside>
      <main className="tn-ws-main">
        <div className="tn-ws-topbar">
          <div className="h-4 w-32 rounded bg-muted" />
        </div>
        <div className="flex-1 p-8">
          <div className="mx-auto max-w-[820px] space-y-6">
            <div className="h-6 w-64 rounded bg-muted" />
            <div className="space-y-2">
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-3 w-5/6 rounded bg-muted" />
            </div>
            <div className="h-6 w-48 rounded bg-muted mt-8" />
            <div className="space-y-2">
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-3 w-4/6 rounded bg-muted" />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

1. Navigate to a valid workspace URL
2. On initial load, should see a sidebar skeleton + editor area skeleton with pulsing animation
3. Once loaded, skeleton replaced by actual workspace content

- [ ] **Step 3: Commit**

```bash
git add components/workspace/workspace-layout.tsx
git commit -m "feat: add loading skeleton to workspace

Replaces 'Loading workspace...' text with an animated skeleton that
mirrors the sidebar + editor layout structure.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Post-Implementation Checklist

After all tasks are complete:

- [ ] Run `npm run lint` - expect exit 0
- [ ] Run `npx tsc --noEmit` - expect exit 0
- [ ] Run `npm run build` - expect exit 0
- [ ] Browser test: login, generate page, reports list, report viewer, workspace, settings, logout, 404, delete a report
- [ ] Apply migration `005_reports_delete_policy.sql` to Supabase

## Out of Scope (Documented for Future Work)

These items were identified in the audit but are not included in this plan:

1. **API key configuration** - config-only, not a code change
2. **Agent service configuration** - config-only, not a code change
3. **Clinician profile management** - `clinician_profiles` table exists but needs a full profile page (separate feature)
4. **Terms of service / privacy policy** - legal/content work, not engineering
5. **Onboarding flow** - UX design needed before implementation
6. **Dictate / Template buttons** - require speech-to-text and template system (separate features)
