import { NextResponse } from 'next/server'
import { withAuth } from '@/server/http/route'
import { parseQuery } from '@/server/http/input'
import { paymentQuerySchema } from '@/server/schemas/payments'
import { listForBuy, listForCustomer, listForSell } from '@/server/services/payments'

/**
 * One filter at a time, checked in the same order the NestJS controller used.
 * A request with no filter returns an empty list rather than every payment in
 * the organization — this endpoint backs detail panels, not a global ledger.
 */
export const GET = withAuth(async (req, { user }) => {
  const { sellId, buyId, customerId } = parseQuery(req, paymentQuerySchema)

  if (sellId) return NextResponse.json(await listForSell(user.organizationId, sellId))
  if (buyId) return NextResponse.json(await listForBuy(user.organizationId, buyId))
  if (customerId) return NextResponse.json(await listForCustomer(user.organizationId, customerId))

  return NextResponse.json([])
})
