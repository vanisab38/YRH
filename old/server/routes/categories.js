import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM categories ORDER BY name').all());
});

router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });
  db.prepare('INSERT OR IGNORE INTO categories (name) VALUES (?)').run(name.trim());
  res.status(201).json(db.prepare('SELECT * FROM categories WHERE name = ?').get(name.trim()));
});

export default router;
