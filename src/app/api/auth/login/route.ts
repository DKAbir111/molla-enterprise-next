import { NextResponse } from 'next/server'
import { withPublic } from '@/server/http/route'
import { parseBody } from '@/server/http/input'
import { clientIp, userAgent } from '@/server/http/client-info'
import { loginSchema } from '@/server/schemas/auth'
import { login } from '@/server/services/auth'

export const POST = withPublic(async (req) => {
  const dto = await parseBody(req, loginSchema)
  const result = await login(dto, { ipAddress: clientIp(req), userAgent: userAgent(req) })
  return NextResponse.json(result)
})
