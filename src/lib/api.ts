import type { Reading, Settings, Tariff, Payment, AdvancePayment } from '../types';

// API Base URL - use environment variable or default (empty = relative, proxied by Vite)
const API_BASE = import.meta.env.VITE_API_URL || '';

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// ===== READINGS =====
export const readingsAPI = {
  async getAll(): Promise<Reading[]> {
    const data = await fetchAPI<any[]>('/api/readings');
    return data.map(r => ({ ...r, timestamp: new Date(r.timestamp) }));
  },

  async getLast(): Promise<Reading | undefined> {
    const readings = await this.getAll();
    return readings[0];
  },

  async add(reading: Omit<Reading, 'id'>): Promise<number> {
    const data = await fetchAPI<{ id: number }>('/api/readings', {
      method: 'POST',
      body: JSON.stringify({
        ...reading,
        timestamp: reading.timestamp.toISOString(),
      }),
    });
    return data.id;
  },

  async update(id: number, updates: Partial<Reading>): Promise<void> {
    await fetchAPI(`/api/readings/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...updates,
        timestamp: updates.timestamp?.toISOString(),
      }),
    });
  },

  async delete(id: number): Promise<void> {
    await fetchAPI(`/api/readings/${id}`, { method: 'DELETE' });
  },
};

// ===== SETTINGS =====
export const settingsAPI = {
  async get(): Promise<Settings> {
    return fetchAPI<Settings>('/api/settings');
  },

  async update(updates: Partial<Settings>): Promise<void> {
    await fetchAPI('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },
};

// ===== TARIFFS =====
export const tariffsAPI = {
  async getAll(): Promise<Tariff[]> {
    const data = await fetchAPI<any[]>('/api/tariffs');
    return data.map(t => ({
      ...t,
      validFrom: new Date(t.validFrom),
      validUntil: t.validUntil ? new Date(t.validUntil) : undefined,
    }));
  },

  async getCurrent(): Promise<Tariff | undefined> {
    const tariffs = await this.getAll();
    if (tariffs.length === 0) return undefined;

    const now = new Date();
    // Finde aktuell gültigen Tarif
    const current = tariffs.find(t => t.validFrom <= now && (!t.validUntil || t.validUntil >= now));
    if (current) return current;

    // Fallback: neuester Tarif (nach validFrom sortiert)
    return tariffs.sort((a, b) => b.validFrom.getTime() - a.validFrom.getTime())[0];
  },

  async add(tariff: Omit<Tariff, 'id'>): Promise<number> {
    const data = await fetchAPI<{ id: number }>('/api/tariffs', {
      method: 'POST',
      body: JSON.stringify({
        ...tariff,
        validFrom: tariff.validFrom.toISOString(),
        validUntil: tariff.validUntil?.toISOString(),
      }),
    });
    return data.id;
  },

  async update(id: number, updates: Partial<Tariff>): Promise<void> {
    await fetchAPI(`/api/tariffs/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...updates,
        validFrom: updates.validFrom?.toISOString(),
        validUntil: updates.validUntil?.toISOString(),
      }),
    });
  },

  async delete(id: number): Promise<void> {
    await fetchAPI(`/api/tariffs/${id}`, { method: 'DELETE' });
  },

  calculateCost(consumption: number, tariff: Tariff): number {
    const pricePerKwh = tariff.totalPricePerKwh || tariff.workingPrice;
    return consumption * pricePerKwh;
  },

  calculateMonthlyCost(consumption: number, tariff: Tariff): number {
    const variableCost = this.calculateCost(consumption, tariff);
    const fixedCost = tariff.fixedMonthly || (tariff.basePrice / 12);
    return variableCost + fixedCost;
  },
};

// ===== PAYMENTS =====
export const paymentsAPI = {
  async getAll(): Promise<Payment[]> {
    const data = await fetchAPI<any[]>('/api/payments');
    return data.map(p => ({ ...p, date: new Date(p.date) }));
  },

  async add(payment: Omit<Payment, 'id'>): Promise<number> {
    const data = await fetchAPI<{ id: number }>('/api/payments', {
      method: 'POST',
      body: JSON.stringify({
        ...payment,
        date: payment.date.toISOString(),
      }),
    });
    return data.id;
  },

  async update(id: number, updates: Partial<Payment>): Promise<void> {
    await fetchAPI(`/api/payments/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...updates,
        date: updates.date?.toISOString(),
      }),
    });
  },

  async delete(id: number): Promise<void> {
    await fetchAPI(`/api/payments/${id}`, { method: 'DELETE' });
  },
};

// ===== ADVANCE PAYMENTS =====
export const advancePaymentsAPI = {
  async getAll(): Promise<AdvancePayment[]> {
    const data = await fetchAPI<any[]>('/api/advance-payments');
    return data.map(a => ({
      ...a,
      validFrom: new Date(a.validFrom),
      validUntil: a.validUntil ? new Date(a.validUntil) : undefined,
    }));
  },

  async getCurrent(): Promise<AdvancePayment | undefined> {
    const payments = await this.getAll();
    if (payments.length === 0) return undefined;

    const now = new Date();
    // Finde aktuell gültigen Abschlag
    const current = payments.find(a => a.validFrom <= now && (!a.validUntil || a.validUntil >= now));
    if (current) return current;

    // Fallback: neuester Abschlag
    return payments.sort((a, b) => b.validFrom.getTime() - a.validFrom.getTime())[0];
  },

  async add(payment: Omit<AdvancePayment, 'id'>): Promise<number> {
    const data = await fetchAPI<{ id: number }>('/api/advance-payments', {
      method: 'POST',
      body: JSON.stringify({
        ...payment,
        validFrom: payment.validFrom.toISOString(),
        validUntil: payment.validUntil?.toISOString(),
      }),
    });
    return data.id;
  },

  async update(id: number, updates: Partial<AdvancePayment>): Promise<void> {
    await fetchAPI(`/api/advance-payments/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...updates,
        validFrom: updates.validFrom?.toISOString(),
        validUntil: updates.validUntil?.toISOString(),
      }),
    });
  },

  async delete(id: number): Promise<void> {
    await fetchAPI(`/api/advance-payments/${id}`, { method: 'DELETE' });
  },
};

// ===== STATISTICS =====
export const statisticsAPI = {
  async get() {
    const data = await fetchAPI<any>('/api/statistics');
    return {
      ...data,
      lastReading: data.lastReading ? {
        ...data.lastReading,
        timestamp: new Date(data.lastReading.timestamp),
      } : undefined,
    };
  },
};

// ===== MONTHLY STATS =====
export const monthlyStatsAPI = {
  async getAll() {
    return fetchAPI<any[]>('/api/monthly-stats');
  },
};

// ===== BALANCE / KONTOSTAND =====
export interface BalanceData {
  totalCost: number;
  totalPayments: number;
  balance: number;
  monthlyBreakdown: {
    month: string;
    year: number;
    monthNum: number;
    consumption: number;
    endReading: number;
    cost: number;
    payments: number;
    runningBalance: number;
  }[];
}

export const balanceAPI = {
  async get(): Promise<BalanceData> {
    return fetchAPI<BalanceData>('/api/balance');
  },
};

// Export all APIs
export const api = {
  readings: readingsAPI,
  settings: settingsAPI,
  tariffs: tariffsAPI,
  payments: paymentsAPI,
  advancePayments: advancePaymentsAPI,
  statistics: statisticsAPI,
  monthlyStats: monthlyStatsAPI,
  balance: balanceAPI,
};

export default api;
