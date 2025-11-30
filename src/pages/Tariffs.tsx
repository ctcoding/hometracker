import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { api } from '../lib/api';
import type { Tariff } from '../types';
import { formatDate, formatNumber } from '../lib/utils';

export default function Tariffs() {
  const navigate = useNavigate();
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    validFrom: '',
    validUntil: '',
    workingPrice: '',
    basePrice: '',
    co2Price: '',
    gasLevy: '',
    meteringPrice: '',
  });

  useEffect(() => {
    loadTariffs();
  }, []);

  async function loadTariffs() {
    try {
      const data = await api.tariffs.getAll();
      setTariffs(data);
    } catch (err) {
      console.error('Failed to load tariffs:', err);
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      validFrom: '',
      validUntil: '',
      workingPrice: '',
      basePrice: '',
      co2Price: '',
      gasLevy: '',
      meteringPrice: '',
    });
    setEditingId(null);
    setShowForm(false);
  }

  function editTariff(tariff: Tariff) {
    setFormData({
      name: tariff.name,
      validFrom: tariff.validFrom.toISOString().split('T')[0],
      validUntil: tariff.validUntil?.toISOString().split('T')[0] || '',
      workingPrice: tariff.workingPrice.toString(),
      basePrice: tariff.basePrice.toString(),
      co2Price: tariff.co2Price?.toString() || '',
      gasLevy: tariff.gasLevy?.toString() || '',
      meteringPrice: tariff.meteringPrice?.toString() || '',
    });
    setEditingId(tariff.id || null);
    setShowForm(false); // Inline edit, not top form
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const tariff: Omit<Tariff, 'id'> = {
      name: formData.name,
      validFrom: new Date(formData.validFrom),
      validUntil: formData.validUntil ? new Date(formData.validUntil) : undefined,
      workingPrice: parseFloat(formData.workingPrice),
      basePrice: parseFloat(formData.basePrice),
      co2Price: formData.co2Price ? parseFloat(formData.co2Price) : undefined,
      gasLevy: formData.gasLevy ? parseFloat(formData.gasLevy) : undefined,
      meteringPrice: formData.meteringPrice ? parseFloat(formData.meteringPrice) : undefined,
    };

    try {
      if (editingId) {
        await api.tariffs.update(editingId, tariff);
      } else {
        await api.tariffs.add(tariff);
      }
      resetForm();
      loadTariffs();
    } catch (err) {
      console.error('Failed to save tariff:', err);
    }
  }

  async function deleteTariff(id: number) {
    if (confirm('Tarif wirklich löschen?')) {
      try {
        await api.tariffs.delete(id);
        loadTariffs();
      } catch (err) {
        console.error('Failed to delete tariff:', err);
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b p-4 flex items-center gap-4">
        <button onClick={() => navigate('/settings')} className="p-2">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Tarife</h1>
          <p className="text-sm text-gray-500">Preis-Historie verwalten</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Neuer Tarif Button */}
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg"
          >
            <Plus size={20} />
            Neuen Tarif anlegen
          </button>
        )}

        {/* Formular */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-4 space-y-4">
            <h3 className="font-semibold text-gray-900">
              {editingId ? 'Tarif bearbeiten' : 'Neuer Tarif'}
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="z.B. Preis 2024"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gültig ab</label>
                <input
                  type="date"
                  value={formData.validFrom}
                  onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gültig bis</label>
                <input
                  type="date"
                  value={formData.validUntil}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="leer = aktuell"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Arbeitspreis (€/kWh)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={formData.workingPrice}
                  onChange={(e) => setFormData({ ...formData, workingPrice: e.target.value })}
                  placeholder="0.1253"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Grundpreis (€/Jahr)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.basePrice}
                  onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                  placeholder="618.32"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CO2-Abgabe (€/kWh)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={formData.co2Price}
                  onChange={(e) => setFormData({ ...formData, co2Price: e.target.value })}
                  placeholder="0.0125"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gasumlagen (€/kWh)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={formData.gasLevy}
                  onChange={(e) => setFormData({ ...formData, gasLevy: e.target.value })}
                  placeholder="0.0049"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Messeinrichtung (€/Jahr)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.meteringPrice}
                onChange={(e) => setFormData({ ...formData, meteringPrice: e.target.value })}
                placeholder="62.83"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 bg-gray-200 hover:bg-gray-300 py-2 rounded-lg font-medium flex items-center justify-center gap-2"
              >
                <X size={18} />
                Abbrechen
              </button>
              <button
                type="submit"
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2"
              >
                <Check size={18} />
                Speichern
              </button>
            </div>
          </form>
        )}

        {/* Tarif-Liste */}
        {tariffs.length === 0 && !showForm ? (
          <div className="text-center py-12 text-gray-500">
            <p>Noch keine Tarife angelegt</p>
            <p className="text-sm mt-2">Lege deinen ersten Tarif an!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tariffs.map((tariff) => (
              editingId === tariff.id ? (
                <form key={tariff.id} onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-4 space-y-3 border-2 border-orange-300">
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-2 py-1 border rounded text-sm font-semibold"
                    required
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500">Gültig ab</label>
                      <input type="date" value={formData.validFrom} onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })} className="w-full px-2 py-1 border rounded text-sm" required />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500">Gültig bis</label>
                      <input type="date" value={formData.validUntil} onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })} className="w-full px-2 py-1 border rounded text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500">Arbeitspreis (€/kWh)</label>
                      <input type="number" step="0.0001" value={formData.workingPrice} onChange={(e) => setFormData({ ...formData, workingPrice: e.target.value })} className="w-full px-2 py-1 border rounded text-sm" required />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500">Grundpreis (€/Jahr)</label>
                      <input type="number" step="0.01" value={formData.basePrice} onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })} className="w-full px-2 py-1 border rounded text-sm" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500">CO2 (€/kWh)</label>
                      <input type="number" step="0.0001" value={formData.co2Price} onChange={(e) => setFormData({ ...formData, co2Price: e.target.value })} className="w-full px-2 py-1 border rounded text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500">Gasumlagen (€/kWh)</label>
                      <input type="number" step="0.0001" value={formData.gasLevy} onChange={(e) => setFormData({ ...formData, gasLevy: e.target.value })} className="w-full px-2 py-1 border rounded text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500">Messung (€/Jahr)</label>
                      <input type="number" step="0.01" value={formData.meteringPrice} onChange={(e) => setFormData({ ...formData, meteringPrice: e.target.value })} className="w-full px-2 py-1 border rounded text-sm" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 bg-orange-500 text-white py-1 rounded text-sm">Speichern</button>
                    <button type="button" onClick={resetForm} className="px-3 py-1 border border-gray-300 rounded text-sm">Abbrechen</button>
                  </div>
                </form>
              ) : (
                <div key={tariff.id} className="bg-white rounded-lg shadow p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900">{tariff.name}</h3>
                      <p className="text-sm text-gray-500">
                        {formatDate(tariff.validFrom)}
                        {tariff.validUntil ? ` - ${formatDate(tariff.validUntil)}` : ' - heute'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => editTariff(tariff)}
                        className="text-gray-500 hover:text-gray-700 p-2"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => tariff.id && deleteTariff(tariff.id)}
                        className="text-red-500 hover:text-red-700 p-2"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-gray-50 rounded p-2">
                      <div className="text-gray-500">Arbeitspreis</div>
                      <div className="font-medium">{formatNumber(tariff.workingPrice, 4)} €/kWh</div>
                    </div>
                    <div className="bg-gray-50 rounded p-2">
                      <div className="text-gray-500">Grundpreis</div>
                      <div className="font-medium">{formatNumber(tariff.basePrice, 2)} €/Jahr</div>
                    </div>
                    {tariff.meteringPrice && (
                      <div className="bg-gray-50 rounded p-2">
                        <div className="text-gray-500">Messeinrichtung</div>
                        <div className="font-medium">{formatNumber(tariff.meteringPrice, 2)} €/Jahr</div>
                      </div>
                    )}
                    {(() => {
                      const yearlyFixed = tariff.basePrice + (tariff.meteringPrice || 0);
                      const idx = tariffs.findIndex(t => t.id === tariff.id);
                      const prevTariff = idx < tariffs.length - 1 ? tariffs[idx + 1] : null;
                      const prevYearlyFixed = prevTariff ? prevTariff.basePrice + (prevTariff.meteringPrice || 0) : null;
                      const fixedDiff = prevYearlyFixed ? ((yearlyFixed - prevYearlyFixed) / prevYearlyFixed) * 100 : null;
                      return (
                        <div className="bg-gray-50 rounded p-2">
                          <div className="text-gray-500 flex justify-between">
                            <span>Fixkosten/Jahr</span>
                            {fixedDiff !== null && (
                              <span className={`text-xs ${fixedDiff > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {fixedDiff > 0 ? '+' : ''}{formatNumber(fixedDiff, 1)}%
                              </span>
                            )}
                          </div>
                          <div className="font-medium">{formatNumber(yearlyFixed, 2)} €/Jahr</div>
                        </div>
                      );
                    })()}
                  </div>

                  {tariff.totalPricePerKwh && (() => {
                    // Find previous tariff (sorted by validFrom desc, so next in array is previous)
                    const idx = tariffs.findIndex(t => t.id === tariff.id);
                    const prevTariff = idx < tariffs.length - 1 ? tariffs[idx + 1] : null;
                    const priceDiff = prevTariff?.totalPricePerKwh
                      ? ((tariff.totalPricePerKwh - prevTariff.totalPricePerKwh) / prevTariff.totalPricePerKwh) * 100
                      : null;
                    return (
                    <div className="mt-2 bg-orange-50 rounded p-2 text-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-orange-600">Gesamt pro kWh</div>
                          <div className="font-semibold text-orange-700">
                            {formatNumber(tariff.totalPricePerKwh, 4)} €/kWh
                          </div>
                        </div>
                        {priceDiff !== null && (
                          <div className={`text-xs px-2 py-1 rounded ${priceDiff > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {priceDiff > 0 ? '+' : ''}{formatNumber(priceDiff, 1)}%
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-orange-600 mt-1">
                        Fix/Monat: {formatNumber(tariff.fixedMonthly || 0, 2)} €
                      </div>
                    </div>
                    );
                  })()}
                </div>
              )
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
