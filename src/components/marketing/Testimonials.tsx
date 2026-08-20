import React from 'react'
import { useTranslations } from 'next-intl'
import { Section, SectionHeading } from './Section'

type Item = { quote: string; name: string; role: string }

/**
 * Attribution here is by role and trade, not by name and headshot.
 *
 * These are real remarks from early users who did not agree to be named, and
 * inventing a face and a full name to sit beside a quote would be a
 * fabrication. Replace with named quotes once you have permission.
 */
export function Testimonials() {
  const t = useTranslations('landing.testimonials')
  const items = t.raw('items') as Item[]

  return (
    <Section tone="muted">
      <SectionHeading eyebrow={t('eyebrow')} title={t('title')} />

      <ul className="mt-14 grid gap-6 lg:grid-cols-3">
        {items.map((item) => (
          <li key={item.quote}>
            <figure className="flex h-full flex-col rounded-2xl border border-border-subtle bg-surface p-6">
              <blockquote className="flex-1 text-[15px] leading-relaxed text-foreground">
                <span
                  aria-hidden="true"
                  className="mr-1 text-2xl font-bold leading-none text-primary/40"
                >
                  &ldquo;
                </span>
                {item.quote}
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3 border-t border-border-subtle pt-4">
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-sm font-semibold text-primary-subtle-foreground"
                >
                  {item.name.charAt(0)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {item.name}
                  </span>
                  <span className="block truncate text-xs text-subtle-foreground">{item.role}</span>
                </span>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </Section>
  )
}
