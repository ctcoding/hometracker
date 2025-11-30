import { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Sun, Thermometer, Wind, Zap } from 'lucide-react';

interface HAMetric {
  id: number;
  timestamp: string;
  brightness_east: number | null;
  brightness_south: number | null;
  brightness_west: number | null;
  wind_speed: number | null;
  temp_outdoor_south: number | null;
  temp_outdoor_north: number | null;
  pv_production: number | null;
  elwa_power: number | null;
  createdAt: string;
}

export default function Umwelt() {
  const [metrics, setMetrics] = useState<HAMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');

  useEffect(() => {
    fetchMetrics();
  }, [timeRange]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const now = new Date();
      const start = new Date();

      if (timeRange === '24h') {
        start.setHours(now.getHours() - 24);
      } else if (timeRange === '7d') {
        start.setDate(now.getDate() - 7);
      } else {
        start.setDate(now.getDate() - 30);
      }

      const response = await fetch(
        `/api/homeassistant/metrics?start=${start.toISOString()}&end=${now.toISOString()}&limit=1000`
      );
      const data = await response.json();
      setMetrics(data.reverse()); // Oldest first for charts
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Transform data for charts
  const chartData = metrics.map(m => ({
    time: new Date(m.timestamp).toLocaleString('de-DE', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }),
    tempSouth: m.temp_outdoor_south,
    tempNorth: m.temp_outdoor_north,
    brightEast: m.brightness_east,
    brightSouth: m.brightness_south,
    brightWest: m.brightness_west,
    wind: m.wind_speed,
    pv: m.pv_production,
    elwa: m.elwa_power
  }));

  // Latest values for cards
  const latest = metrics[metrics.length - 1];

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Umwelt & Energie</h1>
        <div className="text-gray-500">Lade Daten...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Umwelt & Energie</h1>
        <div className="flex gap-2">
          {(['24h', '7d', '30d'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg font-medium ${
                timeRange === range
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-orange-400 to-red-500 rounded-xl p-6 text-white">
          <Thermometer className="mb-2" size={24} />
          <div className="text-sm opacity-90">Temperatur Süd</div>
          <div className="text-3xl font-bold">{latest?.temp_outdoor_south?.toFixed(1) || '--'}°C</div>
        </div>

        <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl p-6 text-white">
          <Sun className="mb-2" size={24} />
          <div className="text-sm opacity-90">Helligkeit Süd</div>
          <div className="text-3xl font-bold">{latest?.brightness_south ? Math.round(latest.brightness_south) : '--'} lx</div>
        </div>

        <div className="bg-gradient-to-br from-blue-400 to-cyan-500 rounded-xl p-6 text-white">
          <Wind className="mb-2" size={24} />
          <div className="text-sm opacity-90">Wind</div>
          <div className="text-3xl font-bold">{latest?.wind_speed?.toFixed(1) || '--'} km/h</div>
        </div>

        <div className="bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl p-6 text-white">
          <Zap className="mb-2" size={24} />
          <div className="text-sm opacity-90">PV-Leistung</div>
          <div className="text-3xl font-bold">{latest?.pv_production?.toFixed(2) || '--'} kW</div>
        </div>
      </div>

      {/* Temperature Chart */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Außentemperatur</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 12 }}
              interval={Math.floor(chartData.length / 10)}
            />
            <YAxis label={{ value: '°C', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="tempSouth" stroke="#f97316" name="Süd" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="tempNorth" stroke="#3b82f6" name="Nord" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Brightness Chart */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Helligkeit (Sonnenverlauf)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 12 }}
              interval={Math.floor(chartData.length / 10)}
            />
            <YAxis label={{ value: 'Lux', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="brightEast" stackId="1" stroke="#f59e0b" fill="#fef3c7" name="Ost" />
            <Area type="monotone" dataKey="brightSouth" stackId="1" stroke="#eab308" fill="#fef08a" name="Süd" />
            <Area type="monotone" dataKey="brightWest" stackId="1" stroke="#fb923c" fill="#fed7aa" name="West" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* PV vs ELWA Chart */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Energie: PV-Ertrag vs. ELWA-Verbrauch</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 12 }}
              interval={Math.floor(chartData.length / 10)}
            />
            <YAxis label={{ value: 'kW', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="pv" fill="#10b981" name="PV-Ertrag" />
            <Bar dataKey="elwa" fill="#f59e0b" name="ELWA-Verbrauch" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Wind Chart */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">Windgeschwindigkeit</h2>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 12 }}
              interval={Math.floor(chartData.length / 10)}
            />
            <YAxis label={{ value: 'km/h', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Line type="monotone" dataKey="wind" stroke="#06b6d4" strokeWidth={2} dot={false} name="Wind" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
