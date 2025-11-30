import { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, Droplets, Sun, Download, History } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatNumber } from '../lib/utils';

interface ElwaReading {
  id: number;
  date: string;
  energyKwh: number;
  energySolarKwh: number;
  energyGridKwh: number;
  temp1: number | null;
  temp2: number | null;
  source: 'screenshot' | 'cloud';
  notes: string | null;
}

interface ElwaMonthly extends ElwaReading {
  month: string;
  savings: number;
  pricePerKwh: number;
}

type TimeFilter = 'yesterday' | '3d' | '1w' | '4w' | '3m' | '6m' | '12m' | 'all';

interface AggregatedData {
  date: string;
  label: string;
  energyKwh: number;
  energySolarKwh: number;
  savings: number;
  count: number;
}

export default function Elwa() {
  const [readings, setReadings] = useState<ElwaMonthly[]>([]);
  const [filteredData, setFilteredData] = useState<ElwaMonthly[]>([]);
  const [aggregatedData, setAggregatedData] = useState<AggregatedData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<TimeFilter>('4w');
  const [apiStatus, setApiStatus] = useState<{ lastRun: string | null; success: boolean } | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterData();
  }, [filter, readings]);

  useEffect(() => {
    aggregateData();
  }, [filteredData, filter]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [monthlyData, statusData] = await Promise.all([
        fetch('/api/elwa/monthly').then(r => r.json()),
        fetch('/api/elwa/status').then(r => r.json()).catch(() => null),
      ]);
      setReadings(monthlyData);
      setApiStatus(statusData);
    } catch (err) {
      console.error('Failed to load ELWA data:', err);
      setError('Daten konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  }

  async function importData() {
    setImporting(true);
    setError(null);
    try {
      const response = await fetch('/api/elwa/import-yesterday', {
        method: 'POST',
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Import fehlgeschlagen');
      }

      // Reload data after successful import
      await loadData();
    } catch (err) {
      console.error('Failed to import ELWA data:', err);
      setError(err instanceof Error ? err.message : 'Import fehlgeschlagen');
    } finally {
      setImporting(false);
    }
  }

  async function fillGaps() {
    setImporting(true);
    setError(null);
    try {
      const response = await fetch('/api/elwa/fill-gaps', {
        method: 'POST',
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Lücken füllen fehlgeschlagen');
      }

      // Reload data after successful import
      await loadData();
    } catch (err) {
      console.error('Failed to fill ELWA gaps:', err);
      setError(err instanceof Error ? err.message : 'Lücken füllen fehlgeschlagen');
    } finally {
      setImporting(false);
    }
  }

  function filterData() {
    if (readings.length === 0) return;

    const now = new Date();
    let startDate: Date;

    switch (filter) {
      case 'yesterday':
        startDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
        break;
      case '3d':
        startDate = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
        break;
      case '1w':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '4w':
        startDate = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
        break;
      case '3m':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '6m':
        startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        break;
      case '12m':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
        setFilteredData(readings);
        return;
    }

    const filtered = readings.filter(r => new Date(r.date) >= startDate);
    setFilteredData(filtered);
  }

  function aggregateData() {
    if (filteredData.length === 0) {
      setAggregatedData([]);
      return;
    }

    // Für kurze Zeiträume: keine Aggregation (tägliche Daten)
    if (filter === 'yesterday' || filter === '3d' || filter === '1w') {
      const daily = filteredData.map(r => ({
        date: r.date,
        label: new Date(r.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
        energyKwh: r.energyKwh,
        energySolarKwh: r.energySolarKwh || r.energyKwh,
        savings: r.savings,
        count: 1,
      }));
      setAggregatedData(daily);
      return;
    }

    // Für mittlere Zeiträume: wöchentliche Aggregation
    if (filter === '4w' || filter === '3m') {
      const weeklyMap = new Map<string, AggregatedData>();

      filteredData.forEach(r => {
        const date = new Date(r.date);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay() + 1); // Montag als Wochenanfang
        const weekKey = weekStart.toISOString().split('T')[0];

        if (!weeklyMap.has(weekKey)) {
          weeklyMap.set(weekKey, {
            date: weekKey,
            label: `KW ${getWeekNumber(weekStart)}`,
            energyKwh: 0,
            energySolarKwh: 0,
            savings: 0,
            count: 0,
          });
        }

        const week = weeklyMap.get(weekKey)!;
        week.energyKwh += r.energyKwh;
        week.energySolarKwh += r.energySolarKwh || r.energyKwh;
        week.savings += r.savings;
        week.count++;
      });

      setAggregatedData(Array.from(weeklyMap.values()).sort((a, b) => a.date.localeCompare(b.date)));
      return;
    }

    // Für lange Zeiträume: monatliche Aggregation
    const monthlyMap = new Map<string, AggregatedData>();

    filteredData.forEach(r => {
      const monthKey = r.date.substring(0, 7); // YYYY-MM

      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          date: monthKey,
          label: new Date(monthKey + '-01').toLocaleDateString('de-DE', { month: 'short', year: '2-digit' }),
          energyKwh: 0,
          energySolarKwh: 0,
          savings: 0,
          count: 0,
        });
      }

      const month = monthlyMap.get(monthKey)!;
      month.energyKwh += r.energyKwh;
      month.energySolarKwh += r.energySolarKwh || r.energyKwh;
      month.savings += r.savings;
      month.count++;
    });

    setAggregatedData(Array.from(monthlyMap.values()).sort((a, b) => a.date.localeCompare(b.date)));
  }

  function getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  const filterButtons: { value: TimeFilter; label: string }[] = [
    { value: 'yesterday', label: 'Gestern' },
    { value: '3d', label: '3 Tage' },
    { value: '1w', label: '1 Woche' },
    { value: '4w', label: '4 Wochen' },
    { value: '3m', label: '3 Monate' },
    { value: '6m', label: '6 Monate' },
    { value: '12m', label: '12 Monate' },
    { value: 'all', label: 'Alle' },
  ];

  const totalEnergy = filteredData.reduce((sum, r) => sum + r.energyKwh, 0);
  const totalSavings = filteredData.reduce((sum, r) => sum + r.savings, 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Subheader */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-900">Warmwasser</h2>
          <div className="flex gap-2">
            <button
              onClick={importData}
              className="p-2 text-green-600 hover:text-green-700 rounded-lg"
              disabled={importing || loading}
              title="Daten vom my-PV API importieren"
            >
              <Download size={20} className={importing ? 'animate-bounce' : ''} />
            </button>
            <button
              onClick={fillGaps}
              className="p-2 text-blue-600 hover:text-blue-700 rounded-lg"
              disabled={importing || loading}
              title="Lücken der letzten 48h füllen"
            >
              <History size={20} className={importing ? 'animate-pulse' : ''} />
            </button>
            <button
              onClick={loadData}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-lg"
              disabled={loading}
              title="Anzeige aktualisieren"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
        {/* API Status */}
        {apiStatus && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              {apiStatus.success ? (
                <CheckCircle size={14} className="text-green-600" />
              ) : (
                <AlertCircle size={14} className="text-red-600" />
              )}
              <span className="text-gray-600">
                API: {apiStatus.lastRun ? new Date(apiStatus.lastRun).toLocaleString('de-DE') : 'Noch nie'}
              </span>
            </div>
            <span className={apiStatus.success ? 'text-green-600' : 'text-red-600'}>
              {apiStatus.success ? '✓' : '✗'}
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="m-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm">
          {error}
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Zeitfilter */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-sm font-medium text-gray-500 mb-3">Zeitraum</h2>
          <div className="flex flex-wrap gap-2">
            {filterButtons.map(btn => (
              <button
                key={btn.value}
                onClick={() => setFilter(btn.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filter === btn.value
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Statistik-Karten */}
        {filteredData.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 rounded-lg shadow p-4">
              <div className="flex items-center gap-2 text-green-600 mb-1">
                <Sun size={16} />
                <span className="text-xs">PV-Energie</span>
              </div>
              <div className="text-xl font-bold text-green-700">
                {formatNumber(totalEnergy, 1)} kWh
              </div>
              <div className="text-xs text-green-600 mt-1">100% Sonnenenergie</div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg shadow p-4">
              <div className="flex items-center gap-2 text-green-600 mb-1">
                <Droplets size={16} />
                <span className="text-xs">Ersparnis</span>
              </div>
              <div className="text-xl font-bold text-green-700">
                {formatNumber(totalSavings, 2)} €
              </div>
              <div className="text-xs text-green-600 mt-1">vs. Fernwärme</div>
            </div>
          </div>
        )}

        {/* Chart */}
        {aggregatedData.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-sm font-medium text-gray-500 mb-4">Energieverlauf</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={aggregatedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  style={{ fontSize: '12px' }}
                />
                <YAxis style={{ fontSize: '12px' }} />
                <Tooltip
                  labelFormatter={(label) => label as string}
                  formatter={(value: number) => [formatNumber(value, 1) + ' kWh', '']}
                />
                <Legend />
                <Line type="monotone" dataKey="energyKwh" stroke="#22c55e" name="PV-Energie" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Ersparnisse-Chart */}
        {aggregatedData.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-sm font-medium text-gray-500 mb-4">Ersparnisse durch PV-Warmwasser</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={aggregatedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  yAxisId="left"
                  style={{ fontSize: '12px' }}
                  label={{ value: 'kWh', angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  style={{ fontSize: '12px' }}
                  label={{ value: '€', angle: 90, position: 'insideRight', style: { fontSize: '12px' } }}
                />
                <Tooltip
                  labelFormatter={(label) => label as string}
                  formatter={(value: number, name: string) => {
                    if (name === 'PV-Energie') return [formatNumber(value, 1) + ' kWh', name];
                    if (name === 'Ersparnis') return [formatNumber(value, 2) + ' €', name];
                    return [value, name];
                  }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="energySolarKwh" fill="#22c55e" name="PV-Energie" />
                <Bar yAxisId="right" dataKey="savings" fill="#16a34a" name="Ersparnis" />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-gray-500 mt-3 text-center">
              Grün: PV-Energie für Warmwasser | Dunkelgrün: Geldersparnis vs. Fernwärme
            </p>
          </div>
        )}

        {/* Daten-Tabelle */}
        {filteredData.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-sm font-medium text-gray-500">Tägliche Daten</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Datum</th>
                    <th className="px-4 py-3 text-right">PV-Energie</th>
                    <th className="px-4 py-3 text-right">Ersparnis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredData.slice().reverse().map((reading) => (
                    <tr key={reading.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900">
                        {new Date(reading.date).toLocaleDateString('de-DE')}
                      </td>
                      <td className="px-4 py-3 text-right text-green-600 font-medium">
                        {formatNumber(reading.energyKwh, 1)} kWh
                      </td>
                      <td className="px-4 py-3 text-right text-green-700 font-medium">
                        {formatNumber(reading.savings, 2)} €
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Keine Daten */}
        {!loading && filteredData.length === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            <Droplets size={48} className="mx-auto mb-4 text-gray-300" />
            <p>Keine ELWA-Daten für diesen Zeitraum verfügbar</p>
            <p className="text-sm mt-2">Cloud-API in den Einstellungen konfigurieren</p>
          </div>
        )}
      </div>
    </div>
  );
}
