import ExcelJS from 'exceljs';
import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/dal';
import { canViewReports } from '@/lib/permissions';
import { getWorkerActivityReport } from '@/lib/queries/reports/worker-activity';
import { currentMonthRange } from '@/lib/dates';

export async function GET(request: Request) {
  const session = await verifySession();
  if (!canViewReports(session.role)) redirect('/');

  const defaults = currentMonthRange();
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from') ?? defaults.from;
  const to = searchParams.get('to') ?? defaults.to;

  const rows = await getWorkerActivityReport(from, to);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('กิจกรรมของช่าง');
  sheet.columns = [
    { header: 'ชื่อ', key: 'workerName', width: 16 },
    { header: 'ประเภท', key: 'workerType', width: 12 },
    { header: 'หมวดหมู่', key: 'categoryName', width: 16 },
    { header: 'จำนวนงาน', key: 'jobCount', width: 12 },
    { header: 'จำนวนวัน', key: 'dayCount', width: 12 },
  ];
  sheet.getRow(1).font = { bold: true };
  for (const row of rows) sheet.addRow(row);

  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="worker-activity-report.xlsx"`,
    },
  });
}
