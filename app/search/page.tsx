import Link from 'next/link';
import { verifySession } from '@/lib/dal';
import { searchWorkOrders, getFilterOptions, getFloorOptions, SEARCH_PAGE_LIMIT, type SearchFilters } from '@/lib/queries/search';
import { getActiveWorkers } from '@/lib/queries/work-orders';
import { WorkOrderCard } from '@/app/components/WorkOrderCard';
import { ListControls } from '@/app/components/ListControls';

type SearchPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

// §3/§3.1 Search: the same search-box/sort/group/filter-chip component as
// the Today screen's pending list (see app/page.tsx), defaulting to
// everything rather than pending-only, plus its own extra filters
// (status/category/group/worker/date range) and Excel export.
export default async function SearchPage({ searchParams }: SearchPageProps) {
  const session = await verifySession();
  const params = await searchParams;
  const group = params.group === 'room' || params.group === 'floor' ? params.group : 'none';
  const filters: SearchFilters = {
    q: params.q,
    status: params.status,
    categoryId: params.categoryId,
    groupId: params.groupId,
    workerId: params.workerId,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    sort: (params.sort as SearchFilters['sort']) || 'newest',
    specialOnly: params.special === 'on',
    stalledOver7: params.stalled7 === 'on',
    floor: params.floor,
    assignedWorkerId: params.mine === 'on' ? (session.workerId ?? undefined) : undefined,
  };
  // `sort` always has a default value, so it can't be part of this check —
  // otherwise a bare visit to /search would count as "has filters" and run
  // an unfiltered query instead of showing the empty-state prompt below.
  const hasAnyFilter = Object.entries(filters).some(([k, v]) => k !== 'sort' && Boolean(v));

  const [results, { categories, groups }, workers, floorOptions] = await Promise.all([
    hasAnyFilter ? searchWorkOrders(filters) : Promise.resolve([]),
    getFilterOptions(),
    getActiveWorkers(),
    getFloorOptions(),
  ]);

  // Built from the raw URL params (not the resolved `filters` object) so the
  // export link carries exactly what the form submitted — same param names
  // the export route and this page both parse (`special`, `stalled7`,
  // `mine`), rather than the filters object's internal field names.
  const EXPORT_PARAM_KEYS = [
    'q', 'status', 'categoryId', 'groupId', 'workerId', 'dateFrom', 'dateTo',
    'sort', 'special', 'stalled7', 'floor', 'mine',
  ] as const;
  const exportQuery = new URLSearchParams(
    EXPORT_PARAM_KEYS.filter((k) => params[k]).map((k) => [k, params[k]!])
  ).toString();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6">
      <header className="flex items-center gap-3">
        <Link href="/" className="text-zinc-500 hover:text-zinc-900" aria-label="กลับ">
          ←
        </Link>
        <h1 className="text-lg font-semibold text-zinc-900">ค้นหางาน</h1>
      </header>

      <ListControls
        action="/search"
        storageKey="search-list-prefs"
        values={{
          q: params.q,
          sort: filters.sort,
          group,
          mine: params.mine === 'on',
          special: params.special === 'on',
          stalled7: params.stalled7 === 'on',
          floor: params.floor,
        }}
        floorOptions={floorOptions}
        showMine={!!session.workerId}
        submitLabel="ค้นหา"
      >
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
      </ListControls>

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
          <WorkOrderCard key={wo.id} wo={wo} />
        ))}
      </div>
    </div>
  );
}
