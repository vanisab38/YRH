// Phase 1 seed (§8): workers, all 22 categories, category groups, locations
// seen in the August sheet, and the one system user the import script needs.
// Re-runnable: every insert is keyed off a natural unique column and upserts.
import { db } from './index';
import { workers, categories, categoryGroups, locations, users } from './schema';
import { sql } from 'drizzle-orm';

async function main() {
  // --- system user for the import script (§6 step 11), created first so
  // every other write in this script can be attributed to it — the audit
  // trigger (migration 0004) requires app.current_user_id to be set before
  // any write to categories/work_orders/wo_log_entries. is_local=false
  // (session-scoped, not transaction-scoped) since this script isn't a
  // pooled web request — it's fine to hold for the script's one connection.
  const [importedUser] = await db
    .insert(users)
    .values({
      username: 'imported',
      passwordHash: '!', // never a valid bcrypt hash — this account cannot log in
      // §3.5: "the system user's display name is English inside a Thai
      // sentence" (บันทึกโดย Imported from Excel, shown throughout the app).
      displayName: 'นำเข้าจาก Excel',
      role: 'admin',
      isActive: false,
    })
    .onConflictDoUpdate({ target: users.username, set: { displayName: sql`excluded.display_name` } })
    .returning({ id: users.id });

  await db.execute(sql`select set_config('app.current_user_id', ${importedUser.id}, false)`);

  // --- category_groups (§2 category_groups) ---------------------------------
  const groupRows = await db
    .insert(categoryGroups)
    .values([
      { nameTh: 'แอร์', sortOrder: 1 },
      { nameTh: 'ไฟฟ้า', sortOrder: 2 },
      { nameTh: 'ไอที', sortOrder: 3 },
    ])
    .onConflictDoUpdate({
      target: categoryGroups.nameTh,
      set: { nameTh: sql`excluded.name_th` },
    })
    .returning();
  const groupIdByName = Object.fromEntries(groupRows.map((g) => [g.nameTh, g.id]));

  // --- categories (§2 categories seed table) ---------------------------------
  const categoryRows: {
    nameTh: string;
    isSpecial: boolean;
    colour: string | null;
    group: string | null;
    isActive: boolean;
    sortOrder: number;
  }[] = [
    { nameTh: 'เฟอร์นิเจอร์', isSpecial: false, colour: null, group: null, isActive: true, sortOrder: 1 },
    { nameTh: 'งานประจำ', isSpecial: false, colour: null, group: null, isActive: true, sortOrder: 2 },
    { nameTh: 'ประปา', isSpecial: false, colour: null, group: null, isActive: true, sortOrder: 3 },
    { nameTh: 'รีโนเวท', isSpecial: false, colour: null, group: null, isActive: true, sortOrder: 4 },
    { nameTh: 'แอร์', isSpecial: true, colour: '#00B0F0', group: 'แอร์', isActive: true, sortOrder: 5 },
    { nameTh: 'โปรเจค', isSpecial: true, colour: '#FFC000', group: null, isActive: true, sortOrder: 6 },
    { nameTh: 'ไฟฟ้า', isSpecial: false, colour: null, group: 'ไฟฟ้า', isActive: true, sortOrder: 7 },
    { nameTh: 'ยาแนว', isSpecial: true, colour: '#00B050', group: null, isActive: true, sortOrder: 8 },
    { nameTh: 'หลอดไฟ', isSpecial: false, colour: null, group: 'ไฟฟ้า', isActive: true, sortOrder: 9 },
    { nameTh: 'ทีวี', isSpecial: false, colour: null, group: 'ไอที', isActive: true, sortOrder: 10 },
    { nameTh: 'IT', isSpecial: false, colour: null, group: 'ไอที', isActive: true, sortOrder: 11 },
    { nameTh: 'ไอที', isSpecial: false, colour: null, group: 'ไอที', isActive: true, sortOrder: 12 },
    { nameTh: 'คอนคอร์ด', isSpecial: false, colour: null, group: null, isActive: true, sortOrder: 13 },
    { nameTh: 'ห้องน้ำคนขับรถ', isSpecial: false, colour: null, group: null, isActive: true, sortOrder: 14 },
    // ล้างแอร์: zero work orders after import — WO 2608007 is miscategorised
    // and moves to งานประจำ (§2, §6 step 12). Seeded inactive so it never
    // appears in a dropdown but the name stays on record.
    { nameTh: 'ล้างแอร์', isSpecial: false, colour: null, group: 'แอร์', isActive: false, sortOrder: 15 },
    { nameTh: 'เช็คแอร์', isSpecial: false, colour: null, group: 'แอร์', isActive: true, sortOrder: 16 },
    { nameTh: 'แอร์ตัวที่3', isSpecial: false, colour: null, group: 'แอร์', isActive: true, sortOrder: 17 },
    { nameTh: 'อาคาร', isSpecial: false, colour: null, group: null, isActive: true, sortOrder: 18 },
    { nameTh: 'ไวไฟ', isSpecial: false, colour: null, group: 'ไอที', isActive: true, sortOrder: 19 },
    { nameTh: 'ตู้เย็น', isSpecial: false, colour: null, group: null, isActive: true, sortOrder: 20 },
    { nameTh: 'เครื่องซักผ้า', isSpecial: false, colour: null, group: null, isActive: true, sortOrder: 21 },
    // Looks like a keying mistake (a status value in the category column).
    // Imported as-is per §2 so nothing is lost; deactivate from admin if unwanted.
    { nameTh: 'Class', isSpecial: false, colour: null, group: null, isActive: true, sortOrder: 22 },
  ];

  await db
    .insert(categories)
    .values(
      categoryRows.map((c) => ({
        nameTh: c.nameTh,
        groupId: c.group ? groupIdByName[c.group] : null,
        isSpecial: c.isSpecial,
        colour: c.colour,
        isActive: c.isActive,
        sortOrder: c.sortOrder,
      }))
    )
    .onConflictDoUpdate({
      target: categories.nameTh,
      set: {
        groupId: sql`excluded.group_id`,
        isSpecial: sql`excluded.is_special`,
        colour: sql`excluded.colour`,
        isActive: sql`excluded.is_active`,
        sortOrder: sql`excluded.sort_order`,
      },
    });

  // --- workers (§2 workers seed) ---------------------------------------------
  // §3.5 (workers section): the By column in the spreadsheet mixed "who did
  // the work" with "what the job is waiting on" — รอสี ("waiting for
  // paint") and จัดซื้อ ("purchasing") are blocking reasons, not people, so
  // they're seeded inactive: history stays intact, but they no longer show
  // up as tappable "who worked on this" chips inviting staff to record a
  // blocking reason as if it were a worker. Chips render staff-first by
  // sort_order since staff are tapped many times a day, contractors a few
  // times a month.
  await db
    .insert(workers)
    .values([
      { name: 'เปิ้ล', type: 'staff', isActive: true, sortOrder: 1 },
      { name: 'นา', type: 'staff', isActive: true, sortOrder: 2 },
      { name: 'ข้าง', type: 'staff', isActive: true, sortOrder: 3 },
      { name: 'ฮอง', type: 'staff', isActive: true, sortOrder: 4 },
      { name: 'ช่างมิตซูบิชิ', type: 'contractor', isActive: true, sortOrder: 5 },
      { name: 'OutSource', type: 'contractor', isActive: true, sortOrder: 6 },
      { name: 'จัดซื้อ', type: 'other', isActive: false, sortOrder: 7 },
      { name: 'รอสี', type: 'other', isActive: false, sortOrder: 8 },
    ])
    .onConflictDoUpdate({
      target: workers.name,
      set: { type: sql`excluded.type`, isActive: sql`excluded.is_active`, sortOrder: sql`excluded.sort_order` },
    });

  // --- locations seen in the August sheet (§6 step 10, incl. near-dupes) -----
  // Room codes follow FFRR (§2 locations) — floor parsed here; leave null for
  // common areas. Near-duplicate spellings are imported as separate rows,
  // same as the import script will do, so this seed and the import agree.
  const roomCodes = [
    '906', '1408', '1208', '605', '1107', '1508', '608', '805', '903', '1009',
    '1507', '1402', '1403', '603', '1407', '905', '1405', '501', '508',
  ];
  const parseFloor = (code: string) => {
    if (code.length === 3) return parseInt(code.slice(0, 1), 10);
    if (code.length === 4) return parseInt(code.slice(0, 2), 10);
    return null;
  };

  const locationRows: { code: string; type: 'room' | 'common' | 'external'; floor: number | null }[] = [
    ...roomCodes.map((code) => ({ code, type: 'room' as const, floor: parseFloor(code) })),
    { code: 'สวนชั้น5', type: 'common', floor: 5 },
    { code: 'ห้องอาหาร', type: 'common', floor: null },
    { code: 'ล็อบบี้', type: 'common', floor: null },
    { code: 'Lobby', type: 'common', floor: null },
    { code: 'ห้องน้ำคนขับ', type: 'common', floor: null },
    { code: 'ห้องน้ำคนขับรถ', type: 'common', floor: null },
    { code: 'ห้องน้ำชายล็อบบี้', type: 'common', floor: null },
    { code: 'หน้าตึก/ร้านอาหาร', type: 'common', floor: null },
    { code: 'ดาดฟ้าชั้น 16', type: 'common', floor: 16 },
    { code: 'ชั้น8ฝั่ง805', type: 'common', floor: 8 },
    { code: 'คอนคอร์ด', type: 'external', floor: null },
  ];

  await db.insert(locations).values(locationRows).onConflictDoNothing();

  console.log('Seed complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
