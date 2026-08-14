import type { Prisma, PrismaClient } from '@prisma/client'
import { prisma } from '../db'
import { BadRequestError, NotFoundError } from '../http/errors'
import { requireOrg } from './scope'
import { dueFromItems, grandTotalFromItems, money, toNumber } from './money'

/**
 * The payment ledger.
 *
 * `Sell.paidAmount` and `Buy.paidAmount` are caches, never sources of truth.
 * Every change goes in as a `Payment` row and the cached column is recomputed
 * from the sum. That is what keeps instalments from overwriting each other:
 * the order form states a running total, so writing the field directly used to
 * erase whatever had been paid before.
 */

/** The client available inside `$transaction` — no nested transactions. */
export type Tx = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>

export interface PaymentInput {
  amount: number
  date?: string
  method?: string
  note?: string
  customerId?: string
  vendorId?: string
  sellId?: string
  buyId?: string
}

/** Rewrites the cached paid total on a sale from its payment rows. */
async function recomputeSellPaid(tx: Tx, sellId: string): Promise<number> {
  const agg = await tx.payment.aggregate({ where: { sellId }, _sum: { amount: true } })
  const paid = money(toNumber(agg._sum.amount))
  await tx.sell.update({ where: { id: sellId }, data: { paidAmount: paid } })
  return paid
}

async function recomputeBuyPaid(tx: Tx, buyId: string): Promise<number> {
  const agg = await tx.payment.aggregate({ where: { buyId }, _sum: { amount: true } })
  const paid = money(toNumber(agg._sum.amount))
  await tx.buy.update({ where: { id: buyId }, data: { paidAmount: paid } })
  return paid
}

function parseDate(value?: string): Date {
  if (!value) return new Date()
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw new BadRequestError('Invalid date')
  return date
}

/**
 * Records money received from a customer.
 *
 * With `sellId` the payment settles that one invoice. Without it the amount is
 * spread across the customer's unpaid invoices oldest-first, which is what
 * happens when someone clears an old balance with a single lump sum. Anything
 * left over is kept as an unapplied credit (`sellId: null`) rather than being
 * silently discarded.
 */
export async function receiveFromCustomer(
  orgId: string | null | undefined,
  input: PaymentInput,
) {
  const organizationId = requireOrg(orgId)
  const amount = money(input.amount)
  if (!(amount > 0)) throw new BadRequestError('Amount must be greater than zero')
  if (!input.customerId) throw new BadRequestError('customerId is required')

  const customer = await prisma.customer.findFirst({
    where: { id: input.customerId, organizationId },
  })
  if (!customer) throw new NotFoundError('Customer not found')

  const date = parseDate(input.date)

  return prisma.$transaction(async (tx) => {
    const base = {
      organizationId,
      direction: 'in',
      date,
      method: input.method ?? 'cash',
      note: input.note ?? null,
      customerId: customer.id,
    }

    if (input.sellId) {
      const sell = await tx.sell.findFirst({
        where: { id: input.sellId, organizationId },
        include: { items: true },
      })
      if (!sell) throw new NotFoundError('Sale not found')

      await tx.payment.create({ data: { ...base, amount, sellId: sell.id } })
      const paid = await recomputeSellPaid(tx, sell.id)
      return { applied: [{ sellId: sell.id, amount }], unapplied: 0, paid }
    }

    // Oldest first. Cancelled invoices are not debts and must not absorb cash.
    const open = await tx.sell.findMany({
      where: { organizationId, customerId: customer.id, status: { not: 'cancelled' } },
      include: { items: true },
      orderBy: { createdAt: 'asc' },
    })

    let remaining = amount
    const applied: Array<{ sellId: string; amount: number }> = []

    for (const sell of open) {
      if (remaining <= 0) break
      const due = dueFromItems(sell)
      if (due <= 0) continue

      const take = money(Math.min(remaining, due))
      await tx.payment.create({ data: { ...base, amount: take, sellId: sell.id } })
      await recomputeSellPaid(tx, sell.id)
      applied.push({ sellId: sell.id, amount: take })
      remaining = money(remaining - take)
    }

    if (remaining > 0) {
      // Paid more than is owed. Held against the customer rather than any one
      // invoice, so the surplus stays visible and can be applied later.
      await tx.payment.create({ data: { ...base, amount: remaining, sellId: null } })
    }

    return { applied, unapplied: remaining }
  })
}

/** Money paid to a vendor. Mirrors `receiveFromCustomer`, against purchases. */
export async function payVendor(orgId: string | null | undefined, input: PaymentInput) {
  const organizationId = requireOrg(orgId)
  const amount = money(input.amount)
  if (!(amount > 0)) throw new BadRequestError('Amount must be greater than zero')

  const date = parseDate(input.date)

  let vendorId: string | null = null
  if (input.vendorId) {
    const vendor = await prisma.vendor.findFirst({
      where: { id: input.vendorId, organizationId },
    })
    if (!vendor) throw new NotFoundError('Vendor not found')
    vendorId = vendor.id
  }

  return prisma.$transaction(async (tx) => {
    const base = {
      organizationId,
      direction: 'out',
      date,
      method: input.method ?? 'cash',
      note: input.note ?? null,
      vendorId,
    }

    if (input.buyId) {
      const buy = await tx.buy.findFirst({
        where: { id: input.buyId, organizationId },
        include: { items: true },
      })
      if (!buy) throw new NotFoundError('Purchase not found')

      await tx.payment.create({ data: { ...base, amount, buyId: buy.id } })
      const paid = await recomputeBuyPaid(tx, buy.id)
      return { applied: [{ buyId: buy.id, amount }], unapplied: 0, paid }
    }

    if (!vendorId) throw new BadRequestError('vendorId or buyId is required')

    const vendor = await tx.vendor.findUnique({ where: { id: vendorId } })
    // Buy stores its vendor as free text rather than a foreign key, so the
    // purchases are matched back by the name/phone pair.
    const open = await tx.buy.findMany({
      where: {
        organizationId,
        vendorName: vendor?.name ?? undefined,
        ...(vendor?.phone ? { vendorPhone: vendor.phone } : {}),
      },
      include: { items: true },
      orderBy: { createdAt: 'asc' },
    })

    let remaining = amount
    const applied: Array<{ buyId: string; amount: number }> = []

    for (const buy of open) {
      if (remaining <= 0) break
      const due = dueFromItems(buy)
      if (due <= 0) continue

      const take = money(Math.min(remaining, due))
      await tx.payment.create({ data: { ...base, amount: take, buyId: buy.id } })
      await recomputeBuyPaid(tx, buy.id)
      applied.push({ buyId: buy.id, amount: take })
      remaining = money(remaining - take)
    }

    if (remaining > 0) {
      await tx.payment.create({ data: { ...base, amount: remaining, buyId: null } })
    }

    return { applied, unapplied: remaining }
  })
}

export interface SetPaidTotalArgs {
  organizationId: string
  sellId?: string
  buyId?: string
  customerId?: string | null
  target: number
}

/**
 * Sets an order's paid figure to an absolute value by booking the difference as
 * a payment.
 *
 * This backs the "Paid amount" field on the sell/buy edit form, which states a
 * running total rather than an increment. Routing it through the ledger keeps
 * the payment history authoritative instead of letting a form overwrite the
 * cached column and lose everything recorded before it.
 */
export async function setOrderPaidTotal(tx: Tx, args: SetPaidTotalArgs): Promise<number> {
  const { organizationId, sellId, buyId, customerId, target } = args

  const where = sellId ? { sellId } : { buyId }
  const agg = await tx.payment.aggregate({ where, _sum: { amount: true } })
  const current = money(toNumber(agg._sum.amount))
  const delta = money(money(target) - current)

  if (delta === 0) return current

  await tx.payment.create({
    data: {
      organizationId,
      direction: sellId ? 'in' : 'out',
      amount: delta,
      date: new Date(),
      method: 'cash',
      note: delta > 0 ? 'Recorded from the order form' : 'Correction from the order form',
      customerId: sellId ? customerId ?? null : null,
      sellId: sellId ?? null,
      buyId: buyId ?? null,
    },
  })

  return sellId ? recomputeSellPaid(tx, sellId) : recomputeBuyPaid(tx, buyId!)
}

export function listForSell(orgId: string | null | undefined, sellId: string) {
  const organizationId = requireOrg(orgId)
  return prisma.payment.findMany({ where: { organizationId, sellId }, orderBy: { date: 'desc' } })
}

export function listForBuy(orgId: string | null | undefined, buyId: string) {
  const organizationId = requireOrg(orgId)
  return prisma.payment.findMany({ where: { organizationId, buyId }, orderBy: { date: 'desc' } })
}

export function listForCustomer(orgId: string | null | undefined, customerId: string) {
  const organizationId = requireOrg(orgId)
  return prisma.payment.findMany({
    where: { organizationId, customerId },
    orderBy: { date: 'desc' },
  })
}

/** Removes a payment and re-derives the affected order's cached total. */
export async function removePayment(orgId: string | null | undefined, id: string) {
  const organizationId = requireOrg(orgId)

  const payment = await prisma.payment.findFirst({ where: { id, organizationId } })
  if (!payment) throw new NotFoundError('Payment not found')

  return prisma.$transaction(async (tx) => {
    await tx.payment.delete({ where: { id } })
    if (payment.sellId) await recomputeSellPaid(tx, payment.sellId)
    if (payment.buyId) await recomputeBuyPaid(tx, payment.buyId)
    return { ok: true }
  })
}

export interface LedgerRow {
  name: string
  phone: string
  invoiced: number
  paid: number
  due: number
  openInvoices: number
  oldestUnpaidAt: Date | null
  credit?: number
}

/** Who owes money, worst first — the list the collection workflow runs off. */
export async function receivables(orgId?: string | null) {
  const organizationId = requireOrg(orgId)

  const sells = await prisma.sell.findMany({
    where: { organizationId, status: { not: 'cancelled' } },
    include: { items: true, customer: { select: { id: true, name: true, phone: true } } },
    orderBy: { createdAt: 'asc' },
  })

  const byCustomer = new Map<string, LedgerRow & { customerId: string }>()

  for (const sell of sells) {
    const due = dueFromItems(sell)
    const id = sell.customerId

    let row = byCustomer.get(id)
    if (!row) {
      row = {
        customerId: id,
        name: sell.customer?.name ?? 'Customer',
        phone: sell.customer?.phone ?? '',
        invoiced: 0,
        paid: 0,
        due: 0,
        openInvoices: 0,
        oldestUnpaidAt: null,
      }
      byCustomer.set(id, row)
    }

    row.invoiced = money(row.invoiced + grandTotalFromItems(sell))
    row.paid = money(row.paid + toNumber(sell.paidAmount))
    if (due > 0) {
      row.due = money(row.due + due)
      row.openInvoices += 1
      // Rows are ordered oldest-first, so the first unpaid one wins.
      if (!row.oldestUnpaidAt) row.oldestUnpaidAt = sell.createdAt
    }
  }

  // Unapplied credit reduces what a customer actually owes.
  const credits = await prisma.payment.groupBy({
    by: ['customerId'],
    where: { organizationId, direction: 'in', sellId: null, customerId: { not: null } },
    _sum: { amount: true },
  })

  for (const credit of credits) {
    const row = credit.customerId ? byCustomer.get(credit.customerId) : null
    if (!row) continue
    row.credit = money(toNumber(credit._sum.amount))
    row.due = money(Math.max(0, row.due - row.credit))
  }

  return [...byCustomer.values()].filter((row) => row.due > 0).sort((a, b) => b.due - a.due)
}

/**
 * The mirror of `receivables`: who YOU owe, worst first.
 *
 * Purchases are grouped by the vendor name/phone pair and matched back to the
 * vendor master where one exists. A purchase typed against a vendor that was
 * never saved still appears — it is money owed either way.
 */
export async function payables(orgId?: string | null) {
  const organizationId = requireOrg(orgId)

  const [buys, vendors] = await Promise.all([
    prisma.buy.findMany({
      where: { organizationId },
      include: { items: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.vendor.findMany({
      where: { organizationId },
      select: { id: true, name: true, phone: true },
    }),
  ])

  const vendorByKey = new Map(vendors.map((v) => [`${v.name}|${v.phone ?? ''}`, v]))
  const byVendor = new Map<string, LedgerRow & { vendorId: string | null }>()

  for (const buy of buys) {
    const name = buy.vendorName ?? 'Vendor'
    const phone = buy.vendorPhone ?? ''
    const key = `${name}|${phone}`
    const due = dueFromItems(buy)

    let row = byVendor.get(key)
    if (!row) {
      row = {
        vendorId: vendorByKey.get(key)?.id ?? null,
        name,
        phone,
        invoiced: 0,
        paid: 0,
        due: 0,
        openInvoices: 0,
        oldestUnpaidAt: null,
      }
      byVendor.set(key, row)
    }

    row.invoiced = money(row.invoiced + grandTotalFromItems(buy))
    row.paid = money(row.paid + toNumber(buy.paidAmount))
    if (due > 0) {
      row.due = money(row.due + due)
      row.openInvoices += 1
      if (!row.oldestUnpaidAt) row.oldestUnpaidAt = buy.createdAt
    }
  }

  return [...byVendor.values()].filter((row) => row.due > 0).sort((a, b) => b.due - a.due)
}

export type { Prisma }
