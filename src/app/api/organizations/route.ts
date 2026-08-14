import { NextResponse } from 'next/server'
import { withAuth } from '@/server/http/route'
import { parseForm } from '@/server/http/input'
import { createOrganizationSchema } from '@/server/schemas/organizations'
import { createOrganization } from '@/server/services/organizations'
import { uploadImage } from '@/server/services/cloudinary'

export const POST = withAuth(async (req, { user }) => {
  const { fields, file } = await parseForm(req, createOrganizationSchema, 'logo')
  const logoUrl = file ? await uploadImage(file, 'organizations') : undefined
  return NextResponse.json(await createOrganization(user.userId, fields, logoUrl))
})
