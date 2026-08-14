import { NextResponse } from 'next/server'
import { withAuth } from '@/server/http/route'
import { parseBody } from '@/server/http/input'
import { updateSellSchema } from '@/server/schemas/sells'
import { getSell, updateSell } from '@/server/services/sells'

export const GET = withAuth<{ id: string }>(async (_req, { params, user }) => {
  return NextResponse.json(await getSell(user.organizationId, params.id))
})

export const PATCH = withAuth<{ id: string }>(async (req, { params, user }) => {
  const dto = await parseBody(req, updateSellSchema)
  return NextResponse.json(await updateSell(user.organizationId, params.id, dto))
})
