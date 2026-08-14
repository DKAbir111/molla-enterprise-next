import { prisma } from '../db'
import { requireOrg } from './scope'
import { toNumber } from './money'

/**
 * The dashboard: headline figures, a monthly revenue series, and top products.
 *
 * A cancelled order is not revenue, was not delivered and did not consume
 * stock, so it is excluded from every figure here — revenue, money due,
 * transport revenue and the best-sellers list alike.
 */

const TOP_PRODUCTS = 4
const DAY_MS = 86_400_000

/** Orders that count. Cancelled ones never do. */
const NOT_CANCELLED = { status: { not: 'cancelled' } } as const

export interface DashboardOptions {
  months?: number
  productDays?: number
  startDate?: string
  endDate?: string
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}`
}

/**
 * The reporting window. An explicit, valid start/end pair wins; otherwise it is
 * the last N calendar months ending today.
 */
function resolveRange(now: Date, months: number, startDate?: string, endDate?: string) {
  if (startDate && endDate) {
    const start = new Date(startDate)
    const end = new Date(endDate)
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start <= end) {
      return { start, end }
    }
  }
  return { start: new Date(now.getFullYear(), now.getMonth() - (months - 1), 1), end: now }
}

export async function getDashboard(orgId: string | null | undefined, options: DashboardOptions = {}) {
  const organizationId = requireOrg(orgId)

  const months = options.months ?? 6
  const productDays = options.productDays ?? 90
  const now = new Date()
  const { start, end } = resolveRange(now, months, options.startDate, options.endDate)

  const [expenses, activeOrders, customers, products, ordersForProducts, ordersInRange] =
    await Promise.all([
      // Scoped to the selected period. This once fetched every expense the
      // organization had ever recorded, so the card compared revenue for the
      // chosen range against all-time expenses — never comparable figures.
      prisma.transaction.findMany({
        where: { organizationId, type: 'expense', date: { gte: start, lte: end } },
      }),
      prisma.sell.count({
        where: { organizationId, NOT: { status: { in: ['delivered', 'cancelled'] } } },
      }),
      prisma.customer.count({ where: { organizationId } }),
      prisma.product.findMany({
        where: { organizationId },
        select: {
          id: true,
          name: true,
          price: true,
          buyPrice: true,
          otherCostPerUnit: true,
          stock: true,
        },
      }),
      prisma.sell.findMany({
        where: {
          organizationId,
          ...NOT_CANCELLED,
          createdAt: { gte: new Date(Date.now() - productDays * DAY_MS) },
        },
        include: { items: true },
      }),
      prisma.sell.findMany({
        where: { organizationId, ...NOT_CANCELLED, createdAt: { gte: start, lte: end } },
        include: { items: true },
      }),
    ])

  const totalExpenses = expenses.reduce((sum, txn) => sum + toNumber(txn.amount), 0)

  // What the shelves are worth at cost, not at list price.
  const stockedProductValue = products.reduce(
    (sum, product) =>
      sum +
      (toNumber(product.buyPrice) + toNumber(product.otherCostPerUnit)) * toNumber(product.stock),
    0,
  )

  // One point per calendar month spanned by the range.
  const steps =
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1
  const monthPoints = Array.from({ length: Math.max(1, steps) }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth() + index, 1)
    return {
      key: monthKey(date),
      label: date.toLocaleString('en', { month: 'short' }),
      revenue: 0,
    }
  })
  const pointByKey = new Map(monthPoints.map((point) => [point.key, point]))

  for (const order of ordersInRange) {
    const point = pointByKey.get(monthKey(order.createdAt))
    if (!point) continue
    // Revenue is goods sold less discount. Transport is a pass-through cost
    // and is reported separately rather than inflating revenue.
    const itemsTotal = order.items.reduce((sum, item) => sum + toNumber(item.total), 0)
    point.revenue += Math.max(0, itemsTotal - toNumber(order.discount))
  }

  const revenueSeries = monthPoints.map((point) => ({ name: point.label, revenue: point.revenue }))
  const totalRevenue = revenueSeries.reduce((sum, point) => sum + point.revenue, 0)

  const moneyReceived = ordersInRange.reduce((sum, order) => sum + toNumber(order.paidAmount), 0)

  const moneyDue = ordersInRange.reduce((sum, order) => {
    const itemsTotal = order.items.reduce((acc, item) => acc + toNumber(item.total), 0)
    const due =
      itemsTotal + toNumber(order.transportTotal) - toNumber(order.discount) - toNumber(order.paidAmount)
    return sum + Math.max(0, due)
  }, 0)

  const transportRevenue = ordersInRange.reduce(
    (sum, order) => sum + toNumber(order.transportTotal),
    0,
  )

  // Best sellers by quantity over the product window, which is independent of
  // the revenue range — "what moves" and "what earned" answer different questions.
  const soldByProduct = new Map<string, number>()
  for (const order of ordersForProducts) {
    for (const item of order.items) {
      soldByProduct.set(
        item.productName,
        (soldByProduct.get(item.productName) ?? 0) + toNumber(item.quantity),
      )
    }
  }

  const productSales = [...soldByProduct.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_PRODUCTS)
    .map(([name, sales]) => ({ name, sales }))

  return {
    overview: {
      totalRevenue,
      totalExpenses,
      activeOrders,
      customers,
      stockedProductValue,
      transportRevenue,
      moneyReceived,
      moneyDue,
    },
    revenueSeries,
    productSales,
  }
}
