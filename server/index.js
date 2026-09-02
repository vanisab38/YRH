import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import './db.js';
import workOrdersRouter from './routes/workOrders.js';
import staffRouter from './routes/staff.js';
import categoriesRouter from './routes/categories.js';
import locationsRouter from './routes/locations.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/work-orders', workOrdersRouter);
app.use('/api/staff', staffRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/locations', locationsRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Work order server running on http://localhost:${PORT}`);
});
