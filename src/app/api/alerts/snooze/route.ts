import { NextResponse } from 'next/server'
import { withAuth } from '@/server/http/route'
import { parseBody } from '@/server/http/input'
import { snoozeSchema, unsnoozeSchema } from '@/server/schemas/alerts'
import { snooze, unsnooze, type AlertType } from '@/server/services/alerts'

export const POST = withAuth(async (req, { user }) => {
  const dto = await parseBody(req, snoozeSchema)
  return NextResponse.json(
    await snooze(user.organizationId, dto.type as AlertType, dto.refId, dto.days, dto.forever),
  )
})

export const DELETE = withAuth(async (req, { user }) => {
  const dto = await parseBody(req, unsnoozeSchema)
  return NextResponse.json(await unsnooze(user.organizationId, dto.type as AlertType, dto.refId))
})
