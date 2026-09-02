import Link from 'next/link';
import { notFound } from 'next/navigation';
import { verifySession } from '@/lib/dal';
import { canAddLogEntryToJob } from '@/lib/permissions';
import { getWorkOrderDetail, getActiveWorkers, isWorkerAssigned } from '@/lib/queries/work-orders';
import { getWorkOrderAttachments } from '@/lib/queries/attachments';
import { formatThaiDate } from '@/lib/dates';
import { CategoryBadge } from '@/app/components/CategoryBadge';
import { StatusPill } from '@/app/components/StatusPill';
import { AddLogEntryForm } from './AddLogEntryForm';
import { PhotoGallery } from './PhotoGallery';
import { PhotoUploadForm } from './PhotoUploadForm';

// Work order detail (§3): header with WO#/room/category/status, then the
// log entries in date order below — the job's history the Excel loses.
export default async function WorkOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await verifySession();
  const job = await getWorkOrderDetail(id);
  if (!job) notFound();

  const assigned =
    session.role === 'worker' ? await isWorkerAssigned(id, session.workerId ?? '') : false;
  const canLog = canAddLogEntryToJob(session.role, job.createdBy, session.userId) || assigned;
  const workers = canLog ? await getActiveWorkers() : [];

  // §2 attachments: Supabase Storage may not be configured yet (see README
  // "Photos") — degrade to "photos unavailable" instead of a 500 page.
  let photos: Awaited<ReturnType<typeof getWorkOrderAttachments>> = [];
  let photosUnavailable = false;
  try {
    photos = await getWorkOrderAttachments(id);
  } catch {
    photosUnavailable = true;
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6">
      <header className="flex items-center gap-3">
        <Link href="/" className="text-zinc-500 hover:text-zinc-900" aria-label="กลับ">
          ←
        </Link>
        <span className="font-mono text-sm text-zinc-500">{job.woNo}</span>
        {job.legacyWoNo && (
          <span className="text-xs text-zinc-400">(เดิม {job.legacyWoNo})</span>
        )}
      </header>

      <section className="flex flex-col gap-2 rounded-xl border border-zinc-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-lg font-semibold text-zinc-900">{job.locationCode}</h1>
          <StatusPill status={job.status} />
        </div>
        <CategoryBadge name={job.categoryName} colour={job.categoryColour} isSpecial={job.categoryIsSpecial} />
        <p className="text-zinc-700">{job.description}</p>
        {job.assignedWorkers.length > 0 && (
          <p className="text-sm text-zinc-500">
            มอบหมายให้: {job.assignedWorkers.map((w) => w.name).join(', ')}
          </p>
        )}
        <p className="text-xs text-zinc-400">
          เปิดโดย {job.createdByName} เมื่อ {formatThaiDate(job.openedDate)}
          {job.closedDate && ` · ปิดเมื่อ ${formatThaiDate(job.closedDate)}`}
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-zinc-700">ประวัติงาน</h2>
        {job.logEntries.length === 0 ? (
          <p className="text-sm text-zinc-400">ยังไม่มีบันทึก</p>
        ) : (
          <ol className="flex flex-col gap-3 border-l-2 border-zinc-200 pl-4">
            {job.logEntries.map((entry) => (
              <li key={entry.id} className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-900">{formatThaiDate(entry.logDate)}</span>
                  <StatusPill status={entry.statusAfter} />
                </div>
                {entry.note && <p className="text-sm text-zinc-600">{entry.note}</p>}
                <p className="text-xs text-zinc-400">
                  {entry.workers.length > 0 ? entry.workers.join(', ') : 'ไม่ระบุผู้ปฏิบัติงาน'} · บันทึกโดย{' '}
                  {entry.enteredByName}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-zinc-700">รูปภาพ</h2>
        {photosUnavailable ? (
          <p className="text-sm text-zinc-400">ระบบจัดเก็บรูปภาพยังไม่ได้ตั้งค่า</p>
        ) : photos.length === 0 ? (
          <p className="text-sm text-zinc-400">ยังไม่มีรูปภาพ</p>
        ) : (
          <PhotoGallery photos={photos} />
        )}
        {canLog && !photosUnavailable && <PhotoUploadForm workOrderId={job.id} />}
      </section>

      {canLog && <AddLogEntryForm workOrderId={job.id} workers={workers} />}
    </div>
  );
}
