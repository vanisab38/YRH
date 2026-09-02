import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM locations ORDER BY label').all());
});

router.post('/', (req, res) => {
  const { label, type } = req.body;
  if (!label || !label.trim()) return res.status(400).json({ error: 'label is required' });
  db.prepare('INSERT OR IGNORE INTO locations (label, type) VALUES (?, ?)').run(
    label.trim(),
    type || 'other'
  );
  res.status(201).json(db.prepare('SELECT * FROM locations WHERE label = ?').get(label.trim()));
});

export default router;
