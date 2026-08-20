import React from 'react'
import { useTranslations } from 'next-intl'
import { Check, Info } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Section, SectionHeading } from './Section'
import { cn } from '@/lib/utils'

type Plan = { name: string; price: string; tagline: string; features: string[] }

/**
 * TODO — PLACEHOLDER PRICING.
 *
 * The amounts in `landing.pricing.plans` are invented and must be replaced
 * before this page is shown to a customer. The notice under the grid says so on
 * the page itself; delete both the notice and its message key once the real
 * numbers are in.
 */
export function Pricing() {
  const t = useTranslations('landing.pricing')
  const plans = t.raw('plans') as Plan[]
  // The middle plan carries the badge and the emphasis.
  const featured = 1

  return (
    <Section id="pricing">
      <SectionHeading eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />

      <ul className="mt-14 grid items-start gap-6 lg:grid-cols-3">
        {plans.map((plan, i) => {
          const isFeatured = i === featured
          const isCustom = !plan.price.startsWith('৳')

          return (
            <li key={plan.name}>
              <div
                className={cn(
                  'relative flex h-full flex-col rounded-2xl border p-6 sm:p-7',
                  isFeatured
                    ? 'border-primary bg-surface shadow-xl shadow-primary/10 lg:-my-3 lg:py-10'
                    : 'border-border-subtle bg-surface'
                )}
              >
                {isFeatured && (
                  <span className="absolute -top-3 left-6 rounded-full gradient-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground">
                    {t('mostPopular')}
                  </span>
                )}

                <h3 className="text-[17px] font-semibold tracking-tight text-foreground">
                  {plan.name}
                </h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{plan.tagline}</p>

                <p className="mt-6 flex items-baseline gap-1.5">
                  <span className="text-[2.25rem] font-bold tracking-tight text-foreground">
                    {plan.price}
                  </span>
                  {!isCustom && (
                    <span className="text-sm text-subtle-foreground">{t('perMonth')}</span>
                  )}
                </p>

                <ul className="mt-6 flex-1 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary-subtle">
                        <Check className="h-2.5 w-2.5 text-primary-subtle-foreground" aria-hidden="true" />
                      </span>
                      <span className="text-sm text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>

                <Link href="/register" className="mt-8 block">
                  <Button className="w-full" variant={isFeatured ? 'default' : 'outline'} size="lg">
                    {isCustom ? t('ctaContact') : t('cta')}
                  </Button>
                </Link>
              </div>
            </li>
          )
        })}
      </ul>

      {/* Stays until the amounts above are real. */}
      <p className="mx-auto mt-10 flex max-w-md items-center justify-center gap-2 rounded-lg border border-warning bg-warning-subtle px-3 py-2.5 text-xs text-foreground">
        <Info className="h-3.5 w-3.5 shrink-0 text-warning" aria-hidden="true" />
        {t('note')}
      </p>
    </Section>
  )
}
