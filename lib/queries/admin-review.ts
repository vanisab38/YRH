import 'server-only';
import { and, eq, desc } from 'drizzle-orm';
import { db } from '@/db';
import { workOrders, categories, locations, users } from '@/db/schema';

// §2/§3: work orders opened by a worker in a special (paid) category aren't
// blocked, just surfaced here so admin/office can see them — created_by is
// the audit trail either way.
export async function getWorkerOpenedSpecialWorkOrders() {
  return db
    .select({
      id: workOrders.id,
      woNo: workOrders.woNo,
      openedDate: workOrders.openedDate,
      description: workOrders.description,
      category: categories.nameTh,
      location: locations.code,
      openedBy: users.displayName,
    })
    .from(workOrders)
    .innerJoin(categories, eq(categories.id, workOrders.categoryId))
    .innerJoin(locations, eq(locations.id, workOrders.locationId))
    .innerJoin(users, eq(users.id, workOrders.createdBy))
    .where(and(eq(users.role, 'worker'), eq(categories.isSpecial, true)))
    .orderBy(desc(workOrders.openedDate));
}
