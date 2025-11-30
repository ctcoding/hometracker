import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Use environment variable for production, fallback to local path for dev
const dbPath = process.env.DB_PATH || join(__dirname, '..', 'data', 'haustracker.db');

// Ensure data directory exists
import { mkdirSync } from 'fs';
import { dirname as pathDirname } from 'path';
mkdirSync(pathDirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    meterValue REAL NOT NULL,
    unit TEXT DEFAULT 'kWh',
    outdoorTempCurrent REAL,
    outdoorTempNightAvg REAL,
    weatherCondition TEXT,
    brightnessAvg REAL,
    consumption REAL,
    hoursSinceLastReading INTEGER,
    daysSinceLastReading INTEGER,
    consumptionPerDay REAL,
    costSinceLastReading REAL,
    source TEXT DEFAULT 'manual',
    ocrConfidence REAL,
    notes TEXT,
    imageData TEXT,
    synced INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY DEFAULT 'main',
    homeAssistantUrl TEXT,
    homeAssistantToken TEXT,
    homeAssistantApiToken TEXT,
    temperatureSensorEntity TEXT,
    indoorTempSensorEntity TEXT,
    brightnessSensorEntities TEXT,
    reminderIntervalDays INTEGER DEFAULT 7,
    reminderEnabled INTEGER DEFAULT 1,
    pricePerMWh REAL,
    targetConsumptionMonthly REAL,
    targetConsumptionYearly REAL
  );

  CREATE TABLE IF NOT EXISTS tariffs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    provider TEXT,
    validFrom TEXT NOT NULL,
    validUntil TEXT,
    workingPrice REAL NOT NULL,
    basePrice REAL NOT NULL,
    co2Price REAL DEFAULT 0,
    gasLevy REAL DEFAULT 0,
    meteringPrice REAL DEFAULT 0,
    totalPricePerKwh REAL,
    fixedMonthly REAL,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    amount REAL NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    invoiceNumber TEXT
  );

  CREATE TABLE IF NOT EXISTS advancePayments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount REAL NOT NULL,
    validFrom TEXT NOT NULL,
    validUntil TEXT,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS monthlyStats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    startReading REAL,
    endReading REAL,
    consumption REAL,
    consumptionPerDay REAL,
    calculatedCost REAL,
    paidAdvances REAL,
    balance REAL,
    UNIQUE(year, month)
  );

  CREATE TABLE IF NOT EXISTS elwaReadings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    energyKwh REAL NOT NULL,
    energySolarKwh REAL,
    energyGridKwh REAL,
    temp1 REAL,
    temp2 REAL,
    source TEXT DEFAULT 'manual',
    notes TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date)
  );

  CREATE TABLE IF NOT EXISTS ha_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    brightness_east REAL,
    brightness_south REAL,
    brightness_west REAL,
    wind_speed REAL,
    temp_outdoor_south REAL,
    temp_outdoor_north REAL,
    pv_production REAL,
    elwa_power REAL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(timestamp)
  );

  CREATE INDEX IF NOT EXISTS idx_ha_metrics_timestamp ON ha_metrics(timestamp);

  -- Insert default settings if not exists
  INSERT OR IGNORE INTO settings (id) VALUES ('main');
`);

// Migrations for existing databases
try {
  db.exec(`ALTER TABLE settings ADD COLUMN indoorTempSensorEntity TEXT`);
} catch { /* column exists */ }
try {
  db.exec(`ALTER TABLE settings ADD COLUMN brightnessSensorEntities TEXT`);
} catch { /* column exists */ }
try {
  db.exec(`ALTER TABLE settings ADD COLUMN targetConsumptionMonthly REAL`);
} catch { /* column exists */ }
try {
  db.exec(`ALTER TABLE settings ADD COLUMN targetConsumptionYearly REAL`);
} catch { /* column exists */ }
try {
  db.exec(`ALTER TABLE settings ADD COLUMN elwaPowerSensorEntity TEXT`);
} catch { /* column exists */ }
try {
  db.exec(`ALTER TABLE settings ADD COLUMN elwaWaterTempBottomEntity TEXT`);
} catch { /* column exists */ }
try {
  db.exec(`ALTER TABLE settings ADD COLUMN elwaWaterTempTopEntity TEXT`);
} catch { /* column exists */ }
try {
  db.exec(`ALTER TABLE settings ADD COLUMN homeAssistantApiToken TEXT`);
} catch { /* column exists */ }

console.log('Database initialized at:', dbPath);

export default db;
