import { NextResponse } from 'next/server'
import { withAuth } from '@/server/http/route'
import { parseBody } from '@/server/http/input'
import { createCustomerSchema } from '@/server/schemas/contacts'
import { createCustomer, listCustomers } from '@/server/services/customers'

export const GET = withAuth(async (_req, { user }) => {
  return NextResponse.json(await listCustomers(user.organizationId))
})

export const POST = withAuth(async (req, { user }) => {
  const dto = await parseBody(req, createCustomerSchema)
  return NextResponse.json(await createCustomer(user.organizationId, dto))
})
