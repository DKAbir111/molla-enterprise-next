import { NextResponse } from 'next/server'
import { withAuth } from '@/server/http/route'
import { parseBody } from '@/server/http/input'
import { createPaymentSchema } from '@/server/schemas/payments'
import { receiveFromCustomer } from '@/server/services/payments'

/** Money received. Applied oldest-invoice-first unless a sellId is given. */
export const POST = withAuth(async (req, { user }) => {
  const dto = await parseBody(req, createPaymentSchema)
  return NextResponse.json(await receiveFromCustomer(user.organizationId, dto))
})
