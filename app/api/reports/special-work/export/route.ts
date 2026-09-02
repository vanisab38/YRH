import ExcelJS from 'exceljs';
import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/dal';
import { canViewReports } from '@/lib/permissions';
import { getSpecialWorkReport } from '@/lib/queries/reports/special-work';
import { currentMonthRange, formatThaiDate } from '@/lib/dates';

const STATUS_TH: Record<string, string> = { pending: 'ค้าง', done: 'เสร็จ', cancelled: 'ยกเลิก' };

export async function GET(request: Request) {
  const session = await verifySession();
  if (!canViewReports(session.role)) redirect('/');

  const defaults = currentMonthRange();
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from') ?? defaults.from;
  const to = searchParams.get('to') ?? defaults.to;

  const sections = await getSpecialWorkReport(from, to);

  const workbook = new ExcelJS.Workbook();
  for (const section of sections) {
    if (section.jobs.length === 0) continue;
    const sheet = workbook.addWorksheet(section.categoryName);
    sheet.columns = [
      { header: 'เลขที่งาน', key: 'woNo', width: 12 },
      { header: 'วันที่เปิด', key: 'openedDate', width: 14 },
      { header: 'วันที่ปิด', key: 'closedDate', width: 14 },
      { header: 'ห้อง', key: 'locationCode', width: 12 },
      { header: 'รายละเอียด', key: 'description', width: 40 },
      { header: 'สถานะ', key: 'status', width: 10 },
      { header: 'พนักงาน (วัน)', key: 'staff', width: 30 },
      { header: 'ผู้รับเหมา (วัน)', key: 'contractors', width: 30 },
    ];
    sheet.getRow(1).font = { bold: true };
    for (const job of section.jobs) {
      sheet.addRow({
        woNo: job.woNo,
        openedDate: formatThaiDate(job.openedDate),
        closedDate: job.closedDate ? formatThaiDate(job.closedDate) : '',
        locationCode: job.locationCode,
        description: job.description,
        status: STATUS_TH[job.status] ?? job.status,
        staff: job.staff.map((w) => `${w.name} (${w.days})`).join(', ') || (job.flags.noStaffNoContractor ? 'ไม่มีพนักงานบันทึก' : 'ไม่มีพนักงาน'),
        contractors: job.contractors.map((w) => `${w.name} (${w.days})`).join(', '),
      });
    }
  }
  if (workbook.worksheets.length === 0) workbook.addWorksheet('ไม่มีข้อมูล');

  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="special-work-report.xlsx"`,
    },
  });
}
