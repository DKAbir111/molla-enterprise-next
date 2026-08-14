import { prisma } from '../db'
import { NotFoundError } from '../http/errors'
import { requireOrg } from './scope'
import { toNumber } from './money'
import { notifyLowStockIfNeeded } from './alerts'
import { setOrderPaidTotal, type Tx } from './payments'

const DEFAULT_LOW_STOCK_THRESHOLD = 5

export interface SellItemInput {
  productId: string
  quantity: number
  price?: number
}

export interface CreateSellInput {
  customerId: string
  deliveryAddress?: string
  items: SellItemInput[]
  discount?: number
  paidAmount?: number
  transportPerTrip?: number
  transportTrips?: number
}

export interface UpdateSellInput {
  status?: string
  deliveryAddress?: string
  discount?: number
  paidAmount?: number
  transportPerTrip?: number
  transportTrips?: number
}

const withDetail = { items: true, customer: true } as const

export function listSells(orgId?: string | null) {
  const organizationId = requireOrg(orgId)
  return prisma.sell.findMany({
    where: { organizationId },
    include: withDetail,
    orderBy: { createdAt: 'desc' },
  })
}

export function getSell(orgId: string | null | undefined, id: string) {
  const organizationId = requireOrg(orgId)
  return prisma.sell.findFirst({ where: { id, organizationId }, include: withDetail })
}

/**
 * A human-quotable order reference, e.g. ORD-2608-A1B2C3.
 *
 * Derived from the uuid rather than a counter so it can be produced without a
 * second round trip, and stored on the row so search can match it exactly.
 */
function makeShortCode(id: string, date: Date): string {
  const yy = String(date.getFullYear()).slice(-2)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const short = id.replace(/-/g, '').slice(0, 6).toUpperCase()
  return `ORD-${yy}${mm}-${short}`
}

async function lowStockThreshold(organizationId: string): Promise<number> {
  const settings = await prisma.organizationSettings.findUnique({ where: { organizationId } })
  return settings?.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD
}

export async function createSell(orgId: string | null | undefined, input: CreateSellInput) {
  const organizationId = requireOrg(orgId)

  const customer = await prisma.customer.findFirst({
    where: { id: input.customerId, organizationId },
  })
  if (!customer) throw new NotFoundError('Customer not found')

  const products = await prisma.product.findMany({
    where: { id: { in: input.items.map((item) => item.productId) }, organizationId },
    select: { id: true, name: true, price: true, stock: true, targetPrice: true },
  })
  const productById = new Map(products.map((product) => [product.id, product]))

  const items = input.items.map((item) => {
    const product = productById.get(item.productId)
    if (!product) throw new NotFoundError(`Product not found: ${item.productId}`)

    // A line may be discounted, but never below the product's floor — that is
    // what `targetPrice` is for. Falls back to list price when unset.
    const floor = toNumber(product.targetPrice ?? product.price)
    const requested = typeof item.price === 'number' ? item.price : toNumber(product.price)
    const price = Math.max(requested, floor)

    return {
      productId: product.id,
      productName: product.name,
      quantity: item.quantity,
      price,
      total: price * item.quantity,
    }
  })

  const total = items.reduce((sum, item) => sum + item.total, 0)
  const discount = toNumber(input.discount)
  const paidAmount = toNumber(input.paidAmount)
  const transportPerTrip = toNumber(input.transportPerTrip)
  const transportTrips = Math.max(0, toNumber(input.transportTrips))
  const transportTotal = transportPerTrip * transportTrips

  // Read once, not once per line item.
  const threshold = await lowStockThreshold(organizationId)

  const { sell, crossedThreshold } = await prisma.$transaction(async (tx) => {
    const created = await tx.sell.create({
      data: {
        organizationId,
        customerId: input.customerId,
        deliveryAddress: input.deliveryAddress,
        status: 'pending',
        items: { create: items },
        total,
        discount,
        paidAmount,
        transportPerTrip,
        transportTrips,
        transportTotal,
      },
      include: { items: true },
    })

    const withCode = await tx.sell.update({
      where: { id: created.id },
      data: { shortCode: makeShortCode(created.id, created.createdAt) },
      include: { items: true },
    })

    const crossed: string[] = []
    for (const item of items) {
      const product = await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      })

      const before = toNumber(productById.get(item.productId)?.stock)
      const after = toNumber(product.stock)
      if (before > threshold && after <= threshold) crossed.push(item.productId)

      // Sold out is not sellable.
      if (after <= 0) {
        await tx.product.update({ where: { id: item.productId }, data: { active: false } })
      }
    }

    // An opening payment is a Payment row, not a Transaction. Writing both is
    // what made Accounts count every paid sale twice — once as the sale, once
    // as its own payment.
    if (paidAmount > 0) {
      await tx.payment.create({
        data: {
          organizationId,
          direction: 'in',
          amount: paidAmount,
          date: new Date(),
          method: 'cash',
          note: 'Paid at the time of sale',
          customerId: input.customerId,
          sellId: created.id,
        },
      })
    }

    return { sell: withCode, crossedThreshold: crossed }
  })

  // Outside the transaction: an SMTP hang must not hold a database lock, and a
  // failed email must not roll back a completed sale.
  if (crossedThreshold.length > 0) {
    try {
      await notifyLowStockIfNeeded(organizationId, crossedThreshold)
    } catch (error) {
      console.error('[sells] low-stock notification failed:', error)
    }
  }

  return sell
}

export async function updateSell(
  orgId: string | null | undefined,
  id: string,
  input: UpdateSellInput,
) {
  const organizationId = requireOrg(orgId)

  const existing = await prisma.sell.findFirst({
    where: { id, organizationId },
    include: { items: true },
  })
  if (!existing) throw new NotFoundError('Sell not found')

  const { paidAmount, ...rest } = input
  const data: Record<string, unknown> = { ...rest }

  // `paidAmount` is a cache derived from the payment ledger, so the form must
  // not write it directly — that is what destroyed earlier instalments. The
  // field states a running total, so the difference is booked as a payment and
  // the cache recomputed from the rows.
  const paidTarget = typeof paidAmount === 'number' ? paidAmount : null

  const perTrip = toNumber(input.transportPerTrip ?? existing.transportPerTrip)
  const trips = toNumber(input.transportTrips ?? existing.transportTrips)
  data.transportPerTrip = perTrip
  data.transportTrips = trips
  data.transportTotal = perTrip * trips

  // Cancelling has to put the goods back, and un-cancelling has to take them
  // out again. Comparing against the CURRENT status means saving an already
  // cancelled order twice cannot restock it twice.
  const wasCancelled = existing.status === 'cancelled'
  const nowCancelled = (input.status ?? existing.status) === 'cancelled'
  const stockMoves = wasCancelled !== nowCancelled

  return prisma.$transaction(async (tx) => {
    if (stockMoves) {
      for (const item of existing.items) {
        const quantity = toNumber(item.quantity)
        if (quantity <= 0) continue

        const product = await tx.product.update({
          where: { id: item.productId },
          data: nowCancelled
            ? { stock: { increment: quantity } }
            : { stock: { decrement: quantity } },
        })

        // Mirror the create path: stock on hand is sellable, none is not.
        await tx.product.update({
          where: { id: item.productId },
          data: { active: toNumber(product.stock) > 0 },
        })
      }
    }

    const updated = await tx.sell.update({ where: { id }, data })

    if (paidTarget !== null) {
      await setOrderPaidTotal(tx as Tx, {
        organizationId,
        sellId: id,
        customerId: existing.customerId,
        target: paidTarget,
      })
    }

    return updated
  })
}

/**
 * Replaces an order's lines wholesale.
 *
 * The old quantities go back to stock before the new ones come out, so editing
 * a line from 10 to 12 moves 2 units rather than 12.
 */
export async function updateSellItems(
  orgId: string | null | undefined,
  id: string,
  items: SellItemInput[],
) {
  const organizationId = requireOrg(orgId)

  const sell = await prisma.sell.findFirst({ where: { id, organizationId } })
  if (!sell) throw new NotFoundError('Sell not found')

  const products = await prisma.product.findMany({
    where: { id: { in: items.map((item) => item.productId) }, organizationId },
  })
  const productById = new Map(products.map((product) => [product.id, product]))

  const rows = items.map((item) => {
    const product = productById.get(item.productId)
    if (!product) throw new NotFoundError(`Product not found: ${item.productId}`)

    const price = typeof item.price === 'number' ? item.price : toNumber(product.price)
    return {
      sellId: id,
      productId: item.productId,
      productName: product.name,
      quantity: item.quantity,
      price,
      total: price * item.quantity,
    }
  })

  const total = rows.reduce((sum, row) => sum + row.total, 0)

  return prisma.$transaction(async (tx) => {
    const previous = await tx.sellItem.findMany({ where: { sellId: id } })
    for (const item of previous) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      })
    }

    await tx.sellItem.deleteMany({ where: { sellId: id } })
    await tx.sellItem.createMany({ data: rows })

    for (const row of rows) {
      const product = await tx.product.update({
        where: { id: row.productId },
        data: { stock: { decrement: row.quantity } },
      })
      // Set both ways, so a line removed from the order can revive a product
      // that had been archived for being sold out.
      await tx.product.update({
        where: { id: row.productId },
        data: { active: toNumber(product.stock) > 0 },
      })
    }

    await tx.sell.update({ where: { id }, data: { total } })

    return tx.sell.findUnique({ where: { id }, include: withDetail })
  })
}

/**
 * Finds an order by uuid or by the printed code.
 *
 * Accepts the full `ORD-YYMM-XXXXXX` form, the bare six-character suffix, or a
 * raw uuid — whichever the user has in front of them.
 */
export function searchSells(orgId?: string | null, query?: string) {
  const organizationId = requireOrg(orgId)
  const raw = (query ?? '').trim()

  if (!raw) {
    return prisma.sell.findMany({
      where: { organizationId },
      include: withDetail,
      orderBy: { createdAt: 'desc' },
    })
  }

  const normalized = raw.toUpperCase()
  const fromCode = normalized.match(/^ORD-\d{4}-([A-Z0-9]{6})$/)?.[1]
  const bareCode = /^[A-Z0-9]{6}$/.test(normalized) ? normalized : undefined
  const suffix = (fromCode ?? bareCode)?.toLowerCase()

  return prisma.sell.findMany({
    where: {
      organizationId,
      OR: [
        { id: raw },
        { shortCode: normalized },
        ...(suffix ? [{ id: { contains: suffix } }] : []),
      ],
    },
    include: withDetail,
    orderBy: { createdAt: 'desc' },
    take: 25,
  })
}
