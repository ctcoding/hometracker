# Tech Stack - HausTracker

> Übersicht für Senior-Entwickler

## Architektur

**Client-Server-Architektur** mit getrenntem Frontend und Backend
- Frontend: React SPA als Progressive Web App (PWA)
- Backend: Node.js REST API mit SQLite-Datenbank
- Kommunikation: Vite Proxy (dev) → Express API

## Frontend Stack

### Core
- **React 19.2** - UI Framework
- **TypeScript 5.9** - Type Safety
- **Vite 7.2** - Build Tool & Dev Server
- **React Router 7.9** - Client-side Routing

### Styling & UI
- **Tailwind CSS 4.1** - Utility-first CSS
- **Lucide React** - Icon Library
- **clsx + tailwind-merge** - Conditional Classes

### Charts & Visualisierung
- **Recharts 3.4** - Deklarative Chart-Library (LineChart, AreaChart, BarChart)
- Pattern: ResponsiveContainer + CartesianGrid für responsive, saubere Charts

### State Management
- **Zustand 5.0** - Lightweight State Management
- **React Hooks** - Lokaler State (useState, useEffect)

### PWA Features
- **Vite-PWA 1.1** - Service Worker & Manifest
- **mkcert** - Vertrauenswürdige SSL-Zertifikate für lokale Entwicklung
  - Notwendig für Camera API (MediaDevices)
  - Zertifikate: localhost, 192.168.178.29, 10.211.55.2
  - Ablauf: 2028-02-23

### Storage (Legacy - nicht mehr aktiv genutzt)
- **Dexie 4.2** + **dexie-react-hooks** - IndexedDB Wrapper
- ⚠️ Aktuelle Architektur: Backend-zentriert mit SQLite

## Backend Stack

### Core
- **Node.js** - Runtime
- **Express 4.21** - Web Framework
- **TypeScript** - Type Safety
- **tsx 4.19** - TypeScript Execution & Hot Reload

### Datenbank
- **better-sqlite3 11.5** - Synchrone SQLite3-Bindings
- **WAL Mode** - Write-Ahead Logging für bessere Performance
- Schema: readings, settings, tariffs, payments, elwaReadings, ha_metrics

### Besonderheiten
- **Kein ORM** - Direkter SQL mit Prepared Statements
- **Migrations** - Try-catch für ALTER TABLE (idempotent)

## Externe Integrationen

### my-PV ELWA API
- **Challenge**: Strikte Rate-Limits (HTTP 429)
- **Lösung**: Exponential Backoff Retry (2s, 4s, 8s, 16s, 32s)
- **Scheduler**: Täglicher Import um 2:00 Uhr (keine automatischen Startup-Checks)
- **Gap-Filling**: Manueller Button für 48h Rückwärts-Check

### Home Assistant
- **Push-Architektur**: HA sendet Daten an Backend (nicht Pull)
- **Authentifizierung**: Bearer Token (generiert in Settings)
- **Metriken**: Temperatur, Helligkeit, Wind, PV, ELWA (10-Min-Intervall)
- **Retention**: 2-10 Jahre historische Daten

## Entwicklungs-Setup

### Ports (PERSISTENT)
```
Frontend: 5273 (HTTPS)
Backend:  3331 (HTTP)
```

### HTTPS Lokal
```bash
# mkcert Zertifikate in .cert/
mkcert localhost 192.168.178.29 10.211.55.2 127.0.0.1 ::1
```

### Start
```bash
npm run dev:all  # Startet beide Server parallel
```

### ⚠️ KRITISCHE REGEL: Process Management
```bash
# ❌ NIEMALS
pkill -f vite
pkill -f tsx

# ✅ IMMER (port-spezifisch)
lsof -ti:5273 | xargs kill -9  # Frontend
lsof -ti:3331 | xargs kill -9  # Backend
```

**Grund**: `pkill -f` killt ALLE Prozesse systemweit, auch von parallel laufenden Apps.

## Projekt-Besonderheiten

### 1. PWA ohne Client-DB
- Klassische Client-Server-Architektur trotz PWA
- better-sqlite3 NUR im Backend (funktioniert nicht im Browser)
- Frontend: API-Calls via fetch() mit Vite Proxy

### 2. Mobile-First Navigation
- Responsive Bottom Navigation
- Icons + Text auf Desktop (≥640px)
- Nur Icons auf Mobile (<640px)

### 3. OCR für Zähler-Ablesung
- **Tesseract.js** - Browser-basiertes OCR
- Camera API für Live-Aufnahme
- Manuelle Korrektur-Möglichkeit

### 4. Time-Series Visualisierung
- Recharts für alle Datenvisualisierungen
- Intelligente X-Achsen-Intervalle: `Math.floor(data.length / 10)`
- Gestapelte Areas, Multi-Line, Bar-Vergleiche

### 5. Retry-Pattern für externe APIs
```typescript
async function fetchWithRetry(url, maxRetries = 5, baseDelay = 2000) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url);
    if (response.status === 429) {
      await sleep(baseDelay * Math.pow(2, i));
      continue;
    }
    return response;
  }
  throw new Error('Max retries exceeded');
}
```

## Learnings & Best Practices

### ✅ Do's
1. **Port-basierte Process-Kills** statt `pkill -f`
2. **Exponential Backoff** bei Rate-Limiting
3. **WAL Mode** für SQLite Concurrent Access
4. **Prepared Statements** für SQL (Security + Performance)
5. **mkcert** für lokale HTTPS (kein selbstsigniert)
6. **Responsive Charts** mit ResponsiveContainer
7. **Icons ohne Text** auf Mobile (platzsparend)

### ❌ Don'ts
1. Nie `pkill -f vite/tsx` in Multi-Projekt-Umgebungen
2. Keine automatischen API-Checks beim Serverstart (Rate-Limits)
3. Keine better-sqlite3 im Frontend (Node.js-only)
4. Keine hartcodierten Ports ohne .dev-notes.md Dokumentation

### 🎯 Optimierungen
- **Bundle Size**: recharts ist groß (~500KB), aber notwendig für Charts
- **SQL Indices**: Timestamp-Index auf ha_metrics für schnelle Range-Queries
- **Vite Proxy**: `/api` → `localhost:3331` für CORS-freie Entwicklung

## Deployment Vorbereitung

### Frontend Build
```bash
npm run build
# → dist/ (statische Assets)
```

### Backend Production
```bash
cd server
npm run build
npm start
# → dist/index.js (compiled TypeScript)
```

### Environment Variables
- Backend Port: `process.env.PORT || 3331`
- Frontend: Vite `.env` für API Base URL

## Dateistruktur

```
.
├── src/                    # Frontend (React)
│   ├── components/
│   ├── pages/
│   └── lib/
├── server/                 # Backend (Express)
│   ├── src/
│   │   ├── index.ts       # Express App
│   │   ├── db.ts          # SQLite Setup
│   │   └── elwa-*.ts      # ELWA Integration
│   └── data/              # SQLite DB
├── .cert/                  # mkcert Zertifikate (nicht in Git)
├── vite.config.ts          # Vite + PWA + HTTPS
└── .dev-notes.md           # Projekt-spezifische Notizen
```

## Dependencies Management

**Frontend**: 16 dependencies, 46 total
**Backend**: 3 dependencies (express, cors, better-sqlite3)

**Bewusst schlank gehalten** - nur notwendige Dependencies.

## Performance Metrics

- **Vite Cold Start**: ~200ms
- **Hot Reload**: <100ms
- **Chart Render**: <50ms (300 Datenpunkte)
- **SQLite Query**: <5ms (indexed)

## Nächste Schritte (Optional)

1. **Backend HTTPS** für Produktion (aktuell nur Frontend HTTPS)
2. **Umgebungsvariablen** für API-Keys (ELWA, HA)
3. **Docker Setup** für einfaches Deployment
4. **E2E Tests** (Playwright/Cypress)
5. **API Rate Limiting** im Backend (express-rate-limit)
