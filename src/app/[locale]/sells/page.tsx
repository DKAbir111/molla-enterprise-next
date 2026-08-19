'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DateFilter,
  EmptyState,
  Fab,
  PageToolbar,
  RowActions,
  StatRail,
  StatTile,
} from '@/components/shared'
import { ReceivePaymentDialog } from '@/components/payments/ReceivePaymentDialog'
import { SellModal } from '@/components/sells/SellModal'
import { Link } from '@/i18n/navigation'
import { isWithinRange, type DateRange } from '@/lib/date-range'
import { useStore } from '@/store/useStore'
import { formatCurrency, formatDate, formatOrderCode } from '@/lib/utils'
import { orderTotals } from '@/lib/totals'
import { listSells, updateSell as apiUpdateSell, normalizeOrder } from '@/lib/api'
import { Printer, HandCoins } from 'lucide-react'
import { toast } from 'sonner'
import type { Order, OrderStatus } from '@/types'

export default function SellsPage() {
  const t = useTranslations('sells')
  const tPay = useTranslations('payments')
  const locale = useLocale()
  const { sells, addSell } = useStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [range, setRange] = useState<DateRange>({})
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Order | null>(null)
  const [payTarget, setPayTarget] = useState<(Order & { due: number }) | null>(null)
  const updateSellStatus = useStore((s) => s.updateSellStatus)

  useEffect(() => {
    let mounted = true
    if (sells.length === 0) {
      listSells()
        .then((res) => { if (!mounted) return; (res || []).map(normalizeOrder).forEach(addSell) })
        .catch(() => { })
    }
    return () => { mounted = false }
  }, [sells.length, addSell])

  const filtered = sells.filter((o) => {
    if (!isWithinRange(o.createdAt, range)) return false
    const q = searchQuery.toLowerCase()
    const code = formatOrderCode(o.id, o.createdAt).toLowerCase()
    return o.customerName.toLowerCase().includes(q) || o.id.toLowerCase().includes(q) || code.includes(q)
  })

  // Counted from the date-filtered set, not the whole table — picking "Today"
  // has to answer "how much did I sell today", which it cannot do if the tiles
  // keep reporting all-time figures.
  const inRange = useMemo(() => sells.filter((o) => isWithinRange(o.createdAt, range)), [sells, range])

  const stats = useMemo(() => ({
    total: inRange.length,
    pending: inRange.filter(s => s.status === 'pending').length,
    processing: inRange.filter(s => s.status === 'processing').length,
    delivered: inRange.filter(s => s.status === 'delivered').length,
    cancelled: inRange.filter(s => s.status === 'cancelled').length,
  }), [inRange])

  return (
    <div className="space-y-6">
      <PageToolbar
        search={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={t('search')}
        actionLabel={t('newOrder')}
        onAction={() => setModalOpen(true)}
      >
        <DateFilter value={range} onChange={(v) => setRange({ start: v.start, end: v.end })} />
      </PageToolbar>

      {/* Mini Dashboard */}
      <StatRail className="md:grid-cols-5">
        <StatTile label={t('statTotal')} value={stats.total} />
        <StatTile label={t('orderStatus.pending')} value={stats.pending} tone="text-warning" />
        <StatTile label={t('orderStatus.processing')} value={stats.processing} tone="text-info" />
        <StatTile label={t('orderStatus.delivered')} value={stats.delivered} tone="text-success" />
        <StatTile label={t('orderStatus.cancelled')} value={stats.cancelled} tone="text-danger" />
      </StatRail>

      {filtered.length === 0 ? (
        <EmptyState
          title={t('emptyTitle')}
          description={t('emptyDescription')}
          actionLabel={t('newOrder')}
          onAction={() => setModalOpen(true)}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('orderId')}</TableHead>
                  <TableHead>{t('customer')}</TableHead>
                  <TableHead>{t('date')}</TableHead>
                  <TableHead className="text-right">{t('status')}</TableHead>
                  <TableHead className="text-right">{t('paidDue')}</TableHead>
                  <TableHead className="text-right">{t('total')}</TableHead>
                  <TableHead className="text-right">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((o) => {
                  const { grand, paid, due } = orderTotals(o)
                  return (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium" data-primary="">{formatOrderCode(o.id, o.createdAt)}</TableCell>
                      <TableCell data-label={t('customer')}>{o.customerName}</TableCell>
                      <TableCell data-label={t('date')}>{formatDate(o.createdAt, locale)}</TableCell>
                      <TableCell className="md:text-right" data-label={t('status')}>
                        <div className="w-36 ml-auto">
                          <Select
                            value={o.status}
                            onValueChange={async (v) => {
                              const next = v as OrderStatus
                              const prev = o.status
                              try {
                                updateSellStatus(o.id, next)
                                await apiUpdateSell(o.id, { status: next })
                                toast.success(t('statusUpdated'))
                              } catch {
                                updateSellStatus(o.id, prev)
                                toast.error(t('statusUpdateFailed'))
                              }
                            }}
                          >
                            <SelectTrigger className="h-10 px-2 py-1 text-xs md:h-8">
                              <SelectValue placeholder={t('orderStatus.pending')} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">{t('orderStatus.pending')}</SelectItem>
                              <SelectItem value="processing">{t('orderStatus.processing')}</SelectItem>
                              <SelectItem value="delivered">{t('orderStatus.delivered')}</SelectItem>
                              <SelectItem value="cancelled">{t('orderStatus.cancelled')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                      <TableCell className="md:text-right" data-label={t('paidDue')}>{formatCurrency(paid, locale)} / {formatCurrency(due, locale)}</TableCell>
                      <TableCell className="font-medium md:text-right" data-label={t('total')}>{formatCurrency(grand, locale)}</TableCell>
                      <TableCell className="md:text-right">
                        <div className="flex items-center justify-end gap-1">
                          <RowActions
                            viewHref={`/sells/${o.id}`}
                            onEdit={() => setEditing(o)}
                            labels={{ view: t('view'), edit: t('edit'), delete: t('delete') }}
                          />
                          {due > 0 && o.status !== 'cancelled' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="tap text-success hover:text-success"
                              title={tPay('receivePayment')}
                              aria-label={tPay('receivePayment')}
                              onClick={() => setPayTarget({ ...o, due })}
                            >
                              <HandCoins className="h-4 w-4" />
                            </Button>
                          )}
                          {/* Printing lives on the detail page, which owns the
                              print stylesheet — this is a shortcut to it. */}
                          <Link
                            href={`/sells/${o.id}`}
                            title={t('print')}
                            aria-label={t('print')}
                            className="tap inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-surface-hover"
                          >
                            <Printer className="h-4 w-4" />
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {modalOpen && (
        <SellModal open={modalOpen} mode="create" onClose={() => setModalOpen(false)} />
      )}

      <Fab onClick={() => setModalOpen(true)} label={t('newOrder')} />

      {payTarget && (
        <ReceivePaymentDialog
          open
          onClose={() => setPayTarget(null)}
          customerId={payTarget.customerId}
          customerName={payTarget.customerName}
          outstanding={payTarget.due}
          sellId={payTarget.id}
          locale={locale}
          onRecorded={() => {
            // paidAmount is derived server-side now, so refetch rather than
            // guessing the new figure locally.
            listSells()
              .then((res) => { (res || []).map(normalizeOrder).forEach(addSell) })
              .catch(() => { })
          }}
        />
      )}

      {editing && (
        <SellModal open mode="edit" onClose={() => setEditing(null)} sell={editing} />
      )}
    </div>
  )
}
