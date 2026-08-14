import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { errorBody } from '@/server/http/errors'
import { sendDailyDigest } from '@/server/services/alerts-digest'

/**
 * Scheduled entry point for the daily alerts digest.
 *
 * Unlike every other route this one has no user behind it, so it authenticates
 * with a shared secret instead of a bearer token. Vercel Cron sends
 * `Authorization: Bearer $CRON_SECRET`; the schedule itself lives in
 * `vercel.json`.
 *
 * It is a public URL, so without the check anyone could trigger a mailout to
 * every organization at will.
 */

// The digest walks every opted-in organization, which takes longer than the
// default budget once there are more than a handful.
export const maxDuration = 60
export const dynamic = 'force-dynamic'

/** Constant-time compare, so a wrong secret cannot be guessed byte by byte. */
function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

function authorize(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET
  // Refuse rather than run unguarded when the secret was never configured.
  if (!expected) return false

  const header = req.headers.get('authorization') ?? ''
  const provided = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!provided) return false

  return secretMatches(provided, expected)
}

export async function GET(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json(errorBody(401, 'Unauthorized'), { status: 401 })
  }

  try {
    const result = await sendDailyDigest()
    console.log('[digest] finished:', result)
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error('[digest] run failed:', error)
    return NextResponse.json(errorBody(500, 'Digest failed'), { status: 500 })
  }
}
