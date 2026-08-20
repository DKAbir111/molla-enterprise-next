'use client'

import React from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { ArrowRight, Check } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'

export type AuthMode = 'login' | 'register'

/**
 * Sign in and sign up as one screen.
 *
 * They used to be two routes, so "Create account" was a full navigation: the
 * whole shell tore down and rebuilt, which on a slow connection reads as the
 * app blinking. Both forms are mounted here and only the one in view changes,
 * so switching costs nothing and keeps the user's place. The URL still changes
 * — via `history.pushState`, which Next supports for exactly this — so /login
 * and /register stay linkable, refreshable and bookmarkable, and Back still
 * moves between the two.
 *
 * The layout does not move. The brand panel is always on the left and the form
 * is always on the right; only the form itself swaps, sliding a short distance
 * as it crossfades. An earlier version slid the whole panel across to trade
 * sides, which drew the eye away from the fields the user was heading for.
 *
 * The inactive form stays mounted (that is what makes the crossfade possible)
 * but is marked `inert`, so it is out of the tab order and invisible to screen
 * readers rather than being a second, hidden set of email/password fields.
 */
export function AuthFlow({ initialMode }: { initialMode: AuthMode }) {
  const t = useTranslations('auth')
  const locale = useLocale()
  const [mode, setMode] = React.useState<AuthMode>(initialMode)
  const isRegister = mode === 'register'

  const switchTo = React.useCallback(
    (next: AuthMode) => {
      setMode(next)
      window.history.pushState(null, '', `/${locale}/${next}`)
    },
    [locale]
  )

  // Back/forward must move between the two forms, not off the page.
  React.useEffect(() => {
    const onPop = () =>
      setMode(window.location.pathname.endsWith('/register') ? 'register' : 'login')
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  return (
    <div className="app-bg min-h-screen">
      <div className="mx-auto grid min-h-screen w-full max-w-[1440px] lg:grid-cols-2">
        {/* ------------------------------- panel -------------------------------
            Fixed on the left. Hidden on a phone, where there is no room for it
            and the form should start at the top of the screen. */}
        <aside className="gradient-primary relative hidden overflow-hidden lg:block">
          {/* Texture: a fine dot lattice. Deliberately not a blurred blob — a
              grid reads as considered, a blob reads as filler. */}
          <div
            className="absolute inset-0 opacity-[0.16]"
            style={{
              backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)',
              backgroundSize: '22px 22px',
            }}
          />
          {/* One soft light source, top-trailing, for depth. */}
          <div className="absolute -right-1/4 -top-1/4 h-[60%] w-[80%] rounded-full bg-white/15 blur-3xl" />

          <div className="absolute inset-0 flex flex-col justify-center px-12 xl:px-16">
            <h2 className="text-[2.25rem] font-bold leading-[1.15] tracking-tight text-white">
              {t('panelHeadline')}
            </h2>
            <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-white/80">
              {t('panelSubhead')}
            </p>
            <ul className="mt-9 space-y-3.5">
              {[t('prop1'), t('prop2'), t('prop3')].map((v) => (
                <li key={v} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20">
                    <Check className="h-3 w-3 text-white" />
                  </span>
                  <span className="text-sm text-white/90">{v}</span>
                </li>
              ))}
            </ul>
            <figure className="mt-12 border-t border-white/20 pt-6">
              <blockquote className="text-sm leading-relaxed text-white/80">{t('quote')}</blockquote>
              <figcaption className="mt-3 text-xs font-medium text-white/60">
                {t('quoteAuthor')}
              </figcaption>
            </figure>
          </div>
        </aside>

        {/* ---------------------------- form column ----------------------------
            Always the right-hand side. The brand sits above the fold and stays
            put through the swap — it is not part of what animates. */}
        <main className="relative flex flex-col px-6 py-8 lg:px-12 lg:py-10">
          <Link href="/" className="inline-flex shrink-0 items-center gap-2.5 self-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/conix.png"
              alt=""
              aria-hidden="true"
              className="h-8 w-8 rounded-lg object-contain"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
            <span className="text-[15px] font-semibold tracking-tight text-foreground">
              {t('brand')}
            </span>
          </Link>

          <div className="flex flex-1 items-center justify-center py-10">
            {/* Both forms share one grid cell, so the one arriving is already in
                position as the other leaves. The cell is as tall as the taller
                form (sign-up), which keeps the panel beside it from jumping. */}
            <div className="grid w-full max-w-[26rem]">
              <FormSlot active={!isRegister} from="left">
                <FormHeader title={t('loginTitle')} subtitle={t('loginSubtitle')} />
                <LoginForm />
                <FormSwitch
                  prompt={t('newHere')}
                  cta={t('createAccount')}
                  onClick={() => switchTo('register')}
                />
              </FormSlot>

              <FormSlot active={isRegister} from="right">
                <FormHeader title={t('registerTitle')} subtitle={t('registerSubtitle')} />
                <RegisterForm />
                <FormSwitch
                  prompt={t('haveAccount')}
                  cta={t('signIn')}
                  onClick={() => switchTo('login')}
                />
              </FormSlot>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

/* --------------------------------------------------------------------------
   Pieces
   -------------------------------------------------------------------------- */

/**
 * One of the two forms, stacked in the same grid cell as the other.
 *
 * `from` is the side it rests on while hidden, so sign-in always leaves and
 * returns to the left and sign-up to the right. Sharing one spatial direction
 * makes the pair feel like two positions on a track rather than two unrelated
 * fades.
 *
 * On a phone the hidden one is dropped from the flow entirely — with no panel
 * beside it there is nothing to keep aligned, and a cell sized to the taller
 * form would leave a block of dead space under sign-in.
 */
function FormSlot({
  active,
  from,
  children,
}: {
  active: boolean
  from: 'left' | 'right'
  children: React.ReactNode
}) {
  return (
    <div
      // Keeps the hidden form out of the tab order and the a11y tree.
      inert={!active}
      className={cn(
        'col-start-1 row-start-1 self-center',
        active ? 'block' : 'hidden lg:block',
        'transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none',
        active
          ? 'translate-x-0 opacity-100 delay-100'
          : cn('pointer-events-none opacity-0', from === 'left' ? '-translate-x-3' : 'translate-x-3')
      )}
    >
      {children}
    </div>
  )
}

function FormHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-8">
      <h1 className="text-[2rem] font-bold leading-[1.15] tracking-tight text-foreground">
        {title}
      </h1>
      {subtitle && <p className="mt-2.5 text-[15px] text-muted-foreground">{subtitle}</p>}
    </header>
  )
}

/** The switch under the form — where the eye lands after the submit button. */
function FormSwitch({
  prompt,
  cta,
  onClick,
}: {
  prompt: string
  cta: string
  onClick: () => void
}) {
  return (
    <div className="mt-8 border-t border-border-subtle pt-6">
      <p className="flex flex-wrap items-center justify-center gap-1.5 text-sm text-muted-foreground">
        {prompt}
        <button
          type="button"
          onClick={onClick}
          className="group inline-flex items-center gap-1 rounded-md font-semibold text-primary underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {cta}
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" />
        </button>
      </p>
    </div>
  )
}
