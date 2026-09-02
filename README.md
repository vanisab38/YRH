# Work Order System

A replacement for the monthly `Work_Order_MM_YYYY.xlsx` workbooks used to
track maintenance work at the residence. Multi-user web app, Thai-language
UI, phone-first. Full spec: see the build specification handed to this
project (data model, screens, reports, import rules, phased build plan).

**v1 scope: record and find the work.** No payment calculation — the system
flags special-category jobs (แอร์, ยาแนว, โปรเจค) and reports who worked on
them and on which days; amounts are still worked out by hand from that
report.

Built with Next.js (App Router, TypeScript), Postgres, and Drizzle ORM.

## Status

- **Phase 0** — done. The repo previously held an Express + SQLite
  scaffold with only invented test data and no real users; moved to
  [`old/`](old/) rather than deleted.
- **Phase 1** — done. Schema (`db/schema.ts`), migrations
  (`db/migrations/`), and seed data (`db/seed.ts`): workers, all 22
  categories (with `is_special`/colour/group), category groups, and the
  locations seen in the August sheet.
- **Phase 2** — done. Ran against the real `Work_Order_08_2026.xlsx`:
  346 work orders / 442 log entries promoted to production, with
  `review_needed.xlsx` handed off for the 36 rows that need a decision.
  See [Importing the August workbook](#importing-the-august-workbook).
- **Phase 3** — done. Login, 30-day sessions (`lib/session.ts`), the
  three roles with route protection (`proxy.ts` — renamed from
  `middleware.ts` in Next.js 16), a permissions module covering the §2
  table (`lib/permissions.ts`), and the admin review query for
  special-category jobs a worker opened (`lib/queries/admin-review.ts`).
  `app/page.tsx` is a placeholder home screen that proves the pipeline
  end to end; the real Today screen is Phase 4.
- **Phase 4 onward** — see the build spec's phase list.

## Running it

Requires Node.js 18+ and a Postgres 14+ database (Supabase or Neon in
production; any local Postgres works for development — needs the
`pg_trgm` extension, which the migrations enable).

```sh
npm install
cp .env.example .env.local   # set DATABASE_URL and SESSION_SECRET (openssl rand -base64 32)
npm run db:migrate           # create schema
npm run db:seed              # load workers/categories/locations
npm run db:seed:users        # dev-only login accounts, see Auth below
npm run dev                  # http://localhost:3000
```

## Auth

Username/password login, 30-day sessions (signed JWT in an `httpOnly`
cookie — see `lib/session.ts`), three roles enforced in `lib/permissions.ts`
per the spec's §2 table. `proxy.ts` (Next.js 16 renamed `middleware.ts` to
`proxy.ts`; same mechanism) redirects unauthenticated requests to `/login`.

There's no "create user" admin screen yet, so `npm run db:seed:users`
creates dev/test accounts — **all use password `changeme123`, change or
remove before any real deployment**:

| username | role | linked worker |
|---|---|---|
| `admin` | admin | — |
| `office` | office | — |
| `peal`, `na`, `khang`, `hong` | worker | เปิ้ล, นา, ข้าง, ฮอง |

## Data model

Postgres tables, matching the spec's §2 exactly:

```
users               -- who logs in: admin | office | worker
workers              -- who does the jobs (staff, contractors, other)
categories           -- every distinct spreadsheet category, nothing merged
category_groups      -- reporting-only roll-up, never consulted for is_special
locations            -- rooms and common areas
work_orders          -- the job: room, category, status, opener
wo_assignments        -- who a job is assigned to
wo_log_entries        -- one row per day of activity (replaces repeated Excel rows)
log_entry_workers     -- who actually worked that day
attachments
audit_log
```

The key modelling decision: **one Excel row is not one work order.** A work
order is the job; a log entry is what happened on one day. A Postgres
trigger (`db/migrations/0001_trigram_and_status_trigger.sql`) keeps
`work_orders.status` in sync with the latest log entry so the two can never
drift apart.

Thai text search uses trigram matching (`pg_trgm`), not `tsvector` — Postgres
ships no Thai word-segmentation dictionary and Thai text has no spaces
between words.

## Importing the August workbook

Requires Python 3.11+.

```sh
python3 -m venv .venv && source .venv/bin/activate
pip install -r scripts/requirements.txt
psql "$DATABASE_URL" -f scripts/staging_schema.sql   # one-time: creates the staging schema

python3 scripts/import_excel.py path/to/Work_Order_08_2026.xlsx
```

This stages work orders and log entries into a `staging` Postgres schema —
nothing reaches production yet — and writes `review_needed.xlsx` next to the
input file, listing every row that needs a look before promoting: genuine
WO# collisions that touch a special category (not auto-split — see spec §6
step 5), rows with no parseable date, unrecognised worker names, unexpected
categories, and near-duplicate location spellings. Categories and locations
themselves are upserted straight into the shared reference tables as they're
encountered (§6 steps 9-10), since that's low-risk and needed for the
foreign keys regardless of whether the batch of work orders is promoted.

Sit with your cousin, resolve the `must_resolve` rows, re-run the script if
anything needs to change (it truncates and re-stages each time), then
promote:

```sh
psql "$DATABASE_URL" -f scripts/promote_staging.sql
```

which copies staging into production inside one transaction, prints the
before/after counts to check against the spec's expectations (~350 work
orders, 478 log entries from 336 numbers), and empties staging.

## Project layout

```
app/              Next.js App Router pages/API routes
db/schema.ts      Drizzle schema — the source of truth for the data model
db/migrations/    Generated + hand-written SQL migrations
db/seed.ts        Phase 1 seed data
scripts/          Import script(s) for the historical Excel workbooks
old/              Superseded Express + SQLite scaffold, kept per spec (never deleted)
```
