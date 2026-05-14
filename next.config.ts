import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['@napi-rs/canvas'],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Day-4: report detail moved from /workspace/<id> -> /reports/<id> so the
  // URL hierarchy mirrors the IA (list at /reports, detail at /reports/<id>).
  async redirects() {
    return [
      {
        source: '/workspace/:id',
        destination: '/reports/:id',
        permanent: true,
      },
    ]
  },
  // Round-3 ESC-8 / UA-1: HSTS ships via Vercel default (2y). The other
  // four mechanical headers (X-Frame-Options, X-Content-Type-Options,
  // Referrer-Policy, Permissions-Policy) shipped overnight as zero-risk.
  // CSP is the structural defence against the XSS-to-auth-cookie-takeover
  // path. Starting permissive: 'unsafe-inline' for scripts AND styles. The
  // scripts allowance is the 2-day observation window — once Sentry confirms
  // no legitimate inline scripts beyond Next.js's bootstrap, tighten to
  // nonce + 'strict-dynamic' via proxy.ts. The style allowance is
  // structural (Plate.js, Radix Floating UI, shadcn, next/image all inject
  // inline style attributes; a style-nonce migration would require
  // re-plumbing every CSS-in-JS library).
  //
  // Includes 5 hardening directives the previous CSP-less posture left on
  // the floor: object-src 'none' (blocks Flash-style content), base-uri
  // 'self' (blocks base-tag hijack), form-action 'self' (blocks form
  // exfiltration), frame-ancestors 'none' (clickjacking defence stronger
  // than X-Frame-Options; both ship for legacy browsers), and
  // upgrade-insecure-requests (auto-upgrades any http:// asset).
  //
  // connect-src includes wss://*.supabase.co because supabase-js v2 opens
  // a WebSocket for token refresh/presence even when the app doesn't use
  // .channel() explicitly.
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' blob: data: https://*.supabase.co",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openai.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      'upgrade-insecure-requests',
    ].join('; ')

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
        ],
      },
    ]
  },
}

export default nextConfig
