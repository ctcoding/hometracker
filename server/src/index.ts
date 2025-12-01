import express from 'express';
import cors from 'cors';
import db from './db.js';
import { elwaScheduler } from './elwa-scheduler.js';

const app = express();
const PORT = 3331;

app.use(cors());
app.use(express.json());

// ===== READINGS =====
app.get('/api/readings', (req, res) => {
  const readings = db.prepare('SELECT * FROM readings ORDER BY timestamp DESC').all();
  res.json(readings.map(parseReading));
});

app.get('/api/readings/:id', (req, res) => {
  const reading = db.prepare('SELECT * FROM readings WHERE id = ?').get(req.params.id);
  if (!reading) return res.status(404).json({ error: 'Not found' });
  res.json(parseReading(reading));
});

app.post('/api/readings', (req, res) => {
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
      timestamp, meterValue, unit, outdoorTempCurrent, outdoorTempNightAvg,
      weatherCondition, brightnessAvg, consumption, hoursSinceLastReading,
      daysSinceLastReading, consumptionPerDay, costSinceLastReading,
      source, ocrConfidence, notes, imageData, synced
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    data.timestamp,
    data.meterValue,
    data.unit || 'kWh',
    data.outdoorTempCurrent,
    data.outdoorTempNightAvg,
    data.weatherCondition,
    data.brightnessAvg,
    consumption,
    hoursSinceLastReading,
    daysSinceLastReading ? Math.round(daysSinceLastReading) : null,
    consumptionPerDay ? Math.round(consumptionPerDay * 100) / 100 : null,
    costSinceLastReading,
    data.source || 'manual',
    data.ocrConfidence,
    data.notes,
    data.imageData,
    data.synced ? 1 : 0
  );

  res.json({ id: result.lastInsertRowid });
});

app.put('/api/readings/:id', (req, res) => {
  const data = req.body;
  const stmt = db.prepare(`
    UPDATE readings SET
      timestamp = COALESCE(?, timestamp),
      meterValue = COALESCE(?, meterValue),
      notes = COALESCE(?, notes),
      synced = COALESCE(?, synced)
    WHERE id = ?
  `);
  stmt.run(data.timestamp, data.meterValue, data.notes, data.synced ? 1 : 0, req.params.id);
  res.json({ success: true });
});

app.delete('/api/readings/:id', (req, res) => {
  db.prepare('DELETE FROM readings WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ===== SETTINGS =====
app.get('/api/settings', (req, res) => {
  const settings = db.prepare('SELECT * FROM settings WHERE id = ?').get('main') as any;
  if (settings?.brightnessSensorEntities) {
    try {
      settings.brightnessSensorEntities = JSON.parse(settings.brightnessSensorEntities);
    } catch { settings.brightnessSensorEntities = []; }
  }
  res.json(settings || {});
});

app.put('/api/settings', (req, res) => {
  const data = req.body;
  const brightnessSensorsJson = data.brightnessSensorEntities
    ? JSON.stringify(data.brightnessSensorEntities)
    : null;

  const stmt = db.prepare(`
    UPDATE settings SET
      homeAssistantUrl = COALESCE(?, homeAssistantUrl),
      homeAssistantToken = COALESCE(?, homeAssistantToken),
      temperatureSensorEntity = COALESCE(?, temperatureSensorEntity),
      indoorTempSensorEntity = COALESCE(?, indoorTempSensorEntity),
      brightnessSensorEntities = COALESCE(?, brightnessSensorEntities),
      elwaPowerSensorEntity = ?,
      elwaWaterTempBottomEntity = ?,
      elwaWaterTempTopEntity = ?,
      elwaCloudApiKey = ?,
      elwaSerialNumber = ?,
      reminderIntervalDays = COALESCE(?, reminderIntervalDays),
      reminderEnabled = COALESCE(?, reminderEnabled),
      pricePerMWh = COALESCE(?, pricePerMWh),
      targetConsumptionMonthly = ?,
      targetConsumptionYearly = ?
    WHERE id = 'main'
  `);
  stmt.run(
    data.homeAssistantUrl,
    data.homeAssistantToken,
    data.temperatureSensorEntity,
    data.indoorTempSensorEntity,
    brightnessSensorsJson,
    data.elwaPowerSensorEntity || null,
    data.elwaWaterTempBottomEntity || null,
    data.elwaWaterTempTopEntity || null,
    data.elwaCloudApiKey || null,
    data.elwaSerialNumber || null,
    data.reminderIntervalDays,
    data.reminderEnabled ? 1 : 0,
    data.pricePerMWh,
    data.targetConsumptionMonthly || null,
    data.targetConsumptionYearly || null
  );
  res.json({ success: true });
});

// ===== TARIFFS =====
app.get('/api/tariffs', (req, res) => {
  const tariffs = db.prepare('SELECT * FROM tariffs ORDER BY validFrom DESC').all();
  res.json(tariffs.map(parseTariff));
});

app.post('/api/tariffs', (req, res) => {
  const data = req.body;
  const totalPricePerKwh = data.workingPrice + (data.co2Price || 0) + (data.gasLevy || 0);
  const fixedMonthly = (data.basePrice + (data.meteringPrice || 0)) / 12;

  const stmt = db.prepare(`
    INSERT INTO tariffs (
      name, provider, validFrom, validUntil, workingPrice, basePrice,
      co2Price, gasLevy, meteringPrice, totalPricePerKwh, fixedMonthly, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    data.name, data.provider, data.validFrom, data.validUntil,
    data.workingPrice, data.basePrice, data.co2Price || 0,
    data.gasLevy || 0, data.meteringPrice || 0, totalPricePerKwh, fixedMonthly, data.notes
  );

  res.json({ id: result.lastInsertRowid });
});

app.put('/api/tariffs/:id', (req, res) => {
  const data = req.body;
  const totalPricePerKwh = (data.workingPrice || 0) + (data.co2Price || 0) + (data.gasLevy || 0);
  const fixedMonthly = ((data.basePrice || 0) + (data.meteringPrice || 0)) / 12;

  const stmt = db.prepare(`
    UPDATE tariffs SET
      name = COALESCE(?, name),
      provider = COALESCE(?, provider),
      validFrom = COALESCE(?, validFrom),
      validUntil = ?,
      workingPrice = COALESCE(?, workingPrice),
      basePrice = COALESCE(?, basePrice),
      co2Price = COALESCE(?, co2Price),
      gasLevy = COALESCE(?, gasLevy),
      meteringPrice = COALESCE(?, meteringPrice),
      totalPricePerKwh = ?,
      fixedMonthly = ?,
      notes = ?
    WHERE id = ?
  `);

  stmt.run(
    data.name, data.provider, data.validFrom, data.validUntil,
    data.workingPrice, data.basePrice, data.co2Price, data.gasLevy,
    data.meteringPrice, totalPricePerKwh, fixedMonthly, data.notes, req.params.id
  );

  res.json({ success: true });
});

app.delete('/api/tariffs/:id', (req, res) => {
  db.prepare('DELETE FROM tariffs WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ===== PAYMENTS =====
app.get('/api/payments', (req, res) => {
  const payments = db.prepare('SELECT * FROM payments ORDER BY date DESC').all();
  res.json(payments.map(parsePayment));
});

app.post('/api/payments', (req, res) => {
  const data = req.body;
  const description = data.notes || data.description;
  const stmt = db.prepare(`
    INSERT INTO payments (date, amount, type, description, invoiceNumber)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(data.date, data.amount, data.type, description, data.invoiceNumber);
  res.json({ id: result.lastInsertRowid });
});

app.put('/api/payments/:id', (req, res) => {
  const data = req.body;
  const description = data.notes || data.description;
  const stmt = db.prepare(`
    UPDATE payments SET
      date = COALESCE(?, date),
      amount = COALESCE(?, amount),
      type = COALESCE(?, type),
      description = ?,
      invoiceNumber = ?
    WHERE id = ?
  `);
  stmt.run(data.date, data.amount, data.type, description, data.invoiceNumber, req.params.id);
  res.json({ success: true });
});

app.delete('/api/payments/:id', (req, res) => {
  db.prepare('DELETE FROM payments WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ===== ADVANCE PAYMENTS =====
app.get('/api/advance-payments', (req, res) => {
  const payments = db.prepare('SELECT * FROM advancePayments ORDER BY validFrom DESC').all();
  res.json(payments.map(parseAdvancePayment));
});

app.post('/api/advance-payments', (req, res) => {
  const data = req.body;
  const amount = data.monthlyAmount || data.amount;
  const stmt = db.prepare(`
    INSERT INTO advancePayments (amount, validFrom, validUntil, notes)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(amount, data.validFrom, data.validUntil, data.notes);
  res.json({ id: result.lastInsertRowid });
});

app.put('/api/advance-payments/:id', (req, res) => {
  const data = req.body;
  const amount = data.monthlyAmount || data.amount;
  const stmt = db.prepare(`
    UPDATE advancePayments SET
      amount = COALESCE(?, amount),
      validFrom = COALESCE(?, validFrom),
      validUntil = ?,
      notes = ?
    WHERE id = ?
  `);
  stmt.run(amount, data.validFrom, data.validUntil, data.notes, req.params.id);
  res.json({ success: true });
});

app.delete('/api/advance-payments/:id', (req, res) => {
  db.prepare('DELETE FROM advancePayments WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ===== MONTHLY STATS =====
app.get('/api/monthly-stats', (req, res) => {
  const readings = db.prepare('SELECT * FROM readings ORDER BY timestamp ASC').all() as any[];
  const tariffs = db.prepare('SELECT * FROM tariffs').all() as any[];
  const payments = db.prepare('SELECT * FROM payments').all() as any[];
  const advancePayments = db.prepare('SELECT * FROM advancePayments').all() as any[];

  if (readings.length === 0) {
    return res.json([]);
  }

  // Group readings by month
  const monthlyData: Record<string, any> = {};

  for (const reading of readings) {
    const date = new Date(reading.timestamp);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!monthlyData[key]) {
      monthlyData[key] = {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        readings: [],
        payments: [],
      };
    }
    monthlyData[key].readings.push(reading);
  }

  // Add payments to months
  for (const payment of payments) {
    const date = new Date(payment.date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (monthlyData[key]) {
      monthlyData[key].payments.push(payment);
    }
  }

  // Calculate stats for each month
  const stats = Object.values(monthlyData).map((m: any) => {
    const sortedReadings = m.readings.sort((a: any, b: any) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const startReading = sortedReadings[0]?.meterValue;
    const endReading = sortedReadings[sortedReadings.length - 1]?.meterValue;
    const consumption = endReading && startReading ? endReading - startReading : 0;
    const daysInMonth = new Date(m.year, m.month, 0).getDate();
    const consumptionPerDay = consumption / daysInMonth;

    // Find applicable tariff
    const monthDate = new Date(m.year, m.month - 1, 15);
    const tariff = tariffs.find((t: any) => {
      const from = new Date(t.validFrom);
      const until = t.validUntil ? new Date(t.validUntil) : new Date('2099-12-31');
      return monthDate >= from && monthDate <= until;
    });

    const pricePerKwh = tariff?.totalPricePerKwh || tariff?.workingPrice || 0;
    const fixedMonthly = tariff?.fixedMonthly || 0;
    const calculatedCost = (consumption * pricePerKwh) + fixedMonthly;

    // Only use actual payments from the payments table
    const paidAdvances = m.payments.reduce((sum: number, p: any) => sum + p.amount, 0);
    const balance = paidAdvances - calculatedCost;

    return {
      year: m.year,
      month: m.month,
      startReading,
      endReading,
      consumption: Math.round(consumption),
      consumptionPerDay: Math.round(consumptionPerDay * 10) / 10,
      calculatedCost: Math.round(calculatedCost * 100) / 100,
      paidAdvances: Math.round(paidAdvances * 100) / 100,
      balance: Math.round(balance * 100) / 100,
    };
  });

  // Sort by date descending
  stats.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });

  res.json(stats);
});

// ===== BALANCE / KONTOSTAND =====
app.get('/api/balance', (req, res) => {
  const readings = db.prepare('SELECT * FROM readings ORDER BY timestamp ASC').all() as any[];
  const tariffs = db.prepare('SELECT * FROM tariffs ORDER BY validFrom ASC').all() as any[];
  const payments = db.prepare('SELECT * FROM payments ORDER BY date ASC').all() as any[];

  if (readings.length < 2) {
    return res.json({
      totalCost: 0,
      totalPayments: 0,
      balance: 0,
      monthlyBreakdown: [],
    });
  }

  // Calculate costs per month based on consumption and tariffs
  const monthlyBreakdown: any[] = [];
  let totalCost = 0;
  let totalPayments = 0;

  // Group readings by month
  const monthlyReadings: Record<string, any[]> = {};
  for (const r of readings) {
    const d = new Date(r.timestamp);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyReadings[key]) monthlyReadings[key] = [];
    monthlyReadings[key].push(r);
  }

  // Calculate monthly costs
  const sortedMonths = Object.keys(monthlyReadings).sort();
  let prevMonthEndValue: number | null = null;
  let prevMonthEndTimestamp: Date | null = null;

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  for (const month of sortedMonths) {
    const monthReadings = monthlyReadings[month].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const startValue = prevMonthEndValue ?? monthReadings[0].meterValue;
    const endValue = monthReadings[monthReadings.length - 1].meterValue;
    let consumption = endValue - startValue;
    let isProjected = false;

    // For current month: extrapolate to end of month
    if (month === currentMonthKey && consumption > 0) {
      const [year, monthNum] = month.split('-').map(Number);
      const daysInMonth = new Date(year, monthNum, 0).getDate();
      const firstReadingDate = new Date(monthReadings[0].timestamp);
      const lastReadingDate = new Date(monthReadings[monthReadings.length - 1].timestamp);

      // Use the timestamp of the previous month's last reading if available
      const startTimestamp = prevMonthEndTimestamp ?? firstReadingDate;
      const daysCovered = (lastReadingDate.getTime() - startTimestamp.getTime()) / (1000 * 60 * 60 * 24);

      if (daysCovered > 0 && daysCovered < daysInMonth) {
        const dailyRate = consumption / daysCovered;
        consumption = dailyRate * daysInMonth;
        isProjected = true;
      }
    }

    prevMonthEndValue = endValue;
    prevMonthEndTimestamp = new Date(monthReadings[monthReadings.length - 1].timestamp);

    // Find tariff for this month (middle of month)
    const [year, monthNum] = month.split('-').map(Number);
    const monthDate = new Date(year, monthNum - 1, 15);
    let tariff = tariffs.find((t: any) => {
      const from = new Date(t.validFrom);
      const until = t.validUntil ? new Date(t.validUntil) : new Date('2099-12-31');
      return monthDate >= from && monthDate <= until;
    });
    // Fallback: find closest tariff by validFrom date
    if (!tariff && tariffs.length > 0) {
      tariff = tariffs.reduce((closest: any, t: any) => {
        const tFrom = new Date(t.validFrom).getTime();
        const closestFrom = new Date(closest.validFrom).getTime();
        const monthTime = monthDate.getTime();
        return Math.abs(tFrom - monthTime) < Math.abs(closestFrom - monthTime) ? t : closest;
      });
    }

    const pricePerKwh = tariff?.totalPricePerKwh || tariff?.workingPrice || 0;
    const fixedMonthly = tariff?.fixedMonthly || 0;
    const cost = (consumption * pricePerKwh) + fixedMonthly;
    totalCost += cost;

    // Payments in this month
    const monthPayments = payments.filter(p => {
      const d = new Date(p.date);
      return d.getFullYear() === year && d.getMonth() + 1 === monthNum;
    });

    // Calculate payments in (advances + settlements) and refunds separately
    const paymentsIn = monthPayments
      .filter(p => p.type !== 'refund')
      .reduce((sum, p) => sum + p.amount, 0);
    const refunds = monthPayments
      .filter(p => p.type === 'refund')
      .reduce((sum, p) => sum + p.amount, 0);
    const monthPaymentTotal = paymentsIn - refunds;

    totalPayments += monthPaymentTotal;

    monthlyBreakdown.push({
      month,
      year,
      monthNum,
      consumption: Math.round(consumption),
      endReading: Math.round(endValue),
      cost: Math.round(cost * 100) / 100,
      payments: Math.round(monthPaymentTotal * 100) / 100,
      paymentsIn: Math.round(paymentsIn * 100) / 100,
      refunds: Math.round(refunds * 100) / 100,
      runningBalance: Math.round((totalPayments - totalCost) * 100) / 100,
      isProjected,
      // Debug info
      tariffName: tariff?.name || 'Kein Tarif',
      pricePerKwh: Math.round((pricePerKwh || 0) * 10000) / 10000,
      fixedMonthly: Math.round((fixedMonthly || 0) * 100) / 100,
    });
  }

  res.json({
    totalCost: Math.round(totalCost * 100) / 100,
    totalPayments: Math.round(totalPayments * 100) / 100,
    balance: Math.round((totalPayments - totalCost) * 100) / 100,
    monthlyBreakdown,
  });
});

// ===== STATISTICS =====
app.get('/api/statistics', (req, res) => {
  const readings = db.prepare('SELECT * FROM readings ORDER BY timestamp DESC').all() as any[];

  if (readings.length === 0) {
    return res.json({
      totalReadings: 0,
      averageConsumption: 0,
      averageConsumptionPerDay: 0,
      totalConsumption: 0,
      daysSinceLastReading: 0,
    });
  }

  const consumptions = readings.map(r => r.consumption).filter((c): c is number => c != null && c > 0);
  const consumptionsPerDay = readings.map(r => r.consumptionPerDay).filter((c): c is number => c != null && c > 0);

  const averageConsumption = consumptions.length > 0
    ? consumptions.reduce((a, b) => a + b, 0) / consumptions.length
    : 0;

  const averageConsumptionPerDay = consumptionsPerDay.length > 0
    ? consumptionsPerDay.reduce((a, b) => a + b, 0) / consumptionsPerDay.length
    : 0;

  const totalConsumption = readings.length > 1
    ? readings[0].meterValue - readings[readings.length - 1].meterValue
    : 0;

  const lastReading = readings[0];
  const daysSinceLastReading = lastReading
    ? Math.floor((Date.now() - new Date(lastReading.timestamp).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  res.json({
    totalReadings: readings.length,
    averageConsumption: Math.round(averageConsumption),
    averageConsumptionPerDay: Math.round(averageConsumptionPerDay * 10) / 10,
    totalConsumption: Math.round(totalConsumption),
    lastReading: parseReading(lastReading),
    daysSinceLastReading,
  });
});

// ===== HELPER FUNCTIONS =====
function parseReading(row: any) {
  if (!row) return null;
  return {
    ...row,
    timestamp: new Date(row.timestamp),
    synced: Boolean(row.synced),
    // Map DB fields to frontend names
    outdoorTemp: row.outdoorTempCurrent,
    outdoorTempNight: row.outdoorTempNightAvg,
    weather: row.weatherCondition,
  };
}

function parseTariff(row: any) {
  if (!row) return null;
  return {
    ...row,
    validFrom: new Date(row.validFrom),
    validUntil: row.validUntil ? new Date(row.validUntil) : undefined,
  };
}

function parsePayment(row: any) {
  if (!row) return null;
  return {
    ...row,
    date: new Date(row.date),
    notes: row.description, // Map DB field to frontend field
  };
}

function parseAdvancePayment(row: any) {
  if (!row) return null;
  return {
    ...row,
    monthlyAmount: row.amount,
    validFrom: new Date(row.validFrom),
    validUntil: row.validUntil ? new Date(row.validUntil) : undefined,
  };
}

// ===== ELWA READINGS =====
app.get('/api/elwa', (req, res) => {
  const readings = db.prepare('SELECT * FROM elwaReadings ORDER BY date DESC').all();
  res.json(readings);
});

// Manual trigger for importing yesterday's data
app.post('/api/elwa/import-yesterday', async (req, res) => {
  const result = await elwaScheduler.importYesterdayData();
  res.json(result);
});

// Import specific date range
app.post('/api/elwa/import-range', async (req, res) => {
  const { startDate, endDate } = req.body;
  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate and endDate required' });
  }
  const result = await elwaScheduler.importDateRange(startDate, endDate);
  res.json(result);
});

// Fill gaps in ELWA data (checks last 48h for missing data)
app.post('/api/elwa/fill-gaps', async (req, res) => {
  const result = await elwaScheduler.checkAndFillGaps();
  res.json(result);
});

// Get scheduler status
app.get('/api/elwa/status', (req, res) => {
  const status = elwaScheduler.getStatus();
  res.json(status);
});

app.get('/api/elwa/monthly', (req, res) => {
  // Get monthly ELWA data with Fernwärme tariff for savings calculation
  const elwa = db.prepare('SELECT * FROM elwaReadings ORDER BY date ASC').all() as any[];
  const tariffs = db.prepare('SELECT * FROM tariffs ORDER BY validFrom ASC').all() as any[];

  const result = elwa.map(e => {
    const date = new Date(e.date);
    const tariff = tariffs.find((t: any) => {
      const from = new Date(t.validFrom);
      const until = t.validUntil ? new Date(t.validUntil) : new Date('2099-12-31');
      return date >= from && date <= until;
    }) || tariffs[tariffs.length - 1];

    const pricePerKwh = tariff?.totalPricePerKwh || 0.12;
    const savings = e.energyKwh * pricePerKwh;

    return {
      ...e,
      date: e.date,
      month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      savings: Math.round(savings * 100) / 100,
      pricePerKwh,
    };
  });

  res.json(result);
});

// ===== HOME ASSISTANT PROXY =====
app.post('/api/ha/test', async (req, res) => {
  const { url, token } = req.body;
  try {
    const response = await fetch(`${url}/api/`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    res.json({ success: response.ok });
  } catch (err) {
    res.json({ success: false, error: String(err) });
  }
});

app.post('/api/ha/sensors', async (req, res) => {
  const { url, token } = req.body;
  try {
    const response = await fetch(`${url}/api/states`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch');
    const states = await response.json() as any[];

    const sensors = states
      .filter(s => s.entity_id.startsWith('sensor.'))
      .map(s => ({
        entity_id: s.entity_id,
        name: s.attributes.friendly_name || s.entity_id,
        state: s.state,
        unit: s.attributes.unit_of_measurement,
        device_class: s.attributes.device_class,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json(sensors);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Get sensor values (with averaging for multiple sensors)
app.post('/api/ha/values', async (req, res) => {
  const { url, token, entities } = req.body;
  try {
    const response = await fetch(`${url}/api/states`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch');
    const states = await response.json() as any[];

    const result: Record<string, number | null> = {};

    for (const entityId of entities) {
      if (Array.isArray(entityId)) {
        // Multiple sensors - calculate average
        const values = entityId
          .map(id => states.find(s => s.entity_id === id))
          .map(s => s ? parseFloat(s.state) : NaN)
          .filter(v => !isNaN(v));

        result[entityId.join(',')] = values.length > 0
          ? values.reduce((a, b) => a + b, 0) / values.length
          : null;
      } else {
        // Single sensor
        const state = states.find(s => s.entity_id === entityId);
        const value = state ? parseFloat(state.state) : NaN;
        result[entityId] = isNaN(value) ? null : value;
      }
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ===== HOME ASSISTANT METRICS =====

// Middleware for API token authentication
const authenticateHAToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  const settings = db.prepare('SELECT homeAssistantApiToken FROM settings WHERE id = ?').get('main') as any;

  if (!settings?.homeAssistantApiToken) {
    return res.status(401).json({ error: 'API token not configured in settings' });
  }

  if (token !== settings.homeAssistantApiToken) {
    return res.status(401).json({ error: 'Invalid API token' });
  }

  next();
};

// POST endpoint to receive metrics from Home Assistant
app.post('/api/homeassistant/metrics', authenticateHAToken, (req, res) => {
  try {
    const { timestamp, metrics } = req.body;

    if (!timestamp || !metrics) {
      return res.status(400).json({ error: 'Missing required fields: timestamp, metrics' });
    }

    // Validate timestamp format
    const ts = new Date(timestamp);
    if (isNaN(ts.getTime())) {
      return res.status(400).json({ error: 'Invalid timestamp format' });
    }

    // Insert or replace metrics
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO ha_metrics (
        timestamp,
        brightness_east,
        brightness_south,
        brightness_west,
        wind_speed,
        temp_outdoor_south,
        temp_outdoor_north,
        pv_production,
        elwa_power
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      ts.toISOString(),
      metrics.brightness_east ?? null,
      metrics.brightness_south ?? null,
      metrics.brightness_west ?? null,
      metrics.wind_speed ?? null,
      metrics.temp_outdoor_south ?? null,
      metrics.temp_outdoor_north ?? null,
      metrics.pv_production ?? null,
      metrics.elwa_power ?? null
    );

    res.json({ success: true, message: 'Metrics stored successfully' });
  } catch (err) {
    console.error('Error storing HA metrics:', err);
    res.status(500).json({ error: String(err) });
  }
});

// GET endpoint to retrieve metrics
app.get('/api/homeassistant/metrics', (req, res) => {
  try {
    const { start, end, limit } = req.query;

    let query = 'SELECT * FROM ha_metrics';
    const params: any[] = [];

    if (start || end) {
      const conditions: string[] = [];
      if (start) {
        conditions.push('timestamp >= ?');
        params.push(start);
      }
      if (end) {
        conditions.push('timestamp <= ?');
        params.push(end);
      }
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY timestamp DESC';

    if (limit) {
      query += ' LIMIT ?';
      params.push(parseInt(limit as string));
    }

    const metrics = db.prepare(query).all(...params);
    res.json(metrics);
  } catch (err) {
    console.error('Error fetching HA metrics:', err);
    res.status(500).json({ error: String(err) });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`For mobile access use: http://<your-ip>:${PORT}`);

  // Start ELWA Cloud scheduler
  elwaScheduler.start();
  console.log('✓ ELWA Cloud scheduler started');
});
