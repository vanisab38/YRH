'use client';

import { useActionState } from 'react';
import { createWorkOrder, type ActionState } from '@/lib/actions/work-orders';

type Location = { id: string; code: string; type: string };
type Category = { id: string; nameTh: string; isSpecial: boolean; colour: string | null };
type Worker = { id: string; name: string; type: string };

export function NewWorkOrderForm({
  locations,
  categories,
  workers,
}: {
  locations: Location[];
  categories: Category[];
  workers: Worker[];
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createWorkOrder, undefined);

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="locationCode" className="text-sm font-medium text-zinc-700">
          ห้อง / พื้นที่
        </label>
        <input
          id="locationCode"
          name="locationCode"
          list="location-options"
          required
          autoComplete="off"
          placeholder="เช่น 1408 หรือ สวนชั้น5"
          className="h-12 rounded-lg border border-zinc-300 px-4 text-base focus:border-zinc-500 focus:outline-none"
        />
        <datalist id="location-options">
          {locations.map((loc) => (
            <option key={loc.id} value={loc.code} />
          ))}
        </datalist>
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-sm font-medium text-zinc-700">หมวดหมู่</legend>
        <div className="flex max-h-64 flex-col gap-1 overflow-y-auto rounded-lg border border-zinc-300 p-2">
          {categories.map((cat) => (
            <label
              key={cat.id}
              className="flex items-center gap-2 rounded-md px-2 py-2 text-sm has-checked:bg-zinc-100"
            >
              <input type="radio" name="categoryId" value={cat.id} required className="accent-zinc-900" />
              {cat.isSpecial && cat.colour && (
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.colour }} />
              )}
              <span>{cat.nameTh}</span>
              {cat.isSpecial && <span className="text-xs text-zinc-400">(พิเศษ)</span>}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-sm font-medium text-zinc-700">
          รายละเอียดงาน
        </label>
        <textarea
          id="description"
          name="description"
          required
          rows={3}
          className="rounded-lg border border-zinc-300 p-3 text-base focus:border-zinc-500 focus:outline-none"
        />
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-sm font-medium text-zinc-700">มอบหมายให้ (ถ้ามี)</legend>
        <div className="flex flex-wrap gap-2">
          {workers.map((w) => (
            <label
              key={w.id}
              className="flex items-center gap-1.5 rounded-full border border-zinc-300 px-3 py-1.5 text-sm has-checked:border-zinc-900 has-checked:bg-zinc-900 has-checked:text-white"
            >
              <input type="checkbox" name="workerIds" value={w.id} className="hidden" />
              {w.name}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="priority" className="text-sm font-medium text-zinc-700">
          ความเร่งด่วน
        </label>
        <select
          id="priority"
          name="priority"
          defaultValue="normal"
          className="h-12 rounded-lg border border-zinc-300 px-4 text-base focus:border-zinc-500 focus:outline-none"
        >
          <option value="normal">ปกติ</option>
          <option value="urgent">ด่วน</option>
        </select>
      </div>

      {state?.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="h-14 rounded-xl bg-zinc-900 text-base font-semibold text-white disabled:opacity-50"
      >
        {pending ? 'กำลังบันทึก…' : 'เปิดงาน'}
      </button>
    </form>
  );
}
