import Dexie, { type EntityTable } from 'dexie';
import type { Reading, Settings, Tariff, Payment, AdvancePayment, MonthlyStats } from '../types';

// Dexie Datenbank Definition
class HausTrackerDatabase extends Dexie {
  readings!: EntityTable<Reading, 'id'>;
  settings!: EntityTable<Settings, 'id'>;
  tariffs!: EntityTable<Tariff, 'id'>;
  payments!: EntityTable<Payment, 'id'>;
  advancePayments!: EntityTable<AdvancePayment, 'id'>;
  monthlyStats!: EntityTable<MonthlyStats, 'id'>;

  constructor() {
    super('HausTrackerDB');

    this.version(2).stores({
      readings: '++id, timestamp, meterValue, synced, source',
      settings: 'id',
      tariffs: '++id, validFrom, validUntil',
      payments: '++id, date, type',
      advancePayments: '++id, validFrom, validUntil',
      monthlyStats: '++id, [year+month]',
    });
  }
}

export const db = new HausTrackerDatabase();

// ===== TARIFF HELPERS =====
export const tariffHelpers = {
  async getAll(): Promise<Tariff[]> {
    return await db.tariffs.orderBy('validFrom').reverse().toArray();
  },

  async getCurrent(): Promise<Tariff | undefined> {
    const now = new Date();
    return await db.tariffs
      .filter(t => t.validFrom <= now && (!t.validUntil || t.validUntil >= now))
      .first();
  },

  async getForDate(date: Date): Promise<Tariff | undefined> {
    return await db.tariffs
      .filter(t => t.validFrom <= date && (!t.validUntil || t.validUntil >= date))
      .first();
  },

  async add(tariff: Omit<Tariff, 'id'>): Promise<number> {
    // Berechne Gesamtpreise
    const totalPricePerKwh = tariff.workingPrice + (tariff.co2Price || 0) + (tariff.gasLevy || 0);
    const fixedMonthly = (tariff.basePrice + (tariff.meteringPrice || 0)) / 12;

    const result = await db.tariffs.add({
      ...tariff,
      totalPricePerKwh,
      fixedMonthly,
    });
    return result as number;
  },

  async update(id: number, updates: Partial<Tariff>): Promise<void> {
    const tariff = await db.tariffs.get(id);
    if (tariff) {
      const merged = { ...tariff, ...updates };
      const totalPricePerKwh = merged.workingPrice + (merged.co2Price || 0) + (merged.gasLevy || 0);
      const fixedMonthly = (merged.basePrice + (merged.meteringPrice || 0)) / 12;
      await db.tariffs.update(id, { ...updates, totalPricePerKwh, fixedMonthly });
    }
  },

  async delete(id: number): Promise<void> {
    await db.tariffs.delete(id);
  },

  // Berechne Kosten für einen Verbrauch
  calculateCost(consumption: number, tariff: Tariff): number {
    const variableCost = consumption * (tariff.totalPricePerKwh || tariff.workingPrice);
    return variableCost;
  },

  // Berechne monatliche Gesamtkosten
  calculateMonthlyCost(consumption: number, tariff: Tariff): number {
    const variableCost = consumption * (tariff.totalPricePerKwh || tariff.workingPrice);
    const fixedCost = tariff.fixedMonthly || (tariff.basePrice / 12);
    return variableCost + fixedCost;
  },
};

// ===== PAYMENT HELPERS =====
export const paymentHelpers = {
  async getAll(): Promise<Payment[]> {
    return await db.payments.orderBy('date').reverse().toArray();
  },

  async getByDateRange(start: Date, end: Date): Promise<Payment[]> {
    return await db.payments
      .where('date')
      .between(start, end, true, true)
      .toArray();
  },

  async add(payment: Omit<Payment, 'id'>): Promise<number> {
    const result = await db.payments.add(payment);
    return result as number;
  },

  async delete(id: number): Promise<void> {
    await db.payments.delete(id);
  },

  async getTotalByMonth(year: number, month: number): Promise<number> {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);
    const payments = await this.getByDateRange(start, end);
    return payments
      .filter(p => p.type === 'advance')
      .reduce((sum, p) => sum + p.amount, 0);
  },
};

// ===== ADVANCE PAYMENT HELPERS =====
export const advancePaymentHelpers = {
  async getAll(): Promise<AdvancePayment[]> {
    return await db.advancePayments.orderBy('validFrom').reverse().toArray();
  },

  async getCurrent(): Promise<AdvancePayment | undefined> {
    const now = new Date();
    return await db.advancePayments
      .filter(a => a.validFrom <= now && (!a.validUntil || a.validUntil >= now))
      .first();
  },

  async add(advancePayment: Omit<AdvancePayment, 'id'>): Promise<number> {
    const result = await db.advancePayments.add(advancePayment);
    return result as number;
  },

  async update(id: number, updates: Partial<AdvancePayment>): Promise<void> {
    await db.advancePayments.update(id, updates);
  },

  async delete(id: number): Promise<void> {
    await db.advancePayments.delete(id);
  },
};

// ===== READING HELPERS =====
export const dbHelpers = {
  async getAllReadings(): Promise<Reading[]> {
    return await db.readings.orderBy('timestamp').reverse().toArray();
  },

  async getLastReading(): Promise<Reading | undefined> {
    return await db.readings.orderBy('timestamp').reverse().first();
  },

  async getReadingBefore(date: Date): Promise<Reading | undefined> {
    return await db.readings
      .where('timestamp')
      .below(date)
      .reverse()
      .first();
  },

  async addReading(reading: Omit<Reading, 'id'>): Promise<number> {
    // Finde vorherige Ablesung für Berechnungen
    const previousReading = await this.getReadingBefore(reading.timestamp);

    let consumption: number | undefined;
    let hoursSinceLastReading: number | undefined;
    let daysSinceLastReading: number | undefined;
    let consumptionPerDay: number | undefined;
    let costSinceLastReading: number | undefined;

    if (previousReading) {
      consumption = reading.meterValue - previousReading.meterValue;
      const timeDiff = reading.timestamp.getTime() - previousReading.timestamp.getTime();
      hoursSinceLastReading = Math.round(timeDiff / (1000 * 60 * 60));
      daysSinceLastReading = timeDiff / (1000 * 60 * 60 * 24);
      consumptionPerDay = daysSinceLastReading > 0 ? consumption / daysSinceLastReading : 0;

      // Berechne Kosten mit aktivem Tarif
      const tariff = await tariffHelpers.getForDate(reading.timestamp);
      if (tariff && consumption > 0) {
        costSinceLastReading = tariffHelpers.calculateCost(consumption, tariff);
      }
    }

    const newReading: Omit<Reading, 'id'> = {
      ...reading,
      consumption,
      hoursSinceLastReading,
      daysSinceLastReading: daysSinceLastReading ? Math.round(daysSinceLastReading) : undefined,
      consumptionPerDay: consumptionPerDay ? Math.round(consumptionPerDay * 100) / 100 : undefined,
      costSinceLastReading: costSinceLastReading ? Math.round(costSinceLastReading * 100) / 100 : undefined,
    };

    const result = await db.readings.add(newReading);

    // Aktualisiere nachfolgende Ablesungen (falls historische Daten eingefügt wurden)
    await this.recalculateReadingsAfter(reading.timestamp);

    return result as number;
  },

  // Neuberechnung aller Ablesungen nach einem bestimmten Datum
  async recalculateReadingsAfter(date: Date): Promise<void> {
    const readings = await db.readings
      .where('timestamp')
      .above(date)
      .sortBy('timestamp');

    for (const reading of readings) {
      const previousReading = await this.getReadingBefore(reading.timestamp);
      if (previousReading && reading.id) {
        const consumption = reading.meterValue - previousReading.meterValue;
        const timeDiff = reading.timestamp.getTime() - previousReading.timestamp.getTime();
        const hoursSinceLastReading = Math.round(timeDiff / (1000 * 60 * 60));
        const daysSinceLastReading = timeDiff / (1000 * 60 * 60 * 24);
        const consumptionPerDay = daysSinceLastReading > 0 ? consumption / daysSinceLastReading : 0;

        const tariff = await tariffHelpers.getForDate(reading.timestamp);
        const costSinceLastReading = tariff && consumption > 0
          ? tariffHelpers.calculateCost(consumption, tariff)
          : undefined;

        await db.readings.update(reading.id, {
          consumption,
          hoursSinceLastReading,
          daysSinceLastReading: Math.round(daysSinceLastReading),
          consumptionPerDay: Math.round(consumptionPerDay * 100) / 100,
          costSinceLastReading: costSinceLastReading ? Math.round(costSinceLastReading * 100) / 100 : undefined,
        });
      }
    }
  },

  async updateReading(id: number, updates: Partial<Reading>): Promise<number> {
    const result = await db.readings.update(id, updates);

    // Falls Timestamp oder Wert geändert wurde, neuberechnen
    if (updates.timestamp || updates.meterValue) {
      const reading = await db.readings.get(id);
      if (reading) {
        await this.recalculateReadingsAfter(new Date(0)); // Alle neuberechnen
      }
    }

    return result as number;
  },

  async deleteReading(id: number): Promise<void> {
    const reading = await db.readings.get(id);
    await db.readings.delete(id);
    if (reading) {
      await this.recalculateReadingsAfter(reading.timestamp);
    }
  },

  async getSettings(): Promise<Settings> {
    let settings = await db.settings.get('main');
    if (!settings) {
      settings = {
        id: 'main',
        reminderIntervalDays: 7,
        reminderEnabled: true,
      };
      await db.settings.add(settings);
    }
    return settings;
  },

  async updateSettings(updates: Partial<Settings>): Promise<void> {
    await db.settings.update('main', updates);
  },

  async getStatistics() {
    const readings = await this.getAllReadings();
    const lastReading = readings[0];
    const currentTariff = await tariffHelpers.getCurrent();

    if (readings.length === 0) {
      return {
        totalReadings: 0,
        averageConsumption: 0,
        averageConsumptionPerDay: 0,
        totalConsumption: 0,
        daysSinceLastReading: 0,
      };
    }

    const consumptions = readings
      .map(r => r.consumption)
      .filter((c): c is number => c !== undefined && c > 0);

    const consumptionsPerDay = readings
      .map(r => r.consumptionPerDay)
      .filter((c): c is number => c !== undefined && c > 0);

    const averageConsumption = consumptions.length > 0
      ? consumptions.reduce((a, b) => a + b, 0) / consumptions.length
      : 0;

    const averageConsumptionPerDay = consumptionsPerDay.length > 0
      ? consumptionsPerDay.reduce((a, b) => a + b, 0) / consumptionsPerDay.length
      : 0;

    const totalConsumption = readings.length > 1
      ? readings[0].meterValue - readings[readings.length - 1].meterValue
      : 0;

    const daysSinceLastReading = lastReading
      ? Math.floor((Date.now() - lastReading.timestamp.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // Aktuelle Monatskosten berechnen
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthReadings = readings.filter(r => r.timestamp >= monthStart);
    const currentMonthConsumption = monthReadings.reduce((sum, r) => sum + (r.consumption || 0), 0);

    let currentMonthCost: number | undefined;
    let projectedMonthlyCost: number | undefined;

    if (currentTariff) {
      currentMonthCost = tariffHelpers.calculateMonthlyCost(currentMonthConsumption, currentTariff);

      // Hochrechnung auf ganzen Monat
      const dayOfMonth = now.getDate();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      if (dayOfMonth > 1) {
        const projectedConsumption = (currentMonthConsumption / dayOfMonth) * daysInMonth;
        projectedMonthlyCost = tariffHelpers.calculateMonthlyCost(projectedConsumption, currentTariff);
      }
    }

    return {
      totalReadings: readings.length,
      averageConsumption: Math.round(averageConsumption),
      averageConsumptionPerDay: Math.round(averageConsumptionPerDay * 10) / 10,
      totalConsumption: Math.round(totalConsumption),
      lastReading,
      daysSinceLastReading,
      currentMonthConsumption: Math.round(currentMonthConsumption),
      currentMonthCost: currentMonthCost ? Math.round(currentMonthCost * 100) / 100 : undefined,
      projectedMonthlyCost: projectedMonthlyCost ? Math.round(projectedMonthlyCost * 100) / 100 : undefined,
    };
  },

  async getReadingsByDateRange(startDate: Date, endDate: Date): Promise<Reading[]> {
    return await db.readings
      .where('timestamp')
      .between(startDate, endDate, true, true)
      .toArray();
  },
};

// ===== MONTHLY STATS HELPERS =====
export const monthlyStatsHelpers = {
  async getAll(): Promise<MonthlyStats[]> {
    return await db.monthlyStats.toArray();
  },

  async calculate(year: number, month: number): Promise<MonthlyStats> {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    const readings = await dbHelpers.getReadingsByDateRange(start, end);
    const tariff = await tariffHelpers.getForDate(start);

    // Finde Start- und End-Zählerstand
    const sortedReadings = readings.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const startReading = sortedReadings[0]?.meterValue;
    const endReading = sortedReadings[sortedReadings.length - 1]?.meterValue;

    const consumption = endReading && startReading ? endReading - startReading : 0;
    const daysInMonth = new Date(year, month, 0).getDate();
    const consumptionPerDay = consumption / daysInMonth;

    // Kosten berechnen
    const calculatedCost = tariff
      ? tariffHelpers.calculateMonthlyCost(consumption, tariff)
      : 0;

    // Gezahlte Abschläge
    const paidAdvances = await paymentHelpers.getTotalByMonth(year, month);

    const balance = paidAdvances - calculatedCost;

    const stats: MonthlyStats = {
      year,
      month,
      startReading,
      endReading,
      consumption: Math.round(consumption),
      consumptionPerDay: Math.round(consumptionPerDay * 10) / 10,
      calculatedCost: Math.round(calculatedCost * 100) / 100,
      paidAdvances: Math.round(paidAdvances * 100) / 100,
      balance: Math.round(balance * 100) / 100,
    };

    // Speichern oder aktualisieren
    const existing = await db.monthlyStats
      .where('[year+month]')
      .equals([year, month])
      .first();

    if (existing?.id) {
      await db.monthlyStats.update(existing.id, stats);
    } else {
      await db.monthlyStats.add(stats);
    }

    return stats;
  },

  async calculateAll(): Promise<MonthlyStats[]> {
    const readings = await dbHelpers.getAllReadings();
    if (readings.length === 0) return [];

    const oldest = readings[readings.length - 1];
    const newest = readings[0];

    const stats: MonthlyStats[] = [];

    let current = new Date(oldest.timestamp.getFullYear(), oldest.timestamp.getMonth(), 1);
    const end = new Date(newest.timestamp.getFullYear(), newest.timestamp.getMonth() + 1, 0);

    while (current <= end) {
      const monthStats = await this.calculate(current.getFullYear(), current.getMonth() + 1);
      stats.push(monthStats);
      current.setMonth(current.getMonth() + 1);
    }

    return stats;
  },
};
