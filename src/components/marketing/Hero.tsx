import React from 'react'
import { useTranslations } from 'next-intl'
import { ArrowRight, Check } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'

/**
 * The hero, and the only place on the page with two competing calls to action.
 *
 * The preview beside it is drawn in markup rather than shipped as a screenshot:
 * a PNG of the dashboard would be stale the first time the UI moved, would need
 * a second copy for Bengali, and would be a large image at the top of the
 * critical path. This costs nothing to load and always matches the tokens.
 */
export function Hero() {
  const t = useTranslations('landing.hero')

  return (
    <section className="relative overflow-hidden px-6 pb-20 pt-14 sm:pb-24 lg:px-8 lg:pb-28 lg:pt-20">
      {/* One soft brand wash behind the copy, kept well off the text. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 -top-40 h-[36rem] w-[36rem] rounded-full bg-primary/10 blur-3xl"
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
            {t('badge')}
          </p>

          <h1 className="mt-6 text-[2.5rem] font-bold leading-[1.08] tracking-tight text-foreground sm:text-[3.25rem]">
            {t('title')}
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-[17px]">
            {t('subtitle')}
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/register" className="sm:w-auto">
              <Button size="lg" className="group w-full gap-2 sm:w-auto">
                {t('ctaPrimary')}
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" />
              </Button>
            </Link>
            <a href="#how" className="sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                {t('ctaSecondary')}
              </Button>
            </a>
          </div>

          <p className="mt-4 flex items-center gap-2 text-xs text-subtle-foreground">
            <Check className="h-3.5 w-3.5 text-success" aria-hidden="true" />
            {t('note')}
          </p>
        </div>

        <HeroPreview />
      </div>
    </section>
  )
}

/** An abstract of the dashboard: stat tiles over a short ledger. */
function HeroPreview() {
  const t = useTranslations('landing.hero')

  return (
    <div aria-hidden="true" className="relative">
      {/* Ghost card behind, for depth without a drop shadow doing all the work. */}
      <div className="absolute inset-x-6 -bottom-4 h-24 rounded-2xl bg-primary/10" />

      <div className="relative overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-2xl shadow-primary/10">
        {/* Window chrome, muted — it frames the content without imitating a
            specific operating system. */}
        <div className="flex items-center gap-1.5 border-b border-border-subtle bg-surface-muted px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="ml-3 h-2 w-28 rounded-full bg-border-subtle" />
        </div>

        <div className="space-y-4 p-5">
          <div className="grid grid-cols-3 gap-3">
            {/* Decorative figures. Latin digits deliberately — these are not
                run through formatCurrency, and hardcoded Bengali numerals were
                showing up on the English page. */}
            <PreviewTile label={t('previewStock')} value="1,240" tone="text-foreground" />
            <PreviewTile label={t('previewDue')} value="৳ 86,400" tone="text-warning" />
            <PreviewTile label={t('previewMargin')} value="18.4%" tone="text-success" />
          </div>

          <div className="overflow-hidden rounded-xl border border-border-subtle">
            <div className="flex items-center justify-between bg-surface-muted px-4 py-2.5">
              <span className="h-2 w-20 rounded-full bg-border" />
              <span className="h-2 w-12 rounded-full bg-border" />
            </div>
            {[
              { w: 'w-24', badge: 'bg-success-subtle', bar: 'w-16' },
              { w: 'w-20', badge: 'bg-warning-subtle', bar: 'w-20' },
              { w: 'w-28', badge: 'bg-info-subtle', bar: 'w-12' },
            ].map((row, i) => (
              <div
                key={i}
                className="flex items-center justify-between border-t border-border-subtle px-4 py-3"
              >
                <div className="flex items-center gap-2.5">
                  <span className="h-7 w-7 rounded-full gradient-primary opacity-80" />
                  <span className={`h-2 rounded-full bg-border-subtle ${row.w}`} />
                </div>
                <div className="flex items-center gap-3">
                  <span className={`h-4 w-12 rounded-full ${row.badge}`} />
                  <span className={`h-2 rounded-full bg-border ${row.bar}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function PreviewTile({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-3">
      <p className="truncate text-[10px] font-medium text-subtle-foreground">{label}</p>
      <p className={`mt-1 truncate text-base font-bold ${tone}`}>{value}</p>
    </div>
  )
}
