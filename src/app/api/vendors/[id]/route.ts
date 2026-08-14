import { NextResponse } from 'next/server'
import { withAuth } from '@/server/http/route'
import { parseBody } from '@/server/http/input'
import { updateVendorSchema } from '@/server/schemas/contacts'
import { deleteVendor, getVendor, updateVendor } from '@/server/services/vendors'

export const GET = withAuth<{ id: string }>(async (_req, { params, user }) => {
  return NextResponse.json(await getVendor(user.organizationId, params.id))
})

export const PATCH = withAuth<{ id: string }>(async (req, { params, user }) => {
  const dto = await parseBody(req, updateVendorSchema)
  return NextResponse.json(await updateVendor(user.organizationId, params.id, dto))
})

export const DELETE = withAuth<{ id: string }>(async (_req, { params, user }) => {
  return NextResponse.json(await deleteVendor(user.organizationId, params.id))
})
