import { prisma } from '../db'
import { BadRequestError, NotFoundError } from '../http/errors'
import { requireOrg } from './scope'

/**
 * Manual income and expense entries — the "quick entry" ledger.
 *
 * Deliberately separate from `Payment`: payments settle invoices, whereas these
 * are standalone cash movements (rent, fuel, a one-off sale) with no order
 * behind them. Recording an invoice payment here as well is what used to make
 * Accounts count the same money twice.
 */

export interface TransactionInput {
  description: string
  type: string
  amount: number
  category?: string
  date?: string
}

export function listTransactions(orgId?: string | null) {
  const organizationId = requireOrg(orgId)
  return prisma.transaction.findMany({ where: { organizationId }, orderBy: { date: 'desc' } })
}

export function createTransaction(orgId: string | null | undefined, input: TransactionInput) {
  const organizationId = requireOrg(orgId)

  let date = new Date()
  if (input.date) {
    date = new Date(input.date)
    if (Number.isNaN(date.getTime())) throw new BadRequestError('Invalid date')
  }

  return prisma.transaction.create({
    data: {
      organizationId,
      description: input.description,
      type: input.type,
      amount: input.amount,
      // The column is non-null but the quick-entry form labels this field
      // "optional", and the old DTO required it — so submitting the form as
      // shown was rejected. Empty stands for "no category", which is what the
      // client already normalises a missing value to.
      category: input.category ?? '',
      date,
    },
  })
}

export async function deleteTransaction(orgId: string | null | undefined, id: string) {
  const organizationId = requireOrg(orgId)

  const existing = await prisma.transaction.findFirst({ where: { id, organizationId } })
  if (!existing) throw new NotFoundError('Transaction not found')

  await prisma.transaction.delete({ where: { id } })
  return { ok: true }
}
