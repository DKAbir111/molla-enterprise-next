import { NextResponse } from 'next/server'
import { withAuth } from '@/server/http/route'
import { parseQuery } from '@/server/http/input'
import { dashboardQuerySchema } from '@/server/schemas/misc'
import { getDashboard } from '@/server/services/dashboard'

export const GET = withAuth(async (req, { user }) => {
  const options = parseQuery(req, dashboardQuerySchema)
  return NextResponse.json(await getDashboard(user.organizationId, options))
})
