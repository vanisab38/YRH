-- §2 audit_log: "Trigger on work_orders and wo_log_entries. Category
-- changes above all... A category edited after the fact — on a job, or on
-- the category record itself — is the one change that must be explainable
-- months later." The table existed since Phase 1; nothing wrote to it,
-- which is worse than not having it, since it looks like coverage. This is
-- that trigger — on work_orders, wo_log_entries, and categories (broader
-- than the literal table list, but "on the category record itself" is
-- explicit that categories.is_special/help_text edits need the same trail).
--
-- changed_by can't be read off the row being written (work_orders/
-- categories have no "last edited by" column, and adding one would
-- duplicate what this table already exists to hold), so the app sets a
-- session-local Postgres setting once per transaction before any write —
-- see lib/db-audit.ts — and the trigger reads it. A write that reaches
-- these tables without that setting fails loudly (clear error) rather than
-- silently skipping the audit row.
CREATE OR REPLACE FUNCTION fn_audit_change() RETURNS trigger AS $$
DECLARE
  actor uuid;
BEGIN
  actor := nullif(current_setting('app.current_user_id', true), '')::uuid;
  IF actor IS NULL THEN
    RAISE EXCEPTION 'app.current_user_id is not set — every write to %.%  must run inside a transaction that calls set_config(''app.current_user_id'', ..., true) first (see lib/db-audit.ts)', TG_TABLE_SCHEMA, TG_TABLE_NAME;
  END IF;

  INSERT INTO audit_log (table_name, record_id, action, changed_by, old_values, new_values)
  VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    lower(TG_OP),
    actor,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
  );

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_work_orders ON work_orders;
CREATE TRIGGER trg_audit_work_orders
  AFTER INSERT OR UPDATE OR DELETE ON work_orders
  FOR EACH ROW EXECUTE FUNCTION fn_audit_change();

DROP TRIGGER IF EXISTS trg_audit_wo_log_entries ON wo_log_entries;
CREATE TRIGGER trg_audit_wo_log_entries
  AFTER INSERT OR UPDATE OR DELETE ON wo_log_entries
  FOR EACH ROW EXECUTE FUNCTION fn_audit_change();

DROP TRIGGER IF EXISTS trg_audit_categories ON categories;
CREATE TRIGGER trg_audit_categories
  AFTER INSERT OR UPDATE OR DELETE ON categories
  FOR EACH ROW EXECUTE FUNCTION fn_audit_change();
