import 'server-only';
import { and, asc, desc, eq, exists, gte, lte, or, ilike, sql, type SQL } from 'drizzle-orm';
import { db } from '@/db';
import {
  workOrders,
  categories,
  categoryGroups,
  locations,
  workers,
  woAssignments,
  woLogEntries,
  logEntryWorkers,
  attachments,
} from '@/db/schema';

export type ListSort = 'stalled' | 'oldest' | 'room' | 'category' | 'woNo' | 'recentlyUpdated' | 'newest';
export type ListGroup = 'none' | 'room' | 'floor';

export type SearchFilters = {
  q?: string;
  status?: string;
  categoryId?: string;
  groupId?: string;
  workerId?: string;
  dateFrom?: string;
  dateTo?: string;
  // §3.1: pending-list controls, shared with Search via the same query.
  assignedWorkerId?: string; // "งานของฉัน" — wo_assignments, not who logged time
  specialOnly?: boolean;
  stalledOver7?: boolean;
  floor?: string; // exact floor number as a string, or 'other' for null-floor locations
  sort?: ListSort;
};

// A room code and a WO# can look alike in digits alone (room "808" is a
// substring of WO# "2608083"), so a single free-text box can't ILIKE both
// columns for a short numeric query without one shadowing the other — that
// was the bug reported against the split-field version of this page. Rooms
// are 3-4 digits (§2 FFRR); WO#s are always exactly 7 (§2 YYMMNNN). A query
// of the room length is almost never meant as a WO# substring search, so for
// that shape only, skip WO#/legacy_wo_no matching and let it resolve to room
// only. Anything else (7 digits, or non-numeric text) matches every column
// as before.
function isRoomLengthDigits(q: string): boolean {
  return /^\d{3,4}$/.test(q);
}

// §3.1 Search box: "one field, matching room/location code, WO# and
// legacy_wo_no, worker name (assigned or logged), description, and category
// name." §5: substring match via ILIKE, using the pg_trgm index on
// description (idx_wo_description_trgm) rather than word-based full-text
// search — Thai has no spaces between words for tsvector to split on.
export function buildSearchConditions(filters: SearchFilters): SQL | undefined {
  const conditions: (SQL | undefined)[] = [];

  const q = filters.q?.trim();
  if (q) {
    const qConditions: SQL[] = [
      ilike(workOrders.description, `%${q}%`),
      ilike(locations.code, `%${q}%`),
      ilike(categories.nameTh, `%${q}%`),
      exists(
        db
          .select({ one: sql`1` })
          .from(woAssignments)
          .innerJoin(workers, eq(workers.id, woAssignments.workerId))
          .where(and(eq(woAssignments.workOrderId, workOrders.id), ilike(workers.name, `%${q}%`)))
      ),
      exists(
        db
          .select({ one: sql`1` })
          .from(logEntryWorkers)
          .innerJoin(woLogEntries, eq(woLogEntries.id, logEntryWorkers.logEntryId))
          .innerJoin(workers, eq(workers.id, logEntryWorkers.workerId))
          .where(and(eq(woLogEntries.workOrderId, workOrders.id), ilike(workers.name, `%${q}%`)))
      ),
    ];
    if (!isRoomLengthDigits(q)) {
      qConditions.push(ilike(workOrders.woNo, `%${q}%`), ilike(workOrders.legacyWoNo, `%${q}%`));
    }
    conditions.push(or(...qConditions));
  }

  if (filters.status) conditions.push(eq(workOrders.status, filters.status));
  if (filters.categoryId) conditions.push(eq(workOrders.categoryId, filters.categoryId));
  if (filters.groupId) conditions.push(eq(categories.groupId, filters.groupId));
  if (filters.dateFrom) conditions.push(gte(workOrders.openedDate, filters.dateFrom));
  if (filters.dateTo) conditions.push(lte(workOrders.openedDate, filters.dateTo));
  if (filters.specialOnly) conditions.push(eq(categories.isSpecial, true));
  if (filters.floor === 'other') conditions.push(sql`${locations.floor} is null`);
  else if (filters.floor) conditions.push(eq(locations.floor, Number(filters.floor)));
  if (filters.stalledOver7) conditions.push(sql`${LAST_ACTIVITY_SQL} <= (current_date - 7)`);

  if (filters.workerId) {
    conditions.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(logEntryWorkers)
          .innerJoin(woLogEntries, eq(woLogEntries.id, logEntryWorkers.logEntryId))
          .where(
            and(eq(woLogEntries.workOrderId, workOrders.id), eq(logEntryWorkers.workerId, filters.workerId!))
          )
      )
    );
  }
  if (filters.assignedWorkerId) {
    conditions.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(woAssignments)
          .where(
            and(eq(woAssignments.workOrderId, workOrders.id), eq(woAssignments.workerId, filters.assignedWorkerId!))
          )
      )
    );
  }

  return conditions.length ? and(...conditions) : undefined;
}

// §3.1/§3.3: "stalled" is MAX(log_date) falling back to opened_date when a
// job has no log entries yet — the number the recommended default sort and
// the card's staleness badge both read from, so the ordering and the badge
// tell one consistent story (§3.3).
export const LAST_ACTIVITY_SQL = sql`coalesce((select max(${woLogEntries.logDate}) from ${woLogEntries} where ${woLogEntries.workOrderId} = ${workOrders.id}), ${workOrders.openedDate})`;
export const DAYS_WORKED_SQL = sql<number>`(select count(distinct ${woLogEntries.logDate}) from ${woLogEntries} where ${woLogEntries.workOrderId} = ${workOrders.id})::int`;
// §3.4: "Show a photo count on work order cards... tells someone scanning
// the pending list which jobs they can understand without opening."
export const PHOTO_COUNT_SQL = sql<number>`(select count(*) from ${attachments} where ${attachments.workOrderId} = ${workOrders.id})::int`;

// §3.1 room sort: location codes are text, so a plain ORDER BY puts room 501
// after 1509. Numbered rooms sort by their numeric value, ascending; every
// non-numeric location (common areas, external) sorts after them as a group
// rather than interleaved, per the spec's explicit worked example.
const ROOM_SORT_SQL = [
  sql`case when ${locations.code} ~ '^[0-9]+$' then 0 else 1 end`,
  sql`case when ${locations.code} ~ '^[0-9]+$' then ${locations.code}::int else null end`,
  asc(locations.code),
];

function sortColumns(sort: ListSort | undefined): SQL[] {
  switch (sort) {
    case 'oldest':
      return [asc(workOrders.openedDate)];
    case 'room':
      return ROOM_SORT_SQL;
    case 'category':
      return [desc(categories.isSpecial), asc(categories.nameTh)];
    case 'woNo':
      return [asc(workOrders.woNo)];
    case 'recentlyUpdated':
      return [desc(LAST_ACTIVITY_SQL)];
    case 'newest':
      return [desc(workOrders.openedDate)];
    case 'stalled':
    default:
      return [asc(LAST_ACTIVITY_SQL)];
  }
}

const SEARCH_PAGE_LIMIT = 200;
// Export has no row cap — the whole point is getting everything the filters
// match into one file, not just the page a screen can comfortably show.
const EXPORT_LIMIT = 10_000;

export async function searchWorkOrders(filters: SearchFilters, options: { forExport?: boolean } = {}) {
  return db
    .select({
      id: workOrders.id,
      woNo: workOrders.woNo,
      legacyWoNo: workOrders.legacyWoNo,
      openedDate: workOrders.openedDate,
      closedDate: workOrders.closedDate,
      status: workOrders.status,
      description: workOrders.description,
      categoryName: categories.nameTh,
      categoryColour: categories.colour,
      categoryIsSpecial: categories.isSpecial,
      locationCode: locations.code,
      locationFloor: locations.floor,
      lastActivityDate: sql<string>`${LAST_ACTIVITY_SQL}`,
      daysWorked: DAYS_WORKED_SQL,
      photoCount: PHOTO_COUNT_SQL,
    })
    .from(workOrders)
    .innerJoin(categories, eq(categories.id, workOrders.categoryId))
    .innerJoin(locations, eq(locations.id, workOrders.locationId))
    .where(buildSearchConditions(filters))
    .orderBy(...sortColumns(filters.sort))
    .limit(options.forExport ? EXPORT_LIMIT : SEARCH_PAGE_LIMIT);
}

export { SEARCH_PAGE_LIMIT };

export async function getFilterOptions() {
  const [cats, groups] = await Promise.all([
    db
      .select({ id: categories.id, nameTh: categories.nameTh })
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.sortOrder)),
    db.select({ id: categoryGroups.id, nameTh: categoryGroups.nameTh }).from(categoryGroups).orderBy(asc(categoryGroups.sortOrder)),
  ]);
  return { categories: cats, groups };
}

// §3.1 floor filter chip: distinct floors actually in use, ascending.
export async function getFloorOptions(): Promise<number[]> {
  const rows = await db
    .selectDistinct({ floor: locations.floor })
    .from(locations)
    .where(and(eq(locations.isActive, true), sql`${locations.floor} is not null`))
    .orderBy(asc(locations.floor));
  return rows.map((r) => r.floor!);
}
