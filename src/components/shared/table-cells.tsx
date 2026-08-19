'use client'

import React from 'react'
import { Edit, Eye, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

/**
 * The table-cell vocabulary shared by the customers, vendors, sells and buys
 * lists. Those four rendered the same four blocks of markup with different
 * field names; the classes below are the single copy.
 *
 * Note the `data-primary` / `data-label` attributes callers put on the
 * surrounding `<TableCell>`: globals.css uses them to reflow each row into a
 * card on mobile, so they belong on the cell, not in here.
 */

/** Avatar circle + linked name + a muted line underneath. */
export function ContactCell({
  name,
  subtitle,
  href,
}: {
  name: string
  subtitle?: React.ReactNode
  /** Unprefixed path, e.g. `/customers/123`. The locale is added by `Link`. */
  href?: string
}) {
  const initial = name?.charAt(0) ?? '?'
  const label = <p className="font-medium hover:text-info">{name}</p>

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full gradient-primary font-semibold text-primary-foreground">
        {initial}
      </div>
      <div className="min-w-0">
        {href ? <Link href={href}>{label}</Link> : label}
        {subtitle && <p className="text-sm text-subtle-foreground">{subtitle}</p>}
      </div>
    </div>
  )
}

/** A muted value preceded by a small icon — phone numbers, addresses. */
export function IconTextCell({
  icon: Icon,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  value?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-1 text-muted-foreground">
      <Icon className="h-3 w-3 shrink-0" />
      {value || '-'}
    </div>
  )
}

/** The small rounded pill holding a count. */
export function CountBadge({ value, tone }: { value: React.ReactNode; tone?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full px-2 py-1 text-xs font-medium',
        tone ?? 'bg-info-subtle text-info'
      )}
    >
      {value}
    </span>
  )
}

/**
 * The view / edit / delete trio at the end of a row.
 *
 * View is a `Link` rather than a Button-with-onClick so it prefetches and
 * supports open-in-new-tab; the class list mirrors `Button variant="ghost"
 * size="icon"`, which has no `asChild` escape hatch to render an anchor.
 */
const GHOST_ICON_CLASS =
  'tap inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium ' +
  'transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-ring focus-visible:ring-offset-2'

export function RowActions({
  viewHref,
  onEdit,
  onDelete,
  labels,
}: {
  /** Unprefixed path for the view action. Omit to hide it. */
  viewHref?: string
  onEdit?: () => void
  onDelete?: () => void
  labels: { view: string; edit: string; delete: string }
}) {
  return (
    <div className="flex justify-end gap-2">
      {viewHref && (
        <Link href={viewHref} title={labels.view} aria-label={labels.view} className={GHOST_ICON_CLASS}>
          <Eye className="h-4 w-4" />
        </Link>
      )}
      {onEdit && (
        <Button variant="ghost" size="icon" className="tap" title={labels.edit} aria-label={labels.edit} onClick={onEdit}>
          <Edit className="h-4 w-4" />
        </Button>
      )}
      {onDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="tap text-danger hover:text-danger"
          title={labels.delete}
          aria-label={labels.delete}
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
