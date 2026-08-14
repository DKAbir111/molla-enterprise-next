import { NextResponse } from 'next/server'
import { withAuth } from '@/server/http/route'
import { parseQuery } from '@/server/http/input'
import { loginActivityQuerySchema } from '@/server/schemas/misc'
import { getLoginActivity } from '@/server/services/users'

export const GET = withAuth(async (req, { user }) => {
  const { limit } = parseQuery(req, loginActivityQuerySchema)
  return NextResponse.json(await getLoginActivity(user.userId, limit))
})
