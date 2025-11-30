# HausTracker - Architektur-Dokumentation

## Überblick

HausTracker ist eine pragmatische Web-Anwendung zur Verwaltung von Fernwärme-Zählerdaten mit ELWA-Integration. Die Architektur folgt dem Prinzip **"So einfach wie möglich, so strukturiert wie nötig"**.

## Tech-Stack

**Frontend:**
- React 18 mit TypeScript
- Vite (Build-Tool)
- Tailwind CSS (Styling)
- Recharts (Diagramme)
- Custom Hooks für State Management

**Backend:**
- Node.js mit Express
- TypeScript
- SQLite (better-sqlite3)
- Native Fetch API

**Deployment:**
- PWA (Progressive Web App)
- Lokaler Server (Raspberry Pi / NAS)

## Architektur-Prinzipien

### 1. **Pragmatismus über Dogmatismus**
- Keine unnötige Abstraktion
- Code-Organisation erst wenn benötigt
- Einfachheit vor Skalierbarkeit

### 2. **Separation of Concerns (Light)**
- Frontend: Components → Hooks → API
- Backend: Routes → Business Logic → Database
- KEINE vollständige Clean Architecture

### 3. **Convention over Configuration**
- Standardmäßige Express-Patterns
- React Best Practices
- TypeScript Strict Mode

## Projekt-Struktur

```
haustracker/
├── src/                          # Frontend
│   ├── components/               # React Components
│   ├── pages/                    # Page Components (Routing)
│   ├── hooks/                    # Custom Hooks ⭐ NEU
│   │   ├── useReadings.ts       # Readings State Management
│   │   ├── useTariffs.ts        # Tariffs State Management
│   │   ├── useSettings.ts       # Settings State Management
│   │   ├── useElwa.ts           # ELWA Data Management
│   │   └── index.ts             # Barrel Export
│   ├── main.tsx                 # Entry Point
│   └── App.tsx                  # Root Component
│
├── server/                       # Backend
│   ├── src/
│   │   ├── routes/ ⭐ NEU       # API Route Handlers
│   │   │   ├── readings.routes.ts
│   │   │   ├── tariffs.routes.ts
│   │   │   ├── elwa.routes.ts
│   │   │   └── settings.routes.ts
│   │   ├── db.ts                # Database Connection
│   │   ├── elwa-client.ts       # my-PV API Client
│   │   ├── elwa-scheduler.ts    # Automatic Import Scheduler
│   │   └── index.ts             # Express Server
│   └── data/
│       └── haustracker.db       # SQLite Database
│
├── public/                       # Static Assets
│   ├── manifest.json            # PWA Manifest
│   └── icon.svg                 # App Icon
│
└── docs/                         # Documentation
    └── ARCHITECTURE.md          # This file
```

## Frontend-Architektur

### Component-Hierarchie

```
App
├── Home                          # Dashboard mit Übersicht
├── Readings                      # Zählerstand-Verwaltung
├── Tariffs                       # Tarif-Verwaltung
├── Statistics                    # Statistiken & Charts
├── Settings                      # Einstellungen
└── Elwa                          # ELWA-Daten (optional)
```

### Custom Hooks Pattern

**Problem (vorher):**
```typescript
// API-Calls überall verstreut
function ReadingsPage() {
  const [readings, setReadings] = useState([]);

  useEffect(() => {
    fetch('/api/readings')
      .then(r => r.json())
      .then(data => setReadings(data));
  }, []);

  const addReading = async (data) => {
    await fetch('/api/readings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    // Manuell refetchen...
  };

  return <div>...</div>;
}
```

**Lösung (jetzt):**
```typescript
// Wiederverwendbarer Hook
function ReadingsPage() {
  const { readings, loading, error, addReading } = useReadings();

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;

  return <div>...</div>;
}

// Hook ist testbar und wiederverwendbar
```

### Hook-Struktur

Jeder Hook folgt diesem Pattern:

```typescript
export function useResource() {
  const [data, setData] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    // Fetch logic with error handling
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addItem = async (item: CreateDTO) => {
    // POST logic
    await fetchData(); // Auto-refresh
  };

  return {
    data,
    loading,
    error,
    addItem,
    updateItem,
    deleteItem,
    refresh: fetchData,
  };
}
```

**Vorteile:**
- ✅ Zentralisierte API-Logik
- ✅ Einheitliches Error Handling
- ✅ Automatisches Refresh nach Mutations
- ✅ Wiederverwendbar
- ✅ Testbar

## Backend-Architektur

### Route Organization

**Problem (vorher):**
```typescript
// Alles in index.ts - 600+ Zeilen
app.get('/api/readings', ...)
app.post('/api/readings', ...)
app.get('/api/tariffs', ...)
app.post('/api/tariffs', ...)
// ... 50+ Endpoints
```

**Lösung (jetzt):**
```typescript
// index.ts - Nur Setup & Router Registration
import readingsRouter from './routes/readings.routes.js';
import tariffsRouter from './routes/tariffs.routes.js';

app.use('/api/readings', readingsRouter);
app.use('/api/tariffs', tariffsRouter);
```

### Router-Struktur

Jeder Router ist selbst-contained:

```typescript
// routes/readings.routes.ts
import { Router } from 'express';
import db from '../db.js';

const router = Router();

// Helper functions (privat für diesen Router)
function parseReading(row: any) { ... }
function calculateConsumption(current, previous) { ... }

// Routes
router.get('/', (req, res) => { ... });
router.post('/', (req, res) => { ... });
router.put('/:id', (req, res) => { ... });
router.delete('/:id', (req, res) => { ... });

export default router;
```

**Vorteile:**
- ✅ Eine Datei pro Resource
- ✅ Leicht zu finden
- ✅ Keine 600-Zeilen Monster-Datei
- ✅ Helpers bleiben lokal

## Datenbank-Schema

### Tabellen

**readings** - Zählerstände
```sql
id INTEGER PRIMARY KEY
timestamp TEXT NOT NULL
meterValue REAL NOT NULL
energyKwh REAL
consumption REAL
consumptionPerDay REAL
costSinceLastReading REAL
notes TEXT
meterPhoto TEXT (Base64)
```

**tariffs** - Fernwärme-Tarife
```sql
id INTEGER PRIMARY KEY
name TEXT NOT NULL
validFrom TEXT NOT NULL
validUntil TEXT
basePricePerYear REAL
energyPricePerKwh REAL
powerPricePerKw REAL
annualPowerKw REAL
taxRate REAL
totalPricePerKwh REAL (berechnet)
```

**elwaReadings** - ELWA Warmwasser-Daten
```sql
id INTEGER PRIMARY KEY
date TEXT UNIQUE
energyKwh REAL
energySolarKwh REAL
energyGridKwh REAL
temp1 REAL (Temperatur Sensor 1)
temp2 REAL (Temperatur Sensor 2)
source TEXT ('screenshot' | 'cloud')
notes TEXT
```

**settings** - Einstellungen
```sql
id TEXT PRIMARY KEY
monthlyPayment REAL
warmwasserGrundlast REAL
elwaCloudApiKey TEXT
elwaSerialNumber TEXT
```

## API-Endpunkte

### Readings
- `GET /api/readings` - Alle Zählerstände
- `GET /api/readings/:id` - Einzelner Zählerstand
- `POST /api/readings` - Neuer Zählerstand
- `PUT /api/readings/:id` - Zählerstand aktualisieren
- `DELETE /api/readings/:id` - Zählerstand löschen

### Tariffs
- `GET /api/tariffs` - Alle Tarife
- `POST /api/tariffs` - Neuer Tarif
- `PUT /api/tariffs/:id` - Tarif aktualisieren
- `DELETE /api/tariffs/:id` - Tarif löschen

### ELWA
- `GET /api/elwa` - Alle ELWA-Daten
- `GET /api/elwa/monthly` - Monatliche Daten mit Ersparnissen
- `POST /api/elwa/import-yesterday` - Import von gestern
- `POST /api/elwa/import-range` - Import Datumsbereich

### Settings
- `GET /api/settings` - Einstellungen laden
- `PUT /api/settings` - Einstellungen speichern

## ELWA Cloud Integration

### Architektur

```
┌─────────────────┐
│  my-PV Cloud API│
│  (api.my-pv.com)│
└────────┬────────┘
         │ HTTPS
         │ interval=1d
         ▼
┌─────────────────┐
│  ElwaCloudClient│  (elwa-client.ts)
│  - getDailyData  │
│  - getYesterday  │
│  - transformData │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ElwaScheduler   │  (elwa-scheduler.ts)
│  - importYesterday
│  - importRange    │
│  - checkAndFillGaps (48h)
│  - Daily @ 2 AM   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  SQLite DB      │
│  elwaReadings   │
└─────────────────┘
```

### Gap-Detection Strategie

**Problem:** API-Daten können verzögert erscheinen

**Lösung:** 48h Re-Check Window
```typescript
// Beim Server-Start:
1. Letzten DB-Eintrag finden
2. Von (last - 48h) bis gestern abfragen
3. Nur Einträge mit Daten speichern

// Nächster Start:
1. Wieder 48h zurück prüfen
2. Falls neue Daten → Update
```

**Beispiel:**
```
Tag 1: Abfrage 19-20 Nov → Keine Daten
Tag 2: Abfrage 18-21 Nov → Daten für 19-20 erschienen ✓
```

## Was wir NICHT haben (bewusst)

### ❌ Clean Architecture
- Kein Domain Layer
- Kein Repository Pattern
- Keine Use Cases
- **Grund:** Zu komplex für die App-Größe

### ❌ CQRS / Event Sourcing
- Keine Command/Query Trennung
- Keine Event Streams
- **Grund:** Unnötig für CRUD-Operationen

### ❌ Complex State Management
- Kein Redux/Zustand/Jotai
- **Grund:** Custom Hooks + useState reichen

### ❌ ORM
- Kein Prisma/TypeORM
- **Grund:** Raw SQL ist einfacher für SQLite

### ❌ GraphQL
- Nur REST API
- **Grund:** Overhead nicht gerechtfertigt

## Migration: Alt → Neu

**Schritt 1: Custom Hooks einführen (ohne Breaking Changes)**

1. Hooks erstellen (bereits erledigt)
2. In einer Component testen
3. Schrittweise migrieren

**Schritt 2: Backend Routes trennen (optional)**

```bash
# Backup erstellen
cp server/src/index.ts server/src/index.backup.ts

# Neue index.ts verwenden
cp server/src/index.new.ts server/src/index.ts

# Testen
npm run dev

# Bei Problemen: Rollback
cp server/src/index.backup.ts server/src/index.ts
```

## Best Practices

### Frontend

1. **Hooks für alle API-Calls**
   ```typescript
   // ✅ Gut
   const { data, loading } = useReadings();

   // ❌ Schlecht
   useEffect(() => { fetch('...') }, []);
   ```

2. **Error Boundaries**
   ```typescript
   <ErrorBoundary>
     <YourComponent />
   </ErrorBoundary>
   ```

3. **Loading States zeigen**
   ```typescript
   if (loading) return <Spinner />;
   ```

### Backend

1. **Validation in Routes**
   ```typescript
   if (!data.timestamp || !data.meterValue) {
     return res.status(400).json({ error: 'Missing fields' });
   }
   ```

2. **Error Handling**
   ```typescript
   try {
     // Logic
   } catch (err) {
     res.status(500).json({ error: err.message });
   }
   ```

3. **Prepared Statements**
   ```typescript
   // ✅ Gut - SQL Injection safe
   const stmt = db.prepare('SELECT * FROM readings WHERE id = ?');
   stmt.get(id);

   // ❌ Schlecht
   db.prepare(`SELECT * FROM readings WHERE id = ${id}`);
   ```

## Performance

### Frontend
- Lazy Loading für Pages (React.lazy)
- Memoization für teure Berechnungen (useMemo)
- Debouncing für Suchfelder

### Backend
- SQLite Indexe auf häufige Queries
- Caching für Settings (selten ändern)
- Batch-Inserts für Bulk-Operationen

## Testing (Future)

### Frontend
```typescript
// hooks/useReadings.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useReadings } from './useReadings';

test('fetches readings', async () => {
  const { result } = renderHook(() => useReadings());

  await waitFor(() => {
    expect(result.current.readings).toHaveLength(10);
  });
});
```

### Backend
```typescript
// routes/readings.test.ts
import request from 'supertest';
import app from '../index';

test('GET /api/readings returns readings', async () => {
  const res = await request(app).get('/api/readings');

  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
});
```

## Deployment

### Produktion
```bash
# Frontend Build
npm run build

# Backend Start
cd server && npm start

# Oder beides
npm run dev:all
```

### Environment
```env
PORT=3001
NODE_ENV=production
DATABASE_PATH=./data/haustracker.db
```

## Wartung

### Neue Features hinzufügen

**Frontend:**
1. Neuen Hook erstellen (falls nötig)
2. Component erstellen
3. In `App.tsx` Route hinzufügen

**Backend:**
1. Neuen Router erstellen
2. In `index.ts` mounten
3. Dokumentieren

### Refactoring-Strategie

1. **Tests schreiben** (wenn kritisch)
2. **Inkrementell ändern** (nicht alles auf einmal)
3. **Feature Flags** (für große Änderungen)
4. **Rollback-Plan** (Backup vor Änderungen)

## Zusammenfassung

**Das haben wir:**
- ✅ Klare Struktur (aber nicht over-engineered)
- ✅ Wiederverwendbare Logik (Custom Hooks)
- ✅ Organisierte Routes
- ✅ Typsicherheit (TypeScript)
- ✅ Pragmatische Patterns

**Das wollen wir NICHT:**
- ❌ Komplexität um der Komplexität willen
- ❌ Patterns für Probleme die wir nicht haben
- ❌ Enterprise-Architecture für Haushalts-App

**Philosophie:**
> "Make it work, make it right, make it fast - in that order"
> - Kent Beck

Die Architektur ist so einfach wie möglich, aber strukturiert genug um wartbar zu bleiben.
