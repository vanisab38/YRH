import 'server-only';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { users, workers } from '@/db/schema';

export async function getAllUsers() {
  return db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      role: users.role,
      isActive: users.isActive,
      workerId: users.workerId,
      workerName: workers.name,
      createdAt: users.createdAt,
    })
    .from(users)
    .leftJoin(workers, eq(workers.id, users.workerId))
    .orderBy(asc(users.role), asc(users.displayName));
}

export async function getUserById(id: string) {
  const [row] = await db.select().from(users).where(eq(users.id, id));
  return row ?? null;
}

// Workers not already linked to a login account, plus the currently-linked
// one (if editing) — so the dropdown doesn't offer a worker who already has
// a different account, but keeps showing the one this user already has.
export async function getWorkersForLinking(currentWorkerId?: string | null) {
  const allWorkers = await db
    .select({ id: workers.id, name: workers.name, type: workers.type })
    .from(workers)
    .where(eq(workers.isActive, true))
    .orderBy(asc(workers.sortOrder));

  const linkedUsers = await db
    .select({ workerId: users.workerId })
    .from(users)
    .where(eq(users.isActive, true));
  const linkedWorkerIds = new Set(linkedUsers.map((u) => u.workerId).filter(Boolean));

  return allWorkers.filter((w) => w.id === currentWorkerId || !linkedWorkerIds.has(w.id));
}
