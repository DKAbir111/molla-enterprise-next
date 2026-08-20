import React from 'react'
import { useTranslations } from 'next-intl'
import {
  Bell,
  Boxes,
  Coins,
  Languages,
  ReceiptText,
  Scale,
} from 'lucide-react'
import { Section, SectionHeading } from './Section'

type Feature = { title: string; body: string }

// Fixed to the order of `landing.features.items`. Icons live here rather than
// in the messages file because a translator has no business picking them, and
// a message file should not carry component identifiers.
const ICONS = [Boxes, Scale, Coins, ReceiptText, Bell, Languages]

export function Features() {
  const t = useTranslations('landing.features')
  const items = t.raw('items') as Feature[]

  return (
    <Section id="features">
      <SectionHeading eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />

      <ul className="mt-14 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => {
          const Icon = ICONS[i] ?? Boxes
          return (
            <li key={item.title}>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-subtle text-primary-subtle-foreground">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-[17px] font-semibold tracking-tight text-foreground">
                {item.title}
              </h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{item.body}</p>
            </li>
          )
        })}
      </ul>
    </Section>
  )
}
