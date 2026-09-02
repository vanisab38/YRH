import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <p className="text-lg font-semibold text-zinc-900">ไม่พบหน้านี้</p>
      <p className="text-sm text-zinc-500">อาจถูกลบไปแล้ว หรือลิงก์ไม่ถูกต้อง</p>
      <Link href="/" className="mt-2 text-sm font-medium text-zinc-700 underline hover:text-zinc-900">
        กลับหน้าแรก
      </Link>
    </div>
  );
}
