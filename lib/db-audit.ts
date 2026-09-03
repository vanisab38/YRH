import 'server-only';
import { sql } from 'drizzle-orm';
import type { PgTransaction } from 'drizzle-orm/pg-core';

// Every write to work_orders, wo_log_entries, or categories must run
// through this first, inside the same transaction — the audit trigger
// (db/migrations/0004_audit_trigger.sql) reads this session-local setting
// to know who made the change, and raises if it's missing rather than
// silently writing an unattributed row.
export async function setAuditUser(
  tx: PgTransaction<any, any, any>, // eslint-disable-line @typescript-eslint/no-explicit-any -- driver-specific transaction type, matches db.transaction()'s own callback param
  userId: string
): Promise<void> {
  await tx.execute(sql`select set_config('app.current_user_id', ${userId}, true)`);
}
