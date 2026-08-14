import { NextResponse } from 'next/server'
import { withAuth } from '@/server/http/route'
import { parseBody } from '@/server/http/input'
import { createTeamMemberSchema } from '@/server/schemas/misc'
import { createTeamMember, listTeamMembers } from '@/server/services/users'

export const GET = withAuth(async (_req, { user }) => {
  return NextResponse.json(await listTeamMembers(user.userId))
})

export const POST = withAuth(async (req, { user }) => {
  const dto = await parseBody(req, createTeamMemberSchema)
  return NextResponse.json(await createTeamMember(user.userId, dto))
})
