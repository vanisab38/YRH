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
    const path = `work-orders/${workOrderId}/${randomUUID()}.jpg`;

    // §3.5: "never reference code, files, or documentation in user-facing
    // text... say what the person can do" — resize and upload can both
    // fail (a corrupt/unsupported image, storage unreachable), and either
    // way staff see the same plain retry prompt while the real cause is
    // logged server-side.
    try {
      const original = Buffer.from(await file.arrayBuffer());
      const { buffer, contentType } = await resizeForUpload(original);
      await uploadAttachmentFile(path, buffer, contentType);
      await db.insert(attachments).values({
        workOrderId,
        storagePath: path,
        filename: file.name,
        mimeType: contentType,
        uploadedBy: session.userId,
      });
    } catch (err) {
      console.error('Photo upload failed', err);
      return { error: 'อัปโหลดรูปไม่สำเร็จ ลองอีกครั้ง' };
    }
  }

  revalidatePath(`/work-orders/${workOrderId}`);
  return undefined;
}
