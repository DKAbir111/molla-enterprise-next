import { NextResponse } from 'next/server'
import { withAuth } from '@/server/http/route'
import { parseBody } from '@/server/http/input'
import { createProductSchema } from '@/server/schemas/products'
import { createProduct, listProducts } from '@/server/services/products'

export const GET = withAuth(async (_req, { user }) => {
  return NextResponse.json(await listProducts(user.organizationId))
})

export const POST = withAuth(async (req, { user }) => {
  const dto = await parseBody(req, createProductSchema)
  return NextResponse.json(await createProduct(user.organizationId, dto))
})
