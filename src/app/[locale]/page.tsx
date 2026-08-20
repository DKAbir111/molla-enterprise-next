import type { Metadata } from 'next'
import {
  CtaBanner,
  Faq,
  Features,
  Hero,
  HowItWorks,
  MarketingFooter,
  MarketingNav,
  Pricing,
  Replaces,
  Spotlight,
  Testimonials,
} from '@/components/marketing'

export const metadata: Metadata = {
  title: 'Molla Enterprise — stock, sales and dues for material traders',
  description:
    'Keep stock, purchases, sales, transport and dues in one ledger. Built for sand, stone and cement traders.',
}

/**
 * The marketing page.
 *
 * A server component, and so is every section under it — none of this is
 * interactive except the nav's mobile sheet, and the FAQ uses <details> rather
 * than a scripted accordion. That keeps the page's client bundle to the nav
 * alone.
 *
 * The app itself lives at /dashboard; this route is listed in the middleware's
 * PUBLIC_PATHS and in AppShell's public routes, so it renders without the
 * sidebar, header and auth gate.
 */
export default function LandingPage() {
  return (
    <div className="app-bg min-h-screen">
      <MarketingNav />
      <main>
        <Hero />
        <Replaces />
        <Features />
        <HowItWorks />
        <Spotlight />
        <Testimonials />
        <Pricing />
        <Faq />
        <CtaBanner />
      </main>
      <MarketingFooter />
    </div>
  )
}
