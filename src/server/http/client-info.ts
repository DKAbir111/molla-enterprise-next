import { NextRequest } from 'next/server'

/**
 * The caller's IP as best we can tell.
 *
 * Behind a proxy (Vercel, nginx, Cloudflare) the socket address is the proxy's,
 * so `x-forwarded-for` is the real source — first entry, since each hop appends
 * to the right. Only trust this because the app is always deployed behind a
 * proxy that overwrites the header; a directly-exposed server could be fed
 * anything by the client.
 */
export function clientIp(req: NextRequest): string | undefined {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  return req.headers.get('x-real-ip') ?? undefined
}

export function userAgent(req: NextRequest): string | undefined {
  return req.headers.get('user-agent') ?? undefined
}
