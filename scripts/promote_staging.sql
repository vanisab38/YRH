-- Promote a reviewed staging import into production (§6: "spot-check twenty
-- against the spreadsheet before promoting"). Run only after review_needed.xlsx
-- has been resolved with your cousin and any must-resolve rows have been
-- fixed by re-running import_excel.py (or handled by hand).
--
--   psql "$DATABASE_URL" -f scripts/promote_staging.sql

BEGIN;

INSERT INTO work_orders
  (id, wo_no, legacy_wo_no, opened_date, category_id, location_id,
   description, status, priority, created_by, created_at, closed_date, closed_by, notes)
SELECT id, wo_no, legacy_wo_no, opened_date, category_id, location_id,
       description, status, priority, created_by, created_at, closed_date, closed_by, notes
FROM staging.work_orders;

INSERT INTO wo_log_entries
  (id, work_order_id, log_date, note, status_after, entered_by, created_at)
SELECT id, work_order_id, log_date, note, status_after, entered_by, created_at
FROM staging.wo_log_entries;

INSERT INTO log_entry_workers (log_entry_id, worker_id)
SELECT log_entry_id, worker_id
FROM staging.log_entry_workers;

-- §6: verify counts before trusting the promotion.
SELECT
  (SELECT count(*) FROM staging.work_orders)   AS staged_work_orders,
  (SELECT count(*) FROM work_orders)            AS production_work_orders_total,
  (SELECT count(*) FROM staging.wo_log_entries) AS staged_log_entries,
  (SELECT count(*) FROM wo_log_entries)          AS production_log_entries_total;

TRUNCATE staging.log_entry_workers, staging.wo_log_entries, staging.work_orders;

COMMIT;
