# Deploying to Vercel

This can't be done from the build sandbox — its outbound network policy
blocks `api.vercel.com` and `telemetry.vercel.com` with a `403` (confirmed
via the sandbox's own proxy diagnostics: "the destination host is not
allowed by your organization's egress policy for this session"). The
Vercel CLI can't authenticate from in here regardless of token validity, so
these steps need to run from your own machine or the Vercel dashboard in a
browser.

The app itself is ready: `npm run build` passes cleanly (22 routes,
TypeScript clean, Turbopack production build) as of this commit.

**Note:** the Vercel token pasted into the chat earlier can't be used from
this sandbox and was never written to any file, command, or log. Since it
was typed into a chat session, it's worth revoking it in the Vercel
dashboard (Account Settings → Tokens) and creating a fresh one for the
steps below, just as good hygiene — not because it leaked anywhere from
this end.

## 1. Database

Any Postgres 14+ works, but it needs the `pg_trgm` extension (the
migrations enable it — most managed providers allow `CREATE EXTENSION`).
Two easy options:

- **Vercel Postgres** (Storage tab in the Vercel dashboard, powered by
  Neon) — creates the DB and can inject `DATABASE_URL` into the project
  automatically.
- **Supabase** — matches §7's default and is already the target for photo
  storage (see README "Photos"), so one account covers both.

Either way, grab the connection string.

## 2. Create the Vercel project

From your machine, in this repo:

```sh
npx vercel login          # opens a browser to authenticate
npx vercel link           # choose "create a new project", not an existing one
```

Or via the dashboard: **Add New → Project → Import Git Repository** and
pick this repo, framework preset "Next.js" (auto-detected).

## 3. Environment variables

Set these in the Vercel project (**Settings → Environment Variables**, or
`npx vercel env add <NAME> production`):

| Variable | Required | Value |
|---|---|---|
| `DATABASE_URL` | yes | connection string from step 1 |
| `SESSION_SECRET` | yes | `openssl rand -base64 32` — a fresh value, don't reuse the local dev one |
| `SUPABASE_URL` | no (photos deferred) | leave unset until photo upload is tested |
| `SUPABASE_SERVICE_ROLE_KEY` | no | leave unset |
| `SUPABASE_STORAGE_BUCKET` | no | leave unset |

## 4. Run migrations and seed data

Run these from your machine with `DATABASE_URL` pointed at the
**production** database (a local `.env.local` override or an inline env
var works):

```sh
DATABASE_URL="<production connection string>" npm run db:migrate
DATABASE_URL="<production connection string>" npm run db:seed
```

Do **not** run `npm run db:seed:users` against production — those are
`changeme123` dev/test accounts. Instead, once one admin account exists,
everyone else gets created through `/admin/users`. To get the first admin
account in, either:

- Insert one row by hand (`bcryptjs.hash('<a real password>', 10)` for the
  hash, `role: 'admin'`), or
- Temporarily run `db:seed:users` against production, log in as `admin`,
  create a real admin account through `/admin/users`, then deactivate or
  delete the seeded `admin`/`office`/`peal`/`na`/`khang`/`hong` accounts
  from `/admin/users` before handing the URL to anyone else.

## 5. Deploy

```sh
npx vercel --prod
```

Or push to the connected Git branch if the project is linked to this repo
— Vercel deploys on push automatically once linked.

## 6. Verify

- Open the deployed URL on a phone, not just a laptop browser.
- Log in, confirm `/work-orders/new`, `/search`, `/reports` all load.
- Confirm an admin can reach `/admin/users` and `/admin/categories`.

Once this is done, the two-week parallel run described in §8's closing
line can actually start — that's the real gate this closes.
