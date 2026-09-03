import Link from 'next/link';
import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/dal';
import { canManageAdmin } from '@/lib/permissions';
import { getAllUsers } from '@/lib/queries/admin/users';

const ROLE_LABEL_TH: Record<string, string> = {
  admin: 'ผู้ดูแลระบบ',
  office: 'ฝ่ายสำนักงาน',
  worker: 'ช่าง',
};

export default async function AdminUsersPage() {
  const session = await verifySession();
  if (!canManageAdmin(session.role)) redirect('/');

  const allUsers = await getAllUsers();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6">
      <header className="flex items-center gap-3">
        <Link href="/admin" className="text-zinc-500 hover:text-zinc-900" aria-label="กลับ">
          ←
        </Link>
        <h1 className="text-lg font-semibold text-zinc-900">ผู้ใช้งาน</h1>
      </header>

      <Link
        href="/admin/users/new"
        className="flex h-12 items-center justify-center rounded-xl bg-zinc-900 text-base font-semibold text-white active:bg-zinc-800"
      >
        + เพิ่มผู้ใช้ใหม่
      </Link>

      <div className="flex flex-col gap-2">
        {allUsers.map((u) => (
          <Link
            key={u.id}
            href={`/admin/users/${u.id}`}
            className={`flex items-center justify-between rounded-lg border p-3 hover:border-zinc-400 ${
              u.isActive ? 'border-zinc-200' : 'border-zinc-200 bg-zinc-50 opacity-60'
            }`}
          >
            <div>
              <div className="font-medium text-zinc-900">
                {u.displayName} <span className="text-xs text-zinc-400">@{u.username}</span>
              </div>
              <div className="text-sm text-zinc-500">
                {ROLE_LABEL_TH[u.role] ?? u.role}
                {u.workerName && ` · ${u.workerName}`}
                {!u.isActive && ' · ปิดใช้งาน'}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
