import { NextResponse } from 'next/server'
import { withAuth } from '@/server/http/route'
import { listSnoozes } from '@/server/services/alerts'

export const GET = withAuth(async (_req, { user }) => {
  return NextResponse.json(await listSnoozes(user.organizationId))
})
