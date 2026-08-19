import type { Metadata, Viewport } from "next";
import { getLocale } from "next-intl/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "Business Management System",
  description: "Sand and Construction Materials Business Management",
  // Installed to the home screen the app runs without browser chrome, which is
  // what makes the bottom tab bar read as a real app bar rather than a web nav.
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Business Manager",
  },
};

// `viewportFit: 'cover'` is what makes env(safe-area-inset-*) resolve to real
// numbers on notched phones. Without it the bottom tab bar sits under the iOS
// home indicator. `maximumScale` is deliberately left alone: pinch-zoom is an
// accessibility feature and locking it out fails WCAG 1.4.4.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f0fdfa" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

// `lang` has to be resolved here rather than in `[locale]/layout.tsx`, because
// the <html> element lives in the root layout and that layout sits above the
// [locale] segment, so it never receives the param. `getLocale()` reads it from
// the same request context next-intl already established in the middleware.
//
// It was hardcoded to "en", which mislabelled every Bengali page for screen
// readers and translation tooling, and stopped the `[lang="bn"]` font rule in
// globals.css from ever matching.
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
