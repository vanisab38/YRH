import { db } from './db.js';

const staff = ['เปิ้ล', 'นา', 'ข้าง', 'ฮอง'];
const categories = ['ไฟฟ้า', 'ประปา', 'แอร์', 'เฟอร์นิเจอร์', 'รีโนเวท', 'งานประจำ', 'ไอที', 'ทีวี'];
const locations = [
  { label: '1408', type: 'room' },
  { label: '906', type: 'room' },
  { label: '801', type: 'room' },
  { label: 'ชั้น5', type: 'floor' },
  { label: 'ล็อบบี้', type: 'common_area' },
  { label: 'ห้องครัว', type: 'common_area' },
];

const insertStaff = db.prepare('INSERT OR IGNORE INTO staff (name) VALUES (?)');
for (const name of staff) insertStaff.run(name);

const insertCategory = db.prepare('INSERT OR IGNORE INTO categories (name) VALUES (?)');
for (const name of categories) insertCategory.run(name);

const insertLocation = db.prepare('INSERT OR IGNORE INTO locations (label, type) VALUES (?, ?)');
for (const loc of locations) insertLocation.run(loc.label, loc.type);

const sample = [
  {
    wo_number: '2608001',
    category: 'งานประจำ',
    location: 'ชั้น5',
    detail: 'กวาดใบไม้รดน้ำต้นไม้สวนชั้น5ช่วง7ถึง8โมงเช้า',
    status: 'done',
    reported_date: '2026-07-26',
    assignees: ['ข้าง'],
  },
  {
    wo_number: '2608002',
    category: 'ไฟฟ้า',
    location: 'ห้องครัว',
    detail: 'ซ่อมตู้แช่ห้องครัว',
    status: 'done',
    reported_date: '2026-07-26',
    assignees: ['นา'],
  },
  {
    wo_number: '2608006',
    category: 'ประปา',
    location: '906',
    detail: 'ยาแนวห้องน้ำ',
    status: 'in_progress',
    reported_date: '2026-07-27',
    assignees: ['ข้าง'],
  },
  {
    wo_number: '2608008',
    category: 'เฟอร์นิเจอร์',
    location: '801',
    detail: 'ซ่อมฝ้าห้องนั่งเล่น',
    status: 'open',
    reported_date: '2026-07-27',
    assignees: [],
  },
];

const getId = (table, col, val) => db.prepare(`SELECT id FROM ${table} WHERE ${col} = ?`).get(val)?.id;
const insertWO = db.prepare(
  `INSERT INTO work_orders (wo_number, status, category_id, location_id, detail, reported_date)
   VALUES (?, ?, ?, ?, ?, ?)`
);
const insertAssignee = db.prepare(
  'INSERT OR IGNORE INTO work_order_assignees (work_order_id, staff_id) VALUES (?, ?)'
);

for (const row of sample) {
  const info = insertWO.run(
    row.wo_number,
    row.status,
    getId('categories', 'name', row.category),
    getId('locations', 'label', row.location),
    row.detail,
    row.reported_date
  );
  for (const name of row.assignees) {
    insertAssignee.run(info.lastInsertRowid, getId('staff', 'name', name));
  }
}

console.log('Seed complete: 4 sample work orders, 4 staff, 8 categories, 6 locations.');
