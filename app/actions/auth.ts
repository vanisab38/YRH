'use server';

import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db } from '@/db';
import { users } from '@/db/schema';
import { createSession, deleteSession } from '@/lib/session';

export type LoginState = { error: string } | undefined;

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get('username') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!username || !password) {
    return { error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' }; // "Enter username and password"
  }

  const user = await db.query.users.findFirst({ where: eq(users.username, username) });

  // Constant-shape check: run bcrypt.compare even on a missing user against
  // a dummy hash, so a nonexistent username doesn't respond measurably
  // faster than a wrong password and leak which usernames exist.
  const passwordHash = user?.passwordHash ?? '$2b$10$invalidsaltinvalidsaltinuseonly000000000000000000000';
  const passwordOk = await bcrypt.compare(password, passwordHash);

  if (!user || !passwordOk || !user.isActive) {
    return { error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }; // "Incorrect username or password"
  }

  await createSession({
    userId: user.id,
    role: user.role as 'admin' | 'office' | 'worker',
    workerId: user.workerId,
    displayName: user.displayName,
  });

  redirect('/');
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect('/login');
}
