import Link from 'next/link';
import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/dal';
import { canManageAdmin } from '@/lib/permissions';
import { getWorkersForLinking } from '@/lib/queries/admin/users';
import { NewUserForm } from './NewUserForm';

export default async function NewUserPage() {
  const session = await verifySession();
  if (!canManageAdmin(session.role)) redirect('/');

  const workers = await getWorkersForLinking();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6">
      <header className="flex items-center gap-3">
        <Link href="/admin/users" className="text-zinc-500 hover:text-zinc-900" aria-label="กลับ">
          ←
        </Link>
        <h1 className="text-lg font-semibold text-zinc-900">เพิ่มผู้ใช้ใหม่</h1>
      </header>
      <NewUserForm workers={workers} />
    </div>
  );
}
