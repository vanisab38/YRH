import Link from 'next/link';
import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/dal';
import { canViewReports } from '@/lib/permissions';
import { getWorkerActivityReport } from '@/lib/queries/reports/worker-activity';
import { currentMonthRange, formatThaiDate } from '@/lib/dates';
import { DateRangeForm } from '@/app/components/DateRangeForm';
import { PrintButton } from '@/app/components/PrintButton';

// §4.2 Worker activity: jobs per worker per period, split by category —
// what columns I-L in the old sheet computed by hand with formulas.
export default async function WorkerActivityReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const session = await verifySession();
  if (!canViewReports(session.role)) redirect('/');

  const defaults = currentMonthRange();
  const { from = defaults.from, to = defaults.to } = await searchParams;
  const rows = await getWorkerActivityReport(from, to);
  const exportQuery = new URLSearchParams({ from, to }).toString();

  const byWorker = new Map<string, { name: string; type: string; rows: typeof rows }>();
  for (const row of rows) {
    let w = byWorker.get(row.workerId);
    if (!w) byWorker.set(row.workerId, (w = { name: row.workerName, type: row.workerType, rows: [] }));
    w.rows.push(row);
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6">
      <header className="flex items-center gap-3 print:hidden">
        <Link href="/reports" className="text-zinc-500 hover:text-zinc-900" aria-label="กลับ">
          ←
        </Link>
        <h1 className="text-lg font-semibold text-zinc-900">กิจกรรมของช่างแต่ละคน</h1>
      </header>
      <h1 className="hidden text-lg font-semibold text-zinc-900 print:block">
        กิจกรรมของช่างแต่ละคน ({formatThaiDate(from)} – {formatThaiDate(to)})
      </h1>

      <div className="flex items-center justify-between gap-2">
        <DateRangeForm from={from} to={to} />
        <div className="flex gap-2 print:hidden">
          <a
            href={`/api/reports/worker-activity/export?${exportQuery}`}
            className="flex h-10 items-center rounded-full border border-zinc-300 px-4 text-sm font-medium text-zinc-700 hover:border-zinc-500"
          >
            📄 Excel
          </a>
          <PrintButton />
        </div>
      </div>

      {byWorker.size === 0 && <p className="text-sm text-zinc-400">ไม่มีข้อมูลในช่วงเวลานี้</p>}

      {[...byWorker.values()].map((w) => {
        const totalJobs = w.rows.reduce((sum, r) => sum + r.jobCount, 0);
        const totalDays = w.rows.reduce((sum, r) => sum + r.dayCount, 0);
        return (
          <section key={w.name} className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4">
            <h2 className="font-semibold text-zinc-900">
              {w.name}{' '}
              <span className="text-sm font-normal text-zinc-500">
                — {totalJobs} งาน, {totalDays} วัน
              </span>
            </h2>
            <table className="w-full text-sm">
              <tbody>
                {w.rows.map((r) => (
                  <tr key={r.categoryName} className="border-b border-zinc-100 last:border-0">
                    <td className="py-1.5 text-zinc-600">{r.categoryName}</td>
                    <td className="py-1.5 text-right text-zinc-900">{r.jobCount} งาน</td>
                    <td className="py-1.5 text-right text-zinc-500">{r.dayCount} วัน</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}
    </div>
  );
}
