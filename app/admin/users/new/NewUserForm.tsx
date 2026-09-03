'use client';

import { useActionState, useState } from 'react';
import { createUser, type ActionState } from '@/lib/actions/admin/users';

type Worker = { id: string; name: string; type: string };

export function NewUserForm({ workers }: { workers: Worker[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createUser, undefined);
  const [role, setRole] = useState('worker');

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="username" className="text-sm font-medium text-zinc-700">
          ชื่อผู้ใช้ (สำหรับล็อกอิน)
        </label>
        <input
          id="username"
          name="username"
          required
          autoComplete="off"
          className="h-12 rounded-lg border border-zinc-300 px-4 text-base focus:border-zinc-500 focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="displayName" className="text-sm font-medium text-zinc-700">
          ชื่อที่แสดง
        </label>
        <input
          id="displayName"
          name="displayName"
          required
          className="h-12 rounded-lg border border-zinc-300 px-4 text-base focus:border-zinc-500 focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-zinc-700">
          รหัสผ่านเริ่มต้น (อย่างน้อย 8 ตัวอักษร)
        </label>
        <input
          id="password"
          name="password"
          type="text"
          required
          minLength={8}
          className="h-12 rounded-lg border border-zinc-300 px-4 text-base font-mono focus:border-zinc-500 focus:outline-none"
        />
        <p className="text-xs text-zinc-400">แจ้งรหัสนี้ให้ผู้ใช้ด้วยตนเอง — ระบบยังไม่ส่งให้อัตโนมัติ</p>
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
          {workers.length === 0 && (
            <p className="text-xs text-amber-600">พนักงานทุกคนมีบัญชีผู้ใช้แล้ว</p>
          )}
        </div>
      )}

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
        {pending ? 'กำลังบันทึก…' : 'สร้างผู้ใช้'}
      </button>
    </form>
  );
}
