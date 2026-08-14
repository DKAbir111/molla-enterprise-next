import { NextResponse } from 'next/server'
import { withAuth } from '@/server/http/route'
import { parseBody } from '@/server/http/input'
import { updateCustomerSchema } from '@/server/schemas/contacts'
import { deleteCustomer, getCustomer, updateCustomer } from '@/server/services/customers'

export const GET = withAuth<{ id: string }>(async (_req, { params, user }) => {
  return NextResponse.json(await getCustomer(user.organizationId, params.id))
})

export const PATCH = withAuth<{ id: string }>(async (req, { params, user }) => {
  const dto = await parseBody(req, updateCustomerSchema)
  return NextResponse.json(await updateCustomer(user.organizationId, params.id, dto))
})

export const DELETE = withAuth<{ id: string }>(async (_req, { params, user }) => {
  return NextResponse.json(await deleteCustomer(user.organizationId, params.id))
})
