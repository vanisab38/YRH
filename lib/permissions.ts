// Authorization rules from the spec's §2 permission table. Centralised here
// so Phase 4+ screens and Server Actions check against one definition
// instead of re-deriving role logic ad hoc.
import type { Role } from './session';

export function canCreateWorkOrder(): boolean {
  return true; // admin, office, worker — everyone can open a job (§2)
}

export function canAddLogEntryToAnyJob(role: Role): boolean {
  return role === 'admin' || role === 'office';
}

export function canAddLogEntryToJob(role: Role, jobCreatedBy: string, userId: string): boolean {
  if (canAddLogEntryToAnyJob(role)) return true;
  return jobCreatedBy === userId; // worker: own / assigned job only
}

export function canEditCategoryOnAnyJob(role: Role): boolean {
  return role === 'admin' || role === 'office';
}

// Worker may edit the category on a job they opened, but only until the
// first log entry is recorded against it — after that the category is
// what determined pay eligibility for logged work, so it's locked for them.
export function canEditCategory(
  role: Role,
  job: { createdBy: string; hasLogEntries: boolean },
  userId: string
): boolean {
  if (canEditCategoryOnAnyJob(role)) return true;
  return job.createdBy === userId && !job.hasLogEntries;
}

export function canViewAllWorkOrders(): boolean {
  return true; // §2: "Workers see everything, read-only."
}

export function canViewReports(role: Role): boolean {
  return role === 'admin' || role === 'office';
}

export function canManageAdmin(role: Role): boolean {
  return role === 'admin'; // users, workers, categories, locations
}

// §2: a work order opened by a worker with a special category is not
// blocked, just surfaced for admin visibility (created_by is the audit trail).
export function needsAdminReview(openerRole: Role, categoryIsSpecial: boolean): boolean {
  return openerRole === 'worker' && categoryIsSpecial;
}
