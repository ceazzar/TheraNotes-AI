import Link from 'next/link'
import { FileQuestion } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Topbar } from '@/components/layout/topbar'
import { cn } from '@/lib/utils'

export default function NotFound() {
  // Round-3 IA-1 / PM-5: round-2 NEW-7 only fixed the in-app workspace 404
  // guard; the global notFound boundary still rendered chromeless. A user
  // who mistypes a URL ended up stranded with only "Back to Generate".
  // Mounting Topbar above the centred card so all 404 paths share the
  // same chrome the rest of the authenticated app does.
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Topbar />
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
        <FileQuestion size={24} className="text-muted-foreground" />
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
    </div>
  )
}
