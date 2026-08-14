import { NextResponse } from 'next/server'
import { withAuth } from '@/server/http/route'
import { parseBody, parseQuery } from '@/server/http/input'
import { createDryingGainSchema, dryingGainQuerySchema } from '@/server/schemas/misc'
import { createDryingGain, listDryingGains } from '@/server/services/drying-gains'

export const GET = withAuth(async (req, { user }) => {
  const { productId } = parseQuery(req, dryingGainQuerySchema)
  return NextResponse.json(await listDryingGains(user.organizationId, productId))
})

export const POST = withAuth(async (req, { user }) => {
  const dto = await parseBody(req, createDryingGainSchema)
  return NextResponse.json(await createDryingGain(user.organizationId, dto))
})
