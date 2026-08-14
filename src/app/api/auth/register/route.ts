import { NextResponse } from 'next/server'
import { withPublic } from '@/server/http/route'
import { parseBody } from '@/server/http/input'
import { registerSchema } from '@/server/schemas/auth'
import { register } from '@/server/services/auth'

export const POST = withPublic(async (req) => {
  const dto = await parseBody(req, registerSchema)
  return NextResponse.json(await register(dto))
})
