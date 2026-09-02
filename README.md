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
- **Phase 2 onward** — see the build spec's phase list.

## Running it

Requires Node.js 18+ and a Postgres 14+ database (Supabase or Neon in
production; any local Postgres works for development — needs the
`pg_trgm` extension, which the migrations enable).

```sh
npm install
cp .env.example .env.local   # set DATABASE_URL
npm run db:migrate           # create schema
npm run db:seed              # load workers/categories/locations
npm run dev                  # http://localhost:3000
```

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

## Project layout

```
app/              Next.js App Router pages/API routes
db/schema.ts      Drizzle schema — the source of truth for the data model
db/migrations/    Generated + hand-written SQL migrations
db/seed.ts        Phase 1 seed data
scripts/          Import script(s) for the historical Excel workbooks
old/              Superseded Express + SQLite scaffold, kept per spec (never deleted)
```
