import type { Prisma } from '@prisma/client'

/**
 * Money helpers.
 *
 * Prisma returns `Decimal` for currency columns, which is correct for storage
 * but does not survive arithmetic with plain numbers. Everything is funnelled
 * through `toNumber` first so a Decimal, a numeric string and a number all
 * behave the same.
 *
 * The grand-total and due formulas live here rather than being retyped at each
 * call site. They were duplicated in five services, which is exactly how two of
 * them end up disagreeing about whether transport is taxable.
 */

export type Numeric = Prisma.Decimal | number | string | null | undefined

export function toNumber(value: Numeric): number {
  if (value == null) return 0
  if (typeof value === 'number') return value
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export interface OrderAmounts {
  total: Numeric
  transportTotal: Numeric
  discount: Numeric
  paidAmount?: Numeric
}

/**
 * What the order is worth: line items plus transport, less the discount.
 * Floored at zero — a discount larger than the order should not read as a debt
 * owed back to the customer.
 */
export function grandTotal(order: OrderAmounts): number {
  const gross = toNumber(order.total) + toNumber(order.transportTotal) - toNumber(order.discount)
  return Math.max(0, gross)
}

/** What is still owed. Overpayment shows as settled, never as negative debt. */
export function amountDue(order: OrderAmounts): number {
  return Math.max(0, grandTotal(order) - toNumber(order.paidAmount))
}

/** Round to whole paisa, so repeated float arithmetic cannot drift a balance. */
export function money(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100
}

interface OrderWithItems {
  items?: Array<{ total: Numeric }> | null
  transportTotal: Numeric
  discount: Numeric
  paidAmount?: Numeric
}

/**
 * The same total, recomputed from the line items instead of the cached `total`
 * column.
 *
 * The ledger uses this variant: it is settling real money, so it derives the
 * invoice from its parts rather than trusting a denormalised column that a
 * concurrent edit may not have refreshed yet. Read paths that only need a
 * number for display use `grandTotal` and skip loading the items.
 */
export function grandTotalFromItems(order: OrderWithItems): number {
  const items = (order.items ?? []).reduce((sum, item) => sum + toNumber(item.total), 0)
  return money(Math.max(0, items + toNumber(order.transportTotal) - toNumber(order.discount)))
}

/** Outstanding balance on an invoice, derived from its line items. */
export function dueFromItems(order: OrderWithItems): number {
  return money(grandTotalFromItems(order) - toNumber(order.paidAmount))
}
