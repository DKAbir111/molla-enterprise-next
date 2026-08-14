import { NextResponse } from 'next/server'
import { withAuth } from '@/server/http/route'
import { enableOrganization } from '@/server/services/organizations'

/**
 * `allowDisabledOrg` is the point of this route: the organization is disabled by
 * definition when someone calls it, and the blanket ban on writes would
 * otherwise refuse the one request that lifts the ban.
 */
export const POST = withAuth<{ id: string }>(
  async (_req, { params, user }) => {
    return NextResponse.json(await enableOrganization(user.userId, params.id))
  },
  { allowDisabledOrg: true },
)
