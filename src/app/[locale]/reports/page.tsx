import { redirect } from '@/i18n/navigation'

/**
 * Reports merged into Accounts — the two screens showed overlapping views of
 * the same money. Kept as a redirect so existing links and bookmarks survive.
 */
export default async function ReportsRedirect({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  redirect({ href: '/accounts?tab=reports', locale })
}
