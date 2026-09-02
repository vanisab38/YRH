// Plain GET form — no client JS needed, keeps report URLs shareable/bookmarkable.
export function DateRangeForm({ from, to }: { from: string; to: string }) {
  return (
    <form className="flex flex-wrap items-end gap-2 print:hidden">
      <label className="flex flex-col gap-1 text-xs text-zinc-500">
        จากวันที่
        <input
          type="date"
          name="from"
          defaultValue={from}
          className="h-10 rounded-lg border border-zinc-300 px-3 text-sm"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-zinc-500">
        ถึงวันที่
        <input
          type="date"
          name="to"
          defaultValue={to}
          className="h-10 rounded-lg border border-zinc-300 px-3 text-sm"
        />
      </label>
      <button type="submit" className="h-10 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white">
        แสดงรายงาน
      </button>
    </form>
  );
}
