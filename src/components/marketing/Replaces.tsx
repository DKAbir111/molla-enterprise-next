import React from 'react'
import { useTranslations } from 'next-intl'

/**
 * The strip under the hero.
 *
 * Where a landing page usually puts borrowed credibility — customer logos this
 * product does not have yet, or invented percentages — this says plainly what
 * the software takes the place of. It is the same reassurance, and it is true.
 */
export function Replaces() {
  const t = useTranslations('landing.replaces')
  const items = t.raw('items') as string[]

  return (
    <div className="border-y border-border-subtle bg-surface-muted px-6 py-8 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-x-8 gap-y-4 sm:flex-row sm:justify-center">
        <p className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-subtle-foreground">
          {t('label')}
        </p>
        <ul className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 sm:gap-x-6">
          {items.map((item, i) => (
            <li key={item} className="flex items-center gap-3 sm:gap-6">
              <span className="text-sm font-medium text-muted-foreground line-through decoration-danger/50 decoration-2">
                {item}
              </span>
              {i < items.length - 1 && (
                <span className="hidden h-1 w-1 rounded-full bg-border sm:block" aria-hidden="true" />
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
