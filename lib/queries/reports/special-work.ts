import 'server-only';
import { and, asc, eq, gte, inArray, lte } from 'drizzle-orm';
import { db } from '@/db';
import { workOrders, categories, locations, woLogEntries, logEntryWorkers, workers } from '@/db/schema';

export type SpecialWorkJob = {
  id: string;
  woNo: string;
  openedDate: string;
  closedDate: string | null;
  status: string;
  locationCode: string;
  description: string;
  staff: { name: string; days: number }[];
  contractors: { name: string; days: number }[];
  flags: {
    noStaffNoContractor: boolean; // §4.1: data gap — a missed payment risk
    contractorOnly: boolean; // §4.1: likely nothing owed to staff, but a deliberate call
    stillPending: boolean; // §4.1: nothing should sit unfinished and unpaid
  };
};

export type SpecialWorkSection = {
  categoryId: string;
  categoryName: string;
  categoryColour: string | null;
  jobs: SpecialWorkJob[];
};

// §4.1 Special work report — the one that replaces the coloured cells.
// Deliberately no amounts, totals, or rates (§4.1: "Your cousin reads the
// worker and day columns and applies whatever rule she's using").
export async function getSpecialWorkReport(dateFrom: string, dateTo: string): Promise<SpecialWorkSection[]> {
  const specialCategories = await db
    .select({ id: categories.id, nameTh: categories.nameTh, colour: categories.colour })
    .from(categories)
    .where(eq(categories.isSpecial, true))
    .orderBy(asc(categories.sortOrder));

  if (specialCategories.length === 0) return [];

  const jobRows = await db
    .select({
      id: workOrders.id,
      woNo: workOrders.woNo,
      openedDate: workOrders.openedDate,
      closedDate: workOrders.closedDate,
      status: workOrders.status,
      description: workOrders.description,
      locationCode: locations.code,
      categoryId: workOrders.categoryId,
    })
    .from(workOrders)
    .innerJoin(locations, eq(locations.id, workOrders.locationId))
    .where(
      and(
        inArray(
          workOrders.categoryId,
          specialCategories.map((c) => c.id)
        ),
        gte(workOrders.openedDate, dateFrom),
        lte(workOrders.openedDate, dateTo)
      )
    )
    .orderBy(asc(workOrders.openedDate));

  const jobIds = jobRows.map((j) => j.id);
  const workerDayRows = jobIds.length
    ? await db
        .select({
          workOrderId: woLogEntries.workOrderId,
          workerName: workers.name,
          workerType: workers.type,
          logDate: woLogEntries.logDate,
        })
        .from(logEntryWorkers)
        .innerJoin(woLogEntries, eq(woLogEntries.id, logEntryWorkers.logEntryId))
        .innerJoin(workers, eq(workers.id, logEntryWorkers.workerId))
        .where(inArray(woLogEntries.workOrderId, jobIds))
    : [];

  // work_order_id -> worker name -> { type, days: Set<log_date> }
  const byJob = new Map<string, Map<string, { type: string; dates: Set<string> }>>();
  for (const row of workerDayRows) {
    let jobMap = byJob.get(row.workOrderId);
    if (!jobMap) byJob.set(row.workOrderId, (jobMap = new Map()));
    let entry = jobMap.get(row.workerName);
    if (!entry) jobMap.set(row.workerName, (entry = { type: row.workerType, dates: new Set() }));
    entry.dates.add(row.logDate);
  }

  const sections: SpecialWorkSection[] = specialCategories.map((cat) => ({
    categoryId: cat.id,
    categoryName: cat.nameTh,
    categoryColour: cat.colour,
    jobs: [],
  }));
  const sectionByCategoryId = new Map(sections.map((s) => [s.categoryId, s]));

  for (const job of jobRows) {
    const jobMap = byJob.get(job.id) ?? new Map();
    const staff = [...jobMap.entries()]
      .filter(([, v]) => v.type === 'staff')
      .map(([name, v]) => ({ name, days: v.dates.size }));
    const contractors = [...jobMap.entries()]
      .filter(([, v]) => v.type !== 'staff')
      .map(([name, v]) => ({ name, days: v.dates.size }));

    const section = sectionByCategoryId.get(job.categoryId);
    section?.jobs.push({
      id: job.id,
      woNo: job.woNo,
      openedDate: job.openedDate,
      closedDate: job.closedDate,
      status: job.status,
      locationCode: job.locationCode,
      description: job.description,
      staff,
      contractors,
      flags: {
        noStaffNoContractor: staff.length === 0 && contractors.length === 0,
        contractorOnly: staff.length === 0 && contractors.length > 0,
        stillPending: job.status === 'pending',
      },
    });
  }

  return sections;
}
