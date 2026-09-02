import Link from 'next/link';
import { CategoryBadge } from './CategoryBadge';
import { StatusPill } from './StatusPill';
import { formatThaiDate } from '@/lib/dates';

export function WorkOrderCard({
  wo,
}: {
  wo: {
    id: string;
    woNo: string;
    openedDate: string;
    status: string;
    description: string;
    categoryName: string;
    categoryColour: string | null;
    categoryIsSpecial: boolean;
    locationCode: string;
  };
}) {
  return (
    <Link
      href={`/work-orders/${wo.id}`}
      className="flex flex-col gap-1.5 rounded-lg border border-zinc-200 p-3 hover:border-zinc-400"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-sm text-zinc-500">{wo.woNo}</span>
        <StatusPill status={wo.status} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-zinc-900">{wo.locationCode}</span>
        <CategoryBadge name={wo.categoryName} colour={wo.categoryColour} isSpecial={wo.categoryIsSpecial} />
      </div>
      <p className="line-clamp-2 text-sm text-zinc-600">{wo.description}</p>
      <p className="text-xs text-zinc-400">เปิดเมื่อ {formatThaiDate(wo.openedDate)}</p>
    </Link>
  );
}
