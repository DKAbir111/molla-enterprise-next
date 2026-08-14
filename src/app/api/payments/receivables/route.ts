import { NextResponse } from 'next/server'
import { withAuth } from '@/server/http/route'
import { receivables } from '@/server/services/payments'

export const GET = withAuth(async (_req, { user }) => {
  return NextResponse.json(await receivables(user.organizationId))
})
