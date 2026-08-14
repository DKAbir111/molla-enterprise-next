import { NextResponse } from 'next/server'
import { withAuth } from '@/server/http/route'
import { parseBody } from '@/server/http/input'
import { updateTeamMemberSchema } from '@/server/schemas/misc'
import { removeTeamMember, updateTeamMember } from '@/server/services/users'

export const PATCH = withAuth<{ memberId: string }>(async (req, { params, user }) => {
  const dto = await parseBody(req, updateTeamMemberSchema)
  return NextResponse.json(await updateTeamMember(user.userId, params.memberId, dto))
})

export const DELETE = withAuth<{ memberId: string }>(async (_req, { params, user }) => {
  return NextResponse.json(await removeTeamMember(user.userId, params.memberId))
})
