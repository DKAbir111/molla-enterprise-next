import { NextResponse } from 'next/server'
import { withAuth } from '@/server/http/route'
import { disableOrganization } from '@/server/services/organizations'

export const POST = withAuth<{ id: string }>(async (_req, { params, user }) => {
  return NextResponse.json(await disableOrganization(user.userId, params.id))
})
