import { NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/server/http/route'
import { parseForm } from '@/server/http/input'
import { updateVendor } from '@/server/services/vendors'
import { uploadImage } from '@/server/services/cloudinary'

export const PATCH = withAuth<{ id: string }>(async (req, { params, user }) => {
  const { file } = await parseForm(req, z.object({}), 'avatar')
  const avatarUrl = file ? await uploadImage(file, 'vendors') : undefined
  return NextResponse.json(await updateVendor(user.organizationId, params.id, { avatarUrl }))
})
