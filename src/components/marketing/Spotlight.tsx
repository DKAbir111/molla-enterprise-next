import React from 'react'
import { useTranslations } from 'next-intl'
import { Check } from 'lucide-react'
import { Section } from './Section'
import { cn } from '@/lib/utils'

type Item = { title: string; body: string; points: string[] }

/**
 * Two long-form blocks for the mechanics that actually differentiate the
 * product, alternating sides so the page changes gait after the feature grid.
 *
 * The vignettes are markup, like the hero's, and each one shows the specific
 * arithmetic its block is describing rather than a generic chart.
 */
export function Spotlight() {
  const t = useTranslations('landing.spotlight')
  const items = t.raw('items') as Item[]

  return (
    <Section>
      {/* Each block carries its own headline, so this band needs only the
          eyebrow to announce itself — a SectionHeading here would repeat the
          first block's title. */}
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
        {t('eyebrow')}
      </p>

      <div className="mt-12 space-y-20 lg:space-y-28">
        {items.map((item, i) => (
          <div
            key={item.title}
            className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16"
          >
            <div className={cn(i % 2 === 1 && 'lg:order-2')}>
              <h3 className="text-[1.5rem] font-bold leading-tight tracking-tight text-foreground sm:text-[1.75rem]">
                {item.title}
              </h3>
              <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground sm:text-base">
                {item.body}
              </p>
              <ul className="mt-6 space-y-2.5">
                {item.points.map((p) => (
                  <li key={p} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-subtle">
                      <Check className="h-3 w-3 text-primary-subtle-foreground" aria-hidden="true" />
                    </span>
                    <span className="text-[15px] text-foreground">{p}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={cn(i % 2 === 1 && 'lg:order-1')}>
              {i === 0 ? <TransportVignette /> : <DuesVignette />}
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}

/** The transport arithmetic, shown as the order summary it becomes. */
function TransportVignette() {
  return (
    <div
      aria-hidden="true"
      className="rounded-2xl border border-border-subtle bg-surface p-6 shadow-xl shadow-primary/5"
    >
      <div className="space-y-3 text-sm">
        <Row label="Line items" value="৳ 142,000" />
        <Row label="Transport — ৳ 3,500 × 4 trips" value="৳ 14,000" accent />
        <Row label="Discount" value="− ৳ 2,000" />
        <div className="!mt-4 border-t border-border pt-3">
          <Row label="Grand total" value="৳ 154,000" bold />
        </div>
        <div className="rounded-lg bg-primary-subtle px-3 py-2.5">
          <Row label="Cost per unit" value="৳ 124.19" accent bold />
        </div>
      </div>
    </div>
  )
}

/** A customer account: three instalments, balance derived from them. */
function DuesVignette() {
  return (
    <div
      aria-hidden="true"
      className="rounded-2xl border border-border-subtle bg-surface p-6 shadow-xl shadow-primary/5"
    >
      <div className="space-y-3 text-sm">
        <Row label="Invoiced" value="৳ 154,000" />
        <div className="space-y-2 rounded-lg bg-surface-muted p-3">
          {[
            ['12 Mar · cash', '৳ 50,000'],
            ['28 Mar · bank', '৳ 40,000'],
            ['09 Apr · cash', '৳ 24,000'],
          ].map(([when, amt]) => (
            <div key={when} className="flex items-center justify-between">
              <span className="text-xs text-subtle-foreground">{when}</span>
              <span className="text-xs font-medium text-success">{amt}</span>
            </div>
          ))}
        </div>
        <Row label="Paid" value="৳ 114,000" />
        <div className="!mt-4 border-t border-border pt-3">
          <Row label="Balance due" value="৳ 40,000" bold accent="warning" />
        </div>
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  bold,
  accent,
}: {
  label: string
  value: string
  bold?: boolean
  accent?: boolean | 'warning'
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className={cn('text-muted-foreground', bold && 'font-medium text-foreground')}>
        {label}
      </span>
      <span
        className={cn(
          'tabular-nums',
          bold ? 'text-base font-bold' : 'font-medium',
          accent === 'warning' ? 'text-warning' : accent ? 'text-primary' : 'text-foreground'
        )}
      >
        {value}
      </span>
    </div>
  )
}
