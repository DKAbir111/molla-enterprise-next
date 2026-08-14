import { prisma } from '../db'
import { NotFoundError } from '../http/errors'
import { requireOrg } from './scope'
import { toNumber } from './money'
import { setOrderPaidTotal, type Tx } from './payments'

export interface BuyItemInput {
  productId: string
  quantity: number
  price: number
}

export interface CreateBuyInput {
  vendorName?: string
  vendorPhone?: string
  items: BuyItemInput[]
  discount?: number
  paidAmount?: number
  transportPerTrip?: number
  transportTrips?: number
}

export interface UpdateBuyInput {
  vendorName?: string
  vendorPhone?: string
  discount?: number
  paidAmount?: number
  transportPerTrip?: number
  transportTrips?: number
}

/**
 * `Product.stock` and `BuyItem.quantity` are both `Int`, so a fractional
 * quantity is not storable. Coerced once at the top, then reused for the stored
 * line, its total and the stock movement — those three can then never disagree.
 */
function wholeQuantity(value: unknown): number {
  const n = Math.floor(Number(value ?? 0))
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** Resolves display names for the ordered products in one query. */
async function productNames(organizationId: string, productIds: string[]) {
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, organizationId },
    select: { id: true, name: true },
  })
  return new Map(products.map((product) => [product.id, product.name]))
}

export function listBuys(orgId?: string | null) {
  const organizationId = requireOrg(orgId)
  return prisma.buy.findMany({
    where: { organizationId },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  })
}

export function getBuy(orgId: string | null | undefined, id: string) {
  const organizationId = requireOrg(orgId)
  return prisma.buy.findFirst({ where: { id, organizationId }, include: { items: true } })
}

export async function createBuy(orgId: string | null | undefined, input: CreateBuyInput) {
  const organizationId = requireOrg(orgId)

  const names = await productNames(
    organizationId,
    input.items.map((item) => item.productId),
  )

  const items = input.items.map((item) => {
    const quantity = wholeQuantity(item.quantity)
    return {
      productId: item.productId,
      productName: names.get(item.productId) ?? 'Item',
      quantity,
      price: item.price,
      total: item.price * quantity,
    }
  })

  const total = items.reduce((sum, item) => sum + item.total, 0)
  const discount = toNumber(input.discount)
  const paidAmount = toNumber(input.paidAmount)
  const transportPerTrip = toNumber(input.transportPerTrip)
  const transportTrips = Math.max(0, toNumber(input.transportTrips))
  const transportTotal = transportPerTrip * transportTrips

  return prisma.$transaction(async (tx) => {
    const buy = await tx.buy.create({
      data: {
        organizationId,
        vendorName: input.vendorName,
        vendorPhone: input.vendorPhone,
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

    // A purchase adds to inventory, and restocking has to undo the archiving a
    // sell-out caused — otherwise the product stays invisible despite being in
    // stock.
    for (const item of items) {
      if (item.quantity <= 0) continue
      const product = await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity }, awaitingPurchase: false },
      })
      if (toNumber(product.stock) > 0) {
        await tx.product.update({ where: { id: item.productId }, data: { active: true } })
      }
    }

    // As in `createSell`: a Payment row, not a Transaction, so the purchase
    // total and its payment are not counted as two separate expenses.
    if (paidAmount > 0) {
      const vendor = input.vendorName
        ? await tx.vendor.findFirst({
            where: { organizationId, name: input.vendorName },
            select: { id: true },
          })
        : null

      await tx.payment.create({
        data: {
          organizationId,
          direction: 'out',
          amount: paidAmount,
          date: new Date(),
          method: 'cash',
          note: 'Paid at the time of purchase',
          vendorId: vendor?.id ?? null,
          buyId: buy.id,
        },
      })
    }

    return buy
  })
}

export async function updateBuy(
  orgId: string | null | undefined,
  id: string,
  input: UpdateBuyInput,
) {
  const organizationId = requireOrg(orgId)

  const existing = await prisma.buy.findFirst({ where: { id, organizationId } })
  if (!existing) throw new NotFoundError('Buy not found')

  const { paidAmount, ...rest } = input
  const data: Record<string, unknown> = { ...rest }

  // As in `updateSell`: paidAmount is derived from the payment ledger, so the
  // difference is booked rather than the column overwritten.
  const paidTarget = typeof paidAmount === 'number' ? paidAmount : null

  if (input.transportPerTrip != null || input.transportTrips != null) {
    const perTrip = toNumber(input.transportPerTrip ?? existing.transportPerTrip)
    const trips = toNumber(input.transportTrips ?? existing.transportTrips)
    data.transportPerTrip = perTrip
    data.transportTrips = trips
    data.transportTotal = perTrip * trips
  }

  if (paidTarget === null) {
    return prisma.buy.update({ where: { id }, data })
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.buy.update({ where: { id }, data })
    await setOrderPaidTotal(tx as Tx, { organizationId, buyId: id, target: paidTarget })
    return updated
  })
}

/**
 * Replaces a purchase's lines, moving stock by the difference.
 *
 * The old lines are unwound before the new ones are applied. Without that,
 * correcting a 100 down to a 10 would leave the original 100 in stock forever.
 */
export async function updateBuyItems(
  orgId: string | null | undefined,
  id: string,
  items: BuyItemInput[],
) {
  const organizationId = requireOrg(orgId)

  const buy = await prisma.buy.findFirst({ where: { id, organizationId } })
  if (!buy) throw new NotFoundError('Buy not found')

  const names = await productNames(
    organizationId,
    items.map((item) => item.productId),
  )

  const rows = items.map((item) => {
    const quantity = wholeQuantity(item.quantity)
    const price = toNumber(item.price)
    return {
      buyId: id,
      productId: item.productId,
      productName: names.get(item.productId) ?? 'Item',
      quantity,
      price,
      total: price * quantity,
    }
  })

  const total = rows.reduce((sum, row) => sum + row.total, 0)

  return prisma.$transaction(async (tx) => {
    const previous = await tx.buyItem.findMany({ where: { buyId: id } })

    for (const item of previous) {
      const quantity = wholeQuantity(item.quantity)
      if (quantity <= 0) continue
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: quantity } },
      })
    }

    await tx.buyItem.deleteMany({ where: { buyId: id } })
    await tx.buyItem.createMany({ data: rows })

    for (const row of rows) {
      if (row.quantity <= 0) continue
      await tx.product.update({
        where: { id: row.productId },
        data: { stock: { increment: row.quantity }, awaitingPurchase: false },
      })
    }

    // Any product on either side of the edit may have crossed zero in either
    // direction — a line removed entirely can push stock back down — so settle
    // `active` from the final figure rather than assuming a direction.
    const touched = new Set([
      ...previous.map((item) => item.productId),
      ...rows.map((row) => row.productId),
    ])

    for (const productId of touched) {
      const product = await tx.product.findUnique({
        where: { id: productId },
        select: { stock: true },
      })
      if (!product) continue
      await tx.product.update({
        where: { id: productId },
        data: { active: toNumber(product.stock) > 0 },
      })
    }

    await tx.buy.update({ where: { id }, data: { total } })

    return tx.buy.findUnique({ where: { id }, include: { items: true } })
  })
}
