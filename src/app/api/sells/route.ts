import { NextResponse } from 'next/server'
import { withAuth } from '@/server/http/route'
import { parseBody } from '@/server/http/input'
import { createSellSchema } from '@/server/schemas/sells'
import { createSell, listSells } from '@/server/services/sells'

export const GET = withAuth(async (_req, { user }) => {
  return NextResponse.json(await listSells(user.organizationId))
})

export const POST = withAuth(async (req, { user }) => {
  const dto = await parseBody(req, createSellSchema)
  return NextResponse.json(await createSell(user.organizationId, dto))
})
