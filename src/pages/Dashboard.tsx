import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Wallet, Calendar, RefreshCw, Flame, TrendingUp, TrendingDown, Zap, Thermometer } from 'lucide-react';
import { useStore } from '../lib/store';
import { api } from '../lib/api';
import type { BalanceData } from '../lib/api';
import { formatDate, formatNumber, formatRelativeTime } from '../lib/utils';

interface ElwaData {
  power: number | null;
  tempBottom: number | null;
  tempTop: number | null;
}

export default function Dashboard() {
  const { statistics, setStatistics, setReadings } = useStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
    const [currentAdvance, setCurrentAdvance] = useState<number | null>(null);
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [currentMonthProjection, setCurrentMonthProjection] = useState<{consumption: number; cost: number; lastYearConsumption?: number; lastYearCost?: number} | null>(null);
  const [elwa, setElwa] = useState<ElwaData | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [stats, readings, advance, balanceData, settings] = await Promise.all([
        api.statistics.get(),
        api.readings.getAll(),
        api.advancePayments.getCurrent(),
        api.balance.get(),
        api.settings.get(),
      ]);
      setStatistics(stats);
      setReadings(readings);
      setCurrentAdvance(advance?.monthlyAmount || null);
      setBalance(balanceData);
      // Extract current month projection and last year comparison
      const currentMonth = balanceData.monthlyBreakdown.find((m: any) => m.isProjected);
      if (currentMonth) {
        // Find same month last year
        const lastYearMonth = balanceData.monthlyBreakdown.find((m: any) =>
          m.monthNum === currentMonth.monthNum && m.year === currentMonth.year - 1
        );
        setCurrentMonthProjection({
          consumption: currentMonth.consumption,
          cost: currentMonth.cost,
          lastYearConsumption: lastYearMonth?.consumption,
          lastYearCost: lastYearMonth?.cost,
        });
      }

      // Load ELWA data if configured
      if (settings?.homeAssistantUrl && settings?.homeAssistantToken && settings?.elwaPowerSensorEntity) {
        const entities = [
          settings.elwaPowerSensorEntity,
          settings.elwaWaterTempBottomEntity,
          settings.elwaWaterTempTopEntity,
        ].filter(Boolean);

        const response = await fetch('/api/ha/values', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: settings.homeAssistantUrl,
            token: settings.homeAssistantToken,
            entities,
          }),
        });
        const values = await response.json();
        setElwa({
          power: (settings.elwaPowerSensorEntity && values[settings.elwaPowerSensorEntity]) ?? null,
          tempBottom: (settings.elwaWaterTempBottomEntity && values[settings.elwaWaterTempBottomEntity]) ?? null,
          tempTop: (settings.elwaWaterTempTopEntity && values[settings.elwaWaterTempTopEntity]) ?? null,
        });
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Server nicht erreichbar. Starte: cd server && npm run dev');
    } finally {
      setLoading(false);
    }
  }

  // Trend: Letzte 7 Tage vs. Gesamtdurchschnitt
  const { readings } = useStore.getState();
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recentReadings = readings.filter(r => r.timestamp >= sevenDaysAgo && r.consumption);
  const recentAvg = recentReadings.length > 0
    ? recentReadings.reduce((sum, r) => sum + (r.consumption || 0), 0) /
      recentReadings.reduce((sum, r) => sum + (r.daysSinceLastReading || 1), 0)
    : null;
  const trendPercent = recentAvg && statistics?.averageConsumptionPerDay
    ? ((recentAvg - statistics.averageConsumptionPerDay) / statistics.averageConsumptionPerDay) * 100
    : null;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Subheader */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Dashboard</h2>
        <button onClick={loadData} className="p-2 text-gray-500 hover:text-gray-700 rounded-lg" disabled={loading}>
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="m-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm">
          {error}
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Aktueller Stand */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-sm font-medium text-gray-500 mb-1">Aktueller Zählerstand</h2>
          {statistics?.lastReading ? (
            <>
              <div className="text-3xl font-bold text-gray-900">
                {formatNumber(statistics.lastReading.meterValue, 0)} {statistics.lastReading.unit}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {formatRelativeTime(statistics.lastReading.timestamp)} · {formatDate(statistics.lastReading.timestamp)}
              </p>
              {(statistics.lastReading.consumption ?? 0) > 0 && statistics.lastReading.hoursSinceLastReading && (
                <p className="text-sm text-orange-600 mt-2">
                  +{formatNumber(statistics.lastReading.consumption ?? 0, 0)} kWh in {statistics.lastReading.hoursSinceLastReading}h
                  {statistics.lastReading.consumptionPerDay && (
                    <span className="text-gray-500"> · Ø {formatNumber(statistics.lastReading.consumptionPerDay, 1)} kWh/Tag</span>
                  )}
                </p>
              )}
            </>
          ) : (
            <div className="text-gray-400">Noch keine Ablesung erfasst</div>
          )}
        </div>

        {/* Statistik-Karten */}
        {statistics && statistics.totalReadings > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <Flame size={16} />
                <span className="text-xs">Ø pro Tag</span>
              </div>
              <div className="text-xl font-bold text-gray-900">
                {formatNumber(statistics.averageConsumptionPerDay, 1)} kWh
              </div>
            </div>

            <Link to="/balance" className="bg-white rounded-lg shadow p-4 block">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <Wallet size={16} />
                <span className="text-xs">Kontostand</span>
              </div>
              <div className={`text-xl font-bold ${balance && balance.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {balance ? `${balance.balance >= 0 ? '+' : ''}${formatNumber(balance.balance, 2)} €` : '...'}
              </div>
            </Link>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <Calendar size={16} />
                <span className="text-xs">Ablesungen</span>
              </div>
              <div className="text-xl font-bold text-gray-900">
                {statistics.totalReadings}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                {trendPercent !== null && trendPercent > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                <span className="text-xs">Trend 7 Tage</span>
              </div>
              <div className={`text-xl font-bold ${trendPercent !== null ? (trendPercent > 5 ? 'text-red-600' : trendPercent < -5 ? 'text-green-600' : 'text-gray-900') : 'text-gray-400'}`}>
                {trendPercent !== null ? `${trendPercent > 0 ? '+' : ''}${formatNumber(trendPercent, 0)}%` : '–'}
              </div>
            </div>
          </div>
        )}

        {/* Aktuelle Monatsprognose */}
        {currentMonthProjection && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg shadow p-4">
            <div className="flex items-center gap-2 text-yellow-700 mb-2">
              <Calendar size={16} />
              <span className="text-sm font-medium">Prognose {new Date().toLocaleString('de-DE', { month: 'long' })}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold text-gray-900">{formatNumber(currentMonthProjection.consumption, 0)} kWh</div>
                <div className="text-xs text-gray-500">Monatsverbrauch</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{formatNumber(currentMonthProjection.cost, 2)} €</div>
                <div className="text-xs text-gray-500">Monatskosten</div>
              </div>
            </div>
            <div className="flex justify-between items-end mt-2">
              {currentAdvance && (
                <div className={`text-sm ${currentAdvance >= currentMonthProjection.cost ? 'text-green-600' : 'text-red-600'}`}>
                  {currentAdvance >= currentMonthProjection.cost
                    ? `Ersparnis: ${formatNumber(currentAdvance - currentMonthProjection.cost, 2)} €`
                    : `Mehrkosten: ${formatNumber(currentMonthProjection.cost - currentAdvance, 2)} €`}
                  {' '}(Abschlag {formatNumber(currentAdvance, 0)} €)
                </div>
              )}
              {currentMonthProjection.lastYearConsumption && (() => {
                const diff = currentMonthProjection.consumption - currentMonthProjection.lastYearConsumption;
                const pct = (diff / currentMonthProjection.lastYearConsumption) * 100;
                return (
                  <div className={`text-xs ${diff <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    vs. Vorjahr: {diff > 0 ? '+' : ''}{formatNumber(pct, 0)}%
                  </div>
                );
              })()}
            </div>
          </div>
        )}


        {/* ELWA Heizstab */}
        {elwa && (
          <div className={`rounded-lg shadow p-4 ${elwa.power && elwa.power > 100 ? 'bg-yellow-50 border border-yellow-200' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap size={18} className={elwa.power && elwa.power > 100 ? 'text-yellow-500' : 'text-gray-400'} />
                <span className="font-medium text-gray-900">ELWA Heizstab</span>
              </div>
              {elwa.power !== null && elwa.power > 100 && (
                <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full">Aktiv</span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-xs text-gray-500 mb-1">Leistung</div>
                <div className={`font-bold ${elwa.power && elwa.power > 100 ? 'text-yellow-600' : 'text-gray-400'}`}>
                  {elwa.power !== null ? formatNumber(elwa.power, 0) : '–'} W
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1 flex items-center justify-center gap-1">
                  <Thermometer size={12} /> Unten
                </div>
                <div className="font-bold text-blue-600">
                  {elwa.tempBottom !== null ? formatNumber(elwa.tempBottom, 1) : '–'} °C
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1 flex items-center justify-center gap-1">
                  <Thermometer size={12} /> Oben
                </div>
                <div className="font-bold text-red-500">
                  {elwa.tempTop !== null ? formatNumber(elwa.tempTop, 1) : '–'} °C
                </div>
              </div>
            </div>
            {elwa.power !== null && elwa.power > 100 && (
              <p className="text-xs text-green-600 mt-3 text-center">
                PV-Überschuss heizt Wasser – keine Fernwärme nötig!
              </p>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/add-reading"
            className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg shadow p-4 flex flex-col items-center gap-2 transition-colors"
          >
            <PlusCircle size={24} />
            <span className="text-sm font-semibold">Neue Ablesung</span>
          </Link>
          <Link
            to="/history"
            className="bg-white rounded-lg shadow p-4 flex flex-col items-center gap-2 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Calendar size={24} className="text-orange-500" />
            <span className="text-sm font-semibold">Verlauf</span>
          </Link>
        </div>

        {/* Erinnerung */}
        {statistics && statistics.daysSinceLastReading > 7 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800">
              Letzte Ablesung vor {statistics.daysSinceLastReading} Tagen - Zeit für eine neue!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
