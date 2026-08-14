import { NextResponse } from 'next/server'
import { withAuth } from '@/server/http/route'
import { getAccountsSummary } from '@/server/services/accounts'

export const GET = withAuth(async (_req, { user }) => {
  return NextResponse.json(await getAccountsSummary(user.organizationId))
})
