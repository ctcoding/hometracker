import { Router } from 'express';
import db from '../db.js';
import { elwaScheduler } from '../elwa-scheduler.js';

const router = Router();

// GET all ELWA readings
router.get('/', (req, res) => {
  const readings = db.prepare('SELECT * FROM elwaReadings ORDER BY date DESC').all();
  res.json(readings);
});

// GET ELWA monthly data with savings
router.get('/monthly', (req, res) => {
  const elwa = db.prepare('SELECT * FROM elwaReadings ORDER BY date ASC').all() as any[];
  const tariffs = db.prepare('SELECT * FROM tariffs ORDER BY validFrom ASC').all() as any[];

  const result = elwa.map(e => {
    const tariff = tariffs
      .filter(t => t.validFrom <= e.date && (!t.validUntil || t.validUntil >= e.date))
      .sort((a, b) => b.validFrom.localeCompare(a.validFrom))[0];

    const pricePerKwh = tariff?.totalPricePerKwh || 0.12;
    const savings = e.energyKwh * pricePerKwh;

    return {
      ...e,
      month: e.date.substring(0, 7),
      savings: Math.round(savings * 100) / 100,
      pricePerKwh: Math.round(pricePerKwh * 10000) / 10000,
    };
  });

  res.json(result);
});

// POST import yesterday's data
router.post('/import-yesterday', async (req, res) => {
  const result = await elwaScheduler.importYesterdayData();
  res.json(result);
});

// POST import date range
router.post('/import-range', async (req, res) => {
  const { startDate, endDate } = req.body;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate and endDate required' });
  }

  const result = await elwaScheduler.importDateRange(startDate, endDate);
  res.json(result);
});

// GET scheduler status
router.get('/status', (req, res) => {
  const status = elwaScheduler.getStatus();
  res.json(status);
});

export default router;
