import Link from 'next/link';
import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/dal';
import { canManageAdmin } from '@/lib/permissions';

const SECTIONS = [
  { href: '/admin/users', title: 'ผู้ใช้งาน', desc: 'สร้างบัญชี กำหนดบทบาท เชื่อมกับรายชื่อพนักงาน ปิดการใช้งาน' },
  { href: '/admin/categories', title: 'หมวดหมู่งาน', desc: 'งานพิเศษ สี กลุ่ม ข้อความช่วยเหลือ เปิด/ปิดการใช้งาน' },
];

// §3 Admin — admin only.
export default async function AdminIndexPage() {
  const session = await verifySession();
  if (!canManageAdmin(session.role)) redirect('/');

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6">
      <header className="flex items-center gap-3">
        <Link href="/" className="text-zinc-500 hover:text-zinc-900" aria-label="กลับ">
          ←
        </Link>
        <h1 className="text-lg font-semibold text-zinc-900">ตั้งค่าระบบ</h1>
      </header>
      <div className="flex flex-col gap-2">
        {SECTIONS.map((s) => (
          <Link key={s.href} href={s.href} className="rounded-lg border border-zinc-200 p-4 hover:border-zinc-400">
            <div className="font-medium text-zinc-900">{s.title}</div>
            <div className="text-sm text-zinc-500">{s.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
