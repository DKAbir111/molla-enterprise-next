# Molla Enterprise

Business management for a sand and construction-materials trade: inventory,
sales, purchases, customers, vendors, payments and reporting — in English and
Bengali.

One Next.js application. The UI and the API live in the same project and are
served from the same origin, so there is no second service to deploy, no API
host to configure, and no CORS.

## Requirements

- Node 20+
- PostgreSQL 14+

## Getting started

```bash
cp .env.example .env      # then fill in DATABASE_URL and JWT_SECRET
npm install               # runs `prisma generate` afterwards
npm run prisma:migrate    # creates the schema
npm run dev               # http://localhost:3000
```

`npm install` runs `prisma generate` through `postinstall`, so the typed client
exists before the first build.

## Layout

```
prisma/schema.prisma      Database schema and migrations
src/app/[locale]/         Pages. Every route is under /en or /bn
src/app/api/              The API. One folder per endpoint
src/components/           UI
src/i18n/messages/        en.json and bn.json — 735 keys each
src/lib/                  Client-side helpers and the axios instance
src/server/               Server-only code. Never imported by a component
  ├── db.ts               The single PrismaClient
  ├── auth/               JWT signing and verification
  ├── http/               Route wrappers, error shapes, input parsing
  ├── schemas/            Zod request schemas
  └── services/           Business logic
```

`src/server/` is the boundary that matters: it holds every database call and
every secret-dependent operation, and nothing under `src/components/` imports
from it.

## How a route is written

Handlers stay thin. `withAuth` resolves the caller, refuses a disabled
organization's writes, and turns any thrown error into the right status code, so
a route only has to describe what it does:

```ts
export const GET = withAuth(async (_req, { user }) => {
  return NextResponse.json(await listCustomers(user.organizationId))
})

export const POST = withAuth(async (req, { user }) => {
  const dto = await parseBody(req, createCustomerSchema)
  return NextResponse.json(await createCustomer(user.organizationId, dto))
})
```

Use `withPublic` for routes with no signed-in user — login, register, password
reset.

Errors are thrown, never returned: `throw new NotFoundError('Customer not
found')` becomes a 404 with a JSON body. Anything that is not an explicit
`HttpError` is treated as a bug — logged in full, reported as a bare 500.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build; type errors fail it |
| `npm start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run prisma:migrate` | Create and apply a migration |
| `npm run prisma:studio` | Browse the database |

## Scheduled work

The daily alerts digest runs from `vercel.json` at 09:00, which calls
`/api/cron/alerts-digest`. The route authenticates with `CRON_SECRET` rather
than a user token — it is a public URL, so without that check anyone could
trigger a mailout to every organization.

Off Vercel, point any scheduler at the same URL:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://your-host/api/cron/alerts-digest
```

## Uploads

New uploads go to Cloudinary and are stored as absolute URLs. Older records hold
a relative `/uploads/...` path from an earlier disk-backed uploader; those files
live in `public/uploads` and are served by the app directly, so both forms
resolve without any rewriting.

## Testing on a phone

`npm run dev` binds to every interface. Open `http://<your-lan-ip>:3000` on the
phone — the API is same-origin, so nothing else needs configuring.
