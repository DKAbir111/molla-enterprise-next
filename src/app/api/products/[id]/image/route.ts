import { NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/server/http/route'
import { parseForm } from '@/server/http/input'
import { updateProduct } from '@/server/services/products'
import { uploadImage } from '@/server/services/cloudinary'

export const PATCH = withAuth<{ id: string }>(async (req, { params, user }) => {
  const { file } = await parseForm(req, z.object({}), 'image')
  const imageUrl = file ? await uploadImage(file, 'products') : undefined
  return NextResponse.json(await updateProduct(user.organizationId, params.id, {}, imageUrl))
})
