'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error('Unhandled error:', error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4">
      <Sparkles size={24} className="text-muted-foreground" />
      <h1 className="text-xl font-semibold text-foreground">
        Something went wrong
      </h1>
      <p className="max-w-md text-center text-sm text-muted-foreground">
        An unexpected error occurred. Please try again, or return to the home
        page if the problem persists.
      </p>
      <div className="mt-2 flex gap-3">
        <Button variant="default" size="sm" onClick={() => unstable_retry()}>
          Try again
        </Button>
        <Link
          href="/generate"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
        >
          Back to Generate
        </Link>
      </div>
    </div>
  )
}
