import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4">
      <Sparkles size={24} className="text-muted-foreground" />
      <h1 className="text-xl font-semibold text-foreground">Page not found</h1>
      <p className="max-w-md text-center text-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/generate"
        className={cn(buttonVariants({ variant: 'default', size: 'sm' }), 'mt-2')}
      >
        Back to Generate
      </Link>
    </div>
  )
}
