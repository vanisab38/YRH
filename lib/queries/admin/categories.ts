import 'server-only';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { categories, categoryGroups } from '@/db/schema';

export async function getAllCategoriesAdmin() {
  return db
    .select({
      id: categories.id,
      nameTh: categories.nameTh,
      isSpecial: categories.isSpecial,
      colour: categories.colour,
      helpText: categories.helpText,
      isActive: categories.isActive,
      sortOrder: categories.sortOrder,
      groupId: categories.groupId,
      groupName: categoryGroups.nameTh,
    })
    .from(categories)
    .leftJoin(categoryGroups, eq(categoryGroups.id, categories.groupId))
    .orderBy(asc(categories.sortOrder));
}

export async function getCategoryById(id: string) {
  const [row] = await db.select().from(categories).where(eq(categories.id, id));
  return row ?? null;
}

export async function getAllCategoryGroups() {
  return db.select().from(categoryGroups).orderBy(asc(categoryGroups.sortOrder));
}
