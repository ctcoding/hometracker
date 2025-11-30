// Home Assistant API Integration

export interface HAState {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_changed: string;
  last_updated: string;
}

export interface HASensor {
  entity_id: string;
  name: string;
  state: string;
  unit?: string;
  device_class?: string;
}

interface HAConfig {
  url: string;
  token: string;
}

export class HomeAssistantAPI {
  private url: string;
  private token: string;

  constructor(config: HAConfig) {
    this.url = config.url.replace(/\/$/, ''); // Remove trailing slash
    this.token = config.token;
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.url}/api${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HA API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    try {
      await this.fetch('/');
      return true;
    } catch {
      return false;
    }
  }

  // Get all states
  async getStates(): Promise<HAState[]> {
    return this.fetch('/states');
  }

  // Get all sensors with friendly names
  async getAllSensors(): Promise<HASensor[]> {
    const states = await this.getStates();

    return states
      .filter(s => s.entity_id.startsWith('sensor.'))
      .map(s => ({
        entity_id: s.entity_id,
        name: s.attributes.friendly_name || s.entity_id,
        state: s.state,
        unit: s.attributes.unit_of_measurement,
        device_class: s.attributes.device_class,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  // Get temperature sensors only
  async getTemperatureSensors(): Promise<HASensor[]> {
    const sensors = await this.getAllSensors();
    return sensors.filter(s =>
      s.device_class === 'temperature' ||
      s.unit === '°C' ||
      s.unit === '°F' ||
      s.entity_id.toLowerCase().includes('temp')
    );
  }

  // Get brightness/illuminance sensors
  async getBrightnessSensors(): Promise<HASensor[]> {
    const sensors = await this.getAllSensors();
    return sensors.filter(s =>
      s.device_class === 'illuminance' ||
      s.unit === 'lx' ||
      s.entity_id.toLowerCase().includes('brightness') ||
      s.entity_id.toLowerCase().includes('lux')
    );
  }

  // Get single entity state
  async getState(entityId: string): Promise<HAState> {
    return this.fetch(`/states/${entityId}`);
  }

  // Get sensor value as number
  async getSensorValue(entityId: string): Promise<number | null> {
    try {
      const state = await this.getState(entityId);
      const value = parseFloat(state.state);
      return isNaN(value) ? null : value;
    } catch {
      return null;
    }
  }

  // Get multiple sensor values
  async getSensorValues(entityIds: string[]): Promise<Record<string, number | null>> {
    const results: Record<string, number | null> = {};

    await Promise.all(
      entityIds.map(async (id) => {
        results[id] = await this.getSensorValue(id);
      })
    );

    return results;
  }

  // Get history for an entity
  async getHistory(entityId: string, startTime: Date, endTime?: Date): Promise<any[]> {
    const start = startTime.toISOString();
    const end = endTime ? `&end_time=${endTime.toISOString()}` : '';
    const data = await this.fetch<any[][]>(
      `/history/period/${start}?filter_entity_id=${entityId}${end}`
    );
    return data[0] || [];
  }

  // Calculate average from history
  async getAverageValue(entityId: string, hoursBack: number): Promise<number | null> {
    try {
      const startTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
      const history = await this.getHistory(entityId, startTime);

      if (history.length === 0) return null;

      const values = history
        .map(h => parseFloat(h.state))
        .filter(v => !isNaN(v));

      if (values.length === 0) return null;

      return values.reduce((a, b) => a + b, 0) / values.length;
    } catch {
      return null;
    }
  }

  // Post sensor data to HA (create/update sensor)
  async postSensorValue(sensorName: string, value: number, unit: string = 'kWh'): Promise<void> {
    const entityId = `sensor.haustracker_${sensorName}`;

    await this.fetch(`/states/${entityId}`, {
      method: 'POST',
      body: JSON.stringify({
        state: value.toString(),
        attributes: {
          unit_of_measurement: unit,
          friendly_name: `HausTracker ${sensorName}`,
          device_class: 'energy',
          state_class: 'total_increasing',
        },
      }),
    });
  }

  // Call HA service
  async callService(domain: string, service: string, data?: Record<string, any>): Promise<void> {
    await this.fetch(`/services/${domain}/${service}`, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
}

// Create HA client from settings
export async function createHAClient(settings: {
  homeAssistantUrl?: string;
  homeAssistantToken?: string;
}): Promise<HomeAssistantAPI | null> {
  if (!settings.homeAssistantUrl || !settings.homeAssistantToken) {
    return null;
  }

  return new HomeAssistantAPI({
    url: settings.homeAssistantUrl,
    token: settings.homeAssistantToken,
  });
}

// Helper to fetch weather data from HA
export async function fetchHAWeatherData(
  haClient: HomeAssistantAPI,
  tempSensor?: string,
  brightnessSensor?: string
): Promise<{
  outdoorTemp: number | null;
  outdoorTempNightAvg: number | null;
  brightness: number | null;
}> {
  const results = {
    outdoorTemp: null as number | null,
    outdoorTempNightAvg: null as number | null,
    brightness: null as number | null,
  };

  if (tempSensor) {
    results.outdoorTemp = await haClient.getSensorValue(tempSensor);
    // Get night average (last 8 hours average)
    results.outdoorTempNightAvg = await haClient.getAverageValue(tempSensor, 8);
  }

  if (brightnessSensor) {
    results.brightness = await haClient.getSensorValue(brightnessSensor);
  }

  return results;
}

// Sync reading to Home Assistant
export async function syncReadingToHA(
  haClient: HomeAssistantAPI,
  reading: { meterValue: number; consumption?: number; timestamp: Date }
): Promise<boolean> {
  try {
    // Post meter value
    await haClient.postSensorValue('meter_reading', reading.meterValue, 'kWh');

    // Post consumption if available
    if (reading.consumption !== undefined) {
      await haClient.postSensorValue('consumption', reading.consumption, 'kWh');
    }

    return true;
  } catch (err) {
    console.error('Failed to sync to HA:', err);
    return false;
  }
}
