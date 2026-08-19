import { redirect } from '@/i18n/navigation'

/**
 * The combined dues screen split into Receivables and Payables so each sits
 * with the records it concerns. Kept as a redirect so old links still land.
 */
export default async function DuesRedirect({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  redirect({ href: '/receivables', locale })
}
