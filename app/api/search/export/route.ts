import ExcelJS from 'exceljs';
import { verifySession } from '@/lib/dal';
import { searchWorkOrders, type SearchFilters } from '@/lib/queries/search';
import { formatThaiDate } from '@/lib/dates';

// §3 Search: "Export results to Excel." Same filters as the search page,
// re-run without the on-screen row cap (searchWorkOrders(..., { forExport: true })).
export async function GET(request: Request) {
  // Route Handlers get the same treatment as any public-facing endpoint
  // (Next's auth guide): proxy.ts is an optimistic cookie check, this is
  // the real one.
  await verifySession();

  const { searchParams } = new URL(request.url);
  const filters: SearchFilters = {
    q: searchParams.get('q') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    categoryId: searchParams.get('categoryId') ?? undefined,
    groupId: searchParams.get('groupId') ?? undefined,
    workerId: searchParams.get('workerId') ?? undefined,
    dateFrom: searchParams.get('dateFrom') ?? undefined,
    dateTo: searchParams.get('dateTo') ?? undefined,
  };

  const rows = await searchWorkOrders(filters, { forExport: true });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('ผลการค้นหา');
  sheet.columns = [
    { header: 'เลขที่งาน', key: 'woNo', width: 12 },
    { header: 'เลขที่เดิม', key: 'legacyWoNo', width: 12 },
    { header: 'วันที่เปิด', key: 'openedDate', width: 14 },
    { header: 'สถานะ', key: 'status', width: 10 },
    { header: 'ห้อง/พื้นที่', key: 'locationCode', width: 14 },
    { header: 'หมวดหมู่', key: 'categoryName', width: 16 },
    { header: 'รายละเอียด', key: 'description', width: 50 },
  ];
  sheet.getRow(1).font = { bold: true };

  const STATUS_TH: Record<string, string> = { pending: 'ค้าง', done: 'เสร็จ', cancelled: 'ยกเลิก' };
  for (const row of rows) {
    sheet.addRow({
      woNo: row.woNo,
      legacyWoNo: row.legacyWoNo ?? '',
      openedDate: formatThaiDate(row.openedDate),
      status: STATUS_TH[row.status] ?? row.status,
      locationCode: row.locationCode,
      categoryName: row.categoryName,
      description: row.description,
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="search-results.xlsx"`,
    },
  });
}
