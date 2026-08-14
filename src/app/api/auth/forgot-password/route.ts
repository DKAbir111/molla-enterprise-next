import { NextResponse } from 'next/server'
import { withPublic } from '@/server/http/route'
import { parseBody } from '@/server/http/input'
import { forgotPasswordSchema } from '@/server/schemas/auth'
import { forgotPassword } from '@/server/services/auth'

export const POST = withPublic(async (req) => {
  const dto = await parseBody(req, forgotPasswordSchema)
  return NextResponse.json(await forgotPassword(dto))
})
