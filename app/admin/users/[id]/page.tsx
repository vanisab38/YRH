import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { verifySession } from '@/lib/dal';
import { canManageAdmin } from '@/lib/permissions';
import { getUserById, getWorkersForLinking } from '@/lib/queries/admin/users';
import { EditUserForm } from './EditUserForm';
import { ResetPasswordForm } from './ResetPasswordForm';

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession();
  if (!canManageAdmin(session.role)) redirect('/');

  const { id } = await params;
  const user = await getUserById(id);
  if (!user) notFound();

  const workers = await getWorkersForLinking(user.workerId);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6">
      <header className="flex items-center gap-3">
        <Link href="/admin/users" className="text-zinc-500 hover:text-zinc-900" aria-label="กลับ">
          ←
        </Link>
        <h1 className="text-lg font-semibold text-zinc-900">
          {user.displayName} <span className="text-sm font-normal text-zinc-400">@{user.username}</span>
        </h1>
      </header>

      <EditUserForm
        user={{
          id: user.id,
          displayName: user.displayName,
          role: user.role,
          workerId: user.workerId,
          isActive: user.isActive,
        }}
        workers={workers}
      />

      <ResetPasswordForm userId={user.id} />
    </div>
  );
}
