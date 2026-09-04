import Link from 'next/link';
import { verifySession } from '@/lib/dal';
import { searchWorkOrders, getFilterOptions, SEARCH_PAGE_LIMIT, type SearchFilters } from '@/lib/queries/search';
import { getActiveWorkers } from '@/lib/queries/work-orders';
import { formatThaiDate } from '@/lib/dates';
import { CategoryBadge } from '@/app/components/CategoryBadge';
import { StatusPill } from '@/app/components/StatusPill';

type SearchPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

// §3 Search: one box across description/WO#/legacy_wo_no/room, plus filter
// chips for status/category/group/worker/date range, export to Excel.
// GET form + searchParams so results are a plain shareable/bookmarkable URL.
export default async function SearchPage({ searchParams }: SearchPageProps) {
  await verifySession();
  const params = await searchParams;
  const filters: SearchFilters = {
    q: params.q,
    room: params.room,
    status: params.status,
    categoryId: params.categoryId,
    groupId: params.groupId,
    workerId: params.workerId,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  };
  const hasAnyFilter = Object.values(filters).some(Boolean);

  const [results, { categories, groups }, workers] = await Promise.all([
    hasAnyFilter ? searchWorkOrders(filters) : Promise.resolve([]),
    getFilterOptions(),
    getActiveWorkers(),
  ]);

  const exportQuery = new URLSearchParams(
    Object.entries(filters).filter(([, v]) => v) as [string, string][]
  ).toString();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6">
      <header className="flex items-center gap-3">
        <Link href="/" className="text-zinc-500 hover:text-zinc-900" aria-label="กลับ">
          ←
        </Link>
        <h1 className="text-lg font-semibold text-zinc-900">ค้นหางาน</h1>
      </header>

      <form className="flex flex-col gap-3">
        <div className="flex gap-2">
          <input
            name="q"
            defaultValue={filters.q ?? ''}
            placeholder="ค้นหาคำอธิบายหรือเลขที่งาน"
            autoComplete="off"
            className="h-12 flex-1 rounded-lg border border-zinc-300 px-4 text-base focus:border-zinc-500 focus:outline-none"
          />
          <input
            name="room"
            defaultValue={filters.room ?? ''}
            placeholder="ห้อง"
            autoComplete="off"
            className="h-12 w-28 rounded-lg border border-zinc-300 px-4 text-base focus:border-zinc-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <select name="status" defaultValue={filters.status ?? ''} className="h-10 rounded-full border border-zinc-300 px-3 text-sm">
            <option value="">ทุกสถานะ</option>
            <option value="pending">ค้าง</option>
            <option value="done">เสร็จ</option>
            <option value="cancelled">ยกเลิก</option>
          </select>

          <select name="categoryId" defaultValue={filters.categoryId ?? ''} className="h-10 rounded-full border border-zinc-300 px-3 text-sm">
            <option value="">ทุกหมวดหมู่</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameTh}
              </option>
            ))}
          </select>

          <select name="groupId" defaultValue={filters.groupId ?? ''} className="h-10 rounded-full border border-zinc-300 px-3 text-sm">
            <option value="">ทุกกลุ่ม</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nameTh}
              </option>
            ))}
          </select>

          <select name="workerId" defaultValue={filters.workerId ?? ''} className="h-10 rounded-full border border-zinc-300 px-3 text-sm">
            <option value="">ทุกคน</option>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex flex-1 flex-col gap-1 text-xs text-zinc-500">
            จากวันที่
            <input
              type="date"
              name="dateFrom"
              defaultValue={filters.dateFrom ?? ''}
              className="h-10 rounded-lg border border-zinc-300 px-3 text-sm"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-xs text-zinc-500">
            ถึงวันที่
            <input
              type="date"
              name="dateTo"
              defaultValue={filters.dateTo ?? ''}
              className="h-10 rounded-lg border border-zinc-300 px-3 text-sm"
            />
          </label>
        </div>

        <button type="submit" className="h-12 rounded-lg bg-zinc-900 text-base font-medium text-white">
          ค้นหา
        </button>
      </form>

      {hasAnyFilter && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-500">
            พบ {results.length}
            {results.length === SEARCH_PAGE_LIMIT ? '+' : ''} รายการ
          </p>
          {results.length > 0 && (
            <a
              href={`/api/search/export?${exportQuery}`}
              className="text-sm font-medium text-zinc-700 underline hover:text-zinc-900"
            >
              ส่งออกเป็น Excel
            </a>
          )}
        </div>
      )}

      {hasAnyFilter && results.length === 0 && (
        <p className="text-sm text-zinc-400">ไม่พบงานที่ตรงกับเงื่อนไข ลองคำค้นหรือตัวกรองอื่น</p>
      )}
      {!hasAnyFilter && (
        <p className="text-sm text-zinc-400">พิมพ์คำค้นหรือเลือกตัวกรองด้านบนเพื่อเริ่มค้นหา</p>
      )}

      <div className="flex flex-col gap-2">
        {results.map((wo) => (
          <Link
            key={wo.id}
            href={`/work-orders/${wo.id}`}
            className="flex flex-col gap-1.5 rounded-lg border border-zinc-200 p-3 hover:border-zinc-400"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-sm text-zinc-500">
                {wo.woNo}
                {wo.legacyWoNo && wo.legacyWoNo !== wo.woNo && (
                  <span className="text-zinc-400"> (เดิม {wo.legacyWoNo})</span>
                )}
              </span>
              <StatusPill status={wo.status} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-zinc-900">{wo.locationCode}</span>
              <CategoryBadge name={wo.categoryName} colour={wo.categoryColour} isSpecial={wo.categoryIsSpecial} />
            </div>
            <p className="line-clamp-2 text-sm text-zinc-600">{wo.description}</p>
            <p className="text-xs text-zinc-400">{formatThaiDate(wo.openedDate)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
