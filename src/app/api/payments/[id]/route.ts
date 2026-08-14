import { NextResponse } from 'next/server'
import { withAuth } from '@/server/http/route'
import { removePayment } from '@/server/services/payments'

export const DELETE = withAuth<{ id: string }>(async (_req, { params, user }) => {
  return NextResponse.json(await removePayment(user.organizationId, params.id))
})
