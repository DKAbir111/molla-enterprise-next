import { Prisma } from '@prisma/client'
import { prisma } from '../db'
import { ForbiddenError, NotFoundError } from '../http/errors'
import { requireOrg, toPublicUrl } from './scope'
import { notifyLowStockIfNeeded } from './alerts'

export interface ProductInput {
  name: string
  type: string
  grade?: string
  price: number
  buyPrice?: number
  otherCostPerUnit?: number
  targetPrice?: number
  unit: string
  stock: number
  description?: string
  active?: boolean
}

const DEFAULT_LOW_STOCK_THRESHOLD = 5

function withPublicImage<T extends { imageUrl?: string | null }>(product: T): T {
  return { ...product, imageUrl: toPublicUrl(product.imageUrl) }
}

export async function listProducts(orgId?: string | null) {
  const organizationId = requireOrg(orgId)
  const products = await prisma.product.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
  })
  return products.map(withPublicImage)
}

export async function createProduct(
  orgId: string | null | undefined,
  input: ProductInput,
  imageUrl?: string,
) {
  const organizationId = requireOrg(orgId)

  const created = await prisma.product.create({
    data: {
      name: input.name,
      type: input.type,
      grade: input.grade,
      price: input.price,
      buyPrice: input.buyPrice ?? 0,
      otherCostPerUnit: input.otherCostPerUnit ?? 0,
      // A product with no explicit target sells at its list price.
      targetPrice: input.targetPrice ?? input.price,
      unit: input.unit,
      stock: input.stock,
      description: input.description,
      imageUrl,
      // Something created with no stock starts archived rather than appearing
      // in the catalogue as unbuyable.
      active: input.active ?? input.stock > 0,
      organizationId,
    },
  })

  return withPublicImage(created)
}

export async function updateProduct(
  orgId: string | null | undefined,
  id: string,
  input: Partial<ProductInput>,
  imageUrl?: string,
) {
  const organizationId = requireOrg(orgId)

  const existing = await prisma.product.findFirst({ where: { id, organizationId } })
  if (!existing) throw new NotFoundError('Product not found')

  const data: Prisma.ProductUpdateInput = { ...input }
  if (imageUrl) data.imageUrl = imageUrl

  // Selling out archives the product, unless the caller said otherwise in the
  // same request.
  if (input.active === undefined && typeof input.stock === 'number' && input.stock <= 0) {
    data.active = false
  }

  const updated = await prisma.product.update({ where: { id }, data })

  await notifyIfStockJustDropped(organizationId, id, Number(existing.stock ?? 0), Number(updated.stock ?? 0))

  return withPublicImage(updated)
}

/**
 * Emails only on the downward crossing of the threshold.
 *
 * Checking "is now low" alone would re-send on every later edit while the stock
 * stayed down; comparing against the previous value means one mail per event.
 * Failures are swallowed — a bounced alert must not fail the stock update that
 * triggered it.
 */
async function notifyIfStockJustDropped(
  organizationId: string,
  productId: string,
  before: number,
  after: number,
) {
  try {
    const settings = await prisma.organizationSettings.findUnique({ where: { organizationId } })
    const threshold = settings?.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD
    if (before > threshold && after <= threshold) {
      await notifyLowStockIfNeeded(organizationId, [productId])
    }
  } catch (error) {
    console.error('[products] low-stock notification failed:', error)
  }
}

export async function deleteProduct(orgId: string | null | undefined, id: string) {
  const organizationId = requireOrg(orgId)

  const existing = await prisma.product.findFirst({ where: { id, organizationId } })
  if (!existing) throw new NotFoundError('Product not found')

  try {
    await prisma.product.delete({ where: { id } })
  } catch (error) {
    // P2003 = still referenced by a SellItem or BuyItem. Deleting it would
    // rewrite history on orders that have already been invoiced.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      throw new ForbiddenError(
        'Cannot delete product because it is referenced by existing sells/buys. Consider archiving it instead.',
      )
    }
    throw error
  }

  return { ok: true }
}
