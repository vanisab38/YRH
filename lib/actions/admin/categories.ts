'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { categories } from '@/db/schema';
import { verifySession } from '@/lib/dal';
import { canManageAdmin } from '@/lib/permissions';

export type ActionState = { error: string } | undefined;

const COLOUR_RE = /^#[0-9a-fA-F]{6}$/;

export async function updateCategory(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await verifySession();
  if (!canManageAdmin(session.role)) redirect('/');

  const id = String(formData.get('id') ?? '');
  const isSpecial = formData.get('isSpecial') === 'on';
  const colourRaw = String(formData.get('colour') ?? '').trim();
  const groupId = String(formData.get('groupId') ?? '') || null;
  const helpText = String(formData.get('helpText') ?? '').trim() || null;
  const isActive = formData.get('isActive') === 'on';

  if (!id) return { error: 'ไม่พบหมวดหมู่นี้' };
  if (colourRaw && !COLOUR_RE.test(colourRaw)) {
    return { error: 'รหัสสีต้องเป็นรูปแบบ #RRGGBB เช่น #00B0F0' };
  }

  await db
    .update(categories)
    .set({ isSpecial, colour: colourRaw || null, groupId, helpText, isActive })
    .where(eq(categories.id, id));

  revalidatePath('/admin/categories');
  revalidatePath('/work-orders/new');
  redirect('/admin/categories');
}
