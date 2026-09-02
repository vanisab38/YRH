// One-time / repeatable import of a monthly "Work Order" xlsx log into the
// work_orders / staff / categories / locations tables.
//
// Expected columns (matches the SawasdeeLife Work Order sheet layout):
//   [No., WO#, Date, Category, Location, Detail, Status, By, ...per-staff X columns]
//
// Usage:
//   npm run import -- ./Work_Order_08.2026.xlsx

import xlsx from 'xlsx';
import { db } from '../server/db.js';

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node scripts/import-xlsx.js <path-to-xlsx>');
  process.exit(1);
}

const workbook = xlsx.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: null });

const getId = (table, col, val) => db.prepare(`SELECT id FROM ${table} WHERE ${col} = ?`).get(val)?.id;
const insertStaff = db.prepare('INSERT OR IGNORE INTO staff (name) VALUES (?)');
const insertCategory = db.prepare('INSERT OR IGNORE INTO categories (name) VALUES (?)');
const insertLocation = db.prepare('INSERT OR IGNORE INTO locations (label, type) VALUES (?, ?)');
const insertWO = db.prepare(
  `INSERT INTO work_orders (wo_number, status, category_id, location_id, detail, reported_date)
   VALUES (?, ?, ?, ?, ?, ?)`
);
const insertAssignee = db.prepare(
  'INSERT OR IGNORE INTO work_order_assignees (work_order_id, staff_id) VALUES (?, ?)'
);

function parseDate(raw) {
  if (typeof raw !== 'string') return null;
  const m = raw.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}

function mapStatus(raw) {
  const v = (raw || '').toString().trim();
  if (v === 'เสร็จ') return 'done';
  if (v === 'ค้าง') return 'in_progress';
  return 'open';
}

function splitAssignees(raw) {
  if (!raw) return [];
  return String(raw)
    .split(/[,\/\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const HEADER_MARKERS = new Set(['WO#', 'Work Orders#', 'No.']);
let imported = 0;
let skipped = 0;

const importAll = db.transaction((allRows) => {
  for (const row of allRows) {
    const [, woNumber, date, category, location, detail, status, by] = row;

    if (woNumber == null || HEADER_MARKERS.has(String(woNumber).trim())) continue;
    if (!detail || !String(detail).trim()) {
      skipped++;
      continue;
    }

    const categoryName = category ? String(category).trim() : 'ไม่ระบุ';
    const locationLabel = location != null ? String(location).trim() : 'ไม่ระบุ';

    insertCategory.run(categoryName);
    insertLocation.run(locationLabel, /^\d+$/.test(locationLabel) ? 'room' : 'other');

    const info = insertWO.run(
      String(woNumber).trim(),
      mapStatus(status),
      getId('categories', 'name', categoryName),
      getId('locations', 'label', locationLabel),
      String(detail).trim(),
      parseDate(date)
    );

    for (const name of splitAssignees(by)) {
      insertStaff.run(name);
      insertAssignee.run(info.lastInsertRowid, getId('staff', 'name', name));
    }

    imported++;
  }
});

importAll(rows);

console.log(`Imported ${imported} work orders from "${sheetName}" (${skipped} rows skipped: no detail).`);
