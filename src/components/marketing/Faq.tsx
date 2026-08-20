import React from 'react'
import { useTranslations } from 'next-intl'
import { Plus } from 'lucide-react'
import { Section, SectionHeading } from './Section'

type Item = { q: string; a: string }

/**
 * Built on <details>/<summary> rather than a React accordion.
 *
 * The browser already gives us the open/close state, keyboard handling, the
 * correct roles, and find-in-page that can open a closed panel to reveal a
 * match. A hand-rolled accordion would ship JavaScript to reimplement all of
 * that, usually with worse a11y.
 */
export function Faq() {
  const t = useTranslations('landing.faq')
  const items = t.raw('items') as Item[]

  return (
    <Section id="faq">
      <SectionHeading eyebrow={t('eyebrow')} title={t('title')} />

      <div className="mx-auto mt-14 max-w-3xl divide-y divide-border-subtle border-y border-border-subtle">
        {items.map((item) => (
          <details key={item.q} className="group">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 text-left [&::-webkit-details-marker]:hidden">
              <h3 className="text-[15px] font-medium text-foreground sm:text-base">{item.q}</h3>
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border-subtle text-subtle-foreground transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none">
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </summary>
            <p className="pb-5 pr-12 text-[15px] leading-relaxed text-muted-foreground">
              {item.a}
            </p>
          </details>
        ))}
      </div>
    </Section>
  )
}
