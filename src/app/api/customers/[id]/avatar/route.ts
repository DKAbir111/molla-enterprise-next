import { NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/server/http/route'
import { parseForm } from '@/server/http/input'
import { updateCustomer } from '@/server/services/customers'
import { uploadImage } from '@/server/services/cloudinary'

/**
 * The form carries only the image, so there are no scalar fields to validate —
 * an empty object schema documents that and rejects anything smuggled alongside.
 */
export const PATCH = withAuth<{ id: string }>(async (req, { params, user }) => {
  const { file } = await parseForm(req, z.object({}), 'avatar')
  const avatarUrl = file ? await uploadImage(file, 'customers') : undefined
  return NextResponse.json(await updateCustomer(user.organizationId, params.id, { avatarUrl }))
})
