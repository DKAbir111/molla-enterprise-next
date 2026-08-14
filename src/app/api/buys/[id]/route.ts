import { NextResponse } from 'next/server'
import { withAuth } from '@/server/http/route'
import { parseBody } from '@/server/http/input'
import { updateBuySchema } from '@/server/schemas/buys'
import { getBuy, updateBuy } from '@/server/services/buys'

export const GET = withAuth<{ id: string }>(async (_req, { params, user }) => {
  return NextResponse.json(await getBuy(user.organizationId, params.id))
})

export const PATCH = withAuth<{ id: string }>(async (req, { params, user }) => {
  const dto = await parseBody(req, updateBuySchema)
  return NextResponse.json(await updateBuy(user.organizationId, params.id, dto))
})
