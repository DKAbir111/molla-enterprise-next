import React from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

export function MarketingFooter() {
  const t = useTranslations('landing.footer')
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border-subtle bg-surface-muted px-6 py-14 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
          <div>
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/conix.png"
                alt=""
                aria-hidden="true"
                className="h-8 w-8 rounded-lg object-contain"
              />
              <span className="text-[15px] font-semibold tracking-tight text-foreground">
                Molla Enterprise
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              {t('tagline')}
            </p>
          </div>

          {/* In-page anchors stay plain <a>; real routes go through the
              locale-aware Link. */}
          <FooterColumn
            title={t('product')}
            links={[
              { label: t('features'), href: '#features', anchor: true },
              { label: t('pricing'), href: '#pricing', anchor: true },
              { label: t('faq'), href: '#faq', anchor: true },
            ]}
          />
          <FooterColumn
            title={t('company')}
            links={[
              { label: t('signIn'), href: '/login' },
              { label: t('contact'), href: '/register' },
            ]}
          />
          <FooterColumn
            title={t('legal')}
            links={[
              { label: t('terms'), href: '/terms' },
              { label: t('privacy'), href: '/privacy' },
            ]}
          />
        </div>

        <div className="mt-12 border-t border-border-subtle pt-6">
          <p className="text-xs text-subtle-foreground">
            © {year} Molla Enterprise. {t('rights')}
          </p>
        </div>
      </div>
    </footer>
  )
}

function FooterColumn({
  title,
  links,
}: {
  title: string
  links: { label: string; href: string; anchor?: boolean }[]
}) {
  return (
    <div>
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-subtle-foreground">
        {title}
      </h2>
      <ul className="mt-4 space-y-2.5">
        {links.map((l) => (
          <li key={l.label}>
            {l.anchor ? (
              <a
                href={l.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {l.label}
              </a>
            ) : (
              <Link
                href={l.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {l.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
