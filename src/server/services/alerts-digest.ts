import { prisma } from '../db'
import { getAlerts } from './alerts'
import { sendGeneric } from './mail'

/**
 * The daily alerts digest.
 *
 * In the NestJS build this was an `@Cron` decorator on a long-lived process. A
 * Next.js deployment has no such process — nothing is running between requests
 * — so the schedule moves out of the app and into the platform: `vercel.json`
 * calls `/api/cron/alerts-digest` once a day, and this runs one pass.
 */

const ITEMS_PER_SECTION = 5
const AGING_ORDER_HOURS = 24

type AlertsPayload = Awaited<ReturnType<typeof getAlerts>>

/** How many things actually need attention. Zero means send nothing. */
function countAlerts(data: AlertsPayload): number {
  return (
    data.lowStock.count +
    data.pendingOrders.agingCount +
    data.receivables.count +
    data.payables.count
  )
}

function section<T>(title: string, items: T[] | undefined, format: (item: T) => string): string {
  if (!items || items.length === 0) return ''
  const rows = items
    .slice(0, ITEMS_PER_SECTION)
    .map((item) => `<li>${format(item)}</li>`)
    .join('')
  return `<h3 style="margin:16px 0 8px;">${title}</h3><ul>${rows}</ul>`
}

function buildHtml(orgName: string, data: AlertsPayload): string {
  const body = [
    section('Low Stock', data.lowStock.items, (p) => `${p.name} — ${p.stock} left`),
    section(
      'Aging Orders',
      data.pendingOrders.items.filter((order) => order.ageHours >= AGING_ORDER_HOURS),
      (order) => `#${order.id.slice(0, 6)} — ${order.customerName} — ${order.ageHours}h`,
    ),
    section('Receivables', data.receivables.items, (r) => `${r.customerName} — Due ${r.due}`),
    section('Payables', data.payables.items, (p) => `${p.vendorName} — Due ${p.due}`),
  ]
    .filter(Boolean)
    .join('')

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#111;font-size:14px;">
      <p>Hello from ${orgName}, here is your alerts summary.</p>
      ${body || '<p>No new alerts.</p>'}
      <p style="margin-top:20px;font-size:12px;color:#555;">You can control these emails in Settings → Notifications.</p>
    </div>
  `
}

export interface DigestResult {
  organizations: number
  sent: number
  skipped: number
  failed: number
}

/**
 * Sends one digest per opted-in organization.
 *
 * A failure for one organization must not stop the rest, so each is wrapped
 * individually and the outcome is counted rather than thrown.
 */
export async function sendDailyDigest(): Promise<DigestResult> {
  const optedIn = await prisma.organizationSettings.findMany({
    where: { emailAlerts: true },
    select: { organizationId: true },
  })

  const result: DigestResult = { organizations: optedIn.length, sent: 0, skipped: 0, failed: 0 }

  for (const { organizationId } of optedIn) {
    try {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { name: true, email: true, deletedAt: true },
      })

      // No address to send to, or the organization is disabled — nothing to do.
      if (!org?.email || org.deletedAt) {
        result.skipped += 1
        continue
      }

      const data = await getAlerts(organizationId, ITEMS_PER_SECTION)
      if (countAlerts(data) === 0) {
        result.skipped += 1
        continue
      }

      const ok = await sendGeneric(
        org.email,
        `Alerts summary for ${org.name}`,
        buildHtml(org.name, data),
      )

      if (ok) result.sent += 1
      else result.failed += 1
    } catch (error) {
      console.error(`[digest] organization ${organizationId} failed:`, error)
      result.failed += 1
    }
  }

  return result
}
