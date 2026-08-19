'use client'

import React from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SearchInput } from './SearchInput'

/**
 * Search box, optional filters, and the page's primary create action.
 *
 * The action button is `hidden md:flex` on purpose: on a phone it would sit at
 * the top of a long scrolling list and leave the screen immediately, so pages
 * pair this with a `<Fab>` that stays in thumb reach. Keep both pointed at the
 * same handler.
 */
export function PageToolbar({
  search,
  onSearchChange,
  searchPlaceholder,
  actionLabel,
  onAction,
  children,
}: {
  search: string
  onSearchChange: (value: string) => void
  searchPlaceholder: string
  /** Label for the desktop create button. Omit to render no action. */
  actionLabel?: string
  onAction?: () => void
  /** Filters that sit between the search box and the action, e.g. `<DateFilter>`. */
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <SearchInput
        value={search}
        onChange={onSearchChange}
        placeholder={searchPlaceholder}
        className="min-w-[12rem] flex-1"
      />
      {children}
      {actionLabel && onAction && (
        <Button className="hidden shrink-0 items-center gap-2 md:ml-auto md:flex" onClick={onAction}>
          <Plus className="h-4 w-4" /> {actionLabel}
        </Button>
      )}
    </div>
  )
}
