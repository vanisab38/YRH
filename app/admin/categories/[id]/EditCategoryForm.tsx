'use client';

import { useActionState } from 'react';
import { updateCategory, type ActionState } from '@/lib/actions/admin/categories';

type Group = { id: string; nameTh: string };
type Category = {
  id: string;
  nameTh: string;
  isSpecial: boolean;
  colour: string | null;
  helpText: string | null;
  isActive: boolean;
  groupId: string | null;
};

export function EditCategoryForm({ category, groups }: { category: Category; groups: Group[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateCategory, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={category.id} />

      <label className="flex items-center gap-2 text-sm text-zinc-700">
        <input type="checkbox" name="isSpecial" defaultChecked={category.isSpecial} />
        งานพิเศษ (จ่ายเพิ่ม) — ปรากฏในรายงานงานพิเศษ §4.1
      </label>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="colour" className="text-sm font-medium text-zinc-700">
          สีป้าย (รหัส #RRGGBB, ใช้เมื่อเป็นงานพิเศษ)
        </label>
        <input
          id="colour"
          name="colour"
          defaultValue={category.colour ?? ''}
          placeholder="#00B0F0"
          className="h-12 rounded-lg border border-zinc-300 px-4 font-mono text-base focus:border-zinc-500 focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="groupId" className="text-sm font-medium text-zinc-700">
          กลุ่ม (สำหรับรายงานเท่านั้น — ไม่มีผลต่องานพิเศษ)
        </label>
        <select
          id="groupId"
          name="groupId"
          defaultValue={category.groupId ?? ''}
          className="h-12 rounded-lg border border-zinc-300 px-4 text-base focus:border-zinc-500 focus:outline-none"
        >
          <option value="">— ไม่มีกลุ่ม —</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.nameTh}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="helpText" className="text-sm font-medium text-zinc-700">
          ข้อความช่วยเหลือ (แสดงใต้ตัวเลือกหมวดหมู่ตอนเปิดงานใหม่)
        </label>
        <textarea
          id="helpText"
          name="helpText"
          defaultValue={category.helpText ?? ''}
          rows={2}
          placeholder="เช่น: ล้างแอร์ตามรอบที่กำหนด ใช้ งานประจำ / ล้างแอร์เพราะแขกร้องเรียน ใช้ แอร์"
          className="rounded-lg border border-zinc-300 p-3 text-base focus:border-zinc-500 focus:outline-none"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-zinc-700">
        <input type="checkbox" name="isActive" defaultChecked={category.isActive} />
        เปิดใช้งาน (แสดงในตัวเลือกตอนเปิดงานใหม่)
      </label>

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
