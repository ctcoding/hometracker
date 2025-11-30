import { Router } from 'express';
import db from '../db.js';

const router = Router();

// Helper function to parse reading data
function parseReading(row: any) {
  return {
    ...row,
    meterValue: parseFloat(row.meterValue) || 0,
    consumption: parseFloat(row.consumption) || 0,
    consumptionPerDay: parseFloat(row.consumptionPerDay) || 0,
    costSinceLastReading: parseFloat(row.costSinceLastReading) || 0,
    meterPhoto: row.meterPhoto || null,
  };
}

// GET all readings
router.get('/', (req, res) => {
  const readings = db.prepare('SELECT * FROM readings ORDER BY timestamp DESC').all();
  res.json(readings.map(parseReading));
});

// GET single reading
router.get('/:id', (req, res) => {
  const reading = db.prepare('SELECT * FROM readings WHERE id = ?').get(req.params.id);
  if (!reading) return res.status(404).json({ error: 'Not found' });
  res.json(parseReading(reading));
});

// POST new reading
router.post('/', (req, res) => {
  const data = req.body;

  // Get previous reading for calculations
  const prev = db.prepare('SELECT * FROM readings WHERE timestamp < ? ORDER BY timestamp DESC LIMIT 1')
    .get(data.timestamp) as any;

  let consumption, hoursSinceLastReading, daysSinceLastReading, consumptionPerDay, costSinceLastReading;

  if (prev) {
    consumption = data.meterValue - prev.meterValue;
    const timeDiff = new Date(data.timestamp).getTime() - new Date(prev.timestamp).getTime();
    hoursSinceLastReading = Math.round(timeDiff / (1000 * 60 * 60));
    daysSinceLastReading = timeDiff / (1000 * 60 * 60 * 24);
    consumptionPerDay = daysSinceLastReading > 0 ? consumption / daysSinceLastReading : 0;

    // Get tariff for cost calculation
    const tariff = db.prepare(`
      SELECT * FROM tariffs
      WHERE validFrom <= ? AND (validUntil IS NULL OR validUntil >= ?)
      ORDER BY validFrom DESC LIMIT 1
    `).get(data.timestamp, data.timestamp) as any;

    if (tariff && consumption > 0) {
      const pricePerKwh = tariff.totalPricePerKwh || tariff.workingPrice;
      costSinceLastReading = Math.round(consumption * pricePerKwh * 100) / 100;
    }
  }

  const stmt = db.prepare(`
    INSERT INTO readings (
      timestamp, meterValue, notes, meterPhoto, energyKwh,
      consumption, hoursSinceLastReading, daysSinceLastReading,
      consumptionPerDay, costSinceLastReading
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    data.timestamp,
    data.meterValue,
    data.notes || null,
    data.meterPhoto || null,
    data.meterValue,
    consumption || 0,
    hoursSinceLastReading || 0,
    daysSinceLastReading || 0,
    consumptionPerDay || 0,
    costSinceLastReading || 0
  );

  res.json({ id: result.lastInsertRowid });
});

// PUT update reading
router.put('/:id', (req, res) => {
  const stmt = db.prepare('UPDATE readings SET notes = ? WHERE id = ?');
  stmt.run(req.body.notes, req.params.id);
  res.json({ success: true });
});

// DELETE reading
router.delete('/:id', (req, res) => {
  const stmt = db.prepare('DELETE FROM readings WHERE id = ?');
  stmt.run(req.params.id);
  res.json({ success: true });
});

export default router;
