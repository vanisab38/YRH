import 'server-only';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { workOrders, categories, locations } from '@/db/schema';
import { daysSince } from '@/lib/dates';

export type AgeingJob = {
  id: string;
  woNo: string;
  openedDate: string;
  locationCode: string;
  categoryName: string;
  categoryColour: string | null;
  categoryIsSpecial: boolean;
  description: string;
  ageDays: number;
};

export type AgeingBucket = { label: string; jobs: AgeingJob[] };

// §4.3 Pending/ageing: every open work order bucketed by how long it's been
// open, oldest visibly so nothing gets forgotten. Not date-range filtered —
// unlike the other reports this is about everything open right now,
// regardless of when it was opened (that's what the buckets already show).
export async function getAgeingReport(): Promise<AgeingBucket[]> {
  const rows = await db
    .select({
      id: workOrders.id,
      woNo: workOrders.woNo,
      openedDate: workOrders.openedDate,
      locationCode: locations.code,
      categoryName: categories.nameTh,
      categoryColour: categories.colour,
      categoryIsSpecial: categories.isSpecial,
      description: workOrders.description,
    })
    .from(workOrders)
    .innerJoin(categories, eq(categories.id, workOrders.categoryId))
    .innerJoin(locations, eq(locations.id, workOrders.locationId))
    .where(eq(workOrders.status, 'pending'))
    .orderBy(asc(workOrders.openedDate));

  const buckets: AgeingBucket[] = [
    { label: '0–3 วัน', jobs: [] },
    { label: '4–7 วัน', jobs: [] },
    { label: '8–14 วัน', jobs: [] },
    { label: '15–30 วัน', jobs: [] },
    { label: '30+ วัน', jobs: [] },
  ];

  for (const row of rows) {
    const ageDays = daysSince(row.openedDate);
    const job: AgeingJob = { ...row, ageDays };
    if (ageDays <= 3) buckets[0].jobs.push(job);
    else if (ageDays <= 7) buckets[1].jobs.push(job);
    else if (ageDays <= 14) buckets[2].jobs.push(job);
    else if (ageDays <= 30) buckets[3].jobs.push(job);
    else buckets[4].jobs.push(job);
  }

  return buckets;
}
