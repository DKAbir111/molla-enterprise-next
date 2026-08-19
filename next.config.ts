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
  // The ~28 carried-over lint errors have been cleared, so the build enforces
  // lint again. Keep it that way: unused imports and dead props are how the
  // last set accumulated unnoticed.
  eslint: {
    ignoreDuringBuilds: false,
  },
}

export default withNextIntl(nextConfig)
