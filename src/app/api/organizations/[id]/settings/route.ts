import { NextResponse } from 'next/server'
import { withAuth } from '@/server/http/route'
import { parseBody } from '@/server/http/input'
import { settingsSchema } from '@/server/schemas/organizations'
import { updateSettings } from '@/server/services/organizations'

export const PATCH = withAuth<{ id: string }>(async (req, { params, user }) => {
  const dto = await parseBody(req, settingsSchema)
  return NextResponse.json(await updateSettings(user.userId, params.id, dto))
})
