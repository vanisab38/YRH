import { verifySession } from '@/lib/dal';
import { canViewReports, canManageAdmin } from '@/lib/permissions';
import { getWorkerOpenedSpecialWorkOrders } from '@/lib/queries/admin-review';
import { logout } from '@/app/actions/auth';

const ROLE_LABEL_TH: Record<string, string> = {
  admin: 'ผู้ดูแลระบบ',
  office: 'ฝ่ายสำนักงาน',
  worker: 'ช่าง',
};

// Placeholder home screen for Phase 3 (auth and roles) — proves login,
// sessions, and role-based visibility work end to end. The real "Today"
// screen (open jobs, pending oldest-first, + เปิดงานใหม่) is Phase 4.
export default async function Home() {
  const session = await verifySession();
  const reviewList = canViewReports(session.role) ? await getWorkerOpenedSpecialWorkOrders() : [];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">สวัสดี, {session.displayName}</h1>
          <p className="text-sm text-zinc-500">
            บทบาท: {ROLE_LABEL_TH[session.role] ?? session.role}
          </p>
        </div>
        <form action={logout}>
          <button type="submit" className="text-sm font-medium text-zinc-500 hover:text-zinc-900">
            ออกจากระบบ
          </button>
        </form>
      </header>

      <p className="rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-500">
        หน้ารายการงานวันนี้ (Today) จะมาใน Phase 4 — ตอนนี้ยืนยันได้ว่าล็อกอิน, เซสชัน,
        และสิทธิ์ตามบทบาททำงานถูกต้อง
      </p>

      {canManageAdmin(session.role) && reviewList.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-zinc-900">
            งานพิเศษที่ช่างเปิดเอง — ควรตรวจสอบ
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
    </div>
  );
}
