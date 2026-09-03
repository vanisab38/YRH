'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db } from '@/db';
import { users } from '@/db/schema';
import { verifySession } from '@/lib/dal';
import { canManageAdmin } from '@/lib/permissions';

export type ActionState = { error: string } | undefined;
export type ResetPasswordState = { error: string } | { success: true } | undefined;

const MIN_PASSWORD_LENGTH = 8;
const VALID_ROLES = ['admin', 'office', 'worker'] as const;

async function requireAdmin() {
  const session = await verifySession();
  if (!canManageAdmin(session.role)) redirect('/');
  return session;
}

export async function createUser(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const username = String(formData.get('username') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const displayName = String(formData.get('displayName') ?? '').trim();
  const role = String(formData.get('role') ?? '');
  const workerId = String(formData.get('workerId') ?? '') || null;

  if (!username || !displayName || !VALID_ROLES.includes(role as (typeof VALID_ROLES)[number])) {
    return { error: 'กรุณากรอกข้อมูลให้ครบถ้วน' };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `รหัสผ่านต้องมีอย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร` };
  }
  if (role === 'worker' && !workerId) {
    return { error: 'บทบาท "ช่าง" ต้องเชื่อมกับรายชื่อพนักงานในระบบ' };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    await db.insert(users).values({
      username,
      passwordHash,
      displayName,
      role,
      workerId: role === 'worker' ? workerId : null,
    });
  } catch (err) {
    const pgCode = (err as { code?: string } | null)?.code;
    if (pgCode === '23505') return { error: `มีชื่อผู้ใช้ "${username}" อยู่แล้ว` };
    throw err;
  }

  revalidatePath('/admin/users');
  redirect('/admin/users');
}

export async function updateUser(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const id = String(formData.get('id') ?? '');
  const displayName = String(formData.get('displayName') ?? '').trim();
  const role = String(formData.get('role') ?? '');
  const workerId = String(formData.get('workerId') ?? '') || null;
  const isActive = formData.get('isActive') === 'on';

  if (!id || !displayName || !VALID_ROLES.includes(role as (typeof VALID_ROLES)[number])) {
    return { error: 'กรุณากรอกข้อมูลให้ครบถ้วน' };
  }
  if (role === 'worker' && !workerId) {
    return { error: 'บทบาท "ช่าง" ต้องเชื่อมกับรายชื่อพนักงานในระบบ' };
  }

  await db
    .update(users)
    .set({ displayName, role, workerId: role === 'worker' ? workerId : null, isActive })
    .where(eq(users.id, id));

  revalidatePath('/admin/users');
  redirect('/admin/users');
}

export async function resetPassword(
  _prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  await requireAdmin();

  const id = String(formData.get('id') ?? '');
  const password = String(formData.get('password') ?? '');
  if (!id || password.length < MIN_PASSWORD_LENGTH) {
    return { error: `รหัสผ่านต้องมีอย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร` };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await db.update(users).set({ passwordHash }).where(eq(users.id, id));

  revalidatePath(`/admin/users/${id}`);
  return { success: true };
}
