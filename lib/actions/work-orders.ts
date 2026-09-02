'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { eq, like, sql } from 'drizzle-orm';
import { db } from '@/db';
import { workOrders, woAssignments, woLogEntries, logEntryWorkers, locations } from '@/db/schema';
import { verifySession } from '@/lib/dal';
import { canAddLogEntryToJob } from '@/lib/permissions';
import { bangkokToday } from '@/lib/dates';
import { getWorkOrderDetail, isWorkerAssigned } from '@/lib/queries/work-orders';

export type ActionState = { error: string } | undefined;

// §2 work_orders.wo_no: "Generate it server-side inside the insert
// transaction and let the unique constraint be the backstop — never in the
// browser, or two staff keying at once will collide." Retries on a unique
// violation (Postgres code 23505) rather than trusting the computed max,
// since two requests can race between the SELECT and the INSERT.
async function insertWithGeneratedWoNo(
  insertRow: (woNo: string) => Promise<{ id: string }>
): Promise<string> {
  const today = bangkokToday();
  const prefix = today.slice(2, 4) + today.slice(5, 7); // YYMM

  for (let attempt = 0; attempt < 5; attempt++) {
    const [{ maxSeq }] = await db
      .select({ maxSeq: sql<number>`coalesce(max(cast(right(${workOrders.woNo}, 3) as int)), 0)` })
      .from(workOrders)
      .where(like(workOrders.woNo, `${prefix}%`));
    const woNo = `${prefix}${String(maxSeq + 1).padStart(3, '0')}`;
    try {
      const { id } = await insertRow(woNo);
      return id;
    } catch (err) {
      const pgCode = (err as { code?: string } | null)?.code;
      if (pgCode === '23505' && attempt < 4) continue; // wo_no collision — retry with a fresh max
      throw err;
    }
  }
  throw new Error('Could not generate a unique WO#');
}

export async function createWorkOrder(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await verifySession();

  const locationCode = String(formData.get('locationCode') ?? '').trim();
  const categoryId = String(formData.get('categoryId') ?? '');
  const description = String(formData.get('description') ?? '').trim();
  const priority = String(formData.get('priority') ?? 'normal');
  const workerIds = formData.getAll('workerIds').map(String).filter(Boolean);

  if (!locationCode || !categoryId || !description) {
    return { error: 'กรุณากรอกห้อง/พื้นที่ หมวดหมู่ และรายละเอียดงาน' };
  }

  const [location] = await db.select({ id: locations.id }).from(locations).where(eq(locations.code, locationCode));
  if (!location) {
    return { error: `ไม่พบห้อง/พื้นที่ "${locationCode}" — เลือกจากรายการที่มีอยู่` };
  }

  const workOrderId = await insertWithGeneratedWoNo(async (woNo) => {
    return db.transaction(async (tx) => {
      const [wo] = await tx
        .insert(workOrders)
        .values({
          woNo,
          openedDate: bangkokToday(),
          categoryId,
          locationId: location.id,
          description,
          status: 'pending',
          priority,
          createdBy: session.userId,
        })
        .returning({ id: workOrders.id });

      if (workerIds.length) {
        await tx.insert(woAssignments).values(workerIds.map((workerId) => ({ workOrderId: wo.id, workerId })));
      }
      return wo;
    });
  });

  redirect(`/work-orders/${workOrderId}`);
}

export async function addLogEntry(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await verifySession();

  const workOrderId = String(formData.get('workOrderId') ?? '');
  const logDate = String(formData.get('logDate') ?? '') || bangkokToday();
  const note = String(formData.get('note') ?? '').trim() || null;
  const statusAfter = String(formData.get('statusAfter') ?? '');
  const workerIds = formData.getAll('workerIds').map(String).filter(Boolean);

  if (!workOrderId || (statusAfter !== 'pending' && statusAfter !== 'done')) {
    return { error: 'ข้อมูลไม่ครบถ้วน' };
  }

  const job = await getWorkOrderDetail(workOrderId);
  if (!job) {
    return { error: 'ไม่พบใบสั่งงานนี้' };
  }

  const assigned = session.role === 'worker' ? await isWorkerAssigned(workOrderId, session.workerId ?? '') : false;
  if (!canAddLogEntryToJob(session.role, job.createdBy, session.userId) && !assigned) {
    return { error: 'คุณไม่มีสิทธิ์บันทึกงานนี้' };
  }

  // status/closed_date on work_orders is kept in sync by a database trigger
  // (db/migrations/0001_trigram_and_status_trigger.sql) — no manual update here.
  const [logEntry] = await db
    .insert(woLogEntries)
    .values({ workOrderId, logDate, note, statusAfter, enteredBy: session.userId })
    .returning({ id: woLogEntries.id });

  if (workerIds.length) {
    await db.insert(logEntryWorkers).values(workerIds.map((workerId) => ({ logEntryId: logEntry.id, workerId })));
  }

  revalidatePath(`/work-orders/${workOrderId}`);
  revalidatePath('/');
  return undefined;
}
