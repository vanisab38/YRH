'use client';

import { useActionState } from 'react';
import { resetPassword, type ResetPasswordState } from '@/lib/actions/admin/users';

export function ResetPasswordForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState<ResetPasswordState, FormData>(resetPassword, undefined);

  return (
    <form action={action} className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-4">
      <input type="hidden" name="id" value={userId} />
      <h2 className="text-sm font-semibold text-zinc-900">ตั้งรหัสผ่านใหม่</h2>
      <input
        name="password"
        type="text"
        required
        minLength={8}
        placeholder="รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)"
        className="h-12 rounded-lg border border-zinc-300 px-4 text-base font-mono focus:border-zinc-500 focus:outline-none"
      />
      {state && 'error' in state && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      {state && 'success' in state && <p className="text-sm text-green-700">ตั้งรหัสผ่านใหม่แล้ว</p>}
      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-lg border border-zinc-300 text-sm font-medium text-zinc-700 disabled:opacity-50"
      >
        {pending ? 'กำลังบันทึก…' : 'ตั้งรหัสผ่านใหม่'}
      </button>
    </form>
  );
}
