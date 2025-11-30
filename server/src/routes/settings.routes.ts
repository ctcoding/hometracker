import { Router } from 'express';
import db from '../db.js';

const router = Router();

// GET settings
router.get('/', (req, res) => {
  const settings = db.prepare('SELECT * FROM settings WHERE id = ?').get('main');
  res.json(settings);
});

// PUT update settings
router.put('/', (req, res) => {
  const data = req.body;

  const stmt = db.prepare(`
    UPDATE settings SET
      monthlyPayment = ?,
      warmwasserGrundlast = ?,
      elwaCloudApiKey = ?,
      elwaSerialNumber = ?
    WHERE id = 'main'
  `);

  stmt.run(
    data.monthlyPayment,
    data.warmwasserGrundlast,
    data.elwaCloudApiKey || null,
    data.elwaSerialNumber || null
  );

  res.json({ success: true });
});

export default router;
