'use client'

import React from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * The search box that every list page opens with.
 *
 * The icon is absolutely positioned inside the field and must not swallow
 * clicks meant for the input, hence `pointer-events-none`. The taller `h-12`
 * on mobile is the 48px touch target; desktop drops back to `h-10`.
 */
export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
  clearable = false,
  clearLabel = 'Clear search',
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  className?: string
  /** Show an X inside the field once there is something to clear. */
  clearable?: boolean
  clearLabel?: string
}) {
  const showClear = clearable && value.length > 0

  return (
    <div className={cn('relative w-full md:max-w-md', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground" />
      <Input
        type="search"
        inputMode="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn('h-12 pl-10 md:h-10', clearable && 'pr-10')}
      />
      {showClear && (
        <button
          type="button"
          aria-label={clearLabel}
          onClick={() => onChange('')}
          className="tap absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-subtle-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
