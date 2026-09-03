import Link from 'next/link';
import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/dal';
import { canManageAdmin } from '@/lib/permissions';
import { getAllCategoriesAdmin } from '@/lib/queries/admin/categories';
import { CategoryBadge } from '@/app/components/CategoryBadge';

export default async function AdminCategoriesPage() {
  const session = await verifySession();
  if (!canManageAdmin(session.role)) redirect('/');

  const allCategories = await getAllCategoriesAdmin();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6">
      <header className="flex items-center gap-3">
        <Link href="/admin" className="text-zinc-500 hover:text-zinc-900" aria-label="กลับ">
          ←
        </Link>
        <h1 className="text-lg font-semibold text-zinc-900">หมวดหมู่งาน</h1>
      </header>
      <p className="text-sm text-zinc-500">
        เฉพาะ <strong>แอร์, ยาแนว, โปรเจค</strong> เป็นงานพิเศษ (จ่ายเพิ่ม) — การเปลี่ยนหมวดหมู่จึงเปลี่ยนสิทธิ์การจ่ายเงินด้วย
      </p>

      <div className="flex flex-col gap-2">
        {allCategories.map((c) => (
          <Link
            key={c.id}
            href={`/admin/categories/${c.id}`}
            className={`flex items-center justify-between rounded-lg border p-3 hover:border-zinc-400 ${
              c.isActive ? 'border-zinc-200' : 'border-zinc-200 bg-zinc-50 opacity-60'
            }`}
          >
            <div className="flex flex-col gap-1">
              <CategoryBadge name={c.nameTh} colour={c.colour} isSpecial={c.isSpecial} />
              <div className="text-xs text-zinc-400">
                {c.groupName && `กลุ่ม: ${c.groupName}`}
                {!c.isActive && ' · ปิดใช้งาน'}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
