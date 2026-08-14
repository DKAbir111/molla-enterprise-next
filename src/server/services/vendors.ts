import { prisma } from '../db'
import { NotFoundError } from '../http/errors'
import { requireOrg, withPublicAvatar } from './scope'

export interface VendorInput {
  name: string
  phone: string
  email?: string
  address?: string
  avatarUrl?: string
}

export async function listVendors(orgId?: string | null) {
  const organizationId = requireOrg(orgId)
  const vendors = await prisma.vendor.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
  })
  return vendors.map(withPublicAvatar)
}

/**
 * Returns null rather than throwing when there is no match, which is what the
 * NestJS version did and what the vendor detail page expects.
 */
export async function getVendor(orgId: string | null | undefined, id: string) {
  const organizationId = requireOrg(orgId)
  const vendor = await prisma.vendor.findFirst({ where: { id, organizationId } })
  return vendor ? withPublicAvatar(vendor) : null
}

export async function createVendor(orgId: string | null | undefined, input: VendorInput) {
  const organizationId = requireOrg(orgId)
  return prisma.vendor.create({
    data: {
      name: input.name,
      phone: input.phone,
      email: input.email,
      address: input.address,
      organizationId,
    },
  })
}

export async function updateVendor(
  orgId: string | null | undefined,
  id: string,
  input: Partial<VendorInput>,
) {
  const organizationId = requireOrg(orgId)
  // Scoped check first: a vendor from another organization must read as absent,
  // not be silently updated.
  const existing = await prisma.vendor.findFirst({ where: { id, organizationId } })
  if (!existing) throw new NotFoundError('Vendor not found')

  const updated = await prisma.vendor.update({ where: { id }, data: input })
  return withPublicAvatar(updated)
}

export async function deleteVendor(orgId: string | null | undefined, id: string) {
  const organizationId = requireOrg(orgId)
  const existing = await prisma.vendor.findFirst({ where: { id, organizationId } })
  if (!existing) throw new NotFoundError('Vendor not found')

  await prisma.vendor.delete({ where: { id } })
  return { ok: true }
}
