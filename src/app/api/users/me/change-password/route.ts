import { NextResponse } from 'next/server'
import { withAuth } from '@/server/http/route'
import { parseBody } from '@/server/http/input'
import { changePasswordSchema } from '@/server/schemas/misc'
import { changePassword } from '@/server/services/users'

export const POST = withAuth(async (req, { user }) => {
  const dto = await parseBody(req, changePasswordSchema)
  return NextResponse.json(
    await changePassword(user.userId, dto.currentPassword, dto.newPassword),
  )
})
