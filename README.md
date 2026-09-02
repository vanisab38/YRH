# SawasdeeLife Work Orders

A small internal tool for tracking building maintenance work orders — replaces
the shared monthly Excel log (`Work_Order_MM.YYYY.xlsx`) with a real database,
a filterable table/kanban interface, and an API.

Built as a plain Node.js + Express + SQLite app: no external services or
accounts required, runs entirely on one machine/server with `npm install &&
npm start`.

## Why this shape

The original spreadsheet has one row per task with free-typed Category,
Location, and "By" (assignee) cells, plus four extra columns (one per staff
member) marked with an `X` to show who worked on it. That's fine for a single
month's log, but it means the same category or person gets spelled several
different ways over time, and there's no way to filter/report on the data
without opening Excel.

This app normalizes those into proper tables/lookups and adds real status
tracking (with a 3-stage workflow instead of the sheet's just "done" /
"pending") while keeping every field the spreadsheet already had.

## Data model

```
staff              (id, name, active)
categories         (id, name)
locations          (id, label, type: room | floor | common_area | other)

work_orders (
  id, wo_number, status ('open' | 'in_progress' | 'done'),
  category_id -> categories, location_id -> locations,
  detail, reported_date, created_at, updated_at
)

work_order_assignees   (work_order_id, staff_id)   -- many-to-many, replaces the per-staff X columns
work_order_notes       (work_order_id, staff_id, note, created_at)   -- optional running log per work order
```

See `server/schema.sql` for the full DDL.

`categories` and `locations` are created on the fly the first time a new
value is typed (via a `<datalist>` in the UI, so existing values still
autocomplete) — this keeps data entry as fast as free text while the values
end up normalized in their own tables.

## Running it

Requires Node.js 18+.

```sh
npm install
npm run seed     # optional: loads a handful of sample work orders
npm start        # http://localhost:3000
```

`npm run dev` restarts the server on file changes.

The SQLite database file is created automatically at `data/workorders.db` on
first run (ignored by git).

## Importing the real spreadsheet history

To bring in the existing monthly log(s) instead of (or in addition to) the
sample seed data:

```sh
npm run import -- /path/to/Work_Order_08.2026.xlsx
```

This reads the first sheet, skips header/template rows and rows with no
detail, and maps:
- `เสร็จ` → `done`, `ค้าง` → `in_progress`, anything else → `open`
- the `By` cell (which may contain several names separated by `,` `/` or
  spaces) → one row per assignee in `work_order_assignees`
- `dd.mm.yyyy` dates → `yyyy-mm-dd`

Run it once per monthly file you want to bring in — it's additive, so
importing the same file twice will create duplicate rows.

## API

All endpoints are under `/api`, JSON in/out.

| Method | Path | Notes |
|---|---|---|
| GET | `/api/work-orders` | filters: `status`, `category`, `location`, `staff`, `q` (search in detail) |
| GET | `/api/work-orders/:id` | |
| POST | `/api/work-orders` | `{ wo_number, category, location, detail, status, reported_date, assignees: [name, ...] }` |
| PATCH | `/api/work-orders/:id` | partial update, same shape |
| DELETE | `/api/work-orders/:id` | |
| GET/POST | `/api/work-orders/:id/notes` | append a timestamped note |
| GET/POST | `/api/staff` | |
| GET/POST | `/api/categories` | |
| GET/POST | `/api/locations` | |

## Interface

- **Table view** — filterable list, closest to the original spreadsheet.
- **Kanban view** — Open / In Progress / Done columns; move a card between
  them with the dropdown on the card.
- **New/Edit dialog** — category and location autocomplete from existing
  values but accept new ones; assignees are checkboxes so a task can have
  several people on it (like the sheet's per-staff X columns).

## Possible next steps

- Auth (even a single shared staff login) before this goes on a network
  anyone else can reach.
- Photo attachments per work order (common for maintenance logs).
- A monthly export back to `.xlsx` if anyone downstream still needs the old
  format.
- Swap SQLite for Postgres (e.g. Supabase) if this needs to be accessed by
  multiple people from different devices over the internet rather than run
  on one local/staff machine.
