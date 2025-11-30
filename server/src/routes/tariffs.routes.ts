import { Router } from 'express';
import db from '../db.js';

const router = Router();

// GET all tariffs
router.get('/', (req, res) => {
  const tariffs = db.prepare('SELECT * FROM tariffs ORDER BY validFrom DESC').all();
  res.json(tariffs);
});

// GET single tariff
router.get('/:id', (req, res) => {
  const tariff = db.prepare('SELECT * FROM tariffs WHERE id = ?').get(req.params.id);
  if (!tariff) return res.status(404).json({ error: 'Not found' });
  res.json(tariff);
});

// POST new tariff
router.post('/', (req, res) => {
  const data = req.body;

  const stmt = db.prepare(`
    INSERT INTO tariffs (
      name, validFrom, validUntil, basePricePerYear, energyPricePerKwh,
      powerPricePerKw, annualPowerKw, taxRate, workingPrice, totalPricePerKwh
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const workingPrice = parseFloat(data.energyPricePerKwh);
  const totalPricePerKwh = workingPrice * (1 + parseFloat(data.taxRate) / 100);

  const result = stmt.run(
    data.name,
    data.validFrom,
    data.validUntil || null,
    data.basePricePerYear,
    data.energyPricePerKwh,
    data.powerPricePerKw,
    data.annualPowerKw,
    data.taxRate,
    workingPrice,
    totalPricePerKwh
  );

  res.json({ id: result.lastInsertRowid });
});

// PUT update tariff
router.put('/:id', (req, res) => {
  const data = req.body;

  const workingPrice = parseFloat(data.energyPricePerKwh);
  const totalPricePerKwh = workingPrice * (1 + parseFloat(data.taxRate) / 100);

  const stmt = db.prepare(`
    UPDATE tariffs SET
      name = ?,
      validFrom = ?,
      validUntil = ?,
      basePricePerYear = ?,
      energyPricePerKwh = ?,
      powerPricePerKw = ?,
      annualPowerKw = ?,
      taxRate = ?,
      workingPrice = ?,
      totalPricePerKwh = ?
    WHERE id = ?
  `);

  stmt.run(
    data.name,
    data.validFrom,
    data.validUntil || null,
    data.basePricePerYear,
    data.energyPricePerKwh,
    data.powerPricePerKw,
    data.annualPowerKw,
    data.taxRate,
    workingPrice,
    totalPricePerKwh,
    req.params.id
  );

  res.json({ success: true });
});

// DELETE tariff
router.delete('/:id', (req, res) => {
  const stmt = db.prepare('DELETE FROM tariffs WHERE id = ?');
  stmt.run(req.params.id);
  res.json({ success: true });
});

export default router;
