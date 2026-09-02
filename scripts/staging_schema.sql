-- Staging area for the Excel import (§6: "Import into a staging schema
-- first... spot-check twenty against the spreadsheet before promoting").
--
-- Only work_orders / wo_log_entries / log_entry_workers / wo_assignments are
-- staged — categories, locations, and the "imported" system user are shared
-- reference data that import_excel.py upserts straight into the public
-- schema (§6 steps 9-10 say every distinct category/location string becomes
-- a row; that's low-risk and needed for FK validity regardless of whether
-- the batch of work orders is later promoted or thrown away).
--
-- Re-run safe: import_excel.py truncates these tables at the start of each
-- run, so a staging run always reflects only the most recent import attempt.

CREATE SCHEMA IF NOT EXISTS staging;

CREATE TABLE IF NOT EXISTS staging.work_orders (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wo_no             text NOT NULL,
  legacy_wo_no      text,
  opened_date       date NOT NULL,
  category_id       uuid NOT NULL REFERENCES public.categories(id),
  location_id       uuid NOT NULL REFERENCES public.locations(id),
  description       text NOT NULL,
  status            text NOT NULL CHECK (status IN ('pending', 'done', 'cancelled')),
  priority          text NOT NULL DEFAULT 'normal',
  created_by        uuid NOT NULL REFERENCES public.users(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  closed_date       date,
  closed_by         uuid REFERENCES public.users(id),
  notes             text
);

CREATE TABLE IF NOT EXISTS staging.wo_log_entries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id   uuid NOT NULL REFERENCES staging.work_orders(id) ON DELETE CASCADE,
  log_date        date NOT NULL,
  note            text,
  status_after    text NOT NULL CHECK (status_after IN ('pending', 'done')),
  entered_by      uuid NOT NULL REFERENCES public.users(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS staging.log_entry_workers (
  log_entry_id  uuid NOT NULL REFERENCES staging.wo_log_entries(id) ON DELETE CASCADE,
  worker_id     uuid NOT NULL REFERENCES public.workers(id),
  PRIMARY KEY (log_entry_id, worker_id)
);
