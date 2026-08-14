# Molla Enterprise — working notes

A single Next.js 15 app holding both the UI and the API. It replaces an earlier
two-service layout (Next.js frontend + NestJS backend); that project still
exists separately and is not maintained alongside this one.

## Architecture

- **App Router**, every page under `src/app/[locale]/` — `en` or `bn`.
- **API** under `src/app/api/`, one folder per endpoint. 63 routes.
- **`src/server/`** is server-only: Prisma, JWT, services, zod schemas. Nothing
  in `src/components/` may import from it.
- **Prisma + PostgreSQL**, 16 models.
- Same origin for UI and API, so `axios` uses `baseURL: '/api'` and there is no
  CORS layer anywhere.

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

- `next.config.ts` has `typescript.ignoreBuildErrors: false` — keep it that way.
  `eslint.ignoreDuringBuilds` is still `true` only because the UI carried over
  about twenty pre-existing lint errors; clearing those and flipping it is a good
  small task.
- The `[locale]` segment will happily match `/api/...` if no API route exists at
  that path, returning an HTML 404. `src/app/api/[...path]/route.ts` catches that
  and returns JSON instead.
- `params` is a promise in Next 15. The route wrappers await it; handlers receive
  a plain object.
- i18n: `en.json` and `bn.json` must stay at equal key counts. Bengali pages are
  still served with `<html lang="en">` in `src/app/layout.tsx`, which also stops
  the `[lang="bn"]` font rule in `globals.css` from ever matching. Known, unfixed.
