import { NextResponse } from 'next/server'
import { withAuth } from '@/server/http/route'
import { parseForm } from '@/server/http/input'
import { updateOrganizationSchema } from '@/server/schemas/organizations'
import { deleteOrganization, updateOrganization } from '@/server/services/organizations'
import { uploadImage } from '@/server/services/cloudinary'

export const PATCH = withAuth<{ id: string }>(async (req, { params, user }) => {
  const { fields, file } = await parseForm(req, updateOrganizationSchema, 'logo')
  const logoUrl = file ? await uploadImage(file, 'organizations') : undefined
  return NextResponse.json(await updateOrganization(user.userId, params.id, fields, logoUrl))
})

export const DELETE = withAuth<{ id: string }>(async (_req, { params, user }) => {
  return NextResponse.json(await deleteOrganization(user.userId, params.id))
})
