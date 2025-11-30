import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ChevronDown, Trash2, Pencil, Filter } from 'lucide-react';
import { useStore } from '../lib/store';
import { api } from '../lib/api';
import { formatNumber } from '../lib/utils';
import type { Reading } from '../types';
import SwipeableItem from '../components/SwipeableItem';

const PAGE_SIZE = 30;

export default function History() {
  const { readings, setReadings } = useStore();
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [showMonthEndOnly, setShowMonthEndOnly] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ meterValue: '', notes: '', date: '', time: '', outdoorTemp: '', nightTemp: '', weather: '' });
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadReadings();
  }, []);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && displayCount < filteredReadings.length) {
          setDisplayCount((prev) => Math.min(prev + PAGE_SIZE, filteredReadings.length));
        }
      },
      { threshold: 0.1 }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => observer.disconnect();
  }, [displayCount, readings.length, showMonthEndOnly]);

  async function loadReadings() {
    setLoading(true);
    try {
      const data = await api.readings.getAll();
      setReadings(data);
    } catch (err) {
      console.error('Failed to load readings:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    if (confirm('Ablesung wirklich löschen?')) {
      try {
        await api.readings.delete(id);
        loadReadings();
      } catch (err) {
        console.error('Failed to delete:', err);
      }
    }
  }

  function startEdit(reading: Reading) {
    const d = reading.timestamp;
    const dateStr = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
    const timeStr = `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
    setEditForm({
      meterValue: reading.meterValue.toString(),
      notes: reading.notes || '',
      date: dateStr,
      time: timeStr,
      outdoorTemp: reading.outdoorTempCurrent?.toString() || '',
      nightTemp: reading.outdoorTempNightAvg?.toString() || '',
      weather: reading.weatherCondition || '',
    });
    setEditingId(reading.id || null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({ meterValue: '', notes: '', date: '', time: '', outdoorTemp: '', nightTemp: '', weather: '' });
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    try {
      const [hours, minutes] = editForm.time.split(':').map(Number);
      const timestamp = new Date(editForm.date);
      timestamp.setHours(hours, minutes, 0, 0);
      await api.readings.update(editingId, {
        meterValue: parseFloat(editForm.meterValue),
        timestamp,
        notes: editForm.notes || undefined,
        outdoorTempCurrent: editForm.outdoorTemp ? parseFloat(editForm.outdoorTemp) : undefined,
        outdoorTempNightAvg: editForm.nightTemp ? parseFloat(editForm.nightTemp) : undefined,
        weatherCondition: editForm.weather || undefined,
      });
      cancelEdit();
      loadReadings();
    } catch (err) {
      console.error('Failed to update:', err);
    }
  }

  // Filter: only last reading per month
  const filteredReadings = showMonthEndOnly
    ? getLastReadingPerMonth(readings)
    : readings;

  const displayedReadings = filteredReadings.slice(0, displayCount);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b p-4">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Verlauf</h1>
            <p className="text-sm text-gray-500">{filteredReadings.length} Ablesungen</p>
          </div>
          <Link
            to="/add-reading"
            className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1"
          >
            <Plus size={16} />
            Nachtragen
          </Link>
        </div>
        {/* Filter */}
        <button
          onClick={() => setShowMonthEndOnly(!showMonthEndOnly)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
            showMonthEndOnly
              ? 'bg-orange-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Filter size={14} />
          Nur Monatsende
        </button>
      </div>

      {/* Compact Readings List */}
      <div className="p-2">
        {filteredReadings.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>Noch keine Ablesungen vorhanden</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow divide-y">
            {displayedReadings.map((reading, index) => {
              // Calculate delta from next reading in list (which is previous chronologically)
              const nextReading = displayedReadings[index + 1];
              const calculatedDelta = nextReading ? reading.meterValue - nextReading.meterValue : undefined;
              const displayDelta = (reading.consumption && reading.consumption > 0) ? reading.consumption : calculatedDelta;

              return editingId === reading.id ? (
                <form key={reading.id} onSubmit={saveEdit} className="p-3 bg-orange-50 border-2 border-orange-300 space-y-2">
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500">Datum</label>
                      <input
                        type="date"
                        value={editForm.date}
                        onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                        className="w-full px-2 py-1 border rounded text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500">Uhrzeit</label>
                      <input
                        type="time"
                        value={editForm.time}
                        onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                        className="w-full px-2 py-1 border rounded text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500">Zählerstand</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.meterValue}
                        onChange={(e) => setEditForm({ ...editForm, meterValue: e.target.value })}
                        className="w-full px-2 py-1 border rounded text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500">Wetter</label>
                      <select
                        value={editForm.weather}
                        onChange={(e) => setEditForm({ ...editForm, weather: e.target.value })}
                        className="w-full px-2 py-1 border rounded text-sm bg-white"
                      >
                        <option value="">-</option>
                        <option value="sonnig">☀️ Sonnig</option>
                        <option value="bewölkt">☁️ Bewölkt</option>
                        <option value="regen">🌧️ Regen</option>
                        <option value="schnee">❄️ Schnee</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500">Außentemp °C</label>
                      <input
                        type="number"
                        step="0.1"
                        value={editForm.outdoorTemp}
                        onChange={(e) => setEditForm({ ...editForm, outdoorTemp: e.target.value })}
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500">Nacht-Temp °C</label>
                      <input
                        type="number"
                        step="0.1"
                        value={editForm.nightTemp}
                        onChange={(e) => setEditForm({ ...editForm, nightTemp: e.target.value })}
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-500">Notiz</label>
                      <input
                        type="text"
                        value={editForm.notes}
                        onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 bg-orange-500 text-white py-1 rounded text-sm">Speichern</button>
                    <button type="button" onClick={cancelEdit} className="px-3 py-1 border border-gray-300 rounded text-sm">Abbrechen</button>
                  </div>
                </form>
              ) : (
                <SwipeableItem
                  key={reading.id}
                  onDelete={() => reading.id && handleDelete(reading.id)}
                >
                  <ReadingRow
                    reading={reading}
                    delta={displayDelta}
                    onDelete={() => reading.id && handleDelete(reading.id)}
                    onEdit={() => startEdit(reading)}
                  />
                </SwipeableItem>
              );
            })}
          </div>
        )}

        {/* Load more trigger */}
        {displayCount < filteredReadings.length && (
          <div ref={loaderRef} className="py-4 text-center">
            <div className="inline-flex items-center gap-2 text-gray-400 text-sm">
              <ChevronDown size={16} className="animate-bounce" />
              Weitere laden ({filteredReadings.length - displayCount} verbleibend)
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getLastReadingPerMonth(readings: Reading[]): Reading[] {
  const byMonth = new Map<string, Reading>();

  // readings are sorted desc, so we iterate backwards to get last of each month
  for (const r of [...readings].reverse()) {
    const d = r.timestamp;
    const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    byMonth.set(key, r); // overwrites, keeping the latest
  }

  // Convert back to array and sort desc
  return Array.from(byMonth.values()).sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  );
}

function ReadingRow({ reading, delta, onDelete, onEdit }: { reading: Reading; delta?: number; onDelete: () => void; onEdit: () => void }) {
  const date = reading.timestamp;
  const dateStr = `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear().toString().slice(2)}`;

  return (
    <div className="flex items-center px-3 py-2 hover:bg-gray-50">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-xs text-gray-500 w-16 flex-shrink-0">{dateStr}</span>
          <span className="font-semibold text-gray-900 w-16 flex-shrink-0">
            {formatNumber(reading.meterValue, 0)}
          </span>
          {delta !== undefined ? (
            <span className={`text-sm w-20 flex-shrink-0 ${delta > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
              +{formatNumber(delta, 0)}
            </span>
          ) : (
            <span className="w-20 flex-shrink-0" />
          )}
          {reading.daysSinceLastReading && delta ? (
            <span className="text-xs text-gray-400 flex-shrink-0">
              ({reading.daysSinceLastReading}d · Ø{(delta / reading.daysSinceLastReading).toLocaleString('de-DE', {maximumFractionDigits: 1})}kWh)
            </span>
          ) : null}
          {reading.notes && (
            <span className="text-xs text-gray-400 truncate flex-1">
              {reading.notes}
            </span>
          )}
        </div>
        {/* Action buttons */}
        <div className="flex items-center gap-1 ml-2">
          <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded">
            <Pencil size={14} />
          </button>
          <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded">
            <Trash2 size={14} />
          </button>
        </div>
    </div>
  );
}
