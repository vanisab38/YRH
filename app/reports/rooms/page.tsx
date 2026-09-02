import Link from 'next/link';
import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/dal';
import { canViewReports } from '@/lib/permissions';
import { getRoomReport } from '@/lib/queries/reports/rooms';
import { currentMonthRange, formatThaiDate } from '@/lib/dates';
import { DateRangeForm } from '@/app/components/DateRangeForm';
import { PrintButton } from '@/app/components/PrintButton';

// §4.4 Room / location history report: work orders per room per period,
// category breakdown, flags rooms with repeat issues in the same category.
export default async function RoomReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const session = await verifySession();
  if (!canViewReports(session.role)) redirect('/');

  const defaults = currentMonthRange();
  const { from = defaults.from, to = defaults.to } = await searchParams;
  const rows = await getRoomReport(from, to);
  const exportQuery = new URLSearchParams({ from, to }).toString();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6">
      <header className="flex items-center gap-3 print:hidden">
        <Link href="/reports" className="text-zinc-500 hover:text-zinc-900" aria-label="กลับ">
          ←
        </Link>
        <h1 className="text-lg font-semibold text-zinc-900">สรุปรายห้อง</h1>
      </header>
      <h1 className="hidden text-lg font-semibold text-zinc-900 print:block">
        สรุปรายห้อง ({formatThaiDate(from)} – {formatThaiDate(to)})
      </h1>

      <div className="flex items-center justify-between gap-2">
        <DateRangeForm from={from} to={to} />
        <div className="flex gap-2 print:hidden">
          <a
            href={`/api/reports/rooms/export?${exportQuery}`}
            className="flex h-10 items-center rounded-full border border-zinc-300 px-4 text-sm font-medium text-zinc-700 hover:border-zinc-500"
          >
            📄 Excel
          </a>
          <PrintButton />
        </div>
      </div>

      {rows.length === 0 && <p className="text-sm text-zinc-400">ไม่มีข้อมูลในช่วงเวลานี้</p>}

      <div className="flex flex-col gap-2">
        {rows.map((room) => (
          <Link
            key={room.locationId}
            href={`/rooms?code=${encodeURIComponent(room.locationCode)}`}
            className={`flex flex-col gap-1.5 rounded-lg border p-3 hover:border-zinc-400 ${
              room.hasRepeatIssue ? 'border-amber-300 bg-amber-50' : 'border-zinc-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-zinc-900">{room.locationCode}</span>
              <span className="text-sm text-zinc-500">{room.total} งาน</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {room.categories.map((c) => (
                <span
                  key={c.name}
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                    c.count >= 2 ? 'bg-amber-200 text-amber-900' : 'bg-zinc-100 text-zinc-600'
                  }`}
                >
                  {c.name} × {c.count}
                </span>
              ))}
            </div>
            {room.hasRepeatIssue && (
              <p className="text-xs font-medium text-amber-700">⚠ มีปัญหาซ้ำในหมวดหมู่เดียวกัน</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
