import { NextResponse } from 'next/server'
import { withAuth } from '@/server/http/route'
import { parseQuery } from '@/server/http/input'
import { searchQuerySchema } from '@/server/schemas/sells'
import { searchSells } from '@/server/services/sells'

export const GET = withAuth(async (req, { user }) => {
  const { q } = parseQuery(req, searchQuerySchema)
  return NextResponse.json(await searchSells(user.organizationId, q))
})
