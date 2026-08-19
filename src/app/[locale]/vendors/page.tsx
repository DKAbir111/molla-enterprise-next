'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { MapPin, Phone } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  ContactCell,
  CountBadge,
  DeleteConfirmationModal,
  EmptyState,
  Fab,
  IconTextCell,
  PageToolbar,
  RowActions,
  StatRail,
  StatTile,
} from '@/components/shared'
import { VendorModal } from '@/components/vendors/VendorModal'
import { listBuys, listVendors, deleteVendor } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { grandTotalOf } from '@/lib/totals'
import type { Buy, Vendor } from '@/types'

/** A vendor plus the figures rolled up from their purchase history. */
type VendorRow = {
  vendor: Vendor
  purchases: number
  totalSpent: number
  totalDue: number
  since?: Date
  lastPurchase?: Date
}

/**
 * Buys carry the vendor's name and phone rather than a foreign key, so a row is
 * matched on that pair. Keep the key construction in one place — building it
 * differently on either side silently produced vendors with no purchases.
 */
function vendorKey(name: string, phone?: string | null) {
  return `${name}|${phone || ''}`
}

/** Detail route for a vendor. Also encodes the name/phone pair. */
function vendorHref(v: Vendor) {
  return `/vendors/${encodeURIComponent(v.name)}--${encodeURIComponent(v.phone || '')}`
}

export default function VendorsPage() {
  const t = useTranslations('vendors')
  const locale = useLocale()
  const [buys, setBuys] = useState<Buy[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [modal, setModal] = useState<{ open: boolean; mode: 'create' | 'edit'; vendor?: Vendor | null }>({
    open: false,
    mode: 'create',
    vendor: null,
  })
  const [vendorToDelete, setVendorToDelete] = useState<Vendor | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let mounted = true
    Promise.all([listBuys<Buy[]>(), listVendors<Vendor[]>()])
      .then(([b, v]) => {
        if (!mounted) return
        setBuys(b || [])
        setVendors(v || [])
      })
      .catch(() => { })
    return () => { mounted = false }
  }, [])

  const rows: VendorRow[] = useMemo(() => {
    const map = new Map<string, VendorRow>()
    for (const v of vendors) {
      map.set(vendorKey(v.name, v.phone), {
        vendor: v,
        purchases: 0,
        totalSpent: 0,
        totalDue: 0,
        since: v.createdAt ? new Date(v.createdAt) : undefined,
      })
    }

    for (const b of buys) {
      // Only aggregate onto vendors that exist in the master list; a buy whose
      // vendor was deleted should not resurrect a row.
      const row = map.get(vendorKey(b.vendorName || 'Vendor', b.vendorPhone))
      if (!row) continue

      const grand = grandTotalOf(b)
      row.purchases += 1
      row.totalSpent += grand
      row.totalDue += Math.max(0, grand - Number(b.paidAmount || 0))

      const at = b.createdAt ? new Date(b.createdAt) : undefined
      if (at && (!row.since || at < row.since)) row.since = at
      if (at && (!row.lastPurchase || at > row.lastPurchase)) row.lastPurchase = at
    }
    return Array.from(map.values())
  }, [buys, vendors])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return rows.filter(
      (r) => r.vendor.name.toLowerCase().includes(q) || (r.vendor.phone || '').toLowerCase().includes(q)
    )
  }, [rows, search])

  const totals = useMemo(
    () => ({
      vendors: rows.length,
      purchases: rows.reduce((s, r) => s + r.purchases, 0),
      spent: rows.reduce((s, r) => s + r.totalSpent, 0),
      due: rows.reduce((s, r) => s + r.totalDue, 0),
    }),
    [rows]
  )

  const openCreate = () => setModal({ open: true, mode: 'create', vendor: null })

  return (
    <div className="space-y-6">
      <PageToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t('search')}
        actionLabel={t('addVendor')}
        onAction={openCreate}
      />

      <StatRail>
        <StatTile label={t('vendorsCount')} value={totals.vendors} />
        <StatTile label={t('purchases')} value={totals.purchases} />
        <StatTile label={t('totalSpent')} value={formatCurrency(totals.spent, locale)} tone="text-info" />
        <StatTile label={t('totalDue')} value={formatCurrency(totals.due, locale)} tone="text-warning" />
      </StatRail>

      {filtered.length === 0 ? (
        <EmptyState
          title={t('emptyTitle')}
          description={t('emptyDescription')}
          actionLabel={t('addVendor')}
          onAction={openCreate}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('name')}</TableHead>
                  <TableHead>{t('phone')}</TableHead>
                  <TableHead>{t('address')}</TableHead>
                  <TableHead className="text-center">{t('totalPurchases')}</TableHead>
                  <TableHead className="text-right">{t('totalSpent')}</TableHead>
                  <TableHead className="text-right">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow key={row.vendor.id}>
                    {/* `data-primary` makes this the card headline on mobile;
                        `data-label` turns the rest into labelled rows. */}
                    <TableCell className="font-medium" data-primary="">
                      <ContactCell
                        name={row.vendor.name}
                        href={vendorHref(row.vendor)}
                        subtitle={`${t('since')} ${row.since ? formatDate(row.since, locale) : '-'}`}
                      />
                    </TableCell>
                    <TableCell data-label={t('phone')}>
                      <IconTextCell icon={Phone} value={row.vendor.phone} />
                    </TableCell>
                    <TableCell data-label={t('address')}>
                      <IconTextCell icon={MapPin} value={row.vendor.address} />
                    </TableCell>
                    <TableCell className="md:text-center" data-label={t('totalPurchases')}>
                      <CountBadge value={row.purchases} />
                    </TableCell>
                    <TableCell className="font-medium md:text-right" data-label={t('totalSpent')}>
                      {formatCurrency(row.totalSpent, locale)}
                    </TableCell>
                    <TableCell className="md:text-right">
                      <RowActions
                        viewHref={vendorHref(row.vendor)}
                        onEdit={() => setModal({ open: true, mode: 'edit', vendor: row.vendor })}
                        onDelete={() => setVendorToDelete(row.vendor)}
                        labels={{ view: t('view'), edit: t('edit'), delete: t('delete') }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Fab onClick={openCreate} label={t('addVendor')} />

      <VendorModal
        open={modal.open}
        mode={modal.mode}
        vendor={modal.vendor || null}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
        onSaved={(v: Vendor) =>
          setVendors((prev) =>
            modal.mode === 'edit' ? prev.map((x) => (x.id === v.id ? v : x)) : [...prev, v]
          )
        }
      />

      {vendorToDelete && (
        <DeleteConfirmationModal
          isOpen
          onClose={() => setVendorToDelete(null)}
          onConfirm={async () => {
            const id = vendorToDelete.id
            try {
              await deleteVendor(id)
              setVendors((prev) => prev.filter((x) => x.id !== id))
            } catch { }
            setVendorToDelete(null)
          }}
          title={t('deleteTitle')}
          description={t('deleteConfirm', { name: vendorToDelete.name })}
        />
      )}
    </div>
  )
}
