import Link from 'next/link';
import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/dal';
import { canViewReports } from '@/lib/permissions';

const REPORTS = [
  { href: '/reports/special-work', title: 'รายงานงานพิเศษ', desc: 'แอร์ ยาแนว โปรเจค — ใครทำกี่วัน' },
  { href: '/reports/worker-activity', title: 'กิจกรรมของช่างแต่ละคน', desc: 'งานต่อคนต่อช่วงเวลา แยกตามหมวดหมู่' },
  { href: '/reports/ageing', title: 'งานค้าง — เรียงตามอายุ', desc: '0–3, 4–7, 8–14, 15–30, 30+ วัน' },
  { href: '/reports/rooms', title: 'สรุปรายห้อง', desc: 'จำนวนงานต่อห้องต่อช่วงเวลา พร้อมสัญญาณห้องมีปัญหาซ้ำ' },
];

// §4 Reports — admin/office only per §2's permission table.
export default async function ReportsIndexPage() {
  const session = await verifySession();
  if (!canViewReports(session.role)) redirect('/');

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6">
      <header className="flex items-center gap-3">
        <Link href="/" className="text-zinc-500 hover:text-zinc-900" aria-label="กลับ">
          ←
        </Link>
        <h1 className="text-lg font-semibold text-zinc-900">รายงาน</h1>
      </header>
      <div className="flex flex-col gap-2">
        {REPORTS.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            className="rounded-lg border border-zinc-200 p-4 hover:border-zinc-400"
          >
            <div className="font-medium text-zinc-900">{r.title}</div>
            <div className="text-sm text-zinc-500">{r.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
