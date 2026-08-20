# Molla Enterprise — working notes

A single Next.js 15 app holding both the UI and the API. It replaces an earlier
two-service layout (Next.js frontend + NestJS backend); that project still
exists separately and is not maintained alongside this one.

## Architecture

- **App Router**, every page under `src/app/[locale]/` — `en` or `bn`.
- **`/[locale]` is the public marketing page; the app starts at `/[locale]/dashboard`.**
  The landing route is listed in the middleware's `PUBLIC_PATHS` and in
  `AppShell`'s `publicRoutes`, so it renders with no sidebar, header or auth
  gate. Post-login redirects go to `/dashboard`, never `/`.
- **API** under `src/app/api/`, one folder per endpoint. 63 routes.
- **`src/server/`** is server-only: Prisma, JWT, services, zod schemas. Nothing
  in `src/components/` may import from it.
- **Prisma + PostgreSQL**, 16 models.
- Same origin for UI and API, so `axios` uses `baseURL: '/api'` and there is no
  CORS layer anywhere.

### Where things live

| Path | Holds |
| --- | --- |
| `src/app/[locale]/` | Pages. Route folders only — no components. |
| `src/app/api/` | Route handlers, one folder per endpoint. |
| `src/server/` | Server-only: Prisma, JWT, services, zod schemas. |
| `src/components/ui/` | Unstyled primitives (shadcn). Imported deeply, by file. |
| `src/components/shared/` | Cross-feature building blocks. Import via the barrel. |
| `src/components/<feature>/` | Feature-owned components (`sells/`, `vendors/`, …). |
| `src/components/marketing/` | Landing-page sections. Import via the barrel. |
| `src/lib/` | Browser-safe helpers: api client, totals, dates, PDFs, `cn`. |
| `src/lib/api/` | One module per resource. Import via the `@/lib/api` barrel. |
| `src/i18n/` | Routing, request config, messages, navigation helpers. |
| `src/store/` | Zustand stores, one per concern. |
| `src/types/` | Shared domain types. Components must not define their own. |

Two barrels are load-bearing and everything imports through them:
`@/lib/api` and `@/components/shared`. Deep paths into either are a mistake —
they are how three api modules ended up missing from the barrel unnoticed.
`src/components/ui/` is the deliberate exception: shadcn primitives are imported
by file, as upstream generates them.

## Conventions that are load-bearing

**Route handlers stay thin.** `withAuth` / `withPublic` (`src/server/http/route.ts`)
own authentication, the org-disabled write ban, and error-to-status mapping. A
handler parses input, calls a service, returns JSON.

**Errors are thrown, not returned.** `BadRequestError`, `UnauthorizedError`,
`ForbiddenError`, `NotFoundError`, `ConflictError` from `src/server/http/errors.ts`.
The JSON shape is `{ statusCode, message, error }` — deliberately identical to
what NestJS produced, because the client already reads `error.response.data.message`.

**Validation is zod**, in `src/server/schemas/`. Not class-validator: decorators
need `reflect-metadata` and do not belong in route handlers.

**Every query is scoped by organization.** Call `requireOrg(user.organizationId)`
first; it throws when there is none and narrows the type so the id cannot reach a
`where` clause as `null`.

**Money goes through `src/server/services/money.ts`.** `grandTotal` is line items
+ transport − discount. The ledger uses `grandTotalFromItems`, which recomputes
from the line items rather than trusting the cached `total` column. Do not
retype either formula at a call site.

**On the client the same formulas live in `src/lib/totals.ts`** — `money.ts` is
server-only, so components cannot reach it. Use `orderTotals` for a full
breakdown, `grandTotalOf` / `amountDueOf` for a single figure. The two files must
stay in agreement; change one, change the other. This exists because the
expression was previously written out by hand in ten components.

**Navigation goes through `src/i18n/navigation.ts`.** Import `Link`, `useRouter`,
`redirect` and `usePathname` from there and pass *unprefixed* paths —
`/customers/123`, not `` `/${locale}/customers/123` ``. The locale is added for
you, and `usePathname` returns the path with it already stripped. Never import
`Link` from `next/link` or use a raw `<a>` for an internal route.

**Landing sections share `Section` / `SectionHeading`** from
`src/components/marketing/Section.tsx` — one max width, one gutter, one vertical
scale. All of them are server components; only `MarketingNav` ships JS, and the
FAQ uses `<details>` rather than a scripted accordion. Pricing amounts in
`landing.pricing.plans` are **placeholders** and the page says so in a notice;
delete the notice and its `note` key when real prices land.

**List pages are assembled from `src/components/shared`,** not hand-built:
`PageToolbar` (search + filters + create), `EmptyState`, `StatRail`/`StatTile`,
`Fab`, and the table cells `ContactCell`, `IconTextCell`, `CountBadge`,
`RowActions`. Six pages had independently drifting copies of each.

**`paidAmount` is a cache, never written directly.** Every change is a `Payment`
row; the column is recomputed from the sum. Writing it straight from a form is
what used to erase earlier instalments. Use `setOrderPaidTotal`.

**Manual transactions vs payments.** `Transaction` rows with `source: 'manual'`
are standalone cash movements. Order payments are `Payment` rows. Accounts counts
only manual transactions — counting both double-counted every paid order.

## Things that differ from the NestJS original

- The SSE `/alerts/stream` endpoint is gone. The client polls `/api/alerts` every
  15s, which is what the stream did behind a held-open connection.
- The `@Cron` digest is now `/api/cron/alerts-digest`, scheduled by `vercel.json`
  and guarded by `CRON_SECRET`.
- The 60-second in-memory org cache is gone — a per-process cache is not shared
  between instances and served stale enable/disable state.
- `POST /organizations/:id/enable` now works. The old global guard refused every
  write on a disabled org including this one, so an org could never be re-enabled.
- Password-reset tokens use `crypto.randomBytes`, not `Math.random`.
- `bcryptjs` instead of `bcrypt` — pure JS, no native build step. Hashes are
  compatible, so existing passwords keep working.
- Transaction `category` accepts empty, matching the form that labels it optional.

## Gotchas

- `next.config.ts` has both `typescript.ignoreBuildErrors` and
  `eslint.ignoreDuringBuilds` set to `false`. Keep them that way — the carried-over
  lint errors have been cleared, and letting them back in is how the last batch
  accumulated unnoticed. `npm run typecheck` and `npx next lint` are both clean.
- The `[locale]` segment will happily match `/api/...` if no API route exists at
  that path, returning an HTML 404. `src/app/api/[...path]/route.ts` catches that
  and returns JSON instead.
- `params` is a promise in Next 15. The route wrappers await it; handlers receive
  a plain object.
- i18n: `en.json` and `bn.json` must stay at equal key counts (740 each, and the
  key *paths* are identical — check both, not just the totals).
- `<html lang>` is resolved in `src/app/layout.tsx` via `getLocale()`, not
  hardcoded. It has to happen there because the root layout owns the `<html>`
  element and sits above the `[locale]` segment, so it never sees the param. This
  is also what makes the `[lang="bn"]` font rule in `globals.css` match.
