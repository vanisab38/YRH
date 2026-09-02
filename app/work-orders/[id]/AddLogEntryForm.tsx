'use client';

import { useActionState } from 'react';
import { addLogEntry, type ActionState } from '@/lib/actions/work-orders';
import { bangkokToday } from '@/lib/dates';

type Worker = { id: string; name: string };

export function AddLogEntryForm({ workOrderId, workers }: { workOrderId: string; workers: Worker[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(addLogEntry, undefined);
  const today = bangkokToday();

  return (
    <form action={action} className="flex flex-col gap-4 rounded-xl border border-zinc-200 p-4">
      <input type="hidden" name="workOrderId" value={workOrderId} />
      <h3 className="text-sm font-semibold text-zinc-900">+ บันทึกงานวันนี้</h3>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="logDate" className="text-sm font-medium text-zinc-700">
          วันที่
        </label>
        <input
          id="logDate"
          name="logDate"
          type="date"
          defaultValue={today}
          required
          className="h-11 rounded-lg border border-zinc-300 px-3 text-base focus:border-zinc-500 focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="note" className="text-sm font-medium text-zinc-700">
          บันทึก (ถ้ามี)
        </label>
        <textarea
          id="note"
          name="note"
          rows={2}
          className="rounded-lg border border-zinc-300 p-3 text-base focus:border-zinc-500 focus:outline-none"
        />
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-sm font-medium text-zinc-700">ใครทำงานนี้</legend>
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

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-sm font-medium text-zinc-700">สถานะ</legend>
        <div className="flex gap-2">
          <label className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-zinc-300 py-2.5 text-sm has-checked:border-amber-500 has-checked:bg-amber-50">
            <input type="radio" name="statusAfter" value="pending" defaultChecked required />
            ยังไม่เสร็จ (ค้าง)
          </label>
          <label className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-zinc-300 py-2.5 text-sm has-checked:border-green-500 has-checked:bg-green-50">
            <input type="radio" name="statusAfter" value="done" required />
            เสร็จแล้ว
          </label>
        </div>
      </fieldset>

      {state?.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="h-12 rounded-xl bg-zinc-900 text-base font-semibold text-white disabled:opacity-50"
      >
        {pending ? 'กำลังบันทึก…' : 'บันทึก'}
      </button>
    </form>
  );
}
