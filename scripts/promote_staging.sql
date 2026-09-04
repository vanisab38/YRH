-- Promote a reviewed staging import into production (§6: "spot-check twenty
-- against the spreadsheet before promoting"). Run only after review_needed.xlsx
-- has been resolved with your cousin and any must-resolve rows have been
-- fixed by re-running import_excel.py (or handled by hand).
--
--   psql "$DATABASE_URL" -f scripts/promote_staging.sql

BEGIN;

-- Audit trigger (db/migrations/0004_audit_trigger.sql) requires this before
-- any write to work_orders/wo_log_entries — attribute the promoted rows to
-- the same system user the import script used to stage them.
SELECT set_config('app.current_user_id', (SELECT id::text FROM users WHERE username = 'imported'), true);

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

-- §2.1 step 11b: extend wo_counters to cover whatever periods this batch
-- just promoted, or the next work order created through the app in that
-- period would start back at 001 and collide with an imported number.
INSERT INTO wo_counters (period, last_seq)
SELECT left(wo_no, 4), max(right(wo_no, 3)::int)
FROM staging.work_orders
GROUP BY left(wo_no, 4)
ON CONFLICT (period) DO UPDATE SET last_seq = GREATEST(wo_counters.last_seq, excluded.last_seq);

-- §6: verify counts before trusting the promotion.
SELECT
  (SELECT count(*) FROM staging.work_orders)   AS staged_work_orders,
  (SELECT count(*) FROM work_orders)            AS production_work_orders_total,
  (SELECT count(*) FROM staging.wo_log_entries) AS staged_log_entries,
  (SELECT count(*) FROM wo_log_entries)          AS production_log_entries_total;

TRUNCATE staging.log_entry_workers, staging.wo_log_entries, staging.work_orders;

COMMIT;
