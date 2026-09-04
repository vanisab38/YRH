import Link from 'next/link';
import { CategoryBadge } from './CategoryBadge';
import { StatusPill } from './StatusPill';
import { formatThaiDate, daysSince } from '@/lib/dates';

export type WorkOrderCardData = {
  id: string;
  woNo: string;
  legacyWoNo?: string | null;
  openedDate: string;
  status: string;
  description: string;
  categoryName: string;
  categoryColour: string | null;
  categoryIsSpecial: boolean;
  locationCode: string;
  // §3.3: "two numbers belong there, not one" — days actually worked vs.
  // days since the last update (or, once done, days worked vs. turnaround).
  // Optional so callers that haven't been updated yet (room history, admin
  // review) still render with the plain single date line.
  daysWorked?: number;
  lastActivityDate?: string | null;
  closedDate?: string | null;
  // §3.4: "a small camera icon with a number tells someone scanning the
  // pending list which jobs they can understand without opening."
  photoCount?: number;
};

function StaleBadge({ days }: { days: number }) {
  const colour = days > 30 ? 'text-red-600' : days > 7 ? 'text-amber-600' : 'text-zinc-400';
  return <span className={colour}>ไม่มีอัปเดต {days} วัน</span>;
}

function DateLine({ wo }: { wo: WorkOrderCardData }) {
  if (wo.status === 'done' && wo.closedDate) {
    const turnaround = Math.max(0, daysSince(wo.openedDate) - daysSince(wo.closedDate));
    return (
      <p className="text-xs text-zinc-400">
        ทำไปแล้ว {wo.daysWorked ?? 0} วัน · ปิดใน {turnaround} วัน
      </p>
    );
  }
  if (wo.status === 'pending' && wo.lastActivityDate) {
    return (
      <p className="text-xs text-zinc-400">
        เปิดเมื่อ {formatThaiDate(wo.openedDate)} · ทำไปแล้ว {wo.daysWorked ?? 0} วัน ·{' '}
        <StaleBadge days={daysSince(wo.lastActivityDate)} />
      </p>
    );
  }
  return <p className="text-xs text-zinc-400">เปิดเมื่อ {formatThaiDate(wo.openedDate)}</p>;
}

export function WorkOrderCard({ wo }: { wo: WorkOrderCardData }) {
  return (
    <Link
      href={`/work-orders/${wo.id}`}
      className="flex flex-col gap-1.5 rounded-lg border border-zinc-200 p-3 hover:border-zinc-400"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-sm text-zinc-500">
          {wo.woNo}
          {wo.legacyWoNo && wo.legacyWoNo !== wo.woNo && <span className="text-zinc-400"> (เดิม {wo.legacyWoNo})</span>}
        </span>
        <StatusPill status={wo.status} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-zinc-900">{wo.locationCode}</span>
        <CategoryBadge name={wo.categoryName} colour={wo.categoryColour} isSpecial={wo.categoryIsSpecial} />
        {!!wo.photoCount && <span className="text-xs text-zinc-400">📷 {wo.photoCount}</span>}
      </div>
      <p className="line-clamp-2 text-sm text-zinc-600">{wo.description}</p>
      <DateLine wo={wo} />
    </Link>
  );
}
