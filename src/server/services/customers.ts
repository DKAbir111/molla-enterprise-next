import { Prisma } from '@prisma/client'
import { prisma } from '../db'
import { NotFoundError } from '../http/errors'
import { requireOrg, withPublicAvatar } from './scope'

export interface CustomerInput {
  name: string
  phone: string
  email?: string
  address: string
  avatarUrl?: string
}

interface SpendRow {
  customerId: string
  orders: number
  total_spent: Prisma.Decimal | number | null
}

/**
 * Customers, each with the order count and lifetime spend shown on the list.
 *
 * "Total spent" has to mean the same thing here as everywhere else in the app:
 * line items + transport - discount, with cancelled orders excluded. Summing
 * `SellItem.total` alone would ignore both adjustments and count cancellations.
 *
 * The per-sell figures come through a LATERAL subquery rather than a plain join.
 * Joining `SellItem` directly would repeat each order's transport and discount
 * once per line item, inflating every multi-item order.
 */
export async function listCustomers(orgId?: string | null) {
  const organizationId = requireOrg(orgId)

  const [customers, spend] = await Promise.all([
    prisma.customer.findMany({ where: { organizationId }, orderBy: { createdAt: 'desc' } }),
    prisma.$queryRaw<SpendRow[]>`
      SELECT s."customerId" AS "customerId",
             COUNT(*)::int  AS orders,
             COALESCE(SUM(GREATEST(li.items_total + s."transportTotal" - s."discount", 0)), 0) AS total_spent
      FROM "Sell" s
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(si."total"), 0) AS items_total
        FROM "SellItem" si
        WHERE si."sellId" = s."id"
      ) li ON TRUE
      WHERE s."organizationId" = ${organizationId}
        AND s."status" <> 'cancelled'
      GROUP BY s."customerId"
    `,
  ])

  const byCustomer = new Map(
    spend.map((row) => [
      String(row.customerId),
      { orders: Number(row.orders ?? 0), totalSpent: row.total_spent ?? 0 },
    ]),
  )

  return customers.map((customer) => {
    const totals = byCustomer.get(customer.id) ?? { orders: 0, totalSpent: 0 }
    return {
      ...withPublicAvatar(customer),
      totalOrders: totals.orders,
      totalSpent: totals.totalSpent,
    }
  })
}

export async function getCustomer(orgId: string | null | undefined, id: string) {
  const organizationId = requireOrg(orgId)
  const customer = await prisma.customer.findFirst({ where: { id, organizationId } })
  if (!customer) throw new NotFoundError('Customer not found')
  return withPublicAvatar(customer)
}

export async function createCustomer(orgId: string | null | undefined, input: CustomerInput) {
  const organizationId = requireOrg(orgId)
  return prisma.customer.create({ data: { ...input, organizationId } })
}

export async function updateCustomer(
  orgId: string | null | undefined,
  id: string,
  input: Partial<CustomerInput>,
) {
  // Scoped existence check first, so a customer belonging to another
  // organization reports "not found" rather than being quietly updated.
  await getCustomer(orgId, id)
  const updated = await prisma.customer.update({ where: { id }, data: input })
  return withPublicAvatar(updated)
}

export async function deleteCustomer(orgId: string | null | undefined, id: string) {
  await getCustomer(orgId, id)
  await prisma.customer.delete({ where: { id } })
  return { ok: true }
}
