import { prisma } from '../db'
import { BadRequestError, NotFoundError } from '../http/errors'
import { requireOrg } from './scope'
import { toNumber } from './money'

/**
 * Drying gains: sand bought wet weighs less once dried, so the sellable
 * quantity exceeds what was purchased. Each entry books that surplus into stock
 * and keeps a record of where the extra came from.
 */

export interface DryingGainInput {
  productId: string
  quantity: number
  unitCost?: number
  note?: string
}

export function listDryingGains(orgId?: string | null, productId?: string) {
  const organizationId = requireOrg(orgId)
  return prisma.dryingGain.findMany({
    where: { organizationId, ...(productId ? { productId } : {}) },
    orderBy: { createdAt: 'desc' },
  })
}

export async function createDryingGain(
  orgId: string | null | undefined,
  input: DryingGainInput,
) {
  const organizationId = requireOrg(orgId)

  // `Product.stock` is an Int, so a fractional gain is not storable.
  const quantity = Math.floor(Number(input.quantity ?? 0))
  if (!(quantity > 0)) throw new BadRequestError('Quantity must be positive')

  const product = await prisma.product.findFirst({
    where: { id: input.productId, organizationId },
  })
  if (!product) throw new NotFoundError('Product not found')

  return prisma.$transaction(async (tx) => {
    const gain = await tx.dryingGain.create({
      data: {
        organizationId,
        productId: input.productId,
        quantity,
        unitCost: input.unitCost ?? 0,
        note: input.note,
      },
    })

    const updated = await tx.product.update({
      where: { id: input.productId },
      data: { stock: { increment: quantity } },
    })

    // Stock arriving revives a product archived for having sold out.
    if (toNumber(updated.stock) > 0) {
      await tx.product.update({ where: { id: input.productId }, data: { active: true } })
    }

    return gain
  })
}
