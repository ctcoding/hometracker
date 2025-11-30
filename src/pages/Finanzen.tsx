import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { BalanceData } from '../lib/api';
import { formatNumber } from '../lib/utils';
import { Wallet, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine, Cell
} from 'recharts';

const MONTH_NAMES = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

type MonthRange = '2m' | '3m' | '6m' | '12m' | 'all';

const MONTH_RANGES: { key: MonthRange; label: string }[] = [
  { key: '2m', label: '2 Monate' },
  { key: '3m', label: '3 Monate' },
  { key: '6m', label: '6 Monate' },
  { key: '12m', label: '12 Monate' },
  { key: 'all', label: 'Alles' },
];

export default function Finanzen() {
  const [data, setData] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [balanceMonthRange, setBalanceMonthRange] = useState<MonthRange>('12m');
  const [advancePayments, setAdvancePayments] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [balance, advanceData] = await Promise.all([
        api.balance.get(),
        api.advancePayments.getAll(),
      ]);
      setData(balance);
      setAdvancePayments(advanceData);
    } catch (err) {
      console.error('Failed to load balance:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="animate-spin text-orange-500" size={32} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="text-center text-gray-500">Keine Daten verfügbar</div>
      </div>
    );
  }

  const isPositive = data.balance >= 0;

  // Transform balance data for charts
  const monthlyData = data.monthlyBreakdown.map((m: any) => ({
    name: `${MONTH_NAMES[m.monthNum - 1]} ${String(m.year).slice(2)}`,
    monthNum: m.monthNum,
    year: m.year,
    verbrauch: m.consumption,
    kosten: m.cost,
    abschlag: m.payments,
    bilanz: m.runningBalance,
    isProjected: m.isProjected,
    preis: m.pricePerKwh ? m.pricePerKwh * 100 : null, // ct/kWh
    fixMonatlich: m.fixedMonthly,
  }));

  // Filter monthly data by selected range
  const getMonthCount = (range: MonthRange) => {
    if (range === '2m') return 2;
    if (range === '3m') return 3;
    if (range === '6m') return 6;
    if (range === '12m') return 12;
    return monthlyData.length;
  };

  const balanceData = monthlyData.slice(-getMonthCount(balanceMonthRange));

  // Generate 12-month forecast based on last year's pattern + trend
  const generateForecast = () => {
    if (monthlyData.length < 13) return []; // Need at least 13 months of data

    // Calculate trend factor from last 6 months vs same months last year
    const recentMonths = monthlyData.slice(-6).filter((m: any) => !m.isProjected);
    let trendSum = 0;
    let trendCount = 0;
    recentMonths.forEach((m: any) => {
      const lastYear = monthlyData.find((ly: any) => ly.monthNum === m.monthNum && ly.year === m.year - 1);
      if (lastYear && lastYear.verbrauch > 0) {
        trendSum += m.verbrauch / lastYear.verbrauch;
        trendCount++;
      }
    });
    const trendFactor = trendCount > 0 ? trendSum / trendCount : 1;

    // Get current balance and tariff
    const lastMonth = monthlyData[monthlyData.length - 1];
    const currentBalance = lastMonth?.bilanz || 0;
    const currentPrice = lastMonth?.preis || 14; // ct/kWh
    const currentFixed = lastMonth?.fixMonatlich || 50;
    const defaultAbschlag = lastMonth?.abschlag || 173;

    // Helper to find applicable advance payment for a given date
    const getAbschlagForDate = (date: Date): number => {
      const applicable = advancePayments.find((ap: any) => {
        const from = new Date(ap.validFrom);
        const until = ap.validUntil ? new Date(ap.validUntil) : new Date('2099-12-31');
        return date >= from && date <= until;
      });
      return applicable?.monthlyAmount || defaultAbschlag;
    };

    // Generate next 12 months
    const forecast: any[] = [];
    let runningBalance = currentBalance;
    const now = new Date();
    let forecastMonth = now.getMonth() + 2; // Start from next month
    let forecastYear = now.getFullYear();

    for (let i = 0; i < 12; i++) {
      if (forecastMonth > 12) {
        forecastMonth = 1;
        forecastYear++;
      }

      // Find same month last year
      const lastYearData = monthlyData.find((m: any) => m.monthNum === forecastMonth && m.year === forecastYear - 1);
      const baseConsumption = lastYearData?.verbrauch || 200; // fallback
      const forecastConsumption = Math.round(baseConsumption * trendFactor);
      const forecastCost = (forecastConsumption * currentPrice / 100) + currentFixed;

      // Get applicable Abschlag for this month
      const monthDate = new Date(forecastYear, forecastMonth - 1, 1);
      const abschlag = getAbschlagForDate(monthDate);
      runningBalance += abschlag - forecastCost;

      forecast.push({
        name: `${MONTH_NAMES[forecastMonth - 1]} ${String(forecastYear).slice(2)}`,
        verbrauch: forecastConsumption,
        kosten: forecastCost,
        abschlag: abschlag,
        bilanz: runningBalance,
        vorjahr: baseConsumption,
        isForecast: true,
      });

      forecastMonth++;
    }

    return { forecast, trendFactor, projectedBalance: runningBalance };
  };

  const forecastResult = generateForecast();
  const forecastData = Array.isArray(forecastResult) ? [] : (forecastResult.forecast || []);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Subheader */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Finanzen</h2>
        <button onClick={loadData} className="p-2 text-gray-500 hover:text-gray-700 rounded-lg" disabled={loading}>
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Hauptkarte mit Kontostand */}
        <div className={`rounded-lg shadow p-6 ${isPositive ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-center gap-3 mb-2">
            <Wallet className={isPositive ? 'text-green-600' : 'text-red-600'} size={24} />
            <span className="text-sm font-medium text-gray-600">Aktueller Kontostand</span>
          </div>
          <div className={`text-4xl font-bold ${isPositive ? 'text-green-700' : 'text-red-700'}`}>
            {isPositive ? '+' : ''}{formatNumber(data.balance, 2)} €
          </div>
          <p className="text-sm text-gray-500 mt-2">
            {isPositive ? 'Guthaben - du bist im Plus!' : 'Nachzahlung zu erwarten'}
          </p>
        </div>

        {/* Zusammenfassung */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 text-red-500 mb-1">
              <TrendingDown size={16} />
              <span className="text-xs">Kosten gesamt</span>
            </div>
            <div className="text-xl font-bold text-gray-900">
              {formatNumber(data.totalCost, 2)} €
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 text-green-500 mb-1">
              <TrendingUp size={16} />
              <span className="text-xs">Zahlungen gesamt</span>
            </div>
            <div className="text-xl font-bold text-gray-900">
              {formatNumber(data.totalPayments, 2)} €
            </div>
          </div>
        </div>

        {/* Balance Trend */}
        {balanceData.length > 0 && (() => {
          const minBilanz = Math.min(...balanceData.map(d => d.bilanz));
          const maxBilanz = Math.max(...balanceData.map(d => d.bilanz));
          const range = maxBilanz - minBilanz;
          const zeroOffset = range > 0 ? (maxBilanz / range) : 0.5;
          const clampedOffset = Math.max(0, Math.min(1, zeroOffset));

          return (
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Guthaben-Verlauf</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {MONTH_RANGES.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setBalanceMonthRange(key)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    balanceMonthRange === key
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={balanceData}>
                <defs>
                  <linearGradient id="bilanzGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.8} />
                    <stop offset={`${clampedOffset * 100}%`} stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset={`${clampedOffset * 100}%`} stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value: number) => `${formatNumber(value, 2)} €`} />
                <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
                <Area
                  type="monotone"
                  dataKey="bilanz"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#bilanzGradient)"
                  name="Bilanz"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          );
        })()}

        {/* Kontostand-Prognose */}
        {forecastData.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Kontostand-Prognose</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={forecastData}>
                <defs>
                  <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value: number) => `${formatNumber(value, 2)} €`} />
                <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
                <Area
                  type="monotone"
                  dataKey="bilanz"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  fill="url(#forecastGradient)"
                  name="Prog. Kontostand"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Price Trend */}
        {monthlyData.length > 0 && monthlyData.some(d => d.preis) && (
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Preisentwicklung</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 10 }}
                  domain={['auto', 'auto']}
                  label={{ value: 'ct/kWh', angle: -90, position: 'insideLeft', fontSize: 10 }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 10 }}
                  domain={['auto', 'auto']}
                  label={{ value: '€/Mt', angle: 90, position: 'insideRight', fontSize: 10 }}
                />
                <Tooltip
                  formatter={(value: number, name: string) =>
                    name === 'Arbeitspreis' ? `${formatNumber(value, 2)} ct/kWh` : `${formatNumber(value, 2)} €/Mt`
                  }
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="stepAfter"
                  dataKey="preis"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  name="Arbeitspreis"
                  connectNulls
                />
                <Line
                  yAxisId="right"
                  type="stepAfter"
                  dataKey="fixMonatlich"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  name="Fixkosten"
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 4. Optimaler Abschlag */}
        {monthlyData.length > 3 && (() => {
          const currentAdvance = advancePayments.length > 0
            ? advancePayments.sort((a, b) => new Date(b.validFrom).getTime() - new Date(a.validFrom).getTime())[0]?.monthlyAmount || 0
            : 0;

          const avgMonthlyKosten = monthlyData.reduce((s: number, m: any) => s + (m.kosten || 0), 0) / monthlyData.length;
          const optimalerAbschlag = Math.ceil(avgMonthlyKosten);
          const differenz = currentAdvance - optimalerAbschlag;

          // Simuliere verschiedene Abschläge
          const simulationData = [-30, -20, -10, 0, 10, 20, 30].map(offset => {
            const abschlag = optimalerAbschlag + offset;
            let bilanz = 0;
            monthlyData.forEach((m: any) => {
              bilanz += abschlag - (m.kosten || 0);
            });
            return {
              abschlag,
              name: `${abschlag}€`,
              bilanz: Math.round(bilanz),
              isOptimal: offset === 0,
              isCurrent: Math.abs(abschlag - currentAdvance) < 5,
            };
          });

          return (
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Abschlag-Optimierung</h3>
              <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-xs text-gray-500">Aktuell</div>
                  <div className="text-lg font-bold text-gray-600">{currentAdvance} €</div>
                </div>
                <div className="bg-green-50 rounded-lg p-2">
                  <div className="text-xs text-gray-500">Optimal</div>
                  <div className="text-lg font-bold text-green-600">{optimalerAbschlag} €</div>
                </div>
                <div className={`rounded-lg p-2 ${differenz > 0 ? 'bg-blue-50' : 'bg-yellow-50'}`}>
                  <div className="text-xs text-gray-500">Differenz</div>
                  <div className={`text-lg font-bold ${differenz > 0 ? 'text-blue-600' : 'text-yellow-600'}`}>
                    {differenz > 0 ? '+' : ''}{differenz} €
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={simulationData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <ReferenceLine y={0} stroke="#000" />
                  <Tooltip formatter={(value: number) => `${formatNumber(value, 0)} € Bilanz`} />
                  <Bar dataKey="bilanz" name="Jahresbilanz">
                    {simulationData.map((entry, index) => (
                      <Cell key={index} fill={entry.isOptimal ? '#22c55e' : entry.isCurrent ? '#3b82f6' : '#94a3b8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-gray-400 mt-2">
                Grün = Optimal (Ø Kosten), Blau = Dein aktueller Abschlag. Simulation über {monthlyData.length} Monate.
              </p>
            </div>
          );
        })()}

        {/* Monatliche Übersicht - Karten-Darstellung */}
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-900 px-1">Monatsverlauf</h2>
          {[...data.monthlyBreakdown].reverse().map((m) => (
            <div key={m.month} className="bg-white rounded-lg shadow p-4">
              {/* Header */}
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    {MONTH_NAMES[m.monthNum - 1]} {m.year}
                    {(m as any).isProjected && (
                      <span className="text-xs bg-yellow-200 text-yellow-800 px-1.5 py-0.5 rounded">
                        Prognose
                      </span>
                    )}
                  </h3>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {(m as any).tariffName} · {((m as any).pricePerKwh * 100).toFixed(2)} ct/kWh + {formatNumber((m as any).fixedMonthly || 0, 2)} €/Mt
                  </div>
                </div>
                <div className={`px-2 py-1 rounded text-sm font-medium ${
                  (m.payments - m.cost) >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {(m.payments - m.cost) >= 0 ? '+' : ''}{formatNumber(m.payments - m.cost, 2)} €
                </div>
              </div>

              {/* Daten Grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded p-2">
                  <div className="text-gray-500">Verbrauch</div>
                  <div className="font-semibold">{formatNumber(m.consumption, 0)} kWh</div>
                  <div className="text-xs text-gray-400">
                    {formatNumber(m.consumption / (m.consumption > 0 ? Math.ceil(m.consumption / (m.endReading - (m as any).startReading || 30)) : 30), 1)} kWh/Tag
                  </div>
                </div>
                <div className="bg-gray-50 rounded p-2">
                  <div className="text-gray-500">Kosten</div>
                  <div className="font-semibold">{formatNumber(m.cost, 2)} €</div>
                </div>
                <div className="bg-gray-50 rounded p-2">
                  <div className="text-gray-500">Gezahlt</div>
                  <div className="font-semibold">{formatNumber((m as any).paymentsIn || 0, 2)} €</div>
                </div>
                {((m as any).refunds > 0) && (
                  <div className="bg-gray-50 rounded p-2">
                    <div className="text-gray-500">Rückzahlung</div>
                    <div className="font-semibold">{formatNumber((m as any).refunds, 2)} €</div>
                  </div>
                )}
                <div className="bg-gray-50 rounded p-2">
                  <div className="text-gray-500">Zählerstand</div>
                  <div className="font-semibold">
                    {m.endReading ? formatNumber(m.endReading, 0) : '-'} kWh
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
