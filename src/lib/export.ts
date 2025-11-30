import type { Reading, Tariff, Payment, AdvancePayment } from '../types';

// CSV Export
export function exportReadingsToCSV(readings: Reading[]): string {
  const headers = [
    'Datum',
    'Uhrzeit',
    'Zählerstand (kWh)',
    'Verbrauch (kWh)',
    'Tage seit letzter Ablesung',
    'Verbrauch/Tag (kWh)',
    'Kosten (€)',
    'Außentemperatur (°C)',
    'Quelle',
    'Notizen'
  ].join(';');

  const rows = readings.map(r => {
    const date = new Date(r.timestamp);
    return [
      date.toLocaleDateString('de-DE'),
      date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
      r.meterValue.toFixed(1),
      r.consumption?.toFixed(1) || '',
      r.daysSinceLastReading || '',
      r.consumptionPerDay?.toFixed(2) || '',
      r.costSinceLastReading?.toFixed(2) || '',
      r.outdoorTemp?.toFixed(1) || '',
      r.source || 'manual',
      r.notes?.replace(/;/g, ',') || ''
    ].join(';');
  });

  return [headers, ...rows].join('\n');
}

// JSON Export
export function exportReadingsToJSON(readings: Reading[]): string {
  return JSON.stringify(readings.map(r => ({
    ...r,
    timestamp: new Date(r.timestamp).toISOString(),
  })), null, 2);
}

// Export all data
export function exportAllDataToJSON(data: {
  readings: Reading[];
  tariffs: Tariff[];
  payments: Payment[];
  advancePayments: AdvancePayment[];
}): string {
  return JSON.stringify({
    exportDate: new Date().toISOString(),
    version: '1.0',
    readings: data.readings.map(r => ({
      ...r,
      timestamp: new Date(r.timestamp).toISOString(),
    })),
    tariffs: data.tariffs.map(t => ({
      ...t,
      validFrom: new Date(t.validFrom).toISOString(),
      validUntil: t.validUntil ? new Date(t.validUntil).toISOString() : null,
    })),
    payments: data.payments.map(p => ({
      ...p,
      date: new Date(p.date).toISOString(),
    })),
    advancePayments: data.advancePayments.map(a => ({
      ...a,
      validFrom: new Date(a.validFrom).toISOString(),
      validUntil: a.validUntil ? new Date(a.validUntil).toISOString() : null,
    })),
  }, null, 2);
}

// Download helper
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Export readings as CSV
export function downloadReadingsCSV(readings: Reading[]): void {
  const csv = exportReadingsToCSV(readings);
  const date = new Date().toISOString().split('T')[0];
  downloadFile(csv, `haustracker-ablesungen-${date}.csv`, 'text/csv;charset=utf-8');
}

// Export readings as JSON
export function downloadReadingsJSON(readings: Reading[]): void {
  const json = exportReadingsToJSON(readings);
  const date = new Date().toISOString().split('T')[0];
  downloadFile(json, `haustracker-ablesungen-${date}.json`, 'application/json');
}

// Export all data as JSON
export function downloadAllDataJSON(data: {
  readings: Reading[];
  tariffs: Tariff[];
  payments: Payment[];
  advancePayments: AdvancePayment[];
}): void {
  const json = exportAllDataToJSON(data);
  const date = new Date().toISOString().split('T')[0];
  downloadFile(json, `haustracker-backup-${date}.json`, 'application/json');
}
