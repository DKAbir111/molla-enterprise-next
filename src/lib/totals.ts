/**
 * Order and purchase totals, for the browser.
 *
 * `src/server/services/money.ts` owns these formulas on the server, but it is
 * server-only (it imports Prisma types), so components cannot reach it. This is
 * the client-side counterpart and it must stay in agreement with that file.
 *
 * It exists because the same expression —
 *   `Math.max(0, items + transport - discount)`
 * — was written out by hand in ten places: both list pages, both detail pages,
 * the vendor and customer account panels, the dashboard rail and the reports
 * panel. Ten copies is ten chances for one of them to disagree about whether
 * the discount applies before or after transport.
 *
 * If you change a formula here, change `money.ts` to match.
 */

type Numeric = number | string | null | undefined

export interface LineItem {
  total?: Numeric
}

export interface OrderLike {
  items?: LineItem[] | null
  /** Cached line-item total. Only trusted when `items` is absent. */
  total?: Numeric
  transportTotal?: Numeric
  discount?: Numeric
  paidAmount?: Numeric
}

/** Coerce anything the API might hand back — number, numeric string, null. */
export function toNumber(value: Numeric): number {
  if (value == null) return 0
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

/**
 * Sum of the line items, preferring the items themselves over the cached
 * `total` column — the column can lag behind a concurrent edit.
 */
export function itemsTotalOf(order: OrderLike): number {
  if (order?.items?.length) {
    return order.items.reduce((sum, item) => sum + toNumber(item?.total), 0)
  }
  return toNumber(order?.total)
}

/**
 * What the order is worth: line items plus transport, less the discount.
 * Floored at zero, so a discount larger than the order does not read as money
 * owed back to the customer.
 */
export function grandTotalOf(order: OrderLike): number {
  return Math.max(0, itemsTotalOf(order) + toNumber(order?.transportTotal) - toNumber(order?.discount))
}

/** What is still owed. Overpayment shows as settled, never as negative debt. */
export function amountDueOf(order: OrderLike): number {
  return Math.max(0, grandTotalOf(order) - toNumber(order?.paidAmount))
}

/** Every figure a totals panel needs, computed once. */
export function orderTotals(order: OrderLike) {
  const itemsTotal = itemsTotalOf(order)
  const discount = toNumber(order?.discount)
  const transport = toNumber(order?.transportTotal)
  const grand = Math.max(0, itemsTotal + transport - discount)
  const paid = toNumber(order?.paidAmount)
  return { itemsTotal, discount, transport, grand, paid, due: Math.max(0, grand - paid) }
}
