import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { api } from '../lib/api';

export default function EditReading() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    date: '',
    time: '',
    meterValue: '',
    notes: '',
  });

  useEffect(() => {
    loadReading();
  }, [id]);

  async function loadReading() {
    if (!id) return;
    try {
      const readings = await api.readings.getAll();
      const reading = readings.find(r => r.id === parseInt(id));
      if (reading) {
        const d = reading.timestamp;
        setFormData({
          date: `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`,
          time: `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`,
          meterValue: reading.meterValue.toString(),
          notes: reading.notes || '',
        });
      }
    } catch (err) {
      console.error('Error loading reading:', err);
      setError('Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setError('');

    const meterValue = parseFloat(formData.meterValue);
    if (isNaN(meterValue) || meterValue <= 0) {
      setError('Bitte gültigen Zählerstand eingeben');
      return;
    }

    const timestamp = new Date(`${formData.date}T${formData.time}`);

    try {
      await api.readings.update(parseInt(id), {
        timestamp,
        meterValue,
        notes: formData.notes || undefined,
      });
      navigate('/history');
    } catch (err) {
      console.error('Error updating reading:', err);
      setError('Fehler beim Speichern');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Lade...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white border-b p-4 flex items-center gap-4">
        <button onClick={() => navigate('/history')} className="p-2">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Ablesung bearbeiten</h1>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <div className="bg-white rounded-lg shadow p-4 space-y-4">
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zählerstand (kWh)</label>
            <input
              type="number"
              step="1"
              value={formData.meterValue}
              onChange={(e) => setFormData({ ...formData, meterValue: e.target.value })}
              className="w-full px-4 py-3 text-xl font-mono border border-gray-300 rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notiz</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={2}
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-800">{error}</div>
        )}

        <button
          type="submit"
          className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2"
        >
          <Save size={20} />
          Speichern
        </button>
      </form>
    </div>
  );
}
