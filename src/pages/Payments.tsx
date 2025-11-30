import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Euro, Pencil } from 'lucide-react';
import { api } from '../lib/api';
import type { Payment, AdvancePayment } from '../types';
import { formatDate, formatNumber } from '../lib/utils';

export default function Payments() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [advancePayments, setAdvancePayments] = useState<AdvancePayment[]>([]);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showAdvanceForm, setShowAdvanceForm] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null);
  const [editingAdvanceId, setEditingAdvanceId] = useState<number | null>(null);

  const [paymentForm, setPaymentForm] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'advance' as 'advance' | 'settlement' | 'refund',
    amount: '',
    notes: '',
  });

  const [advanceForm, setAdvanceForm] = useState({
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: '',
    monthlyAmount: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [p, a] = await Promise.all([
        api.payments.getAll(),
        api.advancePayments.getAll(),
      ]);
      setPayments(p);
      setAdvancePayments(a);
    } catch (err) {
      console.error('Failed to load payments:', err);
    }
  }

  async function handlePaymentSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const data = {
        date: new Date(paymentForm.date),
        type: paymentForm.type,
        amount: parseFloat(paymentForm.amount),
        notes: paymentForm.notes || undefined,
      };
      if (editingPaymentId) {
        await api.payments.update(editingPaymentId, data);
      } else {
        await api.payments.add(data);
      }
      resetPaymentForm();
      loadData();
    } catch (err) {
      console.error('Failed to save payment:', err);
    }
  }

  async function handleAdvanceSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const data = {
        validFrom: new Date(advanceForm.validFrom),
        validUntil: advanceForm.validUntil ? new Date(advanceForm.validUntil) : undefined,
        monthlyAmount: parseFloat(advanceForm.monthlyAmount),
      };
      if (editingAdvanceId) {
        await api.advancePayments.update(editingAdvanceId, data);
      } else {
        await api.advancePayments.add(data);
      }
      resetAdvanceForm();
      loadData();
    } catch (err) {
      console.error('Failed to save advance payment:', err);
    }
  }

  function resetPaymentForm() {
    setPaymentForm({ date: new Date().toISOString().split('T')[0], type: 'advance', amount: '', notes: '' });
    setShowPaymentForm(false);
    setEditingPaymentId(null);
  }

  function resetAdvanceForm() {
    setAdvanceForm({ validFrom: new Date().toISOString().split('T')[0], validUntil: '', monthlyAmount: '' });
    setShowAdvanceForm(false);
    setEditingAdvanceId(null);
  }

  function editPayment(p: Payment) {
    const d = p.date;
    setPaymentForm({
      date: `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`,
      type: p.type,
      amount: p.amount.toString(),
      notes: p.notes || '',
    });
    setEditingPaymentId(p.id || null);
  }

  function editAdvance(a: AdvancePayment) {
    const from = a.validFrom;
    const until = a.validUntil;
    setAdvanceForm({
      validFrom: `${from.getFullYear()}-${(from.getMonth()+1).toString().padStart(2,'0')}-${from.getDate().toString().padStart(2,'0')}`,
      validUntil: until ? `${until.getFullYear()}-${(until.getMonth()+1).toString().padStart(2,'0')}-${until.getDate().toString().padStart(2,'0')}` : '',
      monthlyAmount: a.monthlyAmount.toString(),
    });
    setEditingAdvanceId(a.id || null);
  }

  async function deletePayment(id: number) {
    if (confirm('Zahlung löschen?')) {
      try {
        await api.payments.delete(id);
        loadData();
      } catch (err) {
        console.error('Failed to delete payment:', err);
      }
    }
  }

  async function deleteAdvance(id: number) {
    if (confirm('Abschlag löschen?')) {
      try {
        await api.advancePayments.delete(id);
        loadData();
      } catch (err) {
        console.error('Failed to delete advance:', err);
      }
    }
  }

  const totalPaid = payments.reduce((sum, p) => {
    // Refunds are negative (we receive money back), advances and settlements are positive (we pay)
    const amount = p.type === 'refund' ? -p.amount : p.amount;
    return sum + amount;
  }, 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b p-4 flex items-center gap-4">
        <button onClick={() => navigate('/settings')} className="p-2">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Zahlungen</h1>
          <p className="text-sm text-gray-500">Abschläge & Zahlungen verwalten</p>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Abschlag-Konfiguration */}
        <section>
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold text-gray-900">Monatlicher Abschlag</h2>
            <button
              onClick={() => setShowAdvanceForm(!showAdvanceForm)}
              className="text-orange-500 hover:text-orange-600"
            >
              <Plus size={20} />
            </button>
          </div>

          {showAdvanceForm && (
            <form id="advance-form" onSubmit={handleAdvanceSubmit} className="bg-white rounded-lg shadow p-4 space-y-4 mb-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gültig ab</label>
                  <input
                    type="date"
                    value={advanceForm.validFrom}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, validFrom: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gültig bis</label>
                  <input
                    type="date"
                    value={advanceForm.validUntil}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, validUntil: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Betrag (€/Monat)</label>
                <input
                  type="number"
                  step="0.01"
                  value={advanceForm.monthlyAmount}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, monthlyAmount: e.target.value })}
                  placeholder="180.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg font-medium"
                >
                  Speichern
                </button>
                <button
                  type="button"
                  onClick={resetAdvanceForm}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                >
                  Abbrechen
                </button>
              </div>
            </form>
          )}

          {advancePayments.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-4 text-center text-gray-500">
              Noch kein Abschlag definiert
            </div>
          ) : (
            <div className="space-y-2">
              {advancePayments.map((a) => (
                editingAdvanceId === a.id ? (
                  <form key={a.id} onSubmit={handleAdvanceSubmit} className="bg-white rounded-lg shadow p-4 space-y-3 border-2 border-orange-300">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Gültig ab</label>
                        <input
                          type="date"
                          value={advanceForm.validFrom}
                          onChange={(e) => setAdvanceForm({ ...advanceForm, validFrom: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Gültig bis</label>
                        <input
                          type="date"
                          value={advanceForm.validUntil}
                          onChange={(e) => setAdvanceForm({ ...advanceForm, validUntil: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Betrag (€/Monat)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={advanceForm.monthlyAmount}
                        onChange={(e) => setAdvanceForm({ ...advanceForm, monthlyAmount: e.target.value })}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="flex-1 bg-orange-500 text-white py-1 rounded text-sm">Speichern</button>
                      <button type="button" onClick={resetAdvanceForm} className="px-3 py-1 border border-gray-300 rounded text-sm">Abbrechen</button>
                    </div>
                  </form>
                ) : (
                  <div key={a.id} className="bg-white rounded-lg shadow p-4 flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-gray-900">{formatNumber(a.monthlyAmount, 2)} €/Monat</div>
                      <div className="text-sm text-gray-500">
                        {formatDate(a.validFrom)} {a.validUntil ? `- ${formatDate(a.validUntil)}` : '- heute'}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => editAdvance(a)}
                        className="text-blue-500 hover:text-blue-700 p-2"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => a.id && deleteAdvance(a.id)}
                        className="text-red-500 hover:text-red-700 p-2"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                )
              ))}
            </div>
          )}
        </section>

        {/* Zahlungen */}
        <section>
          <div className="flex justify-between items-center mb-3">
            <div>
              <h2 className="font-semibold text-gray-900">Geleistete Zahlungen</h2>
              <p className="text-sm text-gray-500">Gesamt: {formatNumber(totalPaid, 2)} €</p>
            </div>
            <button
              onClick={() => setShowPaymentForm(!showPaymentForm)}
              className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded-lg text-sm flex items-center gap-1"
            >
              <Plus size={16} />
              Zahlung
            </button>
          </div>

          {showPaymentForm && (
            <form id="payment-form" onSubmit={handlePaymentSubmit} className="bg-white rounded-lg shadow p-4 space-y-4 mb-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
                  <input
                    type="date"
                    value={paymentForm.date}
                    onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Art</label>
                  <select
                    value={paymentForm.type}
                    onChange={(e) => setPaymentForm({ ...paymentForm, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="advance">Abschlag</option>
                    <option value="settlement">Nachzahlung</option>
                    <option value="refund">Rückzahlung</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Betrag (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  placeholder="180.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notiz</label>
                <input
                  type="text"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  placeholder="z.B. Lastschrift März"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg font-medium"
                >
                  Zahlung speichern
                </button>
                <button
                  type="button"
                  onClick={resetPaymentForm}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                >
                  Abbrechen
                </button>
              </div>
            </form>
          )}

          {payments.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-4 text-center text-gray-500">
              Noch keine Zahlungen erfasst
            </div>
          ) : (
            <div className="space-y-2">
              {payments.map((p) => (
                editingPaymentId === p.id ? (
                  <form key={p.id} onSubmit={handlePaymentSubmit} className="bg-white rounded-lg shadow p-4 space-y-3 border-2 border-orange-300">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Datum</label>
                        <input
                          type="date"
                          value={paymentForm.date}
                          onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Art</label>
                        <select
                          value={paymentForm.type}
                          onChange={(e) => setPaymentForm({ ...paymentForm, type: e.target.value as any })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="advance">Abschlag</option>
                          <option value="settlement">Nachzahlung</option>
                          <option value="refund">Rückzahlung</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Betrag (€)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={paymentForm.amount}
                          onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Notiz</label>
                        <input
                          type="text"
                          value={paymentForm.notes}
                          onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="flex-1 bg-orange-500 text-white py-1 rounded text-sm">Speichern</button>
                      <button type="button" onClick={resetPaymentForm} className="px-3 py-1 border border-gray-300 rounded text-sm">Abbrechen</button>
                    </div>
                  </form>
                ) : (
                  <div key={p.id} className="bg-white rounded-lg shadow p-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <Euro size={20} className={p.type === 'refund' ? 'text-green-500' : 'text-orange-500'} />
                      <div>
                        <div className="font-semibold text-gray-900">
                          {p.type === 'refund' ? '-' : ''}{formatNumber(p.amount, 2)} €
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDate(p.date)} · {p.type === 'advance' ? 'Abschlag' : p.type === 'settlement' ? 'Nachzahlung' : 'Rückzahlung'}
                        </div>
                        {p.notes && <div className="text-xs text-gray-400">{p.notes}</div>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => editPayment(p)}
                        className="text-blue-500 hover:text-blue-700 p-2"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => p.id && deletePayment(p.id)}
                        className="text-red-500 hover:text-red-700 p-2"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                )
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
