import { NextResponse } from 'next/server'
import { withAuth } from '@/server/http/route'
import { parseBody } from '@/server/http/input'
import { createTransactionSchema } from '@/server/schemas/misc'
import { createTransaction, listTransactions } from '@/server/services/transactions'

export const GET = withAuth(async (_req, { user }) => {
  return NextResponse.json(await listTransactions(user.organizationId))
})

export const POST = withAuth(async (req, { user }) => {
  const dto = await parseBody(req, createTransactionSchema)
  return NextResponse.json(await createTransaction(user.organizationId, dto))
})
