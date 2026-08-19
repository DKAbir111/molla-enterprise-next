import { redirect } from 'next/navigation'
import { routing } from '@/i18n/routing'

/**
 * `/` carries no locale, so send it to the configured default rather than the
 * hardcoded `/en` this used to use — that would have had to be edited by hand
 * if the default ever changed.
 */
export default function RootPage() {
  redirect(`/${routing.defaultLocale}`)
}
