import { useState } from 'react';
import { ChevronDown, Loader2, RefreshCw, X } from 'lucide-react';
import type { HASensor } from '../lib/homeassistant';

interface MultiSensorPickerProps {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  sensors: HASensor[];
  loading?: boolean;
  onRefresh?: () => void;
  placeholder?: string;
}

export default function MultiSensorPicker({
  label,
  values,
  onChange,
  sensors,
  loading,
  onRefresh,
  placeholder = 'Sensoren auswählen...',
}: MultiSensorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredSensors = sensors.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.entity_id.toLowerCase().includes(search.toLowerCase())
  );

  const selectedSensors = sensors.filter(s => values.includes(s.entity_id));

  const toggleSensor = (entityId: string) => {
    if (values.includes(entityId)) {
      onChange(values.filter(v => v !== entityId));
    } else {
      onChange([...values, entityId]);
    }
  };

  const removeSensor = (entityId: string) => {
    onChange(values.filter(v => v !== entityId));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
          </button>
        )}
      </div>

      {/* Selected sensors as tags */}
      {selectedSensors.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedSensors.map(sensor => (
            <span
              key={sensor.entity_id}
              className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 rounded text-xs"
            >
              {sensor.name}
              <button
                type="button"
                onClick={() => removeSensor(sensor.entity_id)}
                className="hover:text-orange-600"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-left"
        >
          <span className="text-gray-400 text-sm">
            {selectedSensors.length > 0
              ? `${selectedSensors.length} ausgewählt (Durchschnitt wird berechnet)`
              : placeholder}
          </span>
          <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-hidden">
            {/* Search */}
            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Suchen..."
                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded"
                autoFocus
              />
            </div>

            {/* Options */}
            <div className="max-h-48 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-gray-500">
                  <Loader2 className="animate-spin mx-auto mb-2" size={20} />
                  Lade Sensoren...
                </div>
              ) : filteredSensors.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  {sensors.length === 0 ? 'Keine Sensoren gefunden' : 'Keine Treffer'}
                </div>
              ) : (
                filteredSensors.map(sensor => (
                  <button
                    key={sensor.entity_id}
                    type="button"
                    onClick={() => toggleSensor(sensor.entity_id)}
                    className={`w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${
                      values.includes(sensor.entity_id) ? 'bg-orange-50 dark:bg-orange-900/20' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={values.includes(sensor.entity_id)}
                      readOnly
                      className="rounded text-orange-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900 dark:text-white">
                        {sensor.name}
                      </div>
                      <div className="text-xs text-gray-500 flex gap-2">
                        <span>{sensor.entity_id}</span>
                        {sensor.state !== 'unknown' && sensor.state !== 'unavailable' && (
                          <span className="text-orange-600">
                            {sensor.state}{sensor.unit ? ` ${sensor.unit}` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Done button */}
            <div className="p-2 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-full text-sm text-orange-500 hover:text-orange-700 font-medium"
              >
                Fertig
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
