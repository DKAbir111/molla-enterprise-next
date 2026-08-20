'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { Menu, X } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const SECTIONS = [
  { key: 'features', href: '#features' },
  { key: 'how', href: '#how' },
  { key: 'pricing', href: '#pricing' },
  { key: 'faq', href: '#faq' },
] as const

/**
 * Sticky top bar for the marketing page.
 *
 * Transparent over the hero and opaque once scrolled, so the headline is not
 * boxed in by a bar the moment the page loads. The section links are plain
 * hash anchors — they scroll within this page, so routing them through the
 * locale-aware `Link` would be wrong.
 */
export function MarketingNav() {
  const t = useTranslations('landing.nav')
  const [scrolled, setScrolled] = React.useState(false)
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // A sheet over the page must not leave the page scrolling behind it.
  React.useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <header
      className={cn(
        'sticky top-0 z-50 transition-colors duration-300 motion-reduce:transition-none',
        scrolled
          ? 'border-b border-border-subtle bg-surface/85 backdrop-blur-xl'
          : 'border-b border-transparent'
      )}
    >
      <nav
        aria-label="Primary"
        className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-6 lg:px-8"
      >
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/conix.png"
            alt=""
            aria-hidden="true"
            className="h-8 w-8 rounded-lg object-contain"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
          <span className="text-[15px] font-semibold tracking-tight text-foreground">
            Molla Enterprise
          </span>
        </Link>

        <ul className="hidden items-center gap-8 md:flex">
          {SECTIONS.map((s) => (
            <li key={s.key}>
              <a
                href={s.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {t(s.key)}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden shrink-0 items-center gap-3 md:flex">
          <Link
            href="/login"
            className="rounded-md px-2 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {t('signIn')}
          </Link>
          <Link href="/register">
            <Button size="sm">{t('getStarted')}</Button>
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t('openMenu')}
          className="tap -mr-2 flex h-10 w-10 items-center justify-center rounded-lg text-foreground md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
      </nav>

      {open && (
        <div className="fixed inset-0 z-[100] md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label={t('closeMenu')}
            onClick={() => setOpen(false)}
            className="animate-fade-in absolute inset-0 bg-black/50 backdrop-blur-[2px]"
          />
          <div className="animate-sheet-up absolute inset-x-0 top-0 rounded-b-3xl border-b border-border-subtle bg-surface p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <span className="text-[15px] font-semibold text-foreground">Molla Enterprise</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t('closeMenu')}
                className="tap -mr-2 flex h-10 w-10 items-center justify-center rounded-full text-subtle-foreground hover:bg-surface-hover"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <ul className="space-y-1">
              {SECTIONS.map((s) => (
                <li key={s.key}>
                  <a
                    href={s.href}
                    onClick={() => setOpen(false)}
                    className="tap-sm flex min-h-12 items-center rounded-xl px-3 text-[15px] font-medium text-foreground hover:bg-surface-hover"
                  >
                    {t(s.key)}
                  </a>
                </li>
              ))}
            </ul>

            <div className="mt-6 grid gap-3 border-t border-border-subtle pt-6">
              <Link href="/login" onClick={() => setOpen(false)}>
                <Button variant="outline" className="w-full">{t('signIn')}</Button>
              </Link>
              <Link href="/register" onClick={() => setOpen(false)}>
                <Button className="w-full">{t('getStarted')}</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
