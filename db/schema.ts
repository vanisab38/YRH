import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  date,
  timestamp,
  jsonb,
  primaryKey,
  index,
  check,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// users — anyone who logs in
// ---------------------------------------------------------------------------
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name').notNull(),
  role: text('role').notNull(), // 'admin' | 'office' | 'worker'
  workerId: uuid('worker_id').references((): AnyPgColumn => workers.id),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check('users_role_check', sql`${t.role} in ('admin', 'office', 'worker')`),
]);

// ---------------------------------------------------------------------------
// workers — people who do the jobs (staff, contractors, others)
// ---------------------------------------------------------------------------
export const workers = pgTable('workers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  fullName: text('full_name'),
  type: text('type').notNull(), // 'staff' | 'contractor' | 'other'
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
}, (t) => [
  check('workers_type_check', sql`${t.type} in ('staff', 'contractor', 'other')`),
]);

// ---------------------------------------------------------------------------
// category_groups — optional roll-up for reporting only, never for is_special
// ---------------------------------------------------------------------------
export const categoryGroups = pgTable('category_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  nameTh: text('name_th').notNull().unique(),
  sortOrder: integer('sort_order').notNull().default(0),
});

// ---------------------------------------------------------------------------
// categories — every distinct spreadsheet value, nothing merged
// ---------------------------------------------------------------------------
export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  nameTh: text('name_th').notNull().unique(),
  groupId: uuid('group_id').references(() => categoryGroups.id),
  isSpecial: boolean('is_special').notNull().default(false),
  colour: text('colour'),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
});

// ---------------------------------------------------------------------------
// locations — rooms and common areas
// ---------------------------------------------------------------------------
export const locations = pgTable('locations', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  type: text('type').notNull(), // 'room' | 'common' | 'external'
  floor: integer('floor'),
  displayName: text('display_name'),
  isActive: boolean('is_active').notNull().default(true),
}, (t) => [
  check('locations_type_check', sql`${t.type} in ('room', 'common', 'external')`),
]);

// ---------------------------------------------------------------------------
// work_orders — the job, created once
// ---------------------------------------------------------------------------
export const workOrders = pgTable('work_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  woNo: text('wo_no').notNull().unique(), // 'YYMMNNN'
  legacyWoNo: text('legacy_wo_no'),
  openedDate: date('opened_date').notNull(),
  categoryId: uuid('category_id').notNull().references(() => categories.id),
  locationId: uuid('location_id').notNull().references(() => locations.id),
  description: text('description').notNull(),
  status: text('status').notNull(), // 'pending' | 'done' | 'cancelled'
  priority: text('priority').notNull().default('normal'),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  closedDate: date('closed_date'),
  closedBy: uuid('closed_by').references(() => users.id),
  notes: text('notes'),
}, (t) => [
  check('work_orders_status_check', sql`${t.status} in ('pending', 'done', 'cancelled')`),
  index('idx_work_orders_status').on(t.status),
  index('idx_work_orders_location_opened').on(t.locationId, t.openedDate),
  index('idx_work_orders_category').on(t.categoryId),
  index('idx_work_orders_opened_date').on(t.openedDate),
  index('idx_work_orders_legacy_wo_no').on(t.legacyWoNo),
]);

// ---------------------------------------------------------------------------
// wo_assignments — who the job is assigned to (who *should* do it)
// ---------------------------------------------------------------------------
export const woAssignments = pgTable('wo_assignments', {
  workOrderId: uuid('work_order_id').notNull().references(() => workOrders.id, { onDelete: 'cascade' }),
  workerId: uuid('worker_id').notNull().references(() => workers.id),
  assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.workOrderId, t.workerId] }),
]);

// ---------------------------------------------------------------------------
// wo_log_entries — one row per day of activity, replaces repeated Excel rows
// ---------------------------------------------------------------------------
export const woLogEntries = pgTable('wo_log_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  workOrderId: uuid('work_order_id').notNull().references(() => workOrders.id, { onDelete: 'cascade' }),
  logDate: date('log_date').notNull(),
  note: text('note'),
  statusAfter: text('status_after').notNull(), // 'pending' | 'done'
  enteredBy: uuid('entered_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check('wo_log_entries_status_after_check', sql`${t.statusAfter} in ('pending', 'done')`),
  index('idx_wo_log_entries_wo_date').on(t.workOrderId, t.logDate),
  index('idx_wo_log_entries_log_date').on(t.logDate),
]);

// ---------------------------------------------------------------------------
// log_entry_workers — who actually worked that day (vs. who was assigned)
// ---------------------------------------------------------------------------
export const logEntryWorkers = pgTable('log_entry_workers', {
  logEntryId: uuid('log_entry_id').notNull().references(() => woLogEntries.id, { onDelete: 'cascade' }),
  workerId: uuid('worker_id').notNull().references(() => workers.id),
}, (t) => [
  primaryKey({ columns: [t.logEntryId, t.workerId] }),
]);

// ---------------------------------------------------------------------------
// attachments
// ---------------------------------------------------------------------------
export const attachments = pgTable('attachments', {
  id: uuid('id').primaryKey().defaultRandom(),
  workOrderId: uuid('work_order_id').notNull().references(() => workOrders.id, { onDelete: 'cascade' }),
  logEntryId: uuid('log_entry_id').references(() => woLogEntries.id, { onDelete: 'cascade' }),
  storagePath: text('storage_path').notNull(),
  filename: text('filename').notNull(),
  mimeType: text('mime_type').notNull(),
  uploadedBy: uuid('uploaded_by').notNull().references(() => users.id),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// audit_log
// ---------------------------------------------------------------------------
export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  tableName: text('table_name').notNull(),
  recordId: uuid('record_id').notNull(),
  action: text('action').notNull(), // 'insert' | 'update' | 'delete'
  changedBy: uuid('changed_by').notNull().references(() => users.id),
  changedAt: timestamp('changed_at', { withTimezone: true }).notNull().defaultNow(),
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),
}, (t) => [
  check('audit_log_action_check', sql`${t.action} in ('insert', 'update', 'delete')`),
  index('idx_audit_log_record').on(t.tableName, t.recordId),
]);
