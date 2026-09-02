-- Thai search (§5): trigram matching, not tsvector — Postgres ships no Thai
-- word-segmentation dictionary, and Thai text has no spaces between words.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_wo_description_trgm
  ON work_orders USING gin (description gin_trgm_ops);
--> statement-breakpoint

-- Keep work_orders.status in sync with the latest wo_log_entries row so the
-- two can never drift apart (§2, wo_log_entries). Recomputes from the most
-- recent log entry on insert/update/delete rather than trusting NEW blindly,
-- so correcting or removing a log entry later still leaves status correct.
CREATE OR REPLACE FUNCTION sync_work_order_status() RETURNS trigger AS $$
DECLARE
  target_wo_id uuid;
  latest RECORD;
BEGIN
  target_wo_id := COALESCE(NEW.work_order_id, OLD.work_order_id);

  SELECT status_after, log_date
    INTO latest
    FROM wo_log_entries
    WHERE work_order_id = target_wo_id
    ORDER BY log_date DESC, created_at DESC, id DESC
    LIMIT 1;

  IF FOUND THEN
    IF latest.status_after = 'done' THEN
      UPDATE work_orders
        SET status = 'done', closed_date = latest.log_date
        WHERE id = target_wo_id;
    ELSE
      UPDATE work_orders
        SET status = latest.status_after, closed_date = NULL
        WHERE id = target_wo_id;
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_work_order_status ON wo_log_entries;
CREATE TRIGGER trg_sync_work_order_status
  AFTER INSERT OR UPDATE OR DELETE ON wo_log_entries
  FOR EACH ROW EXECUTE FUNCTION sync_work_order_status();
