# HausTracker - Wärmezähler & Hausautomatisierungs-App

## 📋 Projektübersicht

Eine Progressive Web App (PWA) zur automatisierten Erfassung von Wärmezähler-Ablesungen mittels OCR und Integration von KNX/Home Assistant Daten für umfassende Energie- und Hausanalysen.

### Kernziele
- **Hauptziel**: Manuelle Excel-Tabelle durch automatisierte Lösung ersetzen
- **OCR-Ablesung**: Kamera-basierte Erfassung von Zählerständen
- **Automatisierung**: Integration mit Home Assistant für Wetter-, Temperatur- und Helligkeitsdaten
- **Bidirektionale Sync**: Daten zwischen App und Home Assistant austauschen
- **Erinnerungen**: Automatische Benachrichtigungen bei fehlenden Ablesungen

---

## 🎯 Anforderungsanalyse

### Funktionale Anforderungen

#### Primäre Features
1. **OCR-Zählerablesung**
   - Kamera-Zugriff für Zähler-Display-Erfassung
   - Echtzeit-Vorschau mit Erkennungs-Overlay
   - Automatische Ziffernerkennung
   - Manuelle Korrekturmöglichkeit
   - Validierung (z.B. neuer Wert muss größer als letzter sein)

2. **Automatische Datenerfassung**
   - Aktuelle Außentemperatur (zum Zeitpunkt der Ablesung)
   - Durchschnittstemperatur letzte Nacht (22:00 - 06:00)
   - Wetterlage des Tages (sonnig/bewölkt basierend auf Helligkeitswerten)
   - Timestamp der Ablesung

3. **Datenhaltung & Historie**
   - Lokale Speicherung aller Ablesungen
   - Zeitreihen-Ansicht
   - Export-Funktionen (CSV, Excel-kompatibel)
   - Backup/Restore-Mechanismus

4. **Home Assistant Integration**
   - Abruf von Sensor-Daten (REST API / WebSocket)
   - Push von Ablesungen nach Home Assistant
   - Erstellung von Home Assistant Sensoren für:
     - Aktueller Zählerstand
     - Tagesverbrauch
     - Wochenverbrauch
     - Durchschnittsverbrauch

5. **Intelligente Erinnerungen**
   - Konfigurierbare Ableseintervalle
   - Push-Benachrichtigungen bei überfälliger Ablesung
   - Optional: Erinnerung zu bestimmten Tageszeiten

#### Sekundäre Features
- Verbrauchsstatistiken & Trends
- Vergleich mit Vormonaten/Vorjahren
- Korrelationsanalyse (Verbrauch vs. Außentemperatur)
- Kostenschätzung basierend auf Tarifen
- Dark Mode
- Mehrsprachigkeit (DE/EN)

### Nicht-funktionale Anforderungen
- **Performance**: OCR < 2 Sekunden
- **Offline-First**: Volle Funktionalität ohne Internet
- **Responsive**: Optimiert für Mobile (primär) und Desktop
- **Datenschutz**: Alle Daten lokal oder selbst-gehostet
- **Sicherheit**: Verschlüsselte Kommunikation mit Home Assistant

---

## 🛠 Technologie-Stack Empfehlung

### Frontend Framework: **React + Vite**

**Begründung:**
- ✅ Modern, performant, große Community
- ✅ Vite: Extrem schnelle Build-Zeiten, optimales HMR
- ✅ Perfekt für PWAs mit vite-plugin-pwa
- ✅ Große Auswahl an UI-Komponenten-Bibliotheken
- ✅ Gute TypeScript-Unterstützung

**Alternative:** SvelteKit (noch performanter, aber kleinere Community)

### UI Framework: **Tailwind CSS + shadcn/ui**

**Begründung:**
- ✅ Tailwind: Modernes Utility-First CSS, sehr flexibel
- ✅ shadcn/ui: Hochwertige, zugängliche Komponenten
- ✅ Kopieren statt installieren - volle Kontrolle
- ✅ Radix UI Primitives - beste Accessibility
- ✅ Modern & Clean Look out-of-the-box

**Alternative:** Mantine UI (mehr vorgefertigte Komponenten)

### OCR-Engine: **Tesseract.js**

**Begründung:**
- ✅ Läuft komplett im Browser (keine Backend-Abhängigkeit)
- ✅ Gute Genauigkeit für Ziffern bei gutem Licht
- ✅ Aktiv maintained, große Community
- ✅ Offline-fähig
- ✅ Kostenfrei

**Optimierungen:**
- Vorverarbeitung mit Canvas API (Kontrast, Threshold, Zuschneiden)
- Trainierte Daten nur für Ziffern laden (kleiner, schneller)
- Web Worker nutzen für nicht-blockierende Verarbeitung

**Alternative:** Google ML Kit (native, genauer, aber komplizierter für PWA)

### Datenhaltung: **IndexedDB (via Dexie.js)**

**Begründung:**
- ✅ Große Speicherkapazität (im Gegensatz zu LocalStorage)
- ✅ Strukturierte Daten, Indizes, Queries
- ✅ Dexie.js macht IndexedDB einfach nutzbar
- ✅ Perfekt für Offline-First Apps
- ✅ Observable Queries für reaktive UI-Updates

### PWA-Setup: **Vite PWA Plugin + Workbox**

**Begründung:**
- ✅ Automatische Service Worker Generierung
- ✅ Offline-Unterstützung out-of-the-box
- ✅ Asset-Caching-Strategien
- ✅ Background Sync für Home Assistant Sync
- ✅ Web Push Notifications

### Home Assistant Integration: **REST API + WebSocket**

**Begründung:**
- ✅ Home Assistant hat ausgezeichnete REST API
- ✅ WebSocket für Echtzeit-Updates (optional)
- ✅ Long-Lived Access Tokens für Authentifizierung
- ✅ Reverse Proxy möglich für externe Zugriffe

### State Management: **Zustand**

**Begründung:**
- ✅ Minimalistisch, performant
- ✅ Kein Boilerplate wie Redux
- ✅ Perfekt für kleine bis mittlere Apps
- ✅ Gute DevTools
- ✅ TypeScript-First

**Alternative:** Jotai (noch minimaler, Atom-basiert)

### Weitere Tools:
- **TypeScript** - Type Safety
- **React Router** - Navigation
- **date-fns** - Datum-Handling
- **Recharts** - Diagramme/Statistiken
- **Zod** - Schema Validation
- **Vitest** - Testing

---

## 🏗 Architektur

### Systemarchitektur

```mermaid
graph TB
    subgraph "Mobile Device (PWA)"
        A[React PWA Frontend]
        B[Service Worker]
        C[IndexedDB]
        D[Camera API]
        E[Tesseract.js Worker]
        F[Notification API]
    end

    subgraph "Home Assistant System"
        G[Home Assistant Core]
        H[REST API]
        I[WebSocket API]
        J[Weather Integration]
        K[KNX Integration]
        L[Recorder Database]
    end

    A -->|Capture Image| D
    D -->|Image Data| E
    E -->|OCR Result| A
    A -->|Store Reading| C
    C -->|Retrieve History| A
    A -->|Fetch Sensors| H
    A -->|Real-time Updates| I
    H -->|Sensor Data| A
    A -->|Register Reminder| B
    B -->|Trigger| F
    A -->|Push Reading as Sensor| H
    H -->|Store| L
    K -->|KNX Data| G
    J -->|Weather Data| G
    G -->|Expose| H
    G -->|Stream| I
```

### Datenfluss: Neue Ablesung

```mermaid
sequenceDiagram
    actor User
    participant App
    participant Camera
    participant OCR
    participant DB
    participant HomeAssistant

    User->>App: Öffnet Ablesung-View
    App->>Camera: Request Video Stream
    Camera-->>App: Video Feed
    User->>App: Drückt Erfassen
    App->>Camera: Capture Frame
    Camera-->>App: Image Blob
    App->>OCR: Process Image
    OCR-->>App: Recognized Digits
    App->>User: Zeige Ergebnis + Korrektur
    User->>App: Bestätigt/Korrigiert
    App->>HomeAssistant: Fetch Current Sensors
    HomeAssistant-->>App: Temperature, Weather Data
    App->>DB: Store Complete Reading
    App->>HomeAssistant: POST Reading as Sensor
    HomeAssistant-->>App: Success
    App->>User: Zeige Erfolg + Statistik
```

### Datenbankschema (IndexedDB)

```typescript
interface Reading {
  id?: number;
  timestamp: Date;
  meterValue: number;
  unit: 'MWh' | 'kWh';

  // Automatisch erfasst
  outdoorTempCurrent: number;
  outdoorTempNightAvg: number;
  weatherCondition: 'sunny' | 'cloudy' | 'mixed' | 'unknown';
  brightnessAvg: number;

  // Berechnete Werte
  consumption?: number; // Differenz zur letzten Ablesung
  daysSinceLastReading?: number;

  // Meta
  source: 'ocr' | 'manual';
  ocrConfidence?: number;
  notes?: string;
  imageData?: Blob; // Optional: Foto speichern
  synced: boolean; // Mit Home Assistant synchronisiert
}

interface Settings {
  id: 'main';
  homeAssistantUrl: string;
  homeAssistantToken: string;
  temperatureSensorEntity: string;
  brightnessSensorEntity: string;
  reminderIntervalDays: number;
  reminderEnabled: boolean;
  pricePerMWh?: number;
  targetConsumption?: number;
}

interface HomeAssistantSync {
  id?: number;
  readingId: number;
  syncedAt: Date;
  entityId: string;
  success: boolean;
}
```

### Komponenten-Hierarchie

```
App
├── Router
│   ├── DashboardPage
│   │   ├── StatisticsCard
│   │   ├── LatestReadingCard
│   │   ├── QuickScanButton
│   │   └── ConsumptionChart
│   │
│   ├── ScanPage
│   │   ├── CameraView
│   │   ├── OCROverlay
│   │   ├── CaptureButton
│   │   └── ResultDialog
│   │       ├── ReadingForm
│   │       └── SensorDataFetch
│   │
│   ├── HistoryPage
│   │   ├── FilterBar
│   │   ├── ReadingsList
│   │   └── ExportButton
│   │
│   ├── StatisticsPage
│   │   ├── ConsumptionTrend
│   │   ├── TemperatureCorrelation
│   │   ├── WeatherImpact
│   │   └── CostProjection
│   │
│   └── SettingsPage
│       ├── HomeAssistantConfig
│       ├── ReminderSettings
│       ├── SensorMapping
│       └── DataManagement
│
└── Providers
    ├── ThemeProvider
    ├── DatabaseProvider
    └── HomeAssistantProvider
```

---

## 📸 OCR-Implementierung & Performance

### Herausforderungen bei Zähler-OCR

1. **Variierende Lichtverhältnisse**
   - Display-Beleuchtung kann schwach sein
   - Reflexionen auf dem Display
   - Schatten

2. **Display-Typen**
   - LCD/LED Segment-Displays
   - 7-Segment-Anzeigen vs. Dot-Matrix
   - Unterschiedliche Kontraste

3. **Aufnahmewinkel**
   - Perspektivische Verzerrung
   - Nicht-optimaler Winkel zum Display

### Optimierungsstrategien

#### 1. Bildvorverarbeitung (Pre-Processing)

```javascript
// Schritte vor Tesseract.js
1. Grayscale Conversion
2. Contrast Enhancement (CLAHE)
3. Adaptive Thresholding (Binary Conversion)
4. Noise Reduction (Gaussian Blur)
5. Edge Detection & Crop zu relevantem Bereich
6. Deskew (Winkelkorrektur)
```

#### 2. OCR-Konfiguration

```javascript
Tesseract.recognize(image, 'eng', {
  tessedit_char_whitelist: '0123456789.,',
  tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE,
  preserve_interword_spaces: '0',
})
```

#### 3. UI/UX-Optimierung

**Guided Capture:**
- Overlay mit Zielrahmen (wie bei QR-Code-Scannern)
- Feedback: "Näher ran", "Zu dunkel", "Display im Rahmen halten"
- Auto-Capture bei stabiler Erkennung

**Konfidenz-basierter Flow:**
```
Hohe Konfidenz (>90%): Auto-confirm nach 2 Sekunden
Mittlere Konfidenz (70-90%): Zeige Ergebnis, bitte um Bestätigung
Niedrige Konfidenz (<70%): Manuelle Eingabe empfehlen
```

#### 4. Performance-Erwartungen

**Realistische Werte:**
- Bildverarbeitung: 100-300ms
- OCR (Tesseract.js): 500-1500ms
- Gesamt: **< 2 Sekunden** (auf modernem Smartphone)

**Optimierung:**
- Web Worker für OCR (UI bleibt responsiv)
- Tesseract.js Caching (beim ersten Laden ~2MB Download)
- Reduzierte Bildauflösung (640x480 ausreichend für Ziffern)

#### 5. Fallback-Strategie

```mermaid
flowchart TD
    A[Foto aufgenommen] --> B[Pre-Processing]
    B --> C[Tesseract OCR]
    C --> D{Konfidenz?}
    D -->|Hoch >90%| E[Auto-Fill Formular]
    D -->|Mittel 70-90%| F[Zeige Ergebnis]
    D -->|Niedrig <70%| G[Leeres Formular]
    E --> H[User bestätigt]
    F --> I[User korrigiert/bestätigt]
    G --> J[User gibt manuell ein]
    H --> K[Speichern]
    I --> K
    J --> K
```

---

## 🏠 Home Assistant Integration

### 1. Daten VON Home Assistant abrufen

#### REST API Aufrufe

```typescript
// services/homeassistant.ts

interface HAConfig {
  url: string;
  token: string;
}

// Sensor-Daten abrufen
async function getSensorState(entityId: string): Promise<number> {
  const response = await fetch(`${config.url}/api/states/${entityId}`, {
    headers: {
      'Authorization': `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    }
  });
  const data = await response.json();
  return parseFloat(data.state);
}

// Historische Daten für Durchschnittsberechnung
async function getHistory(entityId: string, startTime: Date): Promise<any[]> {
  const timestamp = startTime.toISOString();
  const response = await fetch(
    `${config.url}/api/history/period/${timestamp}?filter_entity_id=${entityId}`,
    { headers: { 'Authorization': `Bearer ${config.token}` } }
  );
  return response.json();
}
```

#### Benötigte Daten-Abrufe

```typescript
async function fetchReadingContext(): Promise<ReadingContext> {
  // Aktuelle Außentemperatur
  const currentTemp = await getSensorState('sensor.outdoor_temperature');

  // Nacht-Durchschnitt (22:00 gestern bis 6:00 heute)
  const lastNight = {
    start: setHours(subDays(new Date(), 1), 22),
    end: setHours(new Date(), 6),
  };
  const nightHistory = await getHistory('sensor.outdoor_temperature', lastNight.start);
  const nightAvg = calculateAverage(nightHistory, lastNight.start, lastNight.end);

  // Helligkeits-Daten für heutigen Tag (z.B. 6:00 - jetzt)
  const todayStart = setHours(startOfDay(new Date()), 6);
  const brightnessHistory = await getHistory('sensor.brightness', todayStart);
  const brightnessAvg = calculateAverage(brightnessHistory);

  // Wetterableitung
  const weatherCondition = classifyWeather(brightnessAvg);

  return {
    outdoorTempCurrent: currentTemp,
    outdoorTempNightAvg: nightAvg,
    brightnessAvg,
    weatherCondition,
  };
}
```

### 2. Daten ZU Home Assistant senden

#### Strategie: MQTT Sensor (Empfohlen)

**Vorteile:**
- Einfacher als Custom Components
- Automatische Persistierung in Recorder
- Einfache Integration in Dashboards/Automationen

**Setup in Home Assistant:**

```yaml
# configuration.yaml
mqtt:
  sensor:
    - name: "Wärmezähler Stand"
      state_topic: "home/heat_meter/reading"
      unit_of_measurement: "MWh"
      device_class: energy
      state_class: total_increasing

    - name: "Wärmezähler Tagesverbrauch"
      state_topic: "home/heat_meter/daily_consumption"
      unit_of_measurement: "kWh"
      device_class: energy
      state_class: total

    - name: "Wärmezähler Letzte Ablesung"
      state_topic: "home/heat_meter/last_reading_date"
      device_class: timestamp
```

**Von der App senden:**

```typescript
async function publishToHomeAssistant(reading: Reading) {
  // Via MQTT (wenn HA MQTT Broker exposed ist)
  await mqttClient.publish('home/heat_meter/reading', reading.meterValue.toString());
  await mqttClient.publish('home/heat_meter/last_reading_date', reading.timestamp.toISOString());

  if (reading.consumption) {
    await mqttClient.publish('home/heat_meter/daily_consumption', reading.consumption.toString());
  }
}
```

#### Alternative: RESTful Command

```yaml
# configuration.yaml
rest_command:
  update_heat_meter:
    url: http://homeassistant.local:8123/api/states/sensor.heat_meter_reading
    method: POST
    headers:
      authorization: "Bearer YOUR_LONG_LIVED_TOKEN"
      content-type: 'application/json'
    payload: >
      {
        "state": "{{ state }}",
        "attributes": {
          "unit_of_measurement": "MWh",
          "timestamp": "{{ timestamp }}",
          "temperature": "{{ temperature }}",
          "weather": "{{ weather }}"
        }
      }
```

#### Alternative: Home Assistant App als Input Helper

```yaml
# configuration.yaml
input_number:
  heat_meter_reading:
    name: Wärmezähler Aktueller Stand
    min: 0
    max: 100000
    step: 0.001
    unit_of_measurement: MWh
```

Von der PWA updaten via REST API:

```typescript
async function updateInputHelper(entityId: string, value: number) {
  await fetch(`${config.url}/api/services/input_number/set_value`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      entity_id: entityId,
      value: value,
    }),
  });
}
```

### 3. Authentifizierung

**Long-Lived Access Token** (Empfohlen für PWA):
1. In Home Assistant: Profil → Security → Long-Lived Access Tokens
2. Token in PWA-Settings sicher speichern (IndexedDB, verschlüsselt)
3. Bei jedem API-Call im Authorization Header mitschicken

**Sicherheit:**
- Token nie in Code committen
- HTTPS-only für externe Zugriffe
- Optional: Zusätzliche PIN-Sperre in der App

---

## 💡 Zusätzliche Feature-Ideen

### 1. Intelligente Erinnerungen

**Adaptive Intervalle:**
- Lernt aus Ablesegewohnheiten
- Erinnert 1 Tag vor "normalem" Ablesetag
- Dringlichkeits-Stufen (Info → Warnung → Kritisch)

**Kontext-basierte Erinnerungen:**
- "Temperatur heute besonders niedrig → hoher Verbrauch erwartet"
- "Letzte Ablesung vor genau 30 Tagen → ideal für monatliche Statistik"

### 2. Verbrauchsanalyse & Prognose

**Korrelations-Dashboards:**
```
Verbrauch vs. Außentemperatur (Scatter-Plot)
Verbrauch vs. Sonnenstunden (Bar-Chart)
Wochentag-Analyse (Wochenende vs. Werktage)
Jahresvergleich (2023 vs. 2024)
```

**Prognose-Modell:**
- Basierend auf Temperaturprognose Verbrauch vorhersagen
- Hochrechnung Monats-/Jahresverbrauch
- Kostenschätzung

### 3. Benchmark & Gamification

- Vergleich mit deutschem Durchschnitt (ähnliche Haushaltsgröße)
- Effizienz-Score
- Achievements: "10 Ablesungen erfasst", "Verbrauch um 10% gesenkt"

### 4. Multi-Zähler-Unterstützung

Falls später weitere Zähler (Strom, Wasser, Gas):
- Mehrere Zähler-Profile
- Gemeinsame Timeline/Dashboard
- Gesamtenergiekosten-Übersicht

### 5. Export & Berichte

- PDF-Jahresbericht (für Eigentümerversammlung etc.)
- CSV-Export für eigene Analysen
- Direkter Excel-Export mit Formeln

### 6. Sprachassistent-Integration

- Alexa/Google Home: "Wie hoch ist mein aktueller Zählerstand?"
- Sprachgesteuerte Ablesung: "Alexa, Zählerstand ist 42,5 MWh"

### 7. OCR-Training & Verbesserung

- User-Feedback-Loop: Korrektur-Daten sammeln
- Custom Tesseract-Training für spezifisches Display-Modell
- Community-Trainings-Datensatz für häufige Zählertypen

### 8. Automatisierungs-Trigger in Home Assistant

```yaml
automation:
  - alias: "Hoher Verbrauch erkannt"
    trigger:
      platform: mqtt
      topic: "home/heat_meter/daily_consumption"
    condition:
      condition: numeric_state
      entity_id: sensor.heat_meter_daily_consumption
      above: 50  # kWh
    action:
      service: notify.mobile_app
      data:
        message: "Ungewöhnlich hoher Wärmeverbrauch heute: {{ trigger.payload }} kWh"
```

---

## 🎨 UI/UX Konzept

### Design-Prinzipien

1. **Mobile First**: Primär für Smartphone-Nutzung optimiert
2. **One-Hand-Friendly**: Wichtige Aktionen im unteren Bildschirmbereich
3. **Schnell & Effizient**: Maximal 3 Taps bis zur Ablesung
4. **Visuelles Feedback**: Sofortiges Feedback bei allen Aktionen
5. **Progressive Disclosure**: Einfache Oberfläche, Details auf Wunsch

### Farbschema

**Light Mode:**
- Primary: Warmes Orange/Rot (Wärme-Assoziation) #F97316
- Secondary: Blau (Kälte/Effizienz) #3B82F6
- Success: Grün #10B981
- Background: Helles Grau #F9FAFB

**Dark Mode:**
- Angepasste Palette mit höherem Kontrast
- OLED-freundliches Schwarz #000000

### Key Screens (Text-Scribbles)

#### 1. Dashboard
```
┌─────────────────────────────────┐
│  🏠 HausTracker        ☰        │
├─────────────────────────────────┤
│                                 │
│  📊 Aktueller Stand             │
│  ┌───────────────────────────┐  │
│  │  42.567 MWh              │  │
│  │  Letzte Ablesung: Vor 3d │  │
│  └───────────────────────────┘  │
│                                 │
│  ⚡ Verbrauch letzte Periode    │
│  ┌───────────────────────────┐  │
│  │  45.2 kWh                │  │
│  │  ↓ 5% vs. Vormonat       │  │
│  └───────────────────────────┘  │
│                                 │
│  [Trend-Chart: letzte 30d]     │
│  ┌───────────────────────────┐  │
│  │     ╱╲    ╱╲              │  │
│  │    ╱  ╲  ╱  ╲╱            │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │   📸 NEUE ABLESUNG        │  │
│  └───────────────────────────┘  │
│                                 │
│  [Verlauf] [Statistiken] [⚙️]  │
└─────────────────────────────────┘
```

#### 2. Scan-View
```
┌─────────────────────────────────┐
│  ← Abbrechen                    │
├─────────────────────────────────┤
│                                 │
│  ┌───────────────────────────┐  │
│  │ [Live-Kamera-Feed]        │  │
│  │                           │  │
│  │    ┏━━━━━━━━━━━━━━┓      │  │
│  │    ┃ 42.567 MWh  ┃      │  │
│  │    ┗━━━━━━━━━━━━━━┛      │  │
│  │ (Ziel-Overlay für Display)│  │
│  │                           │  │
│  └───────────────────────────┘  │
│                                 │
│  💡 Tipp: Display im Rahmen    │
│     halten und still bleiben   │
│                                 │
│         ┌─────────┐            │
│         │   📸    │            │
│         │ Scannen │            │
│         └─────────┘            │
│                                 │
│  [💡 Taschenlampe]  [🔄 Flip]  │
└─────────────────────────────────┘
```

#### 3. Ergebnis-Dialog
```
┌─────────────────────────────────┐
│  ✓ Zähler erfolgreich erkannt  │
├─────────────────────────────────┤
│                                 │
│  Zählerstand (MWh)             │
│  ┌───────────────────────────┐  │
│  │  42.567                   │  │
│  └───────────────────────────┘  │
│  ✓ Plausibel (+45.2 kWh)      │
│                                 │
│  📅 15.11.2025  ⏰ 14:32       │
│                                 │
│  🌡️ Automatisch erfasst:       │
│  • Außentemperatur: 5.2°C      │
│  • Nacht-Ø: 3.8°C              │
│  • Wetter: ☁️ Bewölkt           │
│                                 │
│  📝 Notiz (optional)            │
│  ┌───────────────────────────┐  │
│  │                           │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │     💾 SPEICHERN          │  │
│  └───────────────────────────┘  │
│                                 │
│  Abbrechen                      │
└─────────────────────────────────┘
```

#### 4. Statistiken
```
┌─────────────────────────────────┐
│  ← Statistiken                  │
├─────────────────────────────────┤
│  [Monat] [Jahr] [Custom]       │
│                                 │
│  📈 Verbrauchstrend            │
│  ┌───────────────────────────┐  │
│  │ [Line Chart]              │  │
│  │ Verbrauch vs. Temp.       │  │
│  └───────────────────────────┘  │
│                                 │
│  ☀️ Wetter-Einfluss            │
│  ┌───────────────────────────┐  │
│  │ Sonnig:  42 kWh/Tag      │  │
│  │ Bewölkt: 48 kWh/Tag      │  │
│  │ Unterschied: -12.5%       │  │
│  └───────────────────────────┘  │
│                                 │
│  💰 Kostenübersicht            │
│  ┌───────────────────────────┐  │
│  │ Dieser Monat:  ~420€     │  │
│  │ Hochrechnung:   ~1.680€  │  │
│  │ Vorjahr:        1.850€   │  │
│  │ Ersparnis: -9.2% 📉      │  │
│  └───────────────────────────┘  │
│                                 │
│  [📊 Export] [📄 Bericht]      │
└─────────────────────────────────┘
```

### Animations & Transitions

- **Scan-Feedback**: Grüner Glow bei erfolgreicher Erkennung
- **Speichern**: Checkmark-Animation + Haptic Feedback
- **Charts**: Smooth Easing bei Datenwechsel
- **Navigation**: Native-ähnliche Slide-Transitions

---

## 📱 PWA-Spezifika

### Warum PWA?

✅ **Pro:**
- Kein App Store nötig
- Eine Codebasis für iOS & Android & Desktop
- Direktes Deployment, keine Review-Wartezeiten
- Voller Zugriff auf moderne Web-APIs (Camera, Notifications, Storage)
- Einfaches Update (neuer Build → sofort verfügbar)
- Offline-First möglich

⚠️ **Contra:**
- iOS-Einschränkungen (z.B. Push Notifications nur ab iOS 16.4)
- Kein Zugriff auf native-only APIs (NFC, Bluetooth komplizierter)
- Tesseract.js langsamer als native ML Kit
- Weniger "Native Feel" (aber mit gutem Design kaum merkbar)

### Für dieses Projekt: **PWA ist ideal!**

**Begründung:**
- Alle benötigten APIs verfügbar (Camera, Storage, Notifications)
- Home Assistant Integration ist Web-basiert
- Keine Performance-kritischen Anforderungen (2s OCR ist ok)
- Schnelle Iteration & Updates wichtig
- Keine Monetarisierung → kein App Store nötig

### PWA Setup

```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'HausTracker - Wärmezähler App',
        short_name: 'HausTracker',
        description: 'Automatische Wärmezähler-Ablesung mit Home Assistant Integration',
        theme_color: '#F97316',
        background_color: '#FFFFFF',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ],
        categories: ['utilities', 'productivity'],
        screenshots: [
          { src: '/screenshot-mobile.png', sizes: '390x844', type: 'image/png' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/homeassistant\.local\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'ha-api-cache',
              networkTimeoutSeconds: 10,
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      }
    })
  ]
});
```

### Installation Experience

1. **iOS Safari**: "Zum Home-Bildschirm" Button
2. **Android Chrome**: Automatischer Install-Banner
3. **Desktop**: Install-Button in Adressleiste

---

## 🚀 Implementierungsplan

### Phase 1: MVP (2-3 Wochen)

**Ziel:** Grundlegende App mit manueller Eingabe und OCR

**Tasks:**
1. **Setup** (1 Tag)
   - [x] Vite + React + TypeScript Projekt initialisieren
   - [x] Tailwind + shadcn/ui Setup
   - [x] PWA Plugin konfigurieren
   - [x] Projekt-Struktur anlegen

2. **Datenschicht** (1-2 Tage)
   - [ ] Dexie.js Setup mit Schema
   - [ ] CRUD-Operationen für Readings
   - [ ] Settings-Management
   - [ ] Migrations-Strategie

3. **UI-Grundgerüst** (2 Tage)
   - [ ] Layout & Navigation (React Router)
   - [ ] Dashboard-Seite (ohne echte Daten)
   - [ ] Eingabeformular für manuelle Ablesung
   - [ ] Historie-Liste
   - [ ] Settings-Seite

4. **Kamera & OCR** (3-4 Tage)
   - [ ] Kamera-Zugriff & Live-View
   - [ ] Foto-Capture
   - [ ] Tesseract.js Integration
   - [ ] Bildvorverarbeitung
   - [ ] OCR-Ergebnis-Verarbeitung
   - [ ] Konfidenz-basierter UI-Flow

5. **Basis-Features** (2 Tage)
   - [ ] Manuelle Eingabe mit Validierung
   - [ ] Speichern & Historie
   - [ ] Einfache Statistiken (Verbrauch, Differenzen)
   - [ ] Export (CSV)

6. **Testing & Polish** (1 Tag)
   - [ ] Grundlegende Tests
   - [ ] Mobile Testing (echtes Gerät!)
   - [ ] Bug Fixes

### Phase 2: Home Assistant Integration (1 Woche)

**Ziel:** Bidirektionale Sync mit Home Assistant

**Tasks:**
1. **HA-Service-Layer** (2 Tage)
   - [ ] REST API Client
   - [ ] Authentifizierung
   - [ ] Sensor-Daten abrufen
   - [ ] History-Daten abrufen
   - [ ] Error Handling & Retry

2. **Automatische Datenerfassung** (2 Tage)
   - [ ] Temperatur-Sensor-Mapping
   - [ ] Helligkeits-Sensor-Mapping
   - [ ] Durchschnittsberechnung (Nacht)
   - [ ] Wetter-Klassifizierung
   - [ ] Auto-Fill bei Ablesung

3. **Daten zu HA senden** (2 Tage)
   - [ ] MQTT-Client oder REST Command
   - [ ] Sensor-Registrierung in HA
   - [ ] Sync-Status-Tracking
   - [ ] Background Sync (Service Worker)

4. **Settings & Config** (1 Tag)
   - [ ] HA-URL & Token Eingabe
   - [ ] Sensor-Entity-Auswahl
   - [ ] Verbindungstest
   - [ ] Mapping-UI

### Phase 3: Smart Features (1-2 Wochen)

**Ziel:** Erinnerungen, erweiterte Statistiken, Optimierungen

**Tasks:**
1. **Erinnerungen** (2 Tage)
   - [ ] Service Worker Notification Setup
   - [ ] Intervall-Konfiguration
   - [ ] Notification Scheduling
   - [ ] Notification Actions

2. **Erweiterte Statistiken** (3 Tage)
   - [ ] Recharts Integration
   - [ ] Verbrauchs-Trend-Charts
   - [ ] Temperatur-Korrelation
   - [ ] Wetter-Einfluss-Analyse
   - [ ] Kostenberechnung

3. **UX-Verbesserungen** (2 Tage)
   - [ ] Onboarding-Flow
   - [ ] Empty States
   - [ ] Loading States
   - [ ] Error States
   - [ ] Haptic Feedback

4. **Performance-Optimierung** (2 Tage)
   - [ ] OCR-Tuning
   - [ ] Lazy Loading
   - [ ] Code Splitting
   - [ ] Asset Optimization
   - [ ] Lighthouse-Audit

### Phase 4: Polish & Advanced Features (Optional)

**Tasks:**
- [ ] Multi-Language Support
- [ ] Dark Mode
- [ ] Erweiterte Export-Optionen (PDF)
- [ ] Prognose-Modell
- [ ] Achievements/Gamification
- [ ] Custom OCR Training
- [ ] Multi-Zähler-Support

---

## ⚠️ Risiken & Herausforderungen

### 1. OCR-Genauigkeit

**Risiko:** Ziffernerkennung funktioniert nicht zuverlässig genug

**Mitigation:**
- Früher Prototyp mit echtem Zähler testen
- Bildvorverarbeitung optimieren
- UI-Flow mit manueller Korrektur
- Fallback: Manuelle Eingabe immer möglich
- Alternative OCR-Engine evaluieren (Google ML Kit)

**Worst Case:** Hauptsächlich manuelle Eingabe mit optionaler OCR-Unterstützung

### 2. Home Assistant Connectivity

**Risiko:** HA nicht von außerhalb erreichbar, Netzwerkprobleme

**Mitigation:**
- Offline-First Architecture
- Lokales Caching
- Retry-Mechanismen
- Background Sync bei Verbindung
- Klare Error Messages

**Worst Case:** App funktioniert standalone, HA-Sync manuell

### 3. iOS PWA-Einschränkungen

**Risiko:** Notifications, Background Sync limitiert auf iOS

**Mitigation:**
- Graceful Degradation
- Alternative Reminder-Mechanismen (In-App)
- Feature Detection
- Klare Kommunikation an User

**Worst Case:** Reduzierte Features auf iOS, Fokus auf Android

### 4. Performance (Alte Geräte)

**Risiko:** OCR zu langsam auf älteren Smartphones

**Mitigation:**
- Progressive Enhancement
- Bild-Größe reduzieren
- Web Worker nicht-blockierend
- Performance-Monitoring
- Mindest-Anforderungen kommunizieren

**Worst Case:** Manuelle Eingabe für alte Geräte

### 5. Datenmigration

**Risiko:** Bestehende Excel-Daten gehen verloren

**Mitigation:**
- Import-Funktion für CSV/Excel
- Klares Mapping (Datum → Wert)
- Daten-Validierung beim Import
- Export vor Migration empfehlen

**Worst Case:** Parallelbetrieb Excel + App für Übergangszeit

---

## 📦 Deployment

### Hosting-Optionen

#### Option 1: Self-Hosted (Empfohlen)

**Auf gleichem System wie Home Assistant:**
- Nginx/Apache als Reverse Proxy
- Static Files aus `/var/www/haustracker`
- HTTPS via Let's Encrypt
- Lokaler Zugriff: `https://haustracker.local`

**Vorteile:**
- Volle Kontrolle
- Keine externe Abhängigkeit
- Schnelle Verbindung zu HA
- Kein Daten-Leak

#### Option 2: Cloud-Hosting (Vercel/Netlify)

**Mit VPN/Reverse Proxy zu Home Assistant:**
- PWA auf Vercel/Netlify
- HA via VPN oder Cloudflare Tunnel erreichbar

**Vorteile:**
- Einfaches Deployment (Git Push)
- CDN weltweit
- Automatische Updates
- Kein Server-Management

**Nachteil:**
- HA muss extern erreichbar sein (Sicherheitsrisiko)

#### Option 3: Home Assistant Add-on

**Als Custom Add-on verpacken:**
- Docker Container mit Static Files
- Ingress-Support für HA-UI-Embedding

**Vorteil:**
- Perfekte Integration
- Ein-Klick-Installation

**Nachteil:**
- Komplexeres Setup
- Updates manuell

### Empfehlung: **Option 1** für Start, später **Option 3**

---

## 🧪 Testing-Strategie

### Unit Tests (Vitest)
- Utility-Funktionen (Durchschnittsberechnung, Validierung)
- Zustand-Store (Zustand)
- API-Services (gemockt)

### Integration Tests
- Dexie.js Datenbank-Operationen
- Home Assistant API-Calls (mit Mock-Server)
- OCR-Pipeline

### E2E Tests (Playwright)
- Kritische User-Flows
- Ablesung erfassen
- Historie durchsuchen
- Settings speichern

### Manuelles Testing
- Echtes Gerät (iOS & Android)
- Echter Zähler
- Verschiedene Lichtverhältnisse
- Netzwerk-Disconnect-Szenarien

---

## 📚 Technologie-Stack Summary

| Kategorie | Technologie | Begründung |
|-----------|-------------|------------|
| **Framework** | React + Vite | Modern, performant, große Community |
| **Language** | TypeScript | Type Safety, bessere DX |
| **UI** | Tailwind + shadcn/ui | Modern, flexibel, hochwertig |
| **State** | Zustand | Minimalistisch, performant |
| **Routing** | React Router | Standard, bewährt |
| **Database** | Dexie.js (IndexedDB) | Offline-First, große Kapazität |
| **OCR** | Tesseract.js | Browser-basiert, offline-fähig |
| **PWA** | Vite PWA Plugin | Automatisch, Workbox-basiert |
| **Charts** | Recharts | Deklarativ, responsive |
| **Forms** | React Hook Form + Zod | Performant, Validation |
| **Dates** | date-fns | Lightweight, tree-shakeable |
| **Testing** | Vitest + Playwright | Schnell, moderne Alternative zu Jest |
| **API** | Home Assistant REST + MQTT | Native HA-Integration |

---

## 🎯 Success Metrics

### MVP-Erfolg
- [ ] Ablesung in < 30 Sekunden (inkl. OCR)
- [ ] OCR-Erfolgsrate > 80%
- [ ] Offline-Funktionalität 100%
- [ ] Lighthouse Score > 90

### Langfristiger Erfolg
- [ ] Ersetzt Excel-Tabelle komplett
- [ ] Wöchentliche Nutzung
- [ ] < 5 Minuten pro Monat Zeitaufwand
- [ ] Neue Insights durch Statistiken
- [ ] Integration mit HA-Automationen

---

## 🚦 Nächste Schritte

1. **Review & Feedback zu diesem Plan**
   - Passt die Technologie-Auswahl?
   - Sind Features priorisiert richtig?
   - Gibt es Anforderungen, die fehlen?

2. **Prototyp starten**
   - Setup Phase 1 Tasks
   - Erstes Testen mit echtem Zähler

3. **Iteratives Vorgehen**
   - Early & Often testen
   - User Feedback einholen
   - Anpassungen vornehmen

---

## 📞 Offene Fragen

1. **Zähler-Details:**
   - Welcher Hersteller/Modell ist dein Wärmezähler?
   - Wie viele Nachkommastellen hat die Anzeige?
   - Kannst du ein Foto vom Display teilen?

2. **Home Assistant:**
   - Welche Version nutzt du?
   - Ist MQTT bereits konfiguriert?
   - Welche Sensor-Entity-IDs für Temperatur & Helligkeit?

3. **Anforderungen:**
   - Wie oft willst du typischerweise ablesen?
   - Sind mehrere Nutzer/Geräte geplant?
   - Gibt es einen Abrechnungszeitraum (Jahresablesung)?

4. **Hosting:**
   - Läuft Home Assistant auf eigenem Server/NAS?
   - Ist externes Zugreifen gewünscht (außerhalb Heimnetz)?

---

## 📝 Zusammenfassung

Dieses Projekt ist **sehr gut umsetzbar** als PWA mit folgenden Highlights:

✅ **Technisch realistisch:** Alle Features mit modernen Web-APIs machbar
✅ **OCR machbar:** Tesseract.js ausreichend für Ziffern, < 2s Performance
✅ **Offline-First:** Volle Funktionalität ohne Internet
✅ **HA-Integration:** REST API + MQTT für bidirektionale Sync
✅ **Schnelle Entwicklung:** React-Ökosystem ermöglicht schnelle Iteration
✅ **Wartbar:** TypeScript + moderne Tools = gute Codebasis

**Geschätzte Entwicklungszeit:** 4-6 Wochen für voll funktionsfähige Version

**Empfehlung:** Mit Phase 1 MVP starten, früh mit echtem Zähler testen, dann iterativ erweitern!
