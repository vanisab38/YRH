import Link from 'next/link';
import { verifySession } from '@/lib/dal';
import { canViewReports, canManageAdmin } from '@/lib/permissions';
import { getWorkerOpenedSpecialWorkOrders } from '@/lib/queries/admin-review';
import { getTodayOpenedWorkOrders } from '@/lib/queries/work-orders';
import { searchWorkOrders, getFloorOptions, type SearchFilters } from '@/lib/queries/search';
import { logout } from '@/app/actions/auth';
import { WorkOrderCard } from '@/app/components/WorkOrderCard';
import { ListControls } from '@/app/components/ListControls';
import { groupWorkOrders } from '@/lib/group-work-orders';

const ROLE_LABEL_TH: Record<string, string> = {
  admin: 'ผู้ดูแลระบบ',
  office: 'ฝ่ายสำนักงาน',
  worker: 'ช่าง',
};

type HomeProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

// Today screen (§3): jobs opened today, and the pending list — search,
// sort, group and filter chips (§3.1), defaulting to the "stalled" sort so
// the failure mode this system exists to catch (a job nobody has touched
// in weeks) surfaces first, not just whatever was opened longest ago.
export default async function Home({ searchParams }: HomeProps) {
  const session = await verifySession();
  const params = await searchParams;

  const group = params.group === 'room' || params.group === 'floor' ? params.group : 'none';
  const filters: SearchFilters = {
    status: 'pending',
    q: params.q,
    sort: (params.sort as SearchFilters['sort']) || 'stalled',
    specialOnly: params.special === 'on',
    stalledOver7: params.stalled7 === 'on',
    floor: params.floor,
    assignedWorkerId: params.mine === 'on' ? (session.workerId ?? undefined) : undefined,
  };

  const [todayOrders, pendingOrders, reviewList, floorOptions] = await Promise.all([
    getTodayOpenedWorkOrders(),
    searchWorkOrders(filters),
    canViewReports(session.role) ? getWorkerOpenedSpecialWorkOrders() : Promise.resolve([]),
    getFloorOptions(),
  ]);

  const pendingGroups = groupWorkOrders(pendingOrders, group);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">สวัสดี, {session.displayName}</h1>
          <p className="text-sm text-zinc-500">{ROLE_LABEL_TH[session.role] ?? session.role}</p>
        </div>
        <form action={logout}>
          <button type="submit" className="text-sm font-medium text-zinc-500 hover:text-zinc-900">
            ออกจากระบบ
          </button>
        </form>
      </header>

      <Link
        href="/work-orders/new"
        className="flex h-14 items-center justify-center rounded-xl bg-zinc-900 text-base font-semibold text-white active:bg-zinc-800"
      >
        + เปิดงานใหม่
      </Link>

      <nav className="flex gap-4 text-sm font-medium text-zinc-600">
        <Link href="/search" className="hover:text-zinc-900">
          🔍 ค้นหางาน
        </Link>
        <Link href="/rooms" className="hover:text-zinc-900">
          🏠 ประวัติห้อง
        </Link>
        {canViewReports(session.role) && (
          <Link href="/reports" className="hover:text-zinc-900">
            📊 รายงาน
          </Link>
        )}
        {canManageAdmin(session.role) && (
          <Link href="/admin" className="hover:text-zinc-900">
            ⚙️ ตั้งค่าระบบ
          </Link>
        )}
      </nav>

      {reviewList.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-amber-800">
            งานพิเศษที่ช่างเปิดเอง — ควรตรวจสอบ ({reviewList.length})
          </h2>
          <ul className="flex flex-col gap-2">
            {reviewList.map((wo) => (
              <li key={wo.id} className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
                <div className="font-medium text-zinc-900">
                  {wo.woNo} · {wo.category} · {wo.location}
                </div>
                <div className="text-zinc-600">{wo.description}</div>
                <div className="mt-1 text-xs text-zinc-500">
                  เปิดโดย {wo.openedBy} เมื่อ {wo.openedDate}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-zinc-700">เปิดวันนี้ ({todayOrders.length})</h2>
        {todayOrders.length === 0 ? (
          <p className="text-sm text-zinc-400">ยังไม่มีงานที่เปิดวันนี้</p>
        ) : (
          <div className="flex flex-col gap-2">
            {todayOrders.map((wo) => (
              <WorkOrderCard key={wo.id} wo={wo} />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-zinc-700">ค้างทั้งหมด ({pendingOrders.length})</h2>

        <ListControls
          action="/"
          storageKey="today-list-prefs"
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
          submitLabel="กรอง"
        />

        {pendingOrders.length === 0 ? (
          <p className="text-sm text-zinc-400">ไม่มีงานค้าง</p>
        ) : group === 'none' ? (
          <div className="flex flex-col gap-2">
            {pendingOrders.map((wo) => (
              <WorkOrderCard key={wo.id} wo={wo} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {pendingGroups.map((g) => (
              <div key={g.key} className="flex flex-col gap-2">
                <h3 className="text-xs font-semibold text-zinc-500">
                  {g.label} ({g.items.length})
                </h3>
                <div className="flex flex-col gap-2">
                  {g.items.map((wo) => (
                    <WorkOrderCard key={wo.id} wo={wo} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
