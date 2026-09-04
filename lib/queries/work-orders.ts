import 'server-only';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  workOrders,
  categories,
  locations,
  workers,
  woAssignments,
  woLogEntries,
  logEntryWorkers,
  users,
} from '@/db/schema';
import { bangkokToday } from '@/lib/dates';
import { DAYS_WORKED_SQL } from '@/lib/queries/search';

const workOrderListSelection = {
  id: workOrders.id,
  woNo: workOrders.woNo,
  openedDate: workOrders.openedDate,
  status: workOrders.status,
  description: workOrders.description,
  categoryName: categories.nameTh,
  categoryColour: categories.colour,
  categoryIsSpecial: categories.isSpecial,
  locationCode: locations.code,
};

// Today screen (§3): jobs opened today. The pending list (§3.1) lives in
// lib/queries/search.ts's searchWorkOrders — same sort/group/filter/search
// component as the Search page, per Phase 11's "build both from the same
// component."
export async function getTodayOpenedWorkOrders() {
  const today = bangkokToday();
  return db
    .select({ ...workOrderListSelection, daysWorked: DAYS_WORKED_SQL })
    .from(workOrders)
    .innerJoin(categories, eq(categories.id, workOrders.categoryId))
    .innerJoin(locations, eq(locations.id, workOrders.locationId))
    .where(eq(workOrders.openedDate, today))
    .orderBy(desc(workOrders.createdAt));
}

// New work order form: locations ordered with recently-used rooms first,
// never-used rooms after (in room-number order, not the DB's lexical order
// -- see getAllLocationsForPicker for why that matters).
export async function getLocationsForPicker() {
  const rows = await db
    .select({
      id: locations.id,
      code: locations.code,
      type: locations.type,
      lastUsed: sql<string | null>`max(${workOrders.openedDate})`,
    })
    .from(locations)
    .leftJoin(workOrders, eq(workOrders.locationId, locations.id))
    .where(eq(locations.isActive, true))
    .groupBy(locations.id);

  return rows.sort((a, b) => {
    if (a.lastUsed !== b.lastUsed) {
      if (a.lastUsed === null) return 1;
      if (b.lastUsed === null) return -1;
      return b.lastUsed.localeCompare(a.lastUsed);
    }
    return a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' });
  });
}

export async function getActiveCategories() {
  return db
    .select({
      id: categories.id,
      nameTh: categories.nameTh,
      isSpecial: categories.isSpecial,
      colour: categories.colour,
      helpText: categories.helpText,
    })
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(asc(categories.sortOrder));
}

export async function getActiveWorkers() {
  return db
    .select({ id: workers.id, name: workers.name, type: workers.type })
    .from(workers)
    .where(eq(workers.isActive, true))
    .orderBy(asc(workers.sortOrder));
}

export async function getWorkOrderDetail(id: string) {
  const [wo] = await db
    .select({
      id: workOrders.id,
      woNo: workOrders.woNo,
      legacyWoNo: workOrders.legacyWoNo,
      openedDate: workOrders.openedDate,
      closedDate: workOrders.closedDate,
      status: workOrders.status,
      priority: workOrders.priority,
      description: workOrders.description,
      notes: workOrders.notes,
      createdBy: workOrders.createdBy,
      categoryId: workOrders.categoryId,
      categoryName: categories.nameTh,
      categoryColour: categories.colour,
      categoryIsSpecial: categories.isSpecial,
      locationCode: locations.code,
      createdByName: users.displayName,
    })
    .from(workOrders)
    .innerJoin(categories, eq(categories.id, workOrders.categoryId))
    .innerJoin(locations, eq(locations.id, workOrders.locationId))
    .innerJoin(users, eq(users.id, workOrders.createdBy))
    .where(eq(workOrders.id, id));

  if (!wo) return null;

  const assignedWorkers = await db
    .select({ id: workers.id, name: workers.name })
    .from(woAssignments)
    .innerJoin(workers, eq(workers.id, woAssignments.workerId))
    .where(eq(woAssignments.workOrderId, id));

  const logEntries = await db
    .select({
      id: woLogEntries.id,
      logDate: woLogEntries.logDate,
      note: woLogEntries.note,
      statusAfter: woLogEntries.statusAfter,
      enteredByName: users.displayName,
    })
    .from(woLogEntries)
    .innerJoin(users, eq(users.id, woLogEntries.enteredBy))
    .where(eq(woLogEntries.workOrderId, id))
    .orderBy(asc(woLogEntries.logDate), asc(woLogEntries.createdAt));

  const logEntryWorkerRows = logEntries.length
    ? await db
        .select({ logEntryId: logEntryWorkers.logEntryId, name: workers.name })
        .from(logEntryWorkers)
        .innerJoin(workers, eq(workers.id, logEntryWorkers.workerId))
        .where(inArray(logEntryWorkers.logEntryId, logEntries.map((l) => l.id)))
    : [];

  const workersByLogEntry = new Map<string, string[]>();
  for (const row of logEntryWorkerRows) {
    const list = workersByLogEntry.get(row.logEntryId) ?? [];
    list.push(row.name);
    workersByLogEntry.set(row.logEntryId, list);
  }

  return {
    ...wo,
    assignedWorkers,
    logEntries: logEntries.map((l) => ({ ...l, workers: workersByLogEntry.get(l.id) ?? [] })),
  };
}

export async function isWorkerAssigned(workOrderId: string, workerId: string): Promise<boolean> {
  const [row] = await db
    .select({ workerId: woAssignments.workerId })
    .from(woAssignments)
    .where(and(eq(woAssignments.workOrderId, workOrderId), eq(woAssignments.workerId, workerId)));
  return !!row;
}
