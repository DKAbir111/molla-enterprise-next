import { NextResponse } from 'next/server'
import { withAuth } from '@/server/http/route'
import { parseBody } from '@/server/http/input'
import { updateBuyItemsSchema } from '@/server/schemas/buys'
import { updateBuyItems } from '@/server/services/buys'

export const PUT = withAuth<{ id: string }>(async (req, { params, user }) => {
  const { items } = await parseBody(req, updateBuyItemsSchema)
  return NextResponse.json(await updateBuyItems(user.organizationId, params.id, items))
})
