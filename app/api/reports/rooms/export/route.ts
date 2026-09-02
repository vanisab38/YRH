import ExcelJS from 'exceljs';
import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/dal';
import { canViewReports } from '@/lib/permissions';
import { getRoomReport } from '@/lib/queries/reports/rooms';
import { currentMonthRange } from '@/lib/dates';

export async function GET(request: Request) {
  const session = await verifySession();
  if (!canViewReports(session.role)) redirect('/');

  const defaults = currentMonthRange();
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from') ?? defaults.from;
  const to = searchParams.get('to') ?? defaults.to;

  const rows = await getRoomReport(from, to);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('สรุปรายห้อง');
  sheet.columns = [
    { header: 'ห้อง', key: 'locationCode', width: 14 },
    { header: 'จำนวนงานรวม', key: 'total', width: 14 },
    { header: 'แยกตามหมวดหมู่', key: 'categories', width: 50 },
    { header: 'มีปัญหาซ้ำ', key: 'hasRepeatIssue', width: 12 },
  ];
  sheet.getRow(1).font = { bold: true };
  for (const row of rows) {
    sheet.addRow({
      locationCode: row.locationCode,
      total: row.total,
      categories: row.categories.map((c) => `${c.name} × ${c.count}`).join(', '),
      hasRepeatIssue: row.hasRepeatIssue ? 'ใช่' : '',
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="room-report.xlsx"`,
    },
  });
}
