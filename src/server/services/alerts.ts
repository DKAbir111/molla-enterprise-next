import { prisma } from '../db'
import { requireOrg } from './scope'
import { amountDue } from './money'
import { sendGeneric } from './mail'

/**
 * The notification badge: what needs attention right now, across four
 * independent checks. Each is individually switchable in organization settings,
 * and any single item can be snoozed without muting its whole category.
 */

export type AlertType = 'lowStock' | 'pendingOrder' | 'receivable' | 'payable'

export const ALERT_TYPES: readonly AlertType[] = [
  'lowStock',
  'pendingOrder',
  'receivable',
  'payable',
]

/** Used whenever an organization has no settings row yet. */
const DEFAULTS = {
  notifyLowStock: true,
  notifyOrderUpdates: true,
  notifyReceivables: true,
  notifyPayables: true,
  lowStockThreshold: 5,
  pendingOrderAgingHours: 24,
  receivableReminderDays: 3,
  payableReminderDays: 3,
}

const HOUR_MS = 3_600_000
const DAY_MS = 86_400_000

async function loadConfig(organizationId: string) {
  const settings = await prisma.organizationSettings.findUnique({ where: { organizationId } })
  if (!settings) return { ...DEFAULTS }
  return {
    notifyLowStock: settings.notifyLowStock ?? DEFAULTS.notifyLowStock,
    notifyOrderUpdates: settings.notifyOrderUpdates ?? DEFAULTS.notifyOrderUpdates,
    notifyReceivables: settings.notifyReceivables ?? DEFAULTS.notifyReceivables,
    notifyPayables: settings.notifyPayables ?? DEFAULTS.notifyPayables,
    lowStockThreshold: settings.lowStockThreshold ?? DEFAULTS.lowStockThreshold,
    pendingOrderAgingHours: settings.pendingOrderAgingHours ?? DEFAULTS.pendingOrderAgingHours,
    receivableReminderDays: settings.receivableReminderDays ?? DEFAULTS.receivableReminderDays,
    payableReminderDays: settings.payableReminderDays ?? DEFAULTS.payableReminderDays,
  }
}

/** Currently-muted ref ids, grouped by alert type. */
async function loadSnoozes(organizationId: string, now: Date) {
  const rows = await prisma.organizationAlertSnooze.findMany({
    where: {
      organizationId,
      OR: [{ permanent: true }, { until: { gte: now } }],
    },
    select: { type: true, refId: true },
  })

  const muted: Record<AlertType, Set<string>> = {
    lowStock: new Set(),
    pendingOrder: new Set(),
    receivable: new Set(),
    payable: new Set(),
  }
  for (const row of rows) {
    muted[row.type as AlertType]?.add(row.refId)
  }
  return muted
}

export async function getAlerts(orgId?: string | null, limit = 5) {
  const organizationId = requireOrg(orgId)
  const now = new Date()

  const [config, muted] = await Promise.all([
    loadConfig(organizationId),
    loadSnoozes(organizationId, now),
  ])

  const lowStock = config.notifyLowStock
    ? await getLowStock(organizationId, config.lowStockThreshold, muted.lowStock, limit)
    : { count: 0, items: [] }

  const pendingOrders = config.notifyOrderUpdates
    ? await getPendingOrders(organizationId, config.pendingOrderAgingHours, muted.pendingOrder, limit, now)
    : { count: 0, agingCount: 0, items: [] }

  const receivables = config.notifyReceivables
    ? await getReceivables(organizationId, muted.receivable, limit)
    : { count: 0, totalDue: 0, items: [] }

  const payables = config.notifyPayables
    ? await getPayables(organizationId, muted.payable, limit)
    : { count: 0, totalDue: 0, items: [] }

  return { lowStock, pendingOrders, receivables, payables }
}

/** Active products at or below the threshold. Archived stock is not a problem. */
async function getLowStock(
  organizationId: string,
  threshold: number,
  muted: Set<string>,
  limit: number,
) {
  const where = {
    organizationId,
    active: true,
    stock: { lte: threshold },
    id: { notIn: Array.from(muted) },
  }

  const [items, count] = await Promise.all([
    prisma.product.findMany({
      where,
      select: { id: true, name: true, stock: true },
      orderBy: { stock: 'asc' },
      take: limit,
    }),
    prisma.product.count({ where }),
  ])

  return { count, items }
}

async function getPendingOrders(
  organizationId: string,
  agingHours: number,
  muted: Set<string>,
  limit: number,
  now: Date,
) {
  const where = {
    organizationId,
    status: 'pending',
    id: { notIn: Array.from(muted) },
  }
  const agedBefore = new Date(now.getTime() - agingHours * HOUR_MS)

  const [rows, count, agingCount] = await Promise.all([
    prisma.sell.findMany({
      where,
      select: { id: true, createdAt: true, customer: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
      take: limit,
    }),
    prisma.sell.count({ where }),
    prisma.sell.count({ where: { ...where, createdAt: { lte: agedBefore } } }),
  ])

  const items = rows.map((sell) => ({
    id: sell.id,
    customerName: sell.customer?.name ?? 'Customer',
    ageHours: Math.floor((now.getTime() - sell.createdAt.getTime()) / HOUR_MS),
  }))

  return { count, agingCount, items }
}

/**
 * Outstanding money owed to us.
 *
 * The due amount is derived rather than stored, so it cannot be filtered in
 * SQL — every sell is loaded and reduced here. Fine at the current scale; if
 * this list ever grows, a persisted `dueAmount` column is the fix.
 */
async function getReceivables(organizationId: string, muted: Set<string>, limit: number) {
  const sells = await prisma.sell.findMany({
    where: { organizationId },
    select: {
      id: true,
      total: true,
      discount: true,
      transportTotal: true,
      paidAmount: true,
      createdAt: true,
      customer: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const rows = sells
    .map((sell) => ({
      id: sell.id,
      customerName: sell.customer?.name ?? 'Customer',
      due: amountDue(sell),
      createdAt: sell.createdAt,
    }))
    .filter((row) => row.due > 0 && !muted.has(row.id))

  return {
    count: rows.length,
    totalDue: rows.reduce((sum, row) => sum + row.due, 0),
    items: rows.slice(0, limit),
  }
}

/** The mirror image: money we owe suppliers. */
async function getPayables(organizationId: string, muted: Set<string>, limit: number) {
  const buys = await prisma.buy.findMany({
    where: { organizationId },
    select: {
      id: true,
      vendorName: true,
      total: true,
      discount: true,
      transportTotal: true,
      paidAmount: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  const rows = buys
    .map((buy) => ({
      id: buy.id,
      vendorName: buy.vendorName ?? 'Vendor',
      due: amountDue(buy),
      createdAt: buy.createdAt,
    }))
    .filter((row) => row.due > 0 && !muted.has(row.id))

  return {
    count: rows.length,
    totalDue: rows.reduce((sum, row) => sum + row.due, 0),
    items: rows.slice(0, limit),
  }
}

export async function snooze(
  orgId: string | null | undefined,
  type: AlertType,
  refId: string,
  days?: number,
  forever?: boolean,
) {
  const organizationId = requireOrg(orgId)
  const permanent = Boolean(forever)
  const until = permanent
    ? null
    : new Date(Date.now() + (days && days > 0 ? days : 7) * DAY_MS)

  const existing = await prisma.organizationAlertSnooze.findFirst({
    where: { organizationId, type, refId },
  })

  if (existing) {
    return prisma.organizationAlertSnooze.update({
      where: { id: existing.id },
      data: { until, permanent },
    })
  }

  return prisma.organizationAlertSnooze.create({
    data: { organizationId, type, refId, until, permanent },
  })
}

export async function unsnooze(
  orgId: string | null | undefined,
  type: AlertType,
  refId: string,
) {
  const organizationId = requireOrg(orgId)
  await prisma.organizationAlertSnooze.deleteMany({ where: { organizationId, type, refId } })
  return { ok: true }
}

/**
 * Active snoozes, each resolved to a human label so the settings screen can
 * list "Sylhet Sand — 3 left" instead of a bare uuid.
 */
export async function listSnoozes(orgId?: string | null) {
  const organizationId = requireOrg(orgId)
  const now = new Date()

  const rows = await prisma.organizationAlertSnooze.findMany({
    where: { organizationId, OR: [{ permanent: true }, { until: { gte: now } }] },
    orderBy: { createdAt: 'desc' },
    select: { id: true, type: true, refId: true, until: true, permanent: true, createdAt: true },
  })
  if (rows.length === 0) return []

  const idsFor = (...types: AlertType[]) =>
    rows.filter((row) => types.includes(row.type as AlertType)).map((row) => row.refId)

  const productIds = idsFor('lowStock')
  const sellIds = idsFor('pendingOrder', 'receivable')
  const buyIds = idsFor('payable')

  const [products, sells, buys] = await Promise.all([
    productIds.length
      ? prisma.product.findMany({
          where: { id: { in: productIds }, organizationId },
          select: { id: true, name: true, stock: true },
        })
      : [],
    sellIds.length
      ? prisma.sell.findMany({
          where: { id: { in: sellIds }, organizationId },
          select: {
            id: true,
            createdAt: true,
            total: true,
            discount: true,
            transportTotal: true,
            paidAmount: true,
            customer: { select: { name: true } },
          },
        })
      : [],
    buyIds.length
      ? prisma.buy.findMany({
          where: { id: { in: buyIds }, organizationId },
          select: {
            id: true,
            createdAt: true,
            total: true,
            discount: true,
            transportTotal: true,
            paidAmount: true,
            vendorName: true,
          },
        })
      : [],
  ])

  const productById = new Map(products.map((p) => [p.id, p]))
  const sellById = new Map(sells.map((s) => [s.id, s]))
  const buyById = new Map(buys.map((b) => [b.id, b]))

  return rows.map((row) => {
    if (row.type === 'lowStock') {
      const product = productById.get(row.refId)
      return {
        ...row,
        label: product?.name ?? 'Product',
        extra: product ? { stock: Number(product.stock ?? 0) } : undefined,
      }
    }

    if (row.type === 'pendingOrder' || row.type === 'receivable') {
      const sell = sellById.get(row.refId)
      return {
        ...row,
        label: sell
          ? `#${row.refId.slice(0, 6).toUpperCase()} - ${sell.customer?.name ?? 'Customer'}`
          : 'Order',
        extra: {
          due: sell ? amountDue(sell) : 0,
          ageHours: sell
            ? Math.floor((now.getTime() - sell.createdAt.getTime()) / HOUR_MS)
            : 0,
        },
      }
    }

    if (row.type === 'payable') {
      const buy = buyById.get(row.refId)
      return {
        ...row,
        label: buy?.vendorName ?? 'Vendor',
        extra: { due: buy ? amountDue(buy) : 0 },
      }
    }

    return row
  })
}

/**
 * Emails the owner when a product has just crossed below the threshold.
 *
 * Called on the edge — after a stock change that moved a product from "fine" to
 * "low" — rather than on a timer, so one mail goes out per crossing instead of
 * one per day for as long as the stock stays down.
 */
export async function notifyLowStockIfNeeded(orgId: string, productIds: string[]) {
  const organizationId = requireOrg(orgId)
  if (productIds.length === 0) return

  const settings = await prisma.organizationSettings.findUnique({ where: { organizationId } })
  if (!settings?.emailAlerts || !settings.notifyLowStock) return

  const threshold = settings.lowStockThreshold ?? DEFAULTS.lowStockThreshold
  const now = new Date()

  const snoozed = await prisma.organizationAlertSnooze.findMany({
    where: {
      organizationId,
      type: 'lowStock',
      OR: [{ permanent: true }, { until: { gte: now } }],
    },
    select: { refId: true },
  })
  const muted = new Set(snoozed.map((row) => row.refId))

  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, organizationId, active: true },
    select: { id: true, name: true, stock: true },
  })

  const affected = products.filter(
    (product) => !muted.has(product.id) && Number(product.stock ?? 0) <= threshold,
  )
  if (affected.length === 0) return

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { email: true, name: true },
  })
  if (!org?.email) return

  const items = affected.map((p) => `<li>${p.name} — ${p.stock} left</li>`).join('')
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#111;font-size:14px;">
    <p>Low stock alert for ${org.name}:</p>
    <ul>${items}</ul>
    <p style="font-size:12px;color:#555;">You can snooze specific items from the app.</p>
  </div>`

  await sendGeneric(org.email, `Low stock alert (${affected.length})`, html)
}
