// ===== READING TYPES =====
export interface Reading {
  id?: number;
  timestamp: Date;
  meterValue: number;
  unit: 'kWh';

  // Berechnete Werte (werden beim Speichern berechnet)
  hoursSinceLastReading?: number;
  daysSinceLastReading?: number;
  consumption?: number;        // Delta kWh
  consumptionPerDay?: number;  // kWh/Tag
  costSinceLastReading?: number; // € (basierend auf aktivem Tarif)

  // Wetterdaten (optional, aus Home Assistant)
  outdoorTemp?: number;
  outdoorTempNight?: number;
  indoorTemp?: number;
  weather?: 'sunny' | 'cloudy' | 'mixed' | 'unknown';
  outdoorTempCurrent?: number;
  outdoorTempNightAvg?: number;
  weatherCondition?: string;

  // Meta-Informationen
  source: 'ocr' | 'manual' | 'import';
  ocrConfidence?: number;
  notes?: string;
  tags?: string[];  // z.B. ['Duschen', 'Heizstab', 'Urlaub']
  imageData?: string;
  synced: boolean;
}

// ===== TARIFF TYPES =====
export interface Tariff {
  id?: number;
  name: string;              // z.B. "Preis 2024", "Preis ab 01/25"
  validFrom: Date;
  validUntil?: Date;         // null = aktuell gültig

  // Preiskomponenten (alle in €)
  workingPrice: number;      // €/kWh Arbeitspreis
  basePrice: number;         // €/Jahr Grundpreis
  co2Price?: number;         // €/kWh CO2-Abgabe
  gasLevy?: number;          // €/kWh Gasumlage
  meteringPrice?: number;    // €/Jahr Messeinrichtung

  // Wird berechnet
  totalPricePerKwh?: number; // Summe aller kWh-Kosten
  fixedMonthly?: number;     // Monatliche Fixkosten
}

// ===== PAYMENT TYPES =====
export interface Payment {
  id?: number;
  date: Date;
  type: 'advance' | 'settlement' | 'refund'; // Abschlag, Abrechnung, Rückzahlung
  amount: number;            // Positiv = Zahlung an Versorger
  notes?: string;
}

// ===== ADVANCE PAYMENT CONFIG =====
export interface AdvancePayment {
  id?: number;
  validFrom: Date;
  validUntil?: Date;
  monthlyAmount: number;     // Monatlicher Abschlag in €
}

// ===== MONTHLY STATISTICS =====
export interface MonthlyStats {
  id?: number;
  year: number;
  month: number;             // 1-12

  // Zählerstände
  startReading?: number;
  endReading?: number;
  consumption: number;       // kWh im Monat
  consumptionPerDay: number;

  // Kosten
  calculatedCost: number;    // Berechnete Kosten
  paidAdvances: number;      // Gezahlte Abschläge
  balance: number;           // + = Guthaben, - = Schulden

  // Wetter-Durchschnitte
  avgOutdoorTemp?: number;
  heatingDays?: number;      // Tage mit Heizung
}

// ===== SETTINGS =====
export interface Settings {
  id: 'main';

  // Home Assistant
  homeAssistantUrl?: string;
  homeAssistantToken?: string;
  temperatureSensorEntity?: string;
  indoorTempSensorEntity?: string;
  brightnessSensorEntities?: string[];  // Multiple sensors (averaged)

  // ELWA Heizstab Sensoren
  elwaPowerSensorEntity?: string;       // Leistungsaufnahme in W
  elwaWaterTempBottomEntity?: string;   // Wassertemperatur unten
  elwaWaterTempTopEntity?: string;      // Wassertemperatur oben
  elwaCloudApiKey?: string;
  elwaSerialNumber?: string;
  homeAssistantApiToken?: string;

  // Erinnerungen
  reminderIntervalDays: number;
  reminderEnabled: boolean;

  // Ziele
  targetConsumptionMonthly?: number;  // kWh/Monat Ziel
  targetConsumptionYearly?: number;   // kWh/Jahr Ziel
}

// ===== STATISTICS =====
export interface ReadingStatistics {
  totalReadings: number;
  averageConsumption: number;
  averageConsumptionPerDay: number;
  totalConsumption: number;
  lastReading?: Reading;
  daysSinceLastReading: number;

  // Kosten
  currentMonthCost?: number;
  currentMonthConsumption?: number;
  projectedMonthlyCost?: number;
  currentBalance?: number;     // Guthaben/Schulden
}

// ===== PREDEFINED TAGS =====
export const READING_TAGS = [
  'Duschen',
  'Heizstab aktiv',
  'Heizstab lange aktiv',
  'Urlaub',
  'Gäste',
  'Kalt draußen',
  'Warm draußen',
  'Wochenende',
] as const;

export type ReadingTag = typeof READING_TAGS[number];
