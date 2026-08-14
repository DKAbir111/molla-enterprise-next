import { NextResponse } from 'next/server'
import { withAuth } from '@/server/http/route'
import { parseBody } from '@/server/http/input'
import { updateProductSchema } from '@/server/schemas/products'
import { deleteProduct, updateProduct } from '@/server/services/products'

export const PATCH = withAuth<{ id: string }>(async (req, { params, user }) => {
  const dto = await parseBody(req, updateProductSchema)
  return NextResponse.json(await updateProduct(user.organizationId, params.id, dto))
})

export const DELETE = withAuth<{ id: string }>(async (_req, { params, user }) => {
  return NextResponse.json(await deleteProduct(user.organizationId, params.id))
})
