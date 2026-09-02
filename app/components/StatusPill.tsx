const STATUS_TH: Record<string, string> = {
  pending: 'ค้าง',
  done: 'เสร็จ',
  cancelled: 'ยกเลิก',
};

const STATUS_CLASS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  done: 'bg-green-100 text-green-800',
  cancelled: 'bg-zinc-200 text-zinc-600',
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASS[status] ?? 'bg-zinc-100 text-zinc-700'}`}
    >
      {STATUS_TH[status] ?? status}
    </span>
  );
}
