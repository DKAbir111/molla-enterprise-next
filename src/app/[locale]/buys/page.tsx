'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Printer } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  DateFilter,
  EmptyState,
  Fab,
  PageToolbar,
  RowActions,
  StatRail,
  StatTile,
} from '@/components/shared'
import { BuyModal } from '@/components/buys/BuyModal'
import { isWithinRange, type DateRange } from '@/lib/date-range'
import { formatCurrency, formatDate } from '@/lib/utils'
import { orderTotals } from '@/lib/totals'
import { listBuys, listProducts, normalizeProduct } from '@/lib/api'
import { Link } from '@/i18n/navigation'
import { useStore } from '@/store/useStore'
import type { Buy } from '@/types'

export default function BuysPage() {
  const t = useTranslations('buys')
  const locale = useLocale()
  const [buys, setBuys] = useState<Buy[]>([])
  const [search, setSearch] = useState('')
  const [range, setRange] = useState<DateRange>({})
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Buy | null>(null)
  const { products, addProduct } = useStore()

  useEffect(() => {
    let mounted = true
    listBuys<Buy[]>()
      .then((res) => { if (mounted) setBuys(res || []) })
      .catch(() => { })
    if (products.length === 0) {
      listProducts()
        .then((res) => { (res || []).map(normalizeProduct).forEach(addProduct) })
        .catch(() => { })
    }
    return () => { mounted = false }
  }, [products.length, addProduct])

  const inRange = useMemo(
    () => buys.filter((b) => isWithinRange(b.createdAt, range)),
    [buys, range]
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return inRange.filter((b) => q === '' || String(b.vendorName || '').toLowerCase().includes(q))
  }, [inRange, search])

  // Totals follow the selected range, so "Today" answers what was bought today
  // rather than repeating the all-time figure.
  const stats = useMemo(() => {
    let spent = 0, paid = 0, due = 0
    for (const b of inRange) {
      const totals = orderTotals(b)
      spent += totals.grand
      paid += totals.paid
      due += totals.due
    }
    return { total: inRange.length, spent, paid, due }
  }, [inRange])

  const reload = () => { listBuys<Buy[]>().then(setBuys).catch(() => { }) }

  return (
    <div className="space-y-6">
      <PageToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t('search')}
        actionLabel={t('new')}
        onAction={() => setCreateOpen(true)}
      >
        <DateFilter value={range} onChange={(v) => setRange({ start: v.start, end: v.end })} />
      </PageToolbar>

      <StatRail>
        <StatTile label={t('totalPurchases')} value={stats.total} />
        <StatTile label={t('totalSpent')} value={formatCurrency(stats.spent, locale)} tone="text-info" />
        <StatTile label={t('totalPaid')} value={formatCurrency(stats.paid, locale)} tone="text-success" />
        <StatTile label={t('totalDue')} value={formatCurrency(stats.due, locale)} tone="text-warning" />
      </StatRail>

      {filtered.length === 0 ? (
        <EmptyState
          title={t('emptyTitle')}
          description={t('emptyDescription')}
          actionLabel={t('new')}
          onAction={() => setCreateOpen(true)}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('vendor')}</TableHead>
                  <TableHead>{t('date')}</TableHead>
                  <TableHead className="text-right">{t('paidDue')}</TableHead>
                  <TableHead className="text-right">{t('total')}</TableHead>
                  <TableHead className="text-right">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((b) => {
                  const { grand, paid, due } = orderTotals(b)
                  return (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium" data-primary="">{b.vendorName || '-'}</TableCell>
                      <TableCell data-label={t('date')}>{formatDate(b.createdAt, locale)}</TableCell>
                      <TableCell className="md:text-right" data-label={t('paidDue')}>
                        {formatCurrency(paid, locale)} / {formatCurrency(due, locale)}
                      </TableCell>
                      <TableCell className="font-medium md:text-right" data-label={t('total')}>
                        {formatCurrency(grand, locale)}
                      </TableCell>
                      <TableCell className="md:text-right">
                        <div className="flex items-center justify-end gap-1">
                          <RowActions
                            viewHref={`/buys/${b.id}`}
                            onEdit={() => setEditing(b)}
                            labels={{ view: t('view'), edit: t('edit'), delete: t('delete') }}
                          />
                          {/* Printing happens on the detail page, which owns the
                              print stylesheet — this is a shortcut to it. */}
                          <Link
                            href={`/buys/${b.id}`}
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

      <Fab onClick={() => setCreateOpen(true)} label={t('new')} />

      {createOpen && (
        <BuyModal open mode="create" onClose={() => setCreateOpen(false)} onSaved={reload} />
      )}
      {editing && (
        <BuyModal
          open
          mode="edit"
          buy={editing}
          onClose={() => setEditing(null)}
          onSaved={(b: Buy) => setBuys((prev) => prev.map((x) => (x.id === b.id ? b : x)))}
        />
      )}
    </div>
  )
}
