import React from 'react'
import { cn } from '@/lib/utils'

/**
 * The rhythm every landing section shares: one max width, one gutter, one
 * vertical scale. Sections differ in what they contain, never in how far from
 * the edge they sit — that consistency is most of what makes a long page read
 * as one designed thing rather than a stack of separate ideas.
 */
export function Section({
  id,
  children,
  className,
  tone = 'default',
}: {
  id?: string
  children: React.ReactNode
  className?: string
  /** `muted` gives the band a faint fill so adjacent sections separate. */
  tone?: 'default' | 'muted'
}) {
  return (
    <section
      id={id}
      // Anchored nav links land here, so leave room for the sticky header.
      className={cn(
        'scroll-mt-20 px-6 py-20 sm:py-24 lg:px-8 lg:py-28',
        tone === 'muted' && 'bg-surface-muted',
        className
      )}
    >
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  )
}

/**
 * Eyebrow, headline, standfirst — in that order, at one size, every time.
 *
 * `align="left"` is for sections whose content is itself left-aligned (the
 * spotlights); centred is the default because most bands below are grids.
 */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'center',
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  align?: 'center' | 'left'
}) {
  return (
    <header className={cn('max-w-2xl', align === 'center' && 'mx-auto text-center')}>
      {eyebrow && (
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          {eyebrow}
        </p>
      )}
      <h2 className="mt-3 text-[1.75rem] font-bold leading-[1.2] tracking-tight text-foreground sm:text-[2.25rem]">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground sm:text-base">
          {subtitle}
        </p>
      )}
    </header>
  )
}
