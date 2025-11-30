import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Plus } from 'lucide-react';
import { api } from '../lib/api';
import type { Reading } from '../types';
import { READING_TAGS } from '../types';

export default function AddReading() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    meterValue: '',
    outdoorTemp: '',
    outdoorTempNight: '',
    notes: '',
    selectedTags: [] as string[],
  });

  function toggleTag(tag: string) {
    setFormData(prev => ({
      ...prev,
      selectedTags: prev.selectedTags.includes(tag)
        ? prev.selectedTags.filter(t => t !== tag)
        : [...prev.selectedTags, tag],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const meterValue = parseFloat(formData.meterValue);
    if (isNaN(meterValue) || meterValue <= 0) {
      setError('Bitte gültigen Zählerstand eingeben');
      return;
    }

    const timestamp = new Date(`${formData.date}T${formData.time}`);

    const reading: Omit<Reading, 'id'> = {
      timestamp,
      meterValue,
      unit: 'kWh',
      source: 'manual',
      notes: formData.notes || undefined,
      tags: formData.selectedTags.length > 0 ? formData.selectedTags : undefined,
      outdoorTemp: formData.outdoorTemp ? parseFloat(formData.outdoorTemp) : undefined,
      outdoorTempNight: formData.outdoorTempNight ? parseFloat(formData.outdoorTempNight) : undefined,
      synced: false,
    };

    try {
      await api.readings.add(reading);
      setSuccess(true);

      // Formular für weitere Eingabe zurücksetzen
      setFormData(prev => ({
        ...prev,
        meterValue: '',
        outdoorTemp: '',
        outdoorTempNight: '',
        notes: '',
        selectedTags: [],
      }));

      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      console.error('Error saving reading:', err);
      setError('Fehler beim Speichern');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b p-4 flex items-center gap-4">
        <button onClick={() => navigate('/history')} className="p-2">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Ablesung hinzufügen</h1>
          <p className="text-sm text-gray-500">Alte Daten nachtragen</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {/* Datum & Uhrzeit */}
        <div className="bg-white rounded-lg shadow p-4 space-y-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Calendar size={18} />
            Datum & Uhrzeit
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Uhrzeit</label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
          </div>
        </div>

        {/* Zählerstand */}
        <div className="bg-white rounded-lg shadow p-4 space-y-4">
          <h3 className="font-semibold text-gray-900">Zählerstand</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Zählerstand (kWh)
            </label>
            <input
              type="number"
              step="1"
              value={formData.meterValue}
              onChange={(e) => setFormData({ ...formData, meterValue: e.target.value })}
              placeholder="z.B. 2083"
              className="w-full px-4 py-3 text-xl font-mono border border-gray-300 rounded-lg"
              required
            />
          </div>
        </div>

        {/* Wetterdaten */}
        <div className="bg-white rounded-lg shadow p-4 space-y-4">
          <h3 className="font-semibold text-gray-900">Wetterdaten (optional)</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Außentemp. (°C)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.outdoorTemp}
                onChange={(e) => setFormData({ ...formData, outdoorTemp: e.target.value })}
                placeholder="-5"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nacht-Temp. (°C)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.outdoorTempNight}
                onChange={(e) => setFormData({ ...formData, outdoorTempNight: e.target.value })}
                placeholder="-8"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="bg-white rounded-lg shadow p-4 space-y-4">
          <h3 className="font-semibold text-gray-900">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {READING_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  formData.selectedTags.includes(tag)
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Notiz */}
        <div className="bg-white rounded-lg shadow p-4 space-y-4">
          <h3 className="font-semibold text-gray-900">Notiz</h3>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="z.B. 3x Duschen, Heizstab 2h aktiv..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            rows={3}
          />
        </div>

        {/* Error/Success */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-800">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-800">
            ✓ Ablesung gespeichert! Du kannst weitere Daten eingeben.
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/history')}
            className="flex-1 bg-gray-200 hover:bg-gray-300 py-3 rounded-lg font-medium"
          >
            Fertig
          </button>
          <button
            type="submit"
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            Speichern & Weiter
          </button>
        </div>
      </form>
    </div>
  );
}
