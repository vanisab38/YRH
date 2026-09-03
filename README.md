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
- **Phase 4** — done. Today screen (opened-today / all-pending-oldest-first,
  `+ เปิดงานใหม่`, admin review list wired in for real), new work order form
  (searchable room field, category picker with colour badges, worker
  assignment, priority), and work order detail with log-entry history and
  `+ บันทึกงานวันนี้`. `wo_no` is generated server-side inside the insert
  transaction with retry-on-collision, per §2. This is the minimum that
  replaces the Excel.
- **Phase 5** — done. Search (`/search`): one box across description/WO#/
  legacy_wo_no/room (substring match on the `pg_trgm` index from §5, not
  word-based full-text search — Thai has no spaces between words) plus
  filter chips for status/category/group/worker/date range, and an
  "ส่งออกเป็น Excel" export (`/api/search/export`, via `exceljs` — not the
  `xlsx` npm package, which carries unpatched high-severity CVEs). Room
  history (`/rooms`): pick a room, see every work order raised on it newest
  first with per-category counts.
- **Phase 6** — done, admin/office only (`/reports`). **4.1 Special work
  report** (`/reports/special-work`): one section per special category,
  staff/contractor day counts in separate columns, red/amber row flags for
  no-one-logged and contractor-only jobs — verified against the spec's own
  worked examples (WO 2608131: staff เปิ้ล (4) + contractor ช่างมิตซูบิชิ
  (2); WO 2608091: เปิ้ล (3) among three workers). **4.2 Worker activity**
  (`/reports/worker-activity`). **4.3 Pending/ageing**
  (`/reports/ageing`): 0–3/4–7/8–14/15–30/30+ day buckets — not date-range
  filtered, since it's about everything open right now. **4.4 Room
  summary** (`/reports/rooms`): every room in one period at a glance,
  distinct from the live single-room drill-down at `/rooms`, flagging
  repeat issues in the same category. Every report exports to Excel
  (`exceljs`) and "PDF" via the browser's native print-to-PDF (a
  `PrintButton` + `print:` Tailwind variants to hide the chrome) rather
  than a server-rendered PDF — no extra dependency, and it's what the spec
  actually needs for a monthly stack of reports.
- **Phase 7** — code done; **needs a real Supabase project to actually
  work** (see [Photos](#photos) below — this session has no credentials
  for one). Photo upload on the work order detail page, resized to max
  1600px server-side (`sharp`), stored in a private Supabase Storage
  bucket, displayed via short-lived signed URLs. Degrades to a "not
  configured" message instead of a 500 page when the env vars are unset —
  verified: an upload attempt against unset Supabase config shows a
  friendly Thai error with no stack trace and no orphaned database row.
- **Phase 8** — done. Offline handling is deliberately lightweight, not a
  full offline-first rebuild (staff lose signal in stairwells/basement
  plant rooms, not for hours at a time): an `OfflineBanner`
  (`useSyncExternalStore` on `navigator.onLine`, not `useState`+`useEffect`
  — avoids a server/client mismatch and an extra render) makes it
  unmistakable when a save won't go through, rather than a button that
  silently does nothing. Empty states filled in across search (no query
  yet / no results), room history (no room picked yet), and the ageing
  report (nothing pending). Standard Next.js boundaries added: `loading.tsx`
  (a spinner, not a blank screen, while `/search`, `/rooms`, `/reports/*`,
  and `/work-orders/*` fetch), `error.tsx`, and a custom `not-found.tsx` —
  all in Thai. Running the new system alongside the Excel for two weeks
  before retiring it (per §8's closing line) is an operational step for
  whoever administers this day to day, not something to build.
- **Admin: users and categories** — done. §3 describes an Admin screen but
  the phase list (§8) never assigned it a phase, so the 8-phase build
  reached "all phases done" without it — a real gap, not a skipped step,
  and a go-live blocker: without it, only the accounts `db:seed:users`
  creates by hand can log in, so the property owner had no way to create
  or manage her own staff accounts. `/admin/users`: create, set role, link
  to a `workers` record, deactivate, reset password. `/admin/categories`:
  `is_special`/colour/group/active, plus a new `help_text` column
  (`db/migrations/0003_categories_help_text.sql`) that renders live under
  the category picker on the New Work Order form — the mechanism §9.1
  needs once someone decides the actual sentence.

  Building and testing this surfaced two real bugs in the auth/session
  work from Phase 3, now fixed: `verifySession()` (`lib/dal.ts`) trusted
  the session cookie's baked-in claims for the cookie's full 30-day life,
  so deactivating a user or changing their role had no effect until they
  happened to log out — now it re-checks the user against the database on
  every request (one indexed lookup, cheap at this scale). That fix then
  collided with `proxy.ts`'s "already authenticated → bounce away from
  /login" rule: a deactivated user's still-valid cookie would get bounced
  from /login back to /, which the DB check would immediately redirect
  back to /login — an infinite loop, caught by testing the deactivate
  action against a live session rather than only against the database.
  Both are fixed and verified: deactivation and role changes now take
  effect on the very next request, with no crash and no loop.

  **Still a gap, found while building this:** §2 specifies an audit
  trigger on `work_orders` and `wo_log_entries`, called out specifically
  for category changes ("the one change worth being able to explain
  later") — the `audit_log` table exists (Phase 1) but nothing has ever
  written to it. Category edits in `/admin/categories` and any future
  work-order-level category edit are exactly the case this table was
  built for. Worth its own pass.

**Two verifications, cheap to state plainly:**

- **Log entries: 442, not 478.** The spec's own estimate ("expect 336
  numbers in, ~350 work orders out, 478 log entries") was written before
  the import ran. 346 work orders is right in line with that. 442 log
  entries is *correct*, not a shortfall — already reconciled during the
  real import (see the Phase 2 commits): 477 rows were read (1 dropped as
  a repeated header), and 35 of those were deliberately excluded rather
  than guessed at — 21 + 9 rows from the two collisions routed to manual
  review (2608025, 2608044), 2 rows with `ค้าง` instead of a date, and 3
  rows with an implausible year. 477 − 35 = 442, and every excluded row is
  itemized in `review_needed.xlsx`.
- **Not deployed anywhere.** No `vercel.json`, no `.vercel/`, no hosting
  connected — this has only ever run locally (`npm run dev`) inside the
  sandbox that built it. It has never been reachable from a phone, and the
  two-week parallel run described in §8's closing line can't start until
  it is. Deploying needs a hosting decision and account access a session
  like this one doesn't have — Vercel (matching §7's default stack) is
  the natural choice given the Next.js/Postgres stack already in place.

**Then the critical path is no longer code.** Three things need a person,
not another build session:

- **review_needed.xlsx** (§6) — 36 rows from the real import: the two
  collisions routed to manual review (2608025, 2608044), three date
  typos, one duplicate log row, an unrecognised worker name, and some
  near-duplicate location spellings (`ห้องน้ำคนขับ` / `ห้องน้ำคนขับรถ`).
- **§9.1** — the one-sentence rule for when ล้างแอร์-type air-con cleaning
  is paid (`แอร์`) vs. routine (`งานประจำ`) — now has a place to live
  (`/admin/categories` → แอร์ → "ข้อความช่วยเหลือ") the moment someone
  states it.
- **§9.2** — confirm nothing besides แอร์/ยาแนว/โปรเจค should count as
  special, before the special-work report becomes what payroll is
  actually read from.

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

## Photos

Photo attachments (`lib/storage.ts`, `lib/image.ts`) need a Supabase
project — this session had no credentials to create or test against one,
so the code is written and degrades cleanly when unconfigured, but hasn't
been verified against a real bucket. One-time setup:

1. Create a project at [supabase.com](https://supabase.com) (or use the one
   already running `DATABASE_URL`, if it's a Supabase Postgres instance).
2. Storage → New bucket → name it `attachments`, **leave it private**
   (these are photos of guest rooms, not public assets — the app reads
   them back through short-lived signed URLs, never a public one).
3. Project Settings → API → copy the Project URL and the **service role**
   key (not the `anon` key — uploads happen server-side in Server Actions,
   never in the browser).
4. Add to `.env.local`:
   ```
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   SUPABASE_STORAGE_BUCKET=attachments
   ```

With those unset, the work order detail page still renders — the photo
section shows "ระบบจัดเก็บรูปภาพยังไม่ได้ตั้งค่า" ("photo storage isn't
configured yet") instead of a photo grid, and an upload attempt shows a
friendly error rather than a 500. Once configured, no restart or code
change should be needed — worth a real end-to-end check (upload a phone
photo, confirm it resizes and the detail page displays it) before relying
on this in production.

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
