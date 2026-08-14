import { NextResponse } from 'next/server'
import { withAuth } from '@/server/http/route'
import { parseBody } from '@/server/http/input'
import { updateSellItemsSchema } from '@/server/schemas/sells'
import { updateSellItems } from '@/server/services/sells'

export const PUT = withAuth<{ id: string }>(async (req, { params, user }) => {
  const { items } = await parseBody(req, updateSellItemsSchema)
  return NextResponse.json(await updateSellItems(user.organizationId, params.id, items))
})
