import 'server-only';
import { and, asc, eq, gte, lte, sql } from 'drizzle-orm';
import { db } from '@/db';
import { workers, logEntryWorkers, woLogEntries, workOrders, categories } from '@/db/schema';

export type WorkerActivityRow = {
  workerId: string;
  workerName: string;
  workerType: string;
  categoryName: string;
  jobCount: number;
  dayCount: number;
};

// §4.2 Worker activity: "jobs per worker per period, split by category."
// What columns I-L in the old sheet were computing by hand — filtered by
// log_date (when the work happened), not opened_date.
export async function getWorkerActivityReport(dateFrom: string, dateTo: string): Promise<WorkerActivityRow[]> {
  const rows = await db
    .select({
      workerId: workers.id,
      workerName: workers.name,
      workerType: workers.type,
      categoryName: categories.nameTh,
      jobCount: sql<number>`count(distinct ${workOrders.id})::int`,
      dayCount: sql<number>`count(*)::int`,
    })
    .from(logEntryWorkers)
    .innerJoin(workers, eq(workers.id, logEntryWorkers.workerId))
    .innerJoin(woLogEntries, eq(woLogEntries.id, logEntryWorkers.logEntryId))
    .innerJoin(workOrders, eq(workOrders.id, woLogEntries.workOrderId))
    .innerJoin(categories, eq(categories.id, workOrders.categoryId))
    .where(and(gte(woLogEntries.logDate, dateFrom), lte(woLogEntries.logDate, dateTo)))
    .groupBy(workers.id, workers.name, workers.type, categories.id, categories.nameTh)
    .orderBy(asc(workers.sortOrder), asc(categories.sortOrder));

  return rows;
}
