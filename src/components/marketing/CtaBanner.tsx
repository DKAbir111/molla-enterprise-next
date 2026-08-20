import React from 'react'
import { useTranslations } from 'next-intl'
import { ArrowRight } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'

/** The last ask, for readers who got to the bottom without converting. */
export function CtaBanner() {
  const t = useTranslations('landing.cta')

  return (
    <section className="px-6 py-20 sm:py-24 lg:px-8">
      <div className="gradient-primary relative mx-auto max-w-6xl overflow-hidden rounded-3xl px-6 py-16 text-center sm:px-12">
        {/* Same dot lattice as the auth panel, so the two brand surfaces in the
            product are recognisably the same surface. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute -right-1/4 -top-1/2 h-[120%] w-[60%] rounded-full bg-white/15 blur-3xl"
        />

        <div className="relative">
          <h2 className="mx-auto max-w-2xl text-[1.75rem] font-bold leading-[1.15] tracking-tight text-white sm:text-[2.5rem]">
            {t('title')}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-white/85 sm:text-base">
            {t('subtitle')}
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/register" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="group w-full gap-2 bg-white text-primary hover:bg-white/90 sm:w-auto"
              >
                {t('primary')}
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" />
              </Button>
            </Link>
            <Link href="/login" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full border-white/40 bg-transparent text-white hover:bg-white/10 sm:w-auto"
              >
                {t('secondary')}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
