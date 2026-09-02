import 'server-only';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { attachments } from '@/db/schema';
import { getSignedAttachmentUrl } from '@/lib/storage';

export async function getWorkOrderAttachments(workOrderId: string) {
  const rows = await db
    .select()
    .from(attachments)
    .where(eq(attachments.workOrderId, workOrderId))
    .orderBy(desc(attachments.uploadedAt));

  return Promise.all(
    rows.map(async (row) => ({ ...row, url: await getSignedAttachmentUrl(row.storagePath) }))
  );
}
