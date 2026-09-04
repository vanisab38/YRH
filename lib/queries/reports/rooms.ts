import 'server-only';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { db } from '@/db';
import { workOrders, categories, locations } from '@/db/schema';

export type RoomReportRow = {
  locationId: string;
  locationCode: string;
  total: number;
  categories: { name: string; count: number }[];
  hasRepeatIssue: boolean; // §4.4: same category twice or more in the period
};

// §4.4 Room / location history report: "work orders per room per period,
// with category breakdown. Flags rooms with repeat issues in the same
// category." (Distinct from the live, all-time single-room drill-down at
// /rooms — this is every room, one period, at a glance.)
export async function getRoomReport(dateFrom: string, dateTo: string): Promise<RoomReportRow[]> {
  const rows = await db
    .select({
      locationId: locations.id,
      locationCode: locations.code,
      categoryName: categories.nameTh,
      count: sql<number>`count(*)::int`,
    })
    .from(workOrders)
    .innerJoin(locations, eq(locations.id, workOrders.locationId))
    .innerJoin(categories, eq(categories.id, workOrders.categoryId))
    .where(and(gte(workOrders.openedDate, dateFrom), lte(workOrders.openedDate, dateTo)))
    .groupBy(locations.id, locations.code, categories.id, categories.nameTh);

  const byLocation = new Map<string, RoomReportRow>();
  for (const row of rows) {
    let loc = byLocation.get(row.locationId);
    if (!loc) {
      loc = { locationId: row.locationId, locationCode: row.locationCode, total: 0, categories: [], hasRepeatIssue: false };
      byLocation.set(row.locationId, loc);
    }
    loc.categories.push({ name: row.categoryName, count: row.count });
    loc.total += row.count;
    if (row.count >= 2) loc.hasRepeatIssue = true;
  }

  // Room number ascending (e.g. 501, 508, 603 ... 1408) rather than busiest
  // first, so the list reads like a directory you can scan for one room.
  return [...byLocation.values()].sort((a, b) =>
    a.locationCode.localeCompare(b.locationCode, undefined, { numeric: true, sensitivity: 'base' })
  );
}
