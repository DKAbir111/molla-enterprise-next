import { NextResponse } from 'next/server'
import { withPublic } from '@/server/http/route'
import { parseBody } from '@/server/http/input'
import { resetPasswordSchema } from '@/server/schemas/auth'
import { resetPassword } from '@/server/services/auth'

export const POST = withPublic(async (req) => {
  const dto = await parseBody(req, resetPasswordSchema)
  return NextResponse.json(await resetPassword(dto))
})
