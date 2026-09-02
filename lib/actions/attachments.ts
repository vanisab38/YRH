'use server';

import { revalidatePath } from 'next/cache';
import { randomUUID } from 'node:crypto';
import { db } from '@/db';
import { attachments } from '@/db/schema';
import { verifySession } from '@/lib/dal';
import { canAddLogEntryToJob } from '@/lib/permissions';
import { resizeForUpload } from '@/lib/image';
import { uploadAttachmentFile } from '@/lib/storage';
import { getWorkOrderDetail, isWorkerAssigned } from '@/lib/queries/work-orders';

export type UploadState = { error: string } | undefined;

const MAX_FILES_PER_UPLOAD = 6;

// §2 attachments / §3 New work order "photos" field. Runs after the work
// order itself already exists (photos reference work_order_id), so this is
// a second step for a brand-new job and an "add more later" action on the
// detail page alike.
export async function uploadAttachments(_prevState: UploadState, formData: FormData): Promise<UploadState> {
  const session = await verifySession();
  const workOrderId = String(formData.get('workOrderId') ?? '');
  const files = formData.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0);

  if (!workOrderId || files.length === 0) return undefined; // photos are optional — nothing to do

  if (files.length > MAX_FILES_PER_UPLOAD) {
    return { error: `แนบรูปได้ครั้งละไม่เกิน ${MAX_FILES_PER_UPLOAD} รูป` };
  }

  const job = await getWorkOrderDetail(workOrderId);
  if (!job) return { error: 'ไม่พบใบสั่งงานนี้' };

  const assigned = session.role === 'worker' ? await isWorkerAssigned(workOrderId, session.workerId ?? '') : false;
  if (!canAddLogEntryToJob(session.role, job.createdBy, session.userId) && !assigned) {
    return { error: 'คุณไม่มีสิทธิ์แนบรูปในงานนี้' };
  }

  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const original = Buffer.from(await file.arrayBuffer());
    const { buffer, contentType } = await resizeForUpload(original);
    const path = `work-orders/${workOrderId}/${randomUUID()}.jpg`;

    try {
      await uploadAttachmentFile(path, buffer, contentType);
    } catch {
      return {
        error:
          'ไม่สามารถอัปโหลดรูปได้ — ระบบจัดเก็บไฟล์ยังไม่ได้ตั้งค่า (ดู README ส่วน Photos)',
      };
    }

    await db.insert(attachments).values({
      workOrderId,
      storagePath: path,
      filename: file.name,
      mimeType: contentType,
      uploadedBy: session.userId,
    });
  }

  revalidatePath(`/work-orders/${workOrderId}`);
  return undefined;
}
