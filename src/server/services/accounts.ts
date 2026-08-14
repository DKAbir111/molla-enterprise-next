import { prisma } from '../db'
import { requireOrg } from './scope'
import { grandTotal, toNumber } from './money'

/**
 * The accounts summary: income, expenses, six months of both, and a combined
 * recent-activity feed.
 *
 * ACCRUAL BASIS. Income is what was invoiced, not what was collected, so an
 * order's own total is the income and its payments are not income a second
 * time. Only user-entered transactions (`source: 'manual'`) are added: the sell
 * and buy services used to auto-create a Transaction per payment, and summing
 * those alongside the order totals double-counted every paid order. Those
 * movements live in the Payment ledger now.
 */

const MONTHS_SHOWN = 6
const RECENT_LIMIT = 10

interface MonthBucket {
  key: string
  label: string
  income: number
  expense: number
}

/** Bucket key for a date — year and month only. */
function monthKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}`
}

/** Six buckets ending with the current month, oldest first. */
function buildBuckets(now: Date): MonthBucket[] {
  return Array.from({ length: MONTHS_SHOWN }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (MONTHS_SHOWN - 1 - index), 1)
    return { key: monthKey(date), label: date.toISOString().slice(0, 7), income: 0, expense: 0 }
  })
}

export async function getAccountsSummary(orgId?: string | null) {
  const organizationId = requireOrg(orgId)

  const [sells, buys, transactions] = await Promise.all([
    prisma.sell.findMany({
      where: { organizationId, status: { not: 'cancelled' } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        total: true,
        discount: true,
        transportTotal: true,
        customer: { select: { name: true } },
      },
    }),
    prisma.buy.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        vendorName: true,
        createdAt: true,
        total: true,
        discount: true,
        transportTotal: true,
      },
    }),
    prisma.transaction.findMany({
      where: { organizationId, source: 'manual' },
      orderBy: { date: 'desc' },
    }),
  ])

  const manualIncome = transactions
    .filter((txn) => txn.type === 'income')
    .reduce((sum, txn) => sum + Math.max(0, toNumber(txn.amount)), 0)
  const manualExpense = transactions
    .filter((txn) => txn.type === 'expense')
    .reduce((sum, txn) => sum + Math.max(0, toNumber(txn.amount)), 0)

  const income = sells.reduce((sum, sell) => sum + grandTotal(sell), 0) + manualIncome
  const expenses = buys.reduce((sum, buy) => sum + grandTotal(buy), 0) + manualExpense

  const buckets = buildBuckets(new Date())
  const bucketByKey = new Map(buckets.map((bucket) => [bucket.key, bucket]))

  for (const sell of sells) {
    const bucket = bucketByKey.get(monthKey(sell.createdAt))
    if (bucket) bucket.income += grandTotal(sell)
  }

  for (const buy of buys) {
    const bucket = bucketByKey.get(monthKey(buy.createdAt))
    if (bucket) bucket.expense += grandTotal(buy)
  }

  for (const txn of transactions) {
    const bucket = bucketByKey.get(monthKey(txn.date))
    if (!bucket) continue
    const amount = Math.max(0, toNumber(txn.amount))
    if (txn.type === 'income') bucket.income += amount
    else bucket.expense += amount
  }

  // One feed from three sources, newest first. The id is prefixed because the
  // three tables have independent uuid spaces and React needs a unique key.
  const recent = [
    ...sells.map((sell) => ({
      id: `sell-${sell.id}`,
      type: 'income' as const,
      description: `Sale - ${sell.customer?.name ?? 'Customer'}`,
      amount: grandTotal(sell),
      date: sell.createdAt,
    })),
    ...buys.map((buy) => ({
      id: `buy-${buy.id}`,
      type: 'expense' as const,
      description: `Purchase - ${buy.vendorName ?? 'Vendor'}`,
      amount: grandTotal(buy),
      date: buy.createdAt,
    })),
    ...transactions.map((txn) => ({
      id: `txn-${txn.id}`,
      type: (txn.type === 'income' ? 'income' : 'expense') as 'income' | 'expense',
      description: txn.description,
      amount: Math.max(0, toNumber(txn.amount)),
      date: txn.date,
    })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, RECENT_LIMIT)

  return {
    totals: { income, expenses, net: income - expenses },
    monthly: buckets.map((bucket) => ({
      month: bucket.label,
      income: bucket.income,
      expense: bucket.expense,
    })),
    recent,
  }
}
