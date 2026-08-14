import { NextResponse } from 'next/server'
import { withAuth } from '@/server/http/route'
import { parseBody } from '@/server/http/input'
import { createPaymentSchema } from '@/server/schemas/payments'
import { payVendor } from '@/server/services/payments'

/** Money paid out to a vendor. */
export const POST = withAuth(async (req, { user }) => {
  const dto = await parseBody(req, createPaymentSchema)
  return NextResponse.json(await payVendor(user.organizationId, dto))
})
