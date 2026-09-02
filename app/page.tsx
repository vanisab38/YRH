import Link from 'next/link';
import { verifySession } from '@/lib/dal';
import { canViewReports } from '@/lib/permissions';
import { getWorkerOpenedSpecialWorkOrders } from '@/lib/queries/admin-review';
import { getTodayOpenedWorkOrders, getPendingWorkOrdersOldestFirst } from '@/lib/queries/work-orders';
import { logout } from '@/app/actions/auth';
import { WorkOrderCard } from '@/app/components/WorkOrderCard';

const ROLE_LABEL_TH: Record<string, string> = {
  admin: 'ผู้ดูแลระบบ',
  office: 'ฝ่ายสำนักงาน',
  worker: 'ช่าง',
};

// Today screen (§3): jobs opened today, all pending oldest first, one big
// "เปิดงานใหม่" button, and (for admin/office) the special-work review list.
export default async function Home() {
  const session = await verifySession();
  const [todayOrders, pendingOrders, reviewList] = await Promise.all([
    getTodayOpenedWorkOrders(),
    getPendingWorkOrdersOldestFirst(),
    canViewReports(session.role) ? getWorkerOpenedSpecialWorkOrders() : Promise.resolve([]),
  ]);

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

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-zinc-700">ค้างทั้งหมด — เก่าสุดก่อน ({pendingOrders.length})</h2>
        {pendingOrders.length === 0 ? (
          <p className="text-sm text-zinc-400">ไม่มีงานค้าง</p>
        ) : (
          <div className="flex flex-col gap-2">
            {pendingOrders.map((wo) => (
              <WorkOrderCard key={wo.id} wo={wo} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
