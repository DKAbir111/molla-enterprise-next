import { NextResponse } from 'next/server'
import { withAuth } from '@/server/http/route'
import { parseQuery } from '@/server/http/input'
import { alertQuerySchema } from '@/server/schemas/alerts'
import { getAlerts } from '@/server/services/alerts'

/**
 * The notification badge polls this.
 *
 * The NestJS build also exposed an SSE `/alerts/stream` that pushed the same
 * payload every 15 seconds. It is gone: a Next.js deployment bills for the
 * whole time a connection is held open, and a stream that only re-queries on a
 * timer is a poll wearing a costume. The client now polls this endpoint on the
 * same interval and gets the same data for a fraction of the runtime.
 */
export const GET = withAuth(async (req, { user }) => {
  const { limit } = parseQuery(req, alertQuerySchema)
  return NextResponse.json(await getAlerts(user.organizationId, limit))
})
