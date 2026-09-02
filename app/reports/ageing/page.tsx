import Link from 'next/link';
import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/dal';
import { canViewReports } from '@/lib/permissions';
import { getAgeingReport } from '@/lib/queries/reports/ageing';
import { formatThaiDate } from '@/lib/dates';
import { PrintButton } from '@/app/components/PrintButton';
import { CategoryBadge } from '@/app/components/CategoryBadge';

// §4.3 Pending / ageing: open work orders bucketed 0-3, 4-7, 8-14, 15-30,
// 30+ days, oldest visibly so nothing sits forgotten.
export default async function AgeingReportPage() {
  const session = await verifySession();
  if (!canViewReports(session.role)) redirect('/');

  const buckets = await getAgeingReport();
  const total = buckets.reduce((sum, b) => sum + b.jobs.length, 0);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6">
      <header className="flex items-center gap-3 print:hidden">
        <Link href="/reports" className="text-zinc-500 hover:text-zinc-900" aria-label="กลับ">
          ←
        </Link>
        <h1 className="text-lg font-semibold text-zinc-900">งานค้าง — เรียงตามอายุ</h1>
      </header>
      <h1 className="hidden text-lg font-semibold text-zinc-900 print:block">
        งานค้าง — เรียงตามอายุ (ณ วันที่ {formatThaiDate(new Date())})
      </h1>

      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">ทั้งหมด {total} งานค้าง</p>
        <div className="flex gap-2 print:hidden">
          <a
            href="/api/reports/ageing/export"
            className="flex h-10 items-center rounded-full border border-zinc-300 px-4 text-sm font-medium text-zinc-700 hover:border-zinc-500"
          >
            📄 Excel
          </a>
          <PrintButton />
        </div>
      </div>

      {total === 0 && <p className="text-sm text-zinc-400">ไม่มีงานค้าง — เคลียร์หมดแล้ว 🎉</p>}

      {buckets.map(
        (bucket) =>
          bucket.jobs.length > 0 && (
            <section key={bucket.label} className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-zinc-700">
                {bucket.label} ({bucket.jobs.length})
              </h2>
              <div className="flex flex-col gap-2">
                {bucket.jobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/work-orders/${job.id}`}
                    className="flex flex-col gap-1 rounded-lg border border-zinc-200 p-3 hover:border-zinc-400"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm text-zinc-500">{job.woNo}</span>
                      <span className="text-xs font-medium text-amber-700">{job.ageDays} วัน</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-zinc-900">{job.locationCode}</span>
                      <CategoryBadge
                        name={job.categoryName}
                        colour={job.categoryColour}
                        isSpecial={job.categoryIsSpecial}
                      />
                    </div>
                    <p className="line-clamp-2 text-sm text-zinc-600">{job.description}</p>
                    <p className="text-xs text-zinc-400">เปิดเมื่อ {formatThaiDate(job.openedDate)}</p>
                  </Link>
                ))}
              </div>
            </section>
          )
      )}
    </div>
  );
}
