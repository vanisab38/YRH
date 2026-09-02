import ExcelJS from 'exceljs';
import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/dal';
import { canViewReports } from '@/lib/permissions';
import { getAgeingReport } from '@/lib/queries/reports/ageing';
import { formatThaiDate } from '@/lib/dates';

export async function GET() {
  const session = await verifySession();
  if (!canViewReports(session.role)) redirect('/');

  const buckets = await getAgeingReport();

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('งานค้าง');
  sheet.columns = [
    { header: 'ช่วงอายุ', key: 'bucket', width: 12 },
    { header: 'เลขที่งาน', key: 'woNo', width: 12 },
    { header: 'วันที่เปิด', key: 'openedDate', width: 14 },
    { header: 'อายุ (วัน)', key: 'ageDays', width: 10 },
    { header: 'ห้อง', key: 'locationCode', width: 12 },
    { header: 'หมวดหมู่', key: 'categoryName', width: 16 },
    { header: 'รายละเอียด', key: 'description', width: 40 },
  ];
  sheet.getRow(1).font = { bold: true };
  for (const bucket of buckets) {
    for (const job of bucket.jobs) {
      sheet.addRow({
        bucket: bucket.label,
        woNo: job.woNo,
        openedDate: formatThaiDate(job.openedDate),
        ageDays: job.ageDays,
        locationCode: job.locationCode,
        categoryName: job.categoryName,
        description: job.description,
      });
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="ageing-report.xlsx"`,
    },
  });
}
