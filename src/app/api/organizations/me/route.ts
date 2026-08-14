import { NextResponse } from 'next/server'
import { withAuth } from '@/server/http/route'
import { findMyOrganization } from '@/server/services/organizations'

export const GET = withAuth(async (_req, { user }) => {
  return NextResponse.json(await findMyOrganization(user.userId))
})
