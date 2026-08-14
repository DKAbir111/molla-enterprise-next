import type { Organization } from '@prisma/client'
import { prisma } from '../db'
import { ForbiddenError, NotFoundError } from '../http/errors'
import { uploadImage } from './cloudinary'
import { toPublicUrl } from './scope'

/**
 * Organizations, their settings, and the disable/enable/delete lifecycle.
 *
 * The NestJS version kept a 60-second in-memory Map cache in front of
 * `findMine`. That is deliberately gone. A Next.js deployment runs many
 * independent instances, so a per-process cache is not shared: disabling an org
 * on one instance leaves every other instance serving a stale "enabled" record
 * until its own copy expires. The lookup it replaced is a single indexed read
 * on a column the user row already carries — not worth a correctness hazard.
 */

const ADMIN_ROLES = new Set(['owner', 'admin'])

export interface OrganizationInput {
  name: string
  email: string
  phone: string
  address: string
  logoBase64?: string
}

function withPublicLogo<T extends { logoUrl?: string | null }>(org: T): T {
  return { ...org, logoUrl: toPublicUrl(org.logoUrl) }
}

/** Decodes a `data:` URI (or bare base64) and stores it like any other upload. */
async function uploadBase64(base64: string): Promise<string> {
  const match = base64.match(/^data:(.+);base64,(.*)$/)
  const mimetype = match ? match[1] : 'image/png'
  const data = match ? match[2] : base64
  const bytes = Buffer.from(data, 'base64')
  const file = new File([new Uint8Array(bytes)], 'logo', { type: mimetype })
  return uploadImage(file, 'organizations')
}

/** Resolves the logo from either the multipart file or the base64 field. */
async function resolveLogo(logoUrl?: string, logoBase64?: string) {
  if (logoUrl) return logoUrl
  if (logoBase64) return uploadBase64(logoBase64)
  return undefined
}

export async function createOrganization(
  userId: string,
  input: OrganizationInput,
  logoUrl?: string,
) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new NotFoundError('User not found')
  if (user.organizationId) throw new ForbiddenError('Organization already exists for user')

  const logo = await resolveLogo(logoUrl, input.logoBase64)

  // One transaction: an org whose creator is never attached to it would be
  // invisible to the person who just made it.
  const org = await prisma.$transaction(async (tx) => {
    const created = await tx.organization.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        address: input.address,
        logoUrl: logo,
        ownerId: userId,
      },
    })
    await tx.user.update({ where: { id: userId }, data: { organizationId: created.id } })
    await tx.organizationSettings.create({ data: { organizationId: created.id } })
    return created
  })

  return withPublicLogo(org)
}

export async function findMyOrganization(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { organization: true },
  })
  const org = user?.organization ?? null
  return org ? withPublicLogo(org) : null
}

export async function updateOrganization(
  userId: string,
  orgId: string,
  input: Partial<OrganizationInput>,
  logoUrl?: string,
) {
  await requireOwnOrganization(userId, orgId)

  const logo = await resolveLogo(logoUrl, input.logoBase64)

  const updated = await prisma.organization.update({
    where: { id: orgId },
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      address: input.address,
      // Only overwrite when a new image actually arrived — otherwise saving the
      // form with no file picked would blank an existing logo.
      ...(logo ? { logoUrl: logo } : {}),
    },
  })

  return withPublicLogo(updated)
}

export async function disableOrganization(userId: string, orgId: string) {
  await requireOrgAdmin(userId, orgId)
  const updated = await prisma.organization.update({
    where: { id: orgId },
    data: { deletedAt: new Date() },
  })
  return withPublicLogo(updated)
}

export async function enableOrganization(userId: string, orgId: string) {
  await requireOrgAdmin(userId, orgId)
  const updated = await prisma.organization.update({
    where: { id: orgId },
    data: { deletedAt: null },
  })
  return withPublicLogo(updated)
}

/**
 * Permanently removes an organization and everything under it.
 *
 * Order matters: child rows go before their parents, so nothing is left
 * pointing at a record that no longer exists. Users are detached rather than
 * deleted — the account outlives the organization and can join another.
 */
export async function deleteOrganization(userId: string, orgId: string) {
  await requireOrgAdmin(userId, orgId)

  await prisma.$transaction(async (tx) => {
    await tx.sellItem.deleteMany({ where: { sell: { organizationId: orgId } } })
    await tx.buyItem.deleteMany({ where: { buy: { organizationId: orgId } } })
    await tx.payment.deleteMany({ where: { organizationId: orgId } })
    await tx.sell.deleteMany({ where: { organizationId: orgId } })
    await tx.buy.deleteMany({ where: { organizationId: orgId } })
    await tx.transaction.deleteMany({ where: { organizationId: orgId } })
    await tx.dryingGain.deleteMany({ where: { organizationId: orgId } })
    await tx.product.deleteMany({ where: { organizationId: orgId } })
    await tx.customer.deleteMany({ where: { organizationId: orgId } })
    await tx.vendor.deleteMany({ where: { organizationId: orgId } })
    await tx.organizationSettings.deleteMany({ where: { organizationId: orgId } })
    await tx.organizationAlertSnooze.deleteMany({ where: { organizationId: orgId } })
    await tx.user.updateMany({ where: { organizationId: orgId }, data: { organizationId: null } })
    await tx.organization.delete({ where: { id: orgId } })
  })

  return { message: 'Organization deleted successfully' }
}

/** Settings row for the caller's org, created on first read if absent. */
export async function getSettings(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { organizationId: true },
  })
  if (!user?.organizationId) return null

  return prisma.organizationSettings.upsert({
    where: { organizationId: user.organizationId },
    create: { organizationId: user.organizationId },
    update: {},
  })
}

export interface SettingsInput {
  notifyLowStock?: boolean
  notifyOrderUpdates?: boolean
  notifyReceivables?: boolean
  notifyPayables?: boolean
  emailAlerts?: boolean
  smsAlerts?: boolean
  dryingGainEnabled?: boolean
  lowStockThreshold?: number
  pendingOrderAgingHours?: number
  receivableReminderDays?: number
  payableReminderDays?: number
}

export async function updateSettings(userId: string, orgId: string, input: SettingsInput) {
  await requireOwnOrganization(userId, orgId)

  // upsert, so a settings row that was never created does not 404 the save.
  return prisma.organizationSettings.upsert({
    where: { organizationId: orgId },
    create: { organizationId: orgId, ...input },
    update: input,
  })
}

/** The caller must belong to this organization. */
async function requireOwnOrganization(userId: string, orgId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new NotFoundError('User not found')
  if (user.organizationId !== orgId) throw new ForbiddenError('Not your organization')
  return user
}

/** ...and hold a role that may reshape it. */
async function requireOrgAdmin(userId: string, orgId: string) {
  const user = await requireOwnOrganization(userId, orgId)
  if (!ADMIN_ROLES.has(user.role)) {
    throw new ForbiddenError('Only owner or admin can perform this action')
  }
  return user
}

export type { Organization }
