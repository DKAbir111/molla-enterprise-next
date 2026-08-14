import { NextResponse } from 'next/server'
import { withAuth } from '@/server/http/route'
import { deleteTransaction } from '@/server/services/transactions'

export const DELETE = withAuth<{ id: string }>(async (_req, { params, user }) => {
  return NextResponse.json(await deleteTransaction(user.organizationId, params.id))
})
