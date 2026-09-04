'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { workOrders, woAssignments, woLogEntries, logEntryWorkers, locations, woCounters } from '@/db/schema';
import { verifySession } from '@/lib/dal';
import { canAddLogEntryToJob } from '@/lib/permissions';
import { bangkokToday } from '@/lib/dates';
import { setAuditUser } from '@/lib/db-audit';
import { getWorkOrderDetail, isWorkerAssigned } from '@/lib/queries/work-orders';

export type ActionState = { error: string } | undefined;

// §2.1 work_orders.wo_no: "Generate it server-side inside the insert
// transaction and let the unique constraint be the backstop... Use a
// counter table, not MAX(seq) + 1. Reading the highest existing number and
// adding one is a race: two requests read 333 and both try to write 334."
// A single-row upsert on wo_counters is atomic — Postgres serialises
// concurrent upserts on the same row, so there's no read-then-write gap to
// race, and (unlike the old MAX+retry approach) no wasted attempts under
// real concurrency either.
async function insertWithGeneratedWoNo(
  insertRow: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0], woNo: string) => Promise<{ id: string }>,
  userId: string
): Promise<string> {
  // §2.1: "Compute the period in Asia/Bangkok, not UTC" — a job opened just
  // after midnight Bangkok time is still the previous day in UTC.
  const today = bangkokToday();
  const period = today.slice(2, 4) + today.slice(5, 7); // YYMM

  const { id } = await db.transaction(async (tx) => {
    await setAuditUser(tx, userId);
    const [{ lastSeq }] = await tx
      .insert(woCounters)
      .values({ period, lastSeq: 1 })
      .onConflictDoUpdate({ target: woCounters.period, set: { lastSeq: sql`${woCounters.lastSeq} + 1` } })
      .returning({ lastSeq: woCounters.lastSeq });

    // §2.1: "Guard the 999 ceiling... fail with a clear error instead of a
    // confusing unique violation" from a wo_no whose 3-digit tail overflowed.
    if (lastSeq > 999) {
      throw new Error(`เดือนนี้มีงานครบ 999 งานแล้ว ต้องขยายรูปแบบเลขที่งาน (period ${period})`);
    }

    const woNo = `${period}${String(lastSeq).padStart(3, '0')}`;
    return insertRow(tx, woNo);
  });
  return id;
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

  const workOrderId = await insertWithGeneratedWoNo(async (tx, woNo) => {
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
  }, session.userId);

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
  await db.transaction(async (tx) => {
    await setAuditUser(tx, session.userId);

    const [logEntry] = await tx
      .insert(woLogEntries)
      .values({ workOrderId, logDate, note, statusAfter, enteredBy: session.userId })
      .returning({ id: woLogEntries.id });

    if (workerIds.length) {
      await tx.insert(logEntryWorkers).values(workerIds.map((workerId) => ({ logEntryId: logEntry.id, workerId })));
    }
  });

  revalidatePath(`/work-orders/${workOrderId}`);
  revalidatePath('/');
  return undefined;
}
