// Phase 3 dev/test seed: login accounts. There's no admin "create user" UI
// yet (that's an Admin-screen item, not scoped to Phase 3's auth/roles
// work), so these are hardcoded test accounts to exercise all three roles.
// DEV ONLY — change or remove before any real deployment.
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db } from './index';
import { users, workers } from './schema';

const DEV_PASSWORD = 'changeme123';

async function main() {
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);

  await db
    .insert(users)
    .values([
      { username: 'admin', passwordHash, displayName: 'ผู้ดูแลระบบ', role: 'admin' },
      { username: 'office', passwordHash, displayName: 'ฝ่ายสำนักงาน', role: 'office' },
    ])
    .onConflictDoNothing();

  const staffNames = ['เปิ้ล', 'นา', 'ข้าง', 'ฮอง'];
  const staffUsernames: Record<string, string> = { เปิ้ล: 'peal', นา: 'na', ข้าง: 'khang', ฮอง: 'hong' };

  for (const name of staffNames) {
    const worker = await db.query.workers.findFirst({ where: eq(workers.name, name) });
    if (!worker) {
      console.warn(`Worker '${name}' not found — run npm run db:seed first. Skipping.`);
      continue;
    }
    await db
      .insert(users)
      .values({
        username: staffUsernames[name],
        passwordHash,
        displayName: name,
        role: 'worker',
        workerId: worker.id,
      })
      .onConflictDoNothing();
  }

  console.log(`Seed complete. Dev accounts use password: ${DEV_PASSWORD}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
