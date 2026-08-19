import { createNavigation } from 'next-intl/navigation'
import { routing } from './routing'

/**
 * Locale-aware replacements for `next/link` and `next/navigation`.
 *
 * Every page lives under `src/app/[locale]/`, so a bare `/customers/123` is not
 * a real route — it only worked because the middleware bounced it through a
 * redirect. Hand-writing `` `/${locale}/customers/${id}` `` at each call site is
 * what the app did instead, and it went wrong in three ways: two links dropped
 * the prefix entirely, one used a relative `../login`, and six used a raw `<a>`
 * that threw away the client-side transition and reloaded the whole app.
 *
 * Import `Link`, `useRouter`, `redirect`, `usePathname` from here and pass
 * unprefixed hrefs — the current locale is added for you.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing)
