import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { verifySession } from '@/lib/dal';
import { canManageAdmin } from '@/lib/permissions';
import { getCategoryById, getAllCategoryGroups } from '@/lib/queries/admin/categories';
import { EditCategoryForm } from './EditCategoryForm';

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession();
  if (!canManageAdmin(session.role)) redirect('/');

  const { id } = await params;
  const [category, groups] = await Promise.all([getCategoryById(id), getAllCategoryGroups()]);
  if (!category) notFound();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6">
      <header className="flex items-center gap-3">
        <Link href="/admin/categories" className="text-zinc-500 hover:text-zinc-900" aria-label="กลับ">
          ←
        </Link>
        <h1 className="text-lg font-semibold text-zinc-900">{category.nameTh}</h1>
      </header>
      <EditCategoryForm category={category} groups={groups} />
    </div>
  );
}
