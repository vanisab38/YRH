'use client';

import { useActionState, useState } from 'react';
import { updateUser, type ActionState } from '@/lib/actions/admin/users';

type Worker = { id: string; name: string; type: string };
type UserRow = {
  id: string;
  displayName: string;
  role: string;
  workerId: string | null;
  isActive: boolean;
};

export function EditUserForm({ user, workers }: { user: UserRow; workers: Worker[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateUser, undefined);
  const [role, setRole] = useState(user.role);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={user.id} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="displayName" className="text-sm font-medium text-zinc-700">
          ชื่อที่แสดง
        </label>
        <input
          id="displayName"
          name="displayName"
          defaultValue={user.displayName}
          required
          className="h-12 rounded-lg border border-zinc-300 px-4 text-base focus:border-zinc-500 focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="role" className="text-sm font-medium text-zinc-700">
          บทบาท
        </label>
        <select
          id="role"
          name="role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="h-12 rounded-lg border border-zinc-300 px-4 text-base focus:border-zinc-500 focus:outline-none"
        >
          <option value="worker">ช่าง</option>
          <option value="office">ฝ่ายสำนักงาน</option>
          <option value="admin">ผู้ดูแลระบบ</option>
        </select>
      </div>

      {role === 'worker' && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="workerId" className="text-sm font-medium text-zinc-700">
            เชื่อมกับรายชื่อพนักงาน
          </label>
          <select
            id="workerId"
            name="workerId"
            defaultValue={user.workerId ?? ''}
            required={role === 'worker'}
            className="h-12 rounded-lg border border-zinc-300 px-4 text-base focus:border-zinc-500 focus:outline-none"
          >
            <option value="">— เลือก —</option>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-zinc-700">
        <input type="checkbox" name="isActive" defaultChecked={user.isActive} />
        เปิดใช้งานบัญชีนี้
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
