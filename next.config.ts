import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin()

const nextConfig: NextConfig = {
  images: {
    // Uploads live on Cloudinary; nothing is served from the app's own disk.
    remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com' }],
  },
  // Type errors fail the build. The split-repo version suppressed these, which
  // meant a broken build shipped and only broke at runtime — the API lives in
  // this project now, so a type error here is a 500 in production.
  typescript: {
    ignoreBuildErrors: false,
  },
  // Still skipped, because the UI carried over roughly twenty pre-existing lint
  // errors (unused imports, mostly) that predate this project and were not part
  // of the port. Worth clearing, then flipping this to false.
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default withNextIntl(nextConfig)
