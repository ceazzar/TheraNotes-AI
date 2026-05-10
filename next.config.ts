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
}

export default nextConfig
