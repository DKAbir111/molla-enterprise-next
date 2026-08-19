'use client'

import { useState, useEffect, useMemo } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { MapPin, Phone } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { CustomerModal } from '@/components/customers/CustomerModal'
import { useStore } from '@/store/useStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  listCustomers as fetchCustomers,
  deleteCustomer as apiDeleteCustomer,
  normalizeCustomer,
} from '@/lib/api'
import type { Customer } from '@/types'

export default function CustomersPage() {
  const t = useTranslations('customers')
  const locale = useLocale()
  const { customers, addCustomer } = useStore()
  const updateCustomer = useStore((s) => s.updateCustomer)
  const [searchQuery, setSearchQuery] = useState('')
  const [modal, setModal] = useState<{ open: boolean; mode: 'create' | 'edit'; customer?: Customer | null }>({ open: false, mode: 'create', customer: null })
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null)

  // Load from API
  useEffect(() => {
    let mounted = true
    fetchCustomers()
      .then((res) => {
        if (!mounted) return
        const incoming = (res || []).map(normalizeCustomer)
        // Read the current list imperatively: naming `customers` as a
        // dependency would re-run this effect on every write it performs.
        const existing = useStore.getState().customers
        incoming.forEach((c) => {
          const exists = existing.find((x) => x.id === c.id)
          if (exists) {
            // Update totals and any changed fields
            updateCustomer(c.id, c)
          } else {
            addCustomer(c)
          }
        })
      })
      .catch(() => { })
    return () => { mounted = false }
  }, [addCustomer, updateCustomer])

  // Backend now includes aggregates in /customers; no client aggregation needed

  // Mini dashboard stats (always show, even if empty)
  const stats = useMemo(() => {
    const total = customers.length
    const active = customers.filter(c => (c.totalOrders || 0) > 0).length
    const totalRevenue = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0)
    const totalOrders = customers.reduce((sum, c) => sum + (c.totalOrders || 0), 0)
    const avgOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders) : 0
    return { total, active, totalRevenue, avgOrderValue }
  }, [customers])

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return customers.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(searchQuery))
  }, [customers, searchQuery])

  const openCreate = () => setModal({ open: true, mode: 'create', customer: null })

  return (
    <div className="space-y-6">
      <PageToolbar
        search={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={t('search')}
        actionLabel={t('addCustomer')}
        onAction={openCreate}
      />

      <StatRail>
        <StatTile label={t('totalCustomers')} value={stats.total} />
        <StatTile label={t('activeCustomers')} value={stats.active} tone="text-success" />
        <StatTile label={t('totalRevenue')} value={formatCurrency(stats.totalRevenue, locale)} tone="text-info" />
        <StatTile label={t('avgOrderValue')} value={formatCurrency(stats.avgOrderValue, locale)} />
      </StatRail>

      {filteredCustomers.length === 0 ? (
        <EmptyState
          title={t('emptyTitle')}
          description={t('emptyDescription')}
          actionLabel={t('addCustomer')}
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
                    <TableHead className="text-center">{t('totalOrders')}</TableHead>
                    <TableHead className="text-right">{t('totalSpent')}</TableHead>
                    <TableHead className="text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      {/* `data-primary` makes this the card headline on mobile;
                          `data-label` turns the rest into labelled rows. */}
                      <TableCell className="font-medium" data-primary="">
                        <ContactCell
                          name={customer.name}
                          href={`/customers/${customer.id}`}
                          subtitle={`${t('since')} ${formatDate(customer.createdAt, locale)}`}
                        />
                      </TableCell>
                      <TableCell data-label={t('phone')}>
                        <IconTextCell icon={Phone} value={customer.phone} />
                      </TableCell>
                      <TableCell data-label={t('address')}>
                        <IconTextCell icon={MapPin} value={customer.address} />
                      </TableCell>
                      <TableCell className="md:text-center" data-label={t('totalOrders')}>
                        <CountBadge value={customer.totalOrders} />
                      </TableCell>
                      <TableCell className="font-medium md:text-right" data-label={t('totalSpent')}>
                        {formatCurrency(customer.totalSpent, locale)}
                      </TableCell>
                      <TableCell className="md:text-right">
                        <RowActions
                          viewHref={`/customers/${customer.id}`}
                          onEdit={() => setModal({ open: true, mode: 'edit', customer })}
                          onDelete={() => setCustomerToDelete(customer)}
                          labels={{ view: t('viewDetails'), edit: t('edit'), delete: t('delete') }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
      )}
      <Fab onClick={openCreate} label={t('addCustomer')} />

      <CustomerModal open={modal.open} mode={modal.mode} customer={modal.customer || null} onClose={() => setModal((m) => ({ ...m, open: false }))} />
      {customerToDelete && (
        <DeleteConfirmationModal isOpen={!!customerToDelete} onClose={() => setCustomerToDelete(null)} onConfirm={async () => {
          try { await apiDeleteCustomer(customerToDelete.id) } catch { }
          // Optimistic removal from store
          const delId = customerToDelete.id
          useStore.setState(s => ({ customers: s.customers.filter(x => x.id !== delId) }))
          setCustomerToDelete(null)
        }} title={t('delete')} description={t('deleteConfirm', { name: customerToDelete.name })} />
      )}
    </div>
  )
}
