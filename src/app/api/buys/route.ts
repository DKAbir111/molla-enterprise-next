import { NextResponse } from 'next/server'
import { withAuth } from '@/server/http/route'
import { parseBody } from '@/server/http/input'
import { createBuySchema } from '@/server/schemas/buys'
import { createBuy, listBuys } from '@/server/services/buys'

export const GET = withAuth(async (_req, { user }) => {
  return NextResponse.json(await listBuys(user.organizationId))
})

export const POST = withAuth(async (req, { user }) => {
  const dto = await parseBody(req, createBuySchema)
  return NextResponse.json(await createBuy(user.organizationId, dto))
})
