import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
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
  // Round-3 ESC-8: HSTS already shipped via Vercel default (2y). The other
  // four mechanical headers (X-Frame-Options, X-Content-Type-Options,
  // Referrer-Policy, Permissions-Policy) are non-controversial and have no
  // application-level dependencies, so we ship them now. CSP is deferred —
  // it has known interactions with shadcn/Radix inline styles + Plate.js
  // editor + Supabase realtime that need a tightening pass before going on.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
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
