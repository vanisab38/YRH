import { LoginForm } from './LoginForm';

export default function LoginPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-12">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-zinc-900">ระบบใบสั่งงานซ่อมบำรุง</h1>
        <p className="mt-1 text-sm text-zinc-500">เข้าสู่ระบบเพื่อดูและบันทึกงาน</p>
      </div>
      <LoginForm />
    </div>
  );
}
