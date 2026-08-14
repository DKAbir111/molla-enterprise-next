import { NextResponse } from 'next/server'
import { withAuth } from '@/server/http/route'
import { parseBody } from '@/server/http/input'
import { createVendorSchema } from '@/server/schemas/contacts'
import { createVendor, listVendors } from '@/server/services/vendors'

export const GET = withAuth(async (_req, { user }) => {
  return NextResponse.json(await listVendors(user.organizationId))
})

export const POST = withAuth(async (req, { user }) => {
  const dto = await parseBody(req, createVendorSchema)
  return NextResponse.json(await createVendor(user.organizationId, dto))
})
