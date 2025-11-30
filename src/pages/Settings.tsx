import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Save, Bell, Home, DollarSign, Euro, ChevronRight, BarChart3, Download, FileJson, FileSpreadsheet, CheckCircle, XCircle, Loader2, Palette, User } from 'lucide-react';
import { useStore } from '../lib/store';
import { api } from '../lib/api';
import type { Settings as SettingsType } from '../types';
import { formatNumber } from '../lib/utils';
import { downloadReadingsCSV, downloadReadingsJSON, downloadAllDataJSON } from '../lib/export';
import type { HASensor } from '../lib/homeassistant';
import SensorPicker from '../components/SensorPicker';
import MultiSensorPicker from '../components/MultiSensorPicker';
import DarkModeToggle from '../components/DarkModeToggle';

export default function Settings() {
  const { setSettings } = useStore();
  const [formData, setFormData] = useState<SettingsType | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [currentTariff, setCurrentTariff] = useState<{ name: string; price: number } | null>(null);
  const [currentAdvance, setCurrentAdvance] = useState<number | null>(null);
  const [haTestStatus, setHaTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [haSensors, setHaSensors] = useState<HASensor[]>([]);
  const [sensorsLoading, setSensorsLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [settings, tariff, advance] = await Promise.all([
        api.settings.get(),
        api.tariffs.getCurrent(),
        api.advancePayments.getCurrent(),
      ]);

      setFormData(settings || { id: 'main', reminderIntervalDays: 7, reminderEnabled: true });
      setSettings(settings);

      if (tariff) {
        setCurrentTariff({ name: tariff.name, price: tariff.totalPricePerKwh || tariff.workingPrice });
      }
      if (advance) {
        setCurrentAdvance(advance.monthlyAmount);
      }

      // Auto-load sensors if HA credentials exist
      if (settings?.homeAssistantUrl && settings?.homeAssistantToken) {
        loadHASensorsWithCredentials(settings.homeAssistantUrl, settings.homeAssistantToken);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
      setFormData({ id: 'main', reminderIntervalDays: 7, reminderEnabled: true });
    }
  }

  async function loadHASensorsWithCredentials(url: string, token: string) {
    setSensorsLoading(true);
    try {
      const response = await fetch('/api/ha/sensors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, token }),
      });
      const sensors = await response.json();
      if (Array.isArray(sensors)) {
        setHaSensors(sensors);
      }
    } catch (err) {
      console.error('Failed to load sensors:', err);
    } finally {
      setSensorsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData) return;

    try {
      await api.settings.update(formData);
      setSettings(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  }

  async function handleExportCSV() {
    const readings = await api.readings.getAll();
    downloadReadingsCSV(readings);
  }

  async function handleExportJSON() {
    const readings = await api.readings.getAll();
    downloadReadingsJSON(readings);
  }

  async function handleBackup() {
    const [readings, tariffs, payments, advancePayments] = await Promise.all([
      api.readings.getAll(),
      api.tariffs.getAll(),
      api.payments.getAll(),
      api.advancePayments.getAll(),
    ]);
    downloadAllDataJSON({ readings, tariffs, payments, advancePayments });
  }

  async function testHAConnection() {
    if (!formData?.homeAssistantUrl || !formData?.homeAssistantToken) {
      return;
    }

    setHaTestStatus('testing');
    try {
      const response = await fetch('/api/ha/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: formData.homeAssistantUrl,
          token: formData.homeAssistantToken,
        }),
      });
      const result = await response.json();
      setHaTestStatus(result.success ? 'success' : 'error');

      if (result.success) {
        loadHASensors();
      }
    } catch {
      setHaTestStatus('error');
    }

    setTimeout(() => setHaTestStatus('idle'), 5000);
  }

  async function loadHASensors() {
    if (!formData?.homeAssistantUrl || !formData?.homeAssistantToken) {
      return;
    }

    setSensorsLoading(true);
    try {
      const response = await fetch('/api/ha/sensors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: formData.homeAssistantUrl,
          token: formData.homeAssistantToken,
        }),
      });
      const sensors = await response.json();
      setHaSensors(sensors);
    } catch (err) {
      console.error('Failed to load sensors:', err);
    } finally {
      setSensorsLoading(false);
    }
  }

  if (!formData) {
    return <div className="p-4">Lädt...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Subheader */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <h2 className="text-lg font-semibold text-gray-900">Einstellungen</h2>
      </div>

      <div className="p-4 space-y-6">
        {/* Quick Links */}
        <section className="space-y-2">
          <Link
            to="/tariffs"
            className="bg-white rounded-lg shadow p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <DollarSign className="text-orange-500" size={24} />
              <div>
                <div className="font-semibold text-gray-900">Tarife verwalten</div>
                <div className="text-sm text-gray-500">
                  {currentTariff
                    ? `Aktuell: ${currentTariff.name} (${formatNumber(currentTariff.price, 4)} €/kWh)`
                    : 'Noch kein Tarif angelegt'}
                </div>
              </div>
            </div>
            <ChevronRight className="text-gray-400" size={20} />
          </Link>

          <Link
            to="/payments"
            className="bg-white rounded-lg shadow p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Euro className="text-orange-500" size={24} />
              <div>
                <div className="font-semibold text-gray-900">Zahlungen verwalten</div>
                <div className="text-sm text-gray-500">
                  {currentAdvance
                    ? `Aktueller Abschlag: ${formatNumber(currentAdvance, 2)} €/Monat`
                    : 'Noch kein Abschlag definiert'}
                </div>
              </div>
            </div>
            <ChevronRight className="text-gray-400" size={20} />
          </Link>

        </section>
          <Link
            to="/user-settings"
            className="bg-white rounded-lg shadow p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <User className="text-orange-500" size={24} />
              <div>
                <div className="font-semibold text-gray-900">Benutzerverwaltung</div>
                <div className="text-sm text-gray-500">Profil, Passwort, Abmelden</div>
              </div>
            </div>
            <ChevronRight className="text-gray-400" size={20} />
          </Link>


        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Home Assistant */}
          <section className="bg-white rounded-lg shadow p-4 space-y-4">
            <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Home size={20} />
              <span>Home Assistant</span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Server-URL
              </label>
              <input
                type="url"
                value={formData.homeAssistantUrl || ''}
                onChange={(e) =>
                  setFormData({ ...formData, homeAssistantUrl: e.target.value })
                }
                placeholder="http://homeassistant.local:8123"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Access Token
              </label>
              <input
                type="password"
                value={formData.homeAssistantToken || ''}
                onChange={(e) =>
                  setFormData({ ...formData, homeAssistantToken: e.target.value })
                }
                placeholder="Long-Lived Access Token"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
              />
            </div>

            {haSensors.length > 0 ? (
              <>
                <SensorPicker
                  label="Außentemperatur-Sensor"
                  value={formData.temperatureSensorEntity || ''}
                  onChange={(value) => setFormData({ ...formData, temperatureSensorEntity: value })}
                  sensors={haSensors.filter(s =>
                    s.device_class === 'temperature' || s.unit === '°C' || s.unit === '°F' ||
                    s.entity_id.toLowerCase().includes('temp')
                  )}
                  loading={sensorsLoading}
                  onRefresh={loadHASensors}
                  placeholder="Temperatur-Sensor wählen..."
                />

                <SensorPicker
                  label="Innentemperatur-Sensor"
                  value={formData.indoorTempSensorEntity || ''}
                  onChange={(value) => setFormData({ ...formData, indoorTempSensorEntity: value })}
                  sensors={haSensors.filter(s =>
                    s.device_class === 'temperature' || s.unit === '°C' || s.unit === '°F' ||
                    s.entity_id.toLowerCase().includes('temp')
                  )}
                  loading={sensorsLoading}
                  placeholder="Temperatur-Sensor wählen..."
                />

                <MultiSensorPicker
                  label="Helligkeits-Sensoren (Durchschnitt)"
                  values={formData.brightnessSensorEntities || []}
                  onChange={(values) => setFormData({ ...formData, brightnessSensorEntities: values })}
                  sensors={haSensors.filter(s =>
                    s.device_class === 'illuminance' || s.unit === 'lx' ||
                    s.entity_id.toLowerCase().includes('bright') || s.entity_id.toLowerCase().includes('lux')
                  )}
                  loading={sensorsLoading}
                  placeholder="Sensoren wählen (Ost, Süd, West)..."
                />

                <div className="border-t pt-4 mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">ELWA Heizstab</h4>

                  <SensorPicker
                    label="Leistungsaufnahme (W)"
                    value={formData.elwaPowerSensorEntity || ''}
                    onChange={(value) => setFormData({ ...formData, elwaPowerSensorEntity: value })}
                    sensors={haSensors.filter(s =>
                      s.device_class === 'power' || s.unit === 'W' || s.unit === 'kW' ||
                      s.entity_id.toLowerCase().includes('power') || s.entity_id.toLowerCase().includes('elwa')
                    )}
                    loading={sensorsLoading}
                    placeholder="Leistungs-Sensor wählen..."
                  />

                  <SensorPicker
                    label="Wassertemperatur unten"
                    value={formData.elwaWaterTempBottomEntity || ''}
                    onChange={(value) => setFormData({ ...formData, elwaWaterTempBottomEntity: value })}
                    sensors={haSensors.filter(s =>
                      s.device_class === 'temperature' || s.unit === '°C' ||
                      s.entity_id.toLowerCase().includes('temp') || s.entity_id.toLowerCase().includes('water')
                    )}
                    loading={sensorsLoading}
                    placeholder="Temperatur-Sensor wählen..."
                  />

                  <SensorPicker
                    label="Wassertemperatur oben"
                    value={formData.elwaWaterTempTopEntity || ''}
                    onChange={(value) => setFormData({ ...formData, elwaWaterTempTopEntity: value })}
                    sensors={haSensors.filter(s =>
                      s.device_class === 'temperature' || s.unit === '°C' ||
                      s.entity_id.toLowerCase().includes('temp') || s.entity_id.toLowerCase().includes('water')
                    )}
                    loading={sensorsLoading}
                    placeholder="Temperatur-Sensor wählen..."
                  />

                  <div className="border-t pt-4 mt-4">
                    <h5 className="text-sm font-medium text-gray-600 mb-2">my-PV Cloud API</h5>
                    <p className="text-xs text-gray-500 mb-3">
                      Automatischer Import historischer ELWA-Daten aus der my-PV Cloud
                    </p>

                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      API Key
                    </label>
                    <input
                      type="password"
                      value={formData.elwaCloudApiKey || ''}
                      onChange={(e) => setFormData({ ...formData, elwaCloudApiKey: e.target.value })}
                      placeholder="my..."
                      className="w-full px-3 py-2 mb-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />

                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Geräte-Seriennummer
                    </label>
                    <input
                      type="text"
                      value={formData.elwaSerialNumber || ''}
                      onChange={(e) => setFormData({ ...formData, elwaSerialNumber: e.target.value })}
                      placeholder="1601502406190027"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div className="border-t pt-4 mt-4">
                    <h5 className="text-sm font-medium text-gray-600 mb-2">HomeAssistant → Haustracker API</h5>
                    <p className="text-xs text-gray-500 mb-3">
                      API-Token für Home Assistant Automationen (10-Minuten Intervalle für Umwelt-Daten)
                    </p>

                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      API Token
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.homeAssistantApiToken || ''}
                        readOnly
                        placeholder="Generiere ein Token..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const token = 'haus_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
                          setFormData({ ...formData, homeAssistantApiToken: token });
                        }}
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium whitespace-nowrap"
                      >
                        Token generieren
                      </button>
                    </div>
                    {formData.homeAssistantApiToken && (
                      <p className="text-xs text-gray-500 mt-2">
                        Kopiere dieses Token in deine Home Assistant Automation
                      </p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500 text-center py-2">
                Verbinde zuerst mit Home Assistant um Sensoren auszuwählen
              </p>
            )}

            {/* Test Button */}
            <button
              type="button"
              onClick={testHAConnection}
              disabled={!formData.homeAssistantUrl || !formData.homeAssistantToken || haTestStatus === 'testing'}
              className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white py-2 rounded-lg font-medium"
            >
              {haTestStatus === 'testing' && <Loader2 size={18} className="animate-spin" />}
              {haTestStatus === 'success' && <CheckCircle size={18} />}
              {haTestStatus === 'error' && <XCircle size={18} />}
              {haTestStatus === 'idle' && <Home size={18} />}
              {haTestStatus === 'testing' ? 'Verbinde...' :
               haTestStatus === 'success' ? 'Verbunden!' :
               haTestStatus === 'error' ? 'Fehler!' : 'Verbindung testen'}
            </button>
          </section>

          {/* Darstellung */}
          <section className="bg-white rounded-lg shadow p-4 space-y-4">
            <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Palette size={20} />
              <span>Darstellung</span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Farbschema
              </label>
              <DarkModeToggle />
            </div>
          </section>

          {/* Erinnerungen */}
          <section className="bg-white rounded-lg shadow p-4 space-y-4">
            <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Bell size={20} />
              <span>Erinnerungen</span>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Erinnerungen aktiviert
              </label>
              <input
                type="checkbox"
                checked={formData.reminderEnabled}
                onChange={(e) =>
                  setFormData({ ...formData, reminderEnabled: e.target.checked })
                }
                className="w-6 h-6 text-orange-500 rounded focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Intervall (Tage)
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={formData.reminderIntervalDays}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    reminderIntervalDays: parseInt(e.target.value) || 7,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Erinnerung nach X Tagen ohne Ablesung
              </p>
            </div>
          </section>

          {/* Ziele */}
          <section className="bg-white rounded-lg shadow p-4 space-y-4">
            <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <BarChart3 size={20} />
              <span>Verbrauchsziele</span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monatsziel (kWh)
              </label>
              <input
                type="number"
                step="1"
                value={formData.targetConsumptionMonthly || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    targetConsumptionMonthly: parseFloat(e.target.value) || undefined,
                  })
                }
                placeholder="z.B. 500"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jahresziel (kWh)
              </label>
              <input
                type="number"
                step="1"
                value={formData.targetConsumptionYearly || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    targetConsumptionYearly: parseFloat(e.target.value) || undefined,
                  })
                }
                placeholder="z.B. 6000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </section>

          {/* Export */}
          <section className="bg-white rounded-lg shadow p-4 space-y-4">
            <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Download size={20} />
              <span>Daten exportieren</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleExportCSV}
                className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-medium"
              >
                <FileSpreadsheet size={18} />
                CSV
              </button>
              <button
                type="button"
                onClick={handleExportJSON}
                className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-medium"
              >
                <FileJson size={18} />
                JSON
              </button>
            </div>

            <button
              type="button"
              onClick={handleBackup}
              className="w-full flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-medium"
            >
              <Download size={18} />
              Vollständiges Backup
            </button>
          </section>

          {/* Save Button */}
          <button
            type="submit"
            className={`w-full font-semibold py-3 px-6 rounded-lg shadow-lg transition-all flex items-center justify-center gap-2 ${
              saveSuccess
                ? 'bg-green-500 text-white'
                : 'bg-orange-500 hover:bg-orange-600 text-white'
            }`}
          >
            {saveSuccess ? (
              <>
                <CheckCircle size={20} />
                <span>Gespeichert</span>
              </>
            ) : (
              <>
                <Save size={20} />
                <span>Speichern</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
