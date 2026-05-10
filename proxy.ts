import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

/**
 * Auth middleware. Previous implementation failed OPEN if SUPABASE_URL was
 * missing or contained "placeholder" — a misconfigured deploy would silently
 * bypass the auth gate and serve clinical pages unauthenticated. Now fails
 * closed with a 503 so a broken environment is loudly visible during deploy
 * smoke tests rather than quietly insecure in production.
 *
 * Login and the misconfig page itself are still reachable so a user isn't
 * locked out without explanation.
 */

const PUBLIC_ROUTES = new Set(['/login', '/auth/callback', '/auth/error'])

function isMisconfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  return !url || url.includes('placeholder')
}

export async function proxy(request: NextRequest) {
  if (isMisconfigured()) {
    // Allow login + auth callback through so the user can at least see a
    // helpful page; everything else gets a 503.
    if (PUBLIC_ROUTES.has(request.nextUrl.pathname)) {
      return NextResponse.next()
    }
    return new NextResponse(
      'Service is not configured. SUPABASE_URL is missing or invalid.',
      { status: 503, headers: { 'content-type': 'text/plain' } },
    )
  }
  return await updateSession(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}
