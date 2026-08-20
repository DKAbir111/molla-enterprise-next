import React from 'react'
import { useTranslations } from 'next-intl'
import { Section, SectionHeading } from './Section'

type Step = { title: string; body: string }

export function HowItWorks() {
  const t = useTranslations('landing.how')
  const steps = t.raw('steps') as Step[]

  return (
    <Section id="how" tone="muted">
      <SectionHeading eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />

      <ol className="relative mt-14 grid gap-10 sm:grid-cols-3 sm:gap-8">
        {/* The rule that ties the three steps into a sequence. Sits behind the
            numerals and only exists where there is a next step to reach. */}
        <span
          aria-hidden="true"
          className="absolute left-0 right-0 top-5 hidden h-px bg-border-subtle sm:block"
        />
        {steps.map((step, i) => (
          <li key={step.title} className="relative">
            <span className="relative flex h-10 w-10 items-center justify-center rounded-full gradient-primary text-sm font-bold text-primary-foreground shadow-sm">
              {i + 1}
            </span>
            <h3 className="mt-5 text-[17px] font-semibold tracking-tight text-foreground">
              {step.title}
            </h3>
            <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{step.body}</p>
          </li>
        ))}
      </ol>
    </Section>
  )
}
