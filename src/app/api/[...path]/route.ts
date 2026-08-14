import { NextResponse } from 'next/server'
import { errorBody } from '@/server/http/errors'

/**
 * JSON 404 for any unmatched `/api/*` path.
 *
 * Without this the request falls through to the `[locale]` segment and the
 * caller gets a full HTML error page — so a typo'd endpoint surfaces in the
 * client as a JSON parse failure rather than the 404 it actually is.
 *
 * Static and nested routes are matched before a catch-all, so this only ever
 * sees paths nothing else claimed.
 */
function notFound() {
  return NextResponse.json(errorBody(404, 'Not Found'), { status: 404 })
}

export const GET = notFound
export const POST = notFound
export const PUT = notFound
export const PATCH = notFound
export const DELETE = notFound
export const HEAD = notFound
export const OPTIONS = notFound
