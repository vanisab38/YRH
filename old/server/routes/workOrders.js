import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

function getOrCreate(table, column, value) {
  if (value == null || value === '') return null;
  const existing = db.prepare(`SELECT id FROM ${table} WHERE ${column} = ?`).get(value);
  if (existing) return existing.id;
  const info = db.prepare(`INSERT INTO ${table} (${column}) VALUES (?)`).run(value);
  return info.lastInsertRowid;
}

const listSelect = `
  SELECT
    wo.id, wo.wo_number, wo.status, wo.detail, wo.reported_date,
    wo.created_at, wo.updated_at,
    c.id as category_id, c.name as category_name,
    l.id as location_id, l.label as location_label,
    (
      SELECT group_concat(s.name, ', ')
      FROM work_order_assignees woa
      JOIN staff s ON s.id = woa.staff_id
      WHERE woa.work_order_id = wo.id
    ) as assignees
  FROM work_orders wo
  LEFT JOIN categories c ON c.id = wo.category_id
  LEFT JOIN locations l ON l.id = wo.location_id
`;

function getOne(id) {
  return db.prepare(`${listSelect} WHERE wo.id = ?`).get(id);
}

function assignStaff(woId, names) {
  db.prepare('DELETE FROM work_order_assignees WHERE work_order_id = ?').run(woId);
  if (!Array.isArray(names)) return;
  const insert = db.prepare(
    'INSERT OR IGNORE INTO work_order_assignees (work_order_id, staff_id) VALUES (?, ?)'
  );
  for (const name of names) {
    const staffId = getOrCreate('staff', 'name', name);
    if (staffId) insert.run(woId, staffId);
  }
}

router.get('/', (req, res) => {
  const { status, category, location, staff, q } = req.query;
  const clauses = [];
  const params = [];

  if (status) {
    clauses.push('wo.status = ?');
    params.push(status);
  }
  if (category) {
    clauses.push('c.name = ?');
    params.push(category);
  }
  if (location) {
    clauses.push('l.label = ?');
    params.push(location);
  }
  if (q) {
    clauses.push('wo.detail LIKE ?');
    params.push(`%${q}%`);
  }
  if (staff) {
    clauses.push(`wo.id IN (
      SELECT woa.work_order_id FROM work_order_assignees woa
      JOIN staff s ON s.id = woa.staff_id WHERE s.name = ?
    )`);
    params.push(staff);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = db.prepare(`${listSelect} ${where} ORDER BY wo.created_at DESC`).all(...params);
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const row = getOne(req.params.id);
  if (!row) return res.status(404).json({ error: 'not found' });
  res.json(row);
});

router.post('/', (req, res) => {
  const { category, location, detail, reported_date, status, assignees, wo_number } = req.body;
  if (!detail || !detail.trim()) {
    return res.status(400).json({ error: 'detail is required' });
  }

  const category_id = getOrCreate('categories', 'name', category);
  const location_id = getOrCreate('locations', 'label', location);

  const info = db
    .prepare(
      `INSERT INTO work_orders (wo_number, status, category_id, location_id, detail, reported_date)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(wo_number || null, status || 'open', category_id, location_id, detail.trim(), reported_date || null);

  const woId = info.lastInsertRowid;
  assignStaff(woId, assignees);

  res.status(201).json(getOne(woId));
});

router.patch('/:id', (req, res) => {
  const id = req.params.id;
  const existing = getOne(id);
  if (!existing) return res.status(404).json({ error: 'not found' });

  const { category, location, detail, reported_date, status, assignees, wo_number } = req.body;
  const category_id =
    category !== undefined ? getOrCreate('categories', 'name', category) : existing.category_id;
  const location_id =
    location !== undefined ? getOrCreate('locations', 'label', location) : existing.location_id;

  db.prepare(
    `UPDATE work_orders SET
       wo_number = ?, status = ?, category_id = ?, location_id = ?,
       detail = ?, reported_date = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    wo_number !== undefined ? wo_number : existing.wo_number,
    status !== undefined ? status : existing.status,
    category_id,
    location_id,
    detail !== undefined ? detail.trim() : existing.detail,
    reported_date !== undefined ? reported_date : existing.reported_date,
    id
  );

  if (assignees !== undefined) assignStaff(id, assignees);

  res.json(getOne(id));
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM work_orders WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'not found' });
  res.status(204).end();
});

router.get('/:id/notes', (req, res) => {
  const notes = db
    .prepare(
      `SELECT won.id, won.note, won.created_at, s.name as staff_name
       FROM work_order_notes won
       LEFT JOIN staff s ON s.id = won.staff_id
       WHERE won.work_order_id = ?
       ORDER BY won.created_at DESC`
    )
    .all(req.params.id);
  res.json(notes);
});

router.post('/:id/notes', (req, res) => {
  const { note, staff } = req.body;
  if (!note || !note.trim()) return res.status(400).json({ error: 'note is required' });
  const staffId = staff ? getOrCreate('staff', 'name', staff) : null;
  db.prepare('INSERT INTO work_order_notes (work_order_id, staff_id, note) VALUES (?, ?, ?)').run(
    req.params.id,
    staffId,
    note.trim()
  );
  const notes = db
    .prepare(
      `SELECT won.id, won.note, won.created_at, s.name as staff_name
       FROM work_order_notes won
       LEFT JOIN staff s ON s.id = won.staff_id
       WHERE won.work_order_id = ?
       ORDER BY won.created_at DESC`
    )
    .all(req.params.id);
  res.status(201).json(notes);
});

export default router;
