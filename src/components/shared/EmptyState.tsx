'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

/**
 * The dashed placeholder card a list page shows when it has nothing to list.
 *
 * Also covers "your filter matched nothing", so the action stays optional —
 * offering "Add Product" to someone who simply mistyped a search is noise.
 */
export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="px-4 py-12 text-center md:py-16">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full gradient-primary text-2xl text-primary-foreground">
          +
        </div>
        <h3 className="mb-1 text-lg font-semibold">{title}</h3>
        {description && <p className="mb-4 text-muted-foreground">{description}</p>}
        {actionLabel && onAction && <Button onClick={onAction}>{actionLabel}</Button>}
      </CardContent>
    </Card>
  )
}
