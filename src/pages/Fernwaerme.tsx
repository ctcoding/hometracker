import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine, Cell, ScatterChart, Scatter
} from 'recharts';
import { api } from '../lib/api';
import { formatNumber } from '../lib/utils';

const MONTH_NAMES = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

type TimeRange = '7d' | '30d' | '60d' | '90d' | 'thisMonth' | 'lastMonth' | '6m' | '12m' | 'all';
type MonthRange = '2m' | '3m' | '6m' | '12m' | 'all';

const TIME_RANGES: { key: TimeRange; label: string }[] = [
  { key: '7d', label: '7 Tage' },
  { key: '30d', label: '30 Tage' },
  { key: '60d', label: '60 Tage' },
  { key: '90d', label: '90 Tage' },
  { key: 'thisMonth', label: 'Dieser Monat' },
  { key: 'lastMonth', label: 'Letzter Monat' },
  { key: '6m', label: '6 Monate' },
  { key: '12m', label: '12 Monate' },
  { key: 'all', label: 'Alles' },
];

const MONTH_RANGES: { key: MonthRange; label: string }[] = [
  { key: '2m', label: '2 Monate' },
  { key: '3m', label: '3 Monate' },
  { key: '6m', label: '6 Monate' },
  { key: '12m', label: '12 Monate' },
  { key: 'all', label: 'Alles' },
];

export default function Fernwaerme() {
  const [loading, setLoading] = useState(true);
  const [readings, setReadings] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('90d');
  const [consumptionMonthRange, setConsumptionMonthRange] = useState<MonthRange>('12m');
  const [costsMonthRange, setCostsMonthRange] = useState<MonthRange>('12m');
  const [showLastYear, setShowLastYear] = useState(false);
  const [showTemperature, setShowTemperature] = useState(false);
  const [warmwasserGrundlast, setWarmwasserGrundlast] = useState(8); // kWh/Tag Default
  const [advancePayments, setAdvancePayments] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [readingsData, balanceData, advanceData] = await Promise.all([
        api.readings.getAll(),
        api.balance.get(),
        api.advancePayments.getAll(),
      ]);

      setReadings(readingsData);
      setAdvancePayments(advanceData);

      // Transform balance data for charts (already includes projections)
      const chartData = balanceData.monthlyBreakdown.map((m: any) => ({
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

      setMonthlyData(chartData);
    } catch (err) {
      console.error('Failed to load statistics:', err);
    } finally {
      setLoading(false);
    }
  }

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

  // Filter readings by time range
  const getFilteredReadings = () => {
    const now = new Date();
    const filtered = readings.filter(r => r.consumptionPerDay && r.consumptionPerDay > 0);

    if (timeRange === 'all') return filtered;

    let startDate: Date;
    if (timeRange === '7d') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeRange === '30d') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (timeRange === '60d') {
      startDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    } else if (timeRange === '90d') {
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    } else if (timeRange === 'thisMonth') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (timeRange === 'lastMonth') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      return filtered.filter(r => {
        const d = new Date(r.timestamp);
        return d >= startDate && d <= endDate;
      });
    } else if (timeRange === '6m') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    } else if (timeRange === '12m') {
      startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    } else {
      return filtered;
    }

    return filtered.filter(r => new Date(r.timestamp) >= startDate);
  };

  const dailyData = getFilteredReadings()
    .reverse()
    .map(r => ({
      date: new Date(r.timestamp).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
      verbrauch: r.consumptionPerDay,
      temp: r.outdoorTempCurrent,
    }));

  // Filter monthly data by selected range
  const getMonthCount = (range: MonthRange) => {
    if (range === '2m') return 2;
    if (range === '3m') return 3;
    if (range === '6m') return 6;
    if (range === '12m') return 12;
    return monthlyData.length;
  };
  // Add last year data for comparison
  const enrichWithLastYear = (data: any[]) => {
    return data.map(m => {
      const lastYearMonth = monthlyData.find((ly: any) =>
        ly.monthNum === m.monthNum && ly.year === m.year - 1
      );
      return {
        ...m,
        verbrauchVorjahr: lastYearMonth?.verbrauch,
        kostenVorjahr: lastYearMonth?.kosten,
      };
    });
  };

  const consumptionData = enrichWithLastYear(monthlyData.slice(-getMonthCount(consumptionMonthRange)));
  const costsData = enrichWithLastYear(monthlyData.slice(-getMonthCount(costsMonthRange)));

  const totalConsumption = readings.length > 1
    ? readings[0].meterValue - readings[readings.length - 1].meterValue
    : 0;

  const avgDailyConsumption = readings.length > 0
    ? readings
        .filter(r => r.consumptionPerDay > 0)
        .reduce((sum, r) => sum + r.consumptionPerDay, 0) / readings.filter(r => r.consumptionPerDay > 0).length
    : 0;

  const forecastResult = generateForecast();
  const forecastData = Array.isArray(forecastResult) ? [] : (forecastResult.forecast || []);
  const trendFactor = Array.isArray(forecastResult) ? 1 : (forecastResult.trendFactor || 1);
  const projectedBalance = Array.isArray(forecastResult) ? null : forecastResult.projectedBalance;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Subheader */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Fernwärme</h2>
        <button onClick={loadData} className="p-2 text-gray-500 hover:text-gray-700 rounded-lg" disabled={loading}>
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="p-4 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Gesamtverbrauch</div>
            <div className="text-2xl font-bold text-gray-900">
              {formatNumber(totalConsumption, 0)} kWh
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Ø Tagesverbrauch</div>
            <div className="text-2xl font-bold text-gray-900">
              {formatNumber(avgDailyConsumption, 1)} kWh
            </div>
          </div>
        </div>

        {/* Daily Consumption Chart */}
        {readings.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-gray-900">Tagesverbrauch</h3>
              <button
                onClick={() => setShowTemperature(!showTemperature)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  showTemperature ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Temperatur
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {TIME_RANGES.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setTimeRange(key)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    timeRange === key
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 10 }}
                  label={showTemperature ? { value: 'kWh', angle: -90, position: 'insideLeft', fontSize: 10 } : undefined}
                />
                {showTemperature && (
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 10 }}
                    label={{ value: '°C', angle: 90, position: 'insideRight', fontSize: 10 }}
                  />
                )}
                <Tooltip />
                {showTemperature && <Legend />}
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="verbrauch"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="kWh/Tag"
                />
                {showTemperature && (
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="temp"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    name="Temperatur"
                    connectNulls
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
            ) : (
              <div className="h-32 flex items-center justify-center text-gray-400 text-sm">
                Keine Daten im gewählten Zeitraum
              </div>
            )}
          </div>
        )}

        {/* Temperature Correlation Analysis - uses same timeRange as daily chart */}
        {(() => {
          // Filter readings with both temperature and consumption data, using same filter as daily
          const filteredReadings = getFilteredReadings();
          const tempData = filteredReadings.filter(r =>
            r.outdoorTempCurrent !== null &&
            r.outdoorTempCurrent !== undefined &&
            r.consumptionPerDay > 0
          );

          if (tempData.length < 2) return null;

          // Scatter data
          const scatterData = tempData.map(r => ({
            temp: r.outdoorTempCurrent,
            verbrauch: r.consumptionPerDay,
          }));

          // Calculate correlation coefficient (Pearson's r)
          const n = scatterData.length;
          const sumX = scatterData.reduce((s, d) => s + d.temp, 0);
          const sumY = scatterData.reduce((s, d) => s + d.verbrauch, 0);
          const sumXY = scatterData.reduce((s, d) => s + d.temp * d.verbrauch, 0);
          const sumX2 = scatterData.reduce((s, d) => s + d.temp * d.temp, 0);
          const sumY2 = scatterData.reduce((s, d) => s + d.verbrauch * d.verbrauch, 0);
          const r = (n * sumXY - sumX * sumY) /
            Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
          const r2 = r * r;

          // Linear regression for trend line
          const avgX = sumX / n;
          const avgY = sumY / n;
          const slope = (sumXY - n * avgX * avgY) / (sumX2 - n * avgX * avgX);
          const intercept = avgY - slope * avgX;
          const minTemp = Math.min(...scatterData.map(d => d.temp));
          const maxTemp = Math.max(...scatterData.map(d => d.temp));
          const trendLine = [
            { temp: minTemp, trend: slope * minTemp + intercept },
            { temp: maxTemp, trend: slope * maxTemp + intercept },
          ];

          // Group by temperature ranges
          const ranges = [
            { label: '< -10°', min: -50, max: -10 },
            { label: '-10 bis -5°', min: -10, max: -5 },
            { label: '-5 bis 0°', min: -5, max: 0 },
            { label: '0-5°', min: 0, max: 5 },
            { label: '5-10°', min: 5, max: 10 },
            { label: '10-15°', min: 10, max: 15 },
            { label: '> 15°', min: 15, max: 50 },
          ];
          const rangeData = ranges.map(range => {
            const inRange = scatterData.filter(d => d.temp >= range.min && d.temp < range.max);
            return {
              name: range.label,
              avgVerbrauch: inRange.length > 0 ? inRange.reduce((s, d) => s + d.verbrauch, 0) / inRange.length : 0,
              count: inRange.length,
            };
          }).filter(d => d.count > 0);

          // Warmwasser-Grundlast: aus warmen Tagen ODER manueller Wert
          const warmDays = scatterData.filter(d => d.temp > 15);
          const autoBaseLoad = warmDays.length >= 3
            ? warmDays.reduce((s, d) => s + d.verbrauch, 0) / warmDays.length
            : null;
          const baseLoad = autoBaseLoad ?? warmwasserGrundlast; // Fallback auf manuellen Wert
          const isManualBaseLoad = autoBaseLoad === null;

          // Bereinigte Daten (Verbrauch minus Warmwasser-Grundlast)
          const adjustedData = scatterData.map(d => ({
            ...d,
            heizung: Math.max(0, d.verbrauch - baseLoad),
          }));

          // Bereinigte Korrelation (nur Heizanteil)
          const adjN = adjustedData.length;
          const adjSumX = adjustedData.reduce((s, d) => s + d.temp, 0);
          const adjSumY = adjustedData.reduce((s, d) => s + d.heizung, 0);
          const adjSumXY = adjustedData.reduce((s, d) => s + d.temp * d.heizung, 0);
          const adjSumX2 = adjustedData.reduce((s, d) => s + d.temp * d.temp, 0);
          const adjSumY2 = adjustedData.reduce((s, d) => s + d.heizung * d.heizung, 0);
          const adjR = (adjN * adjSumXY - adjSumX * adjSumY) /
            Math.sqrt((adjN * adjSumX2 - adjSumX * adjSumX) * (adjN * adjSumY2 - adjSumY * adjSumY));
          const adjR2 = isNaN(adjR) ? 0 : adjR * adjR;

          // Heizgradtage (HGT): kWh per degree below 20°C (bereinigt)
          const hgtData = tempData
            .filter(r => r.outdoorTempCurrent < 15) // Nur wenn wirklich geheizt wird
            .map(r => {
              const hgt = 20 - r.outdoorTempCurrent;
              const heizanteil = Math.max(0, r.consumptionPerDay - baseLoad);
              return { hgt, efficiency: heizanteil / hgt };
            });
          const avgEfficiency = hgtData.length > 0
            ? hgtData.reduce((s, d) => s + d.efficiency, 0) / hgtData.length
            : 0;

          // R² Bewertung
          const getR2Rating = (val: number) => {
            if (val >= 0.7) return { text: 'Stark', color: 'text-green-600', bg: 'bg-green-50' };
            if (val >= 0.4) return { text: 'Mittel', color: 'text-yellow-600', bg: 'bg-yellow-50' };
            return { text: 'Schwach', color: 'text-red-500', bg: 'bg-red-50' };
          };
          const r2Rating = getR2Rating(adjR2);

          return (
            <>
              {/* Scatter Plot */}
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="font-semibold text-gray-900 mb-1">Temperatur vs. Verbrauch</h3>
                <div className="text-xs text-gray-500 mb-3">
                  Korrelation r = {formatNumber(r, 2)} · R² = {formatNumber(r2 * 100, 1)}% · {n} Datenpunkte
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="temp"
                      type="number"
                      name="Temperatur"
                      unit="°C"
                      tick={{ fontSize: 10 }}
                      label={{ value: '°C', position: 'insideBottomRight', fontSize: 10 }}
                    />
                    <YAxis
                      dataKey="verbrauch"
                      type="number"
                      name="Verbrauch"
                      unit=" kWh"
                      tick={{ fontSize: 10 }}
                      label={{ value: 'kWh/Tag', angle: -90, position: 'insideLeft', fontSize: 10 }}
                    />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter data={scatterData} fill="#f97316" />
                    <Line
                      data={trendLine}
                      type="linear"
                      dataKey="trend"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                      legendType="none"
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>

              {/* Temperature Range Bars */}
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Ø Verbrauch nach Temperaturbereich</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={rangeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        `${formatNumber(value, 1)} kWh/Tag`,
                        'Ø Verbrauch'
                      ]}
                      labelFormatter={(label) => {
                        const item = rangeData.find(d => d.name === label);
                        return `${label} (${item?.count || 0} Messungen)`;
                      }}
                    />
                    <Bar dataKey="avgVerbrauch" fill="#f97316" name="Ø kWh/Tag" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Heating Analysis with Base Load */}
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="font-semibold text-gray-900 mb-1">Heizanalyse (bereinigt)</h3>
                <div className="text-xs text-gray-500 mb-3">
                  Warmwasser-Grundlast abgezogen für aussagekräftigere Heiz-Korrelation
                </div>

                {/* Warmwasser-Slider wenn manuell */}
                {isManualBaseLoad && (
                  <div className="bg-blue-50 rounded-lg p-3 mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500 select-none">Warmwasser-Grundlast (manuell)</span>
                      <span className="text-sm font-bold text-blue-600 select-none">{warmwasserGrundlast.toFixed(1)} kWh/Tag</span>
                    </div>
                    <div className="py-2 select-none">
                      <input
                        type="range"
                        min="0"
                        max="15"
                        step="0.5"
                        value={warmwasserGrundlast}
                        onChange={(e) => setWarmwasserGrundlast(parseFloat(e.target.value))}
                        className="w-full h-8 bg-transparent rounded-lg appearance-none cursor-pointer touch-none [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:bg-blue-200 [&::-webkit-slider-runnable-track]:rounded-lg [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:-mt-2 [&::-moz-range-track]:h-2 [&::-moz-range-track]:bg-blue-200 [&::-moz-range-track]:rounded-lg [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-md"
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>0 kWh</span>
                      <span>~2-3 kWh/Person</span>
                      <span>15 kWh</span>
                    </div>
                  </div>
                )}

                {/* Aufschlüsselung */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500">Warmwasser {isManualBaseLoad ? '(manuell)' : '(berechnet)'}</div>
                    <div className="text-lg font-bold text-blue-600">
                      ~{formatNumber(baseLoad, 1)} kWh/Tag
                    </div>
                    <div className="text-xs text-gray-400">
                      {isManualBaseLoad ? 'Keine warmen Tage im Zeitraum' : `${warmDays.length} Tage >15°C als Basis`}
                    </div>
                  </div>
                  <div className={`rounded-lg p-3 ${
                    avgEfficiency <= 0.9 ? 'bg-green-50' :
                    avgEfficiency <= 1.4 ? 'bg-yellow-50' :
                    'bg-orange-50'
                  }`}>
                    <div className="text-xs text-gray-500">Heiz-Effizienz</div>
                    <div className={`text-lg font-bold ${
                      avgEfficiency <= 0.9 ? 'text-green-600' :
                      avgEfficiency <= 1.4 ? 'text-yellow-600' :
                      'text-orange-600'
                    }`}>
                      {formatNumber(avgEfficiency, 2)} kWh/HGT
                    </div>
                    <div className={`text-xs font-medium ${
                      avgEfficiency <= 0.9 ? 'text-green-600' :
                      avgEfficiency <= 1.4 ? 'text-yellow-600' :
                      'text-orange-600'
                    }`}>
                      {avgEfficiency <= 0.9 ? '✓ Besser als EH 40' :
                       avgEfficiency <= 1.4 ? '○ EH 40 Standard erfüllt' :
                       '△ Über EH 40 Standard'}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      EH 40 Ziel: ~0,9 kWh/HGT (180m²)
                    </div>
                  </div>
                </div>

                {/* R² Erklärung */}
                <div className={`rounded-lg p-3 ${r2Rating.bg}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-gray-500">Korrelation Temperatur → Heizung</div>
                      <div className={`text-xl font-bold ${r2Rating.color}`}>
                        R² = {formatNumber(adjR2 * 100, 0)}% ({r2Rating.text})
                      </div>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      <div>&gt;70% = Stark</div>
                      <div>40-70% = Mittel</div>
                      <div>&lt;40% = Schwach</div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    R² = Wie viel % des Verbrauchs durch Temperatur erklärbar ist.
                    {adjR2 < 0.5 && ''}
                  </p>
                </div>

                <p className="text-xs text-gray-400 mt-3 border-t pt-2">
                  <strong>Hinweis:</strong> Fernwärme = Heizung + Warmwasser. Die Grundlast (~{formatNumber(baseLoad, 1)} kWh/Tag)
                  {isManualBaseLoad
                    ? ' ist manuell eingestellt (keine warmen Tage >15°C im Zeitraum). Passe den Slider an für 5 Personen: ~8 kWh/Tag.'
                    : ' wird aus warmen Tagen geschätzt.'
                  }
                </p>
              </div>
            </>
          );
        })()}

        {/* Monthly Consumption Chart */}
        {monthlyData.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-gray-900">Monatsverbrauch</h3>
              <button
                onClick={() => setShowLastYear(!showLastYear)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  showLastYear ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Vorjahr
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {MONTH_RANGES.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setConsumptionMonthRange(key)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    consumptionMonthRange === key
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={consumptionData}>
                <defs>
                  <pattern id="projectedPattern" patternUnits="userSpaceOnUse" width="8" height="8">
                    <path d="M-2,2 l4,-4 M0,8 l8,-8 M6,10 l4,-4" stroke="#f97316" strokeWidth="2" fill="none" />
                  </pattern>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                {showLastYear && <Legend />}
                <Bar dataKey="verbrauch" name="Verbrauch (kWh)">
                  {consumptionData.map((entry, index) => (
                    <Cell key={index} fill={entry.isProjected ? 'url(#projectedPattern)' : '#f97316'} stroke={entry.isProjected ? '#f97316' : undefined} />
                  ))}
                </Bar>
                {showLastYear && (
                  <Bar dataKey="verbrauchVorjahr" fill="#94a3b8" name="Vorjahr (kWh)" />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Monthly Costs Chart */}
        {monthlyData.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-gray-900">Kosten vs. Abschläge</h3>
              <button
                onClick={() => setShowLastYear(!showLastYear)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  showLastYear ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Vorjahr
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {MONTH_RANGES.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setCostsMonthRange(key)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    costsMonthRange === key
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={costsData}>
                <defs>
                  <pattern id="projectedCostPattern" patternUnits="userSpaceOnUse" width="8" height="8">
                    <path d="M-2,2 l4,-4 M0,8 l8,-8 M6,10 l4,-4" stroke="#ef4444" strokeWidth="2" fill="none" />
                  </pattern>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value: number) => `${formatNumber(value, 2)} €`} />
                <Legend />
                <Bar dataKey="abschlag" fill="#22c55e" name="Abschlag" />
                <Bar dataKey="kosten" name="Kosten" fill="#ef4444">
                  {costsData.map((entry, index) => (
                    <Cell key={index} fill={entry.isProjected ? 'url(#projectedCostPattern)' : '#ef4444'} stroke={entry.isProjected ? '#ef4444' : undefined} />
                  ))}
                </Bar>
                {showLastYear && (
                  <Bar dataKey="kostenVorjahr" fill="#94a3b8" name="Vorjahr" />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 3. Wochentag-Analyse */}
        {readings.length > 5 && (() => {
          const weekdays = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
          const byWeekday: Record<number, number[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };

          readings.filter(r => r.consumptionPerDay > 0).forEach(r => {
            const day = new Date(r.timestamp).getDay();
            byWeekday[day].push(r.consumptionPerDay);
          });

          const weekdayData = weekdays.map((name, i) => {
            const values = byWeekday[i];
            const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
            return { name, verbrauch: Math.round(avg * 10) / 10, count: values.length };
          });

          const wochenende = (weekdayData[0].verbrauch + weekdayData[6].verbrauch) / 2;
          const wochentage = weekdayData.slice(1, 6).reduce((s, d) => s + d.verbrauch, 0) / 5;
          const diff = wochenende - wochentage;

          return (
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Verbrauch nach Wochentag</h3>
              <div className="bg-gray-50 rounded-lg p-2 mb-4 text-center">
                <span className="text-sm">Wochenende vs. Werktage: </span>
                <span className={`font-bold ${diff > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {diff > 0 ? '+' : ''}{formatNumber(diff, 1)} kWh/Tag
                </span>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={weekdayData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(value: number) => `${formatNumber(value, 1)} kWh/Tag`} />
                  <Bar dataKey="verbrauch" name="Ø kWh/Tag">
                    {weekdayData.map((entry, index) => (
                      <Cell key={index} fill={index === 0 || index === 6 ? '#8b5cf6' : '#f97316'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-gray-400 mt-2">
                Lila = Wochenende, Orange = Werktage
              </p>
            </div>
          );
        })()}

        {/* 12-Month Forecast */}
        {forecastData.length > 0 && (
          <>
            {/* Forecast Summary */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg shadow p-4 border border-purple-200">
              <h3 className="font-semibold text-gray-900 mb-3">12-Monats-Prognose</h3>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-xs text-gray-500">Trend vs. Vorjahr</div>
                  <div className={`text-lg font-bold ${trendFactor < 1 ? 'text-green-600' : 'text-red-600'}`}>
                    {trendFactor < 1 ? '' : '+'}{formatNumber((trendFactor - 1) * 100, 0)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Prog. Verbrauch</div>
                  <div className="text-lg font-bold text-gray-900">
                    {formatNumber(forecastData.reduce((s, f) => s + f.verbrauch, 0), 0)} kWh
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Prog. Kontostand</div>
                  <div className={`text-lg font-bold ${projectedBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {projectedBalance >= 0 ? '+' : ''}{formatNumber(projectedBalance, 0)} €
                  </div>
                </div>
              </div>
            </div>

            {/* Forecast Chart - Consumption */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Verbrauchsprognose (nächste 12 Monate)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={forecastData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(value: number) => `${formatNumber(value, 0)} kWh`} />
                  <Legend />
                  <Bar dataKey="verbrauch" fill="#8b5cf6" name="Prognose" fillOpacity={0.7} />
                  <Bar dataKey="vorjahr" fill="#94a3b8" name="Vorjahr" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* No Data Message */}
        {!loading && readings.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p>Noch keine Daten vorhanden</p>
            <p className="text-sm mt-2">Erfasse zuerst einige Ablesungen</p>
          </div>
        )}
      </div>
    </div>
  );
}
