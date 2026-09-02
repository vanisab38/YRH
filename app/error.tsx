'use client'; // Error boundaries must be Client Components

import { useEffect } from 'react';

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <p className="text-lg font-semibold text-zinc-900">เกิดข้อผิดพลาด</p>
      <p className="text-sm text-zinc-500">ลองใหม่อีกครั้ง หากยังไม่ได้ให้แจ้งผู้ดูแลระบบ</p>
      <button
        onClick={() => retry()}
        className="mt-2 h-11 rounded-lg bg-zinc-900 px-5 text-sm font-medium text-white"
      >
        ลองใหม่
      </button>
    </div>
  );
}
