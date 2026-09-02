import Link from 'next/link';
import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/dal';
import { canViewReports } from '@/lib/permissions';
import { getSpecialWorkReport } from '@/lib/queries/reports/special-work';
import { currentMonthRange, formatThaiDate } from '@/lib/dates';
import { DateRangeForm } from '@/app/components/DateRangeForm';
import { PrintButton } from '@/app/components/PrintButton';
import { StatusPill } from '@/app/components/StatusPill';

// §4.1 Special work report — replaces hunting for coloured cells across 478
// rows. One section per special category, worker/contractor day counts in
// separate columns (contractors invoice separately — §4.1: "must never be
// mixed into a staff pay figure"), and three flags that make gaps
// impossible to miss. No amounts, totals, or rates — that's still by hand.
export default async function SpecialWorkReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const session = await verifySession();
  if (!canViewReports(session.role)) redirect('/');

  const defaults = currentMonthRange();
  const { from = defaults.from, to = defaults.to } = await searchParams;
  const sections = await getSpecialWorkReport(from, to);
  const exportQuery = new URLSearchParams({ from, to }).toString();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6">
      <header className="flex items-center gap-3 print:hidden">
        <Link href="/reports" className="text-zinc-500 hover:text-zinc-900" aria-label="กลับ">
          ←
        </Link>
        <h1 className="text-lg font-semibold text-zinc-900">รายงานงานพิเศษ</h1>
      </header>
      <h1 className="hidden text-lg font-semibold text-zinc-900 print:block">
        รายงานงานพิเศษ ({formatThaiDate(from)} – {formatThaiDate(to)})
      </h1>

      <div className="flex items-center justify-between gap-2">
        <DateRangeForm from={from} to={to} />
        <div className="flex gap-2 print:hidden">
          <a
            href={`/api/reports/special-work/export?${exportQuery}`}
            className="flex h-10 items-center rounded-full border border-zinc-300 px-4 text-sm font-medium text-zinc-700 hover:border-zinc-500"
          >
            📄 Excel
          </a>
          <PrintButton />
        </div>
      </div>

      {sections.every((s) => s.jobs.length === 0) && (
        <p className="text-sm text-zinc-400">ไม่มีงานพิเศษในช่วงเวลานี้</p>
      )}

      {sections.map(
        (section) =>
          section.jobs.length > 0 && (
            <section key={section.categoryId} className="flex flex-col gap-3">
              <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900">
                {section.categoryColour && (
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: section.categoryColour }} />
                )}
                {section.categoryName} ({section.jobs.length})
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-zinc-300 text-left text-zinc-500">
                      <th className="py-2 pr-2 font-medium">เลขที่งาน</th>
                      <th className="py-2 pr-2 font-medium">ห้อง</th>
                      <th className="py-2 pr-2 font-medium">รายละเอียด</th>
                      <th className="py-2 pr-2 font-medium">สถานะ</th>
                      <th className="py-2 pr-2 font-medium">พนักงาน (วัน)</th>
                      <th className="py-2 pr-2 font-medium">ผู้รับเหมา (วัน)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.jobs.map((job) => (
                      <tr
                        key={job.id}
                        className={`border-b border-zinc-100 align-top ${
                          job.flags.noStaffNoContractor ? 'bg-red-50' : job.flags.contractorOnly ? 'bg-amber-50' : ''
                        }`}
                      >
                        <td className="py-2 pr-2">
                          <Link href={`/work-orders/${job.id}`} className="font-mono text-zinc-700 hover:underline">
                            {job.woNo}
                          </Link>
                        </td>
                        <td className="py-2 pr-2">{job.locationCode}</td>
                        <td className="py-2 pr-2 text-zinc-600">{job.description}</td>
                        <td className="py-2 pr-2">
                          <StatusPill status={job.status} />
                          {job.flags.stillPending && (
                            <div className="mt-1 text-xs font-medium text-amber-700">ยังไม่เสร็จ</div>
                          )}
                        </td>
                        <td className="py-2 pr-2">
                          {job.staff.length > 0
                            ? job.staff.map((w) => `${w.name} (${w.days})`).join(', ')
                            : job.flags.noStaffNoContractor
                              ? <span className="font-medium text-red-700">ไม่มีพนักงานบันทึก</span>
                              : <span className="font-medium text-amber-700">ไม่มีพนักงาน</span>}
                        </td>
                        <td className="py-2 pr-2">
                          {job.contractors.length > 0
                            ? job.contractors.map((w) => `${w.name} (${w.days})`).join(', ')
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )
      )}

      <p className="text-xs text-zinc-400 print:hidden">
        แถบสีแดง = ไม่มีใครบันทึกงาน (ไม่มีทั้งพนักงานและผู้รับเหมา) · แถบสีเหลือง = มีเฉพาะผู้รับเหมาบันทึก
      </p>
    </div>
  );
}
