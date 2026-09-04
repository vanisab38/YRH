import 'server-only';
import { and, asc, desc, eq, exists, gte, lte, or, ilike, sql, type SQL } from 'drizzle-orm';
import { db } from '@/db';
import {
  workOrders,
  categories,
  categoryGroups,
  locations,
  woLogEntries,
  logEntryWorkers,
} from '@/db/schema';

export type SearchFilters = {
  q?: string;
  room?: string;
  status?: string;
  categoryId?: string;
  groupId?: string;
  workerId?: string;
  dateFrom?: string;
  dateTo?: string;
};

// §3 Search: separate boxes for free text (description, WO#, legacy_wo_no)
// and room, plus filter chips for status, category, group, worker, and date
// range. Room used to share the free-text box with job numbers, but a room
// like "808" also substring-matched job numbers like "2608083" — split so
// each box only searches its own column. §5: substring match via ILIKE,
// which uses the pg_trgm index on description (idx_wo_description_trgm)
// rather than word-based full-text search — Thai has no spaces between
// words for tsvector to split on.
export function buildSearchConditions(filters: SearchFilters): SQL | undefined {
  const conditions: (SQL | undefined)[] = [];

  const q = filters.q?.trim();
  if (q) {
    conditions.push(
      or(
        ilike(workOrders.description, `%${q}%`),
        ilike(workOrders.woNo, `%${q}%`),
        ilike(workOrders.legacyWoNo, `%${q}%`)
      )
    );
  }
  const room = filters.room?.trim();
  if (room) conditions.push(ilike(locations.code, `%${room}%`));
  if (filters.status) conditions.push(eq(workOrders.status, filters.status));
  if (filters.categoryId) conditions.push(eq(workOrders.categoryId, filters.categoryId));
  if (filters.groupId) conditions.push(eq(categories.groupId, filters.groupId));
  if (filters.dateFrom) conditions.push(gte(workOrders.openedDate, filters.dateFrom));
  if (filters.dateTo) conditions.push(lte(workOrders.openedDate, filters.dateTo));
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

  return conditions.length ? and(...conditions) : undefined;
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
      status: workOrders.status,
      description: workOrders.description,
      categoryName: categories.nameTh,
      categoryColour: categories.colour,
      categoryIsSpecial: categories.isSpecial,
      locationCode: locations.code,
    })
    .from(workOrders)
    .innerJoin(categories, eq(categories.id, workOrders.categoryId))
    .innerJoin(locations, eq(locations.id, workOrders.locationId))
    .where(buildSearchConditions(filters))
    .orderBy(desc(workOrders.openedDate))
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
