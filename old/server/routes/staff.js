import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM staff ORDER BY name').all());
});

router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });
  db.prepare('INSERT OR IGNORE INTO staff (name) VALUES (?)').run(name.trim());
  res.status(201).json(db.prepare('SELECT * FROM staff WHERE name = ?').get(name.trim()));
});

router.patch('/:id', (req, res) => {
  const { active } = req.body;
  db.prepare('UPDATE staff SET active = ? WHERE id = ?').run(active ? 1 : 0, req.params.id);
  res.json(db.prepare('SELECT * FROM staff WHERE id = ?').get(req.params.id));
});

export default router;
