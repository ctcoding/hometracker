import { useState } from 'react';
import { ChevronDown, Loader2, RefreshCw } from 'lucide-react';
import type { HASensor } from '../lib/homeassistant';

interface SensorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  sensors: HASensor[];
  loading?: boolean;
  onRefresh?: () => void;
  placeholder?: string;
  filterType?: 'temperature' | 'brightness' | 'all';
}

export default function SensorPicker({
  label,
  value,
  onChange,
  sensors,
  loading,
  onRefresh,
  placeholder = 'Sensor auswählen...',
}: SensorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredSensors = sensors.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.entity_id.toLowerCase().includes(search.toLowerCase())
  );

  const selectedSensor = sensors.find(s => s.entity_id === value);

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

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-left"
        >
          <span className={selectedSensor ? 'text-gray-900 dark:text-white' : 'text-gray-400'}>
            {selectedSensor ? (
              <span className="flex flex-col">
                <span>{selectedSensor.name}</span>
                <span className="text-xs text-gray-500">{selectedSensor.entity_id}</span>
              </span>
            ) : placeholder}
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
                    onClick={() => {
                      onChange(sensor.entity_id);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      sensor.entity_id === value ? 'bg-orange-50 dark:bg-orange-900/20' : ''
                    }`}
                  >
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
                  </button>
                ))
              )}
            </div>

            {/* Clear */}
            {value && (
              <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    onChange('');
                    setIsOpen(false);
                  }}
                  className="w-full text-sm text-red-500 hover:text-red-700"
                >
                  Auswahl aufheben
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
