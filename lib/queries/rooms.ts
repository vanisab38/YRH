import 'server-only';
import { desc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { workOrders, categories, locations } from '@/db/schema';

// §3 Room history: "pick a room, see every work order ever raised on it,
// newest first, with per-category counts."
export async function getLocationByCode(code: string) {
  const [loc] = await db.select().from(locations).where(eq(locations.code, code));
  return loc ?? null;
}

export async function getRoomWorkOrders(locationId: string) {
  return db
    .select({
      id: workOrders.id,
      woNo: workOrders.woNo,
      openedDate: workOrders.openedDate,
      status: workOrders.status,
      description: workOrders.description,
      categoryName: categories.nameTh,
      categoryColour: categories.colour,
      categoryIsSpecial: categories.isSpecial,
    })
    .from(workOrders)
    .innerJoin(categories, eq(categories.id, workOrders.categoryId))
    .where(eq(workOrders.locationId, locationId))
    .orderBy(desc(workOrders.openedDate));
}

export async function getRoomCategoryCounts(locationId: string) {
  return db
    .select({
      categoryName: categories.nameTh,
      categoryColour: categories.colour,
      count: sql<number>`count(*)::int`,
    })
    .from(workOrders)
    .innerJoin(categories, eq(categories.id, workOrders.categoryId))
    .where(eq(workOrders.locationId, locationId))
    .groupBy(categories.id, categories.nameTh, categories.colour)
    .orderBy(desc(sql`count(*)`));
}

export async function getAllLocationsForPicker() {
  const rows = await db
    .select({ id: locations.id, code: locations.code, type: locations.type })
    .from(locations)
    .where(eq(locations.isActive, true));

  // Plain SQL `ORDER BY code` sorts lexically ("1501" before "501"), so sort
  // here instead: numeric-aware, e.g. "501" before "1208" before "1501".
  return rows.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' }));
}
