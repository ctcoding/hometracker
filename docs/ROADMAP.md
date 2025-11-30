# HausTracker Roadmap

## Aktueller Stand: MVP v1.0 ✅

### Fertige Features
- [x] PWA mit React + Vite + Tailwind
- [x] Kamera-basierte Zählerablesung
- [x] OCR mit Tesseract.js (optimiert für SHARKY 775)
- [x] Manuelle Eingabe als Fallback
- [x] Lokale Speicherung (IndexedDB/Dexie.js)
- [x] Dashboard mit aktuellem Stand
- [x] Verlauf aller Ablesungen
- [x] Basis-Einstellungen
- [x] Offline-fähig (Service Worker)

---

## Phase 2: Erweiterte Ablesungen 📊

### 2.1 Detaillierte Ablesung-Daten
Basierend auf deiner Excel-Tabelle:

- [ ] **Zeitraum-Berechnung**
  - Stunden seit letzter Ablesung
  - Tage seit letzter Ablesung
  - Automatische Berechnung

- [ ] **Verbrauchsmetriken**
  - Delta kWh (Verbrauch seit letzter Ablesung)
  - kWh/Tag (Durchschnittsverbrauch)
  - kWh/Stunde

- [ ] **Kosten-Berechnung**
  - €/Tag basierend auf aktuellem Tarif
  - €/kWh Anzeige
  - Kosten seit letzter Ablesung

- [ ] **Wetterdaten** (aus Home Assistant)
  - Außentemperatur aktuell
  - Außentemperatur Nachts (Durchschnitt 22-6 Uhr)
  - Zimmertemperatur
  - Wetter am Vortag (sonnig/bewölkt)

- [ ] **Erweiterte Notizen**
  - Freitext-Notizen pro Ablesung
  - Schnell-Tags: "Duschen", "Heizstab aktiv", "Urlaub", etc.
  - Filterbar in Historie

---

## Phase 3: Preisverwaltung 💰

### 3.1 Tarif-Verwaltung
- [ ] **Aktuelle Preise**
  - Arbeitspreis (€/kWh)
  - Grundpreis pro Jahr
  - CO2-Abgabe pro kWh
  - Gasumlagen pro kWh
  - Messeinrichtung pro Jahr

- [ ] **Preis-Historie**
  - Preisänderungen mit Datum speichern
  - Automatische Anwendung des korrekten Tarifs je Zeitraum
  - Anzeige: "Preis 2024", "Preis ab 01/25", "Preis ab 04/25"

- [ ] **Zusammengesetzte Kosten**
  - Gesamtkosten pro kWh berechnen
  - Fix pro Monat berechnen
  - Steigerung in % anzeigen

### 3.2 Abschlag-Verwaltung
- [ ] **Abschlagszahlungen**
  - Monatlicher Abschlag eingeben
  - Änderungen mit Datum speichern
  - Historie der Abschlagsänderungen

- [ ] **Zahlungen erfassen**
  - Datum + Betrag der Zahlung
  - Automatische Zuordnung zum Monat

---

## Phase 4: Monatliche Auswertung 📈

### 4.1 Monatsübersicht
- [ ] **Monatliche Aggregation**
  - Zählerstand zum Monatsende
  - Delta kWh (Monatsverbrauch)
  - Kosten im Monat (berechnet)
  - kWh pro Tag (Monatsdurchschnitt)

- [ ] **Kontostand-Tracking**
  - Geleistete Abschlagszahlungen
  - Tatsächliche Kosten
  - Guthaben/Schulden (Differenz)
  - Farbcodierung: Grün = Guthaben, Rot = Schulden

### 4.2 Prognose & Hochrechnung
- [ ] **Verbrauchsprognose**
  - Hochrechnung auf Basis der letzten X Monate
  - Berücksichtigung saisonaler Schwankungen
  - Voraussichtlicher Jahresverbrauch

- [ ] **Kostenprognose**
  - Erwartete Kosten für nächste Monate
  - Erwartetes Jahresguthaben/-schulden
  - Empfehlung für Abschlagsanpassung

- [ ] **Zielverbrauch**
  - Eigenes Ziel setzen (kWh/Monat oder kWh/Jahr)
  - Vergleich Ist vs. Soll
  - Warnung bei Überschreitung

---

## Phase 5: Statistiken & Charts 📉

### 5.1 Visualisierungen
- [ ] **Verbrauchs-Charts**
  - Liniendiagramm: Verbrauch über Zeit
  - Balkendiagramm: Monatsvergleich
  - Vergleich: Dieses Jahr vs. Vorjahr

- [ ] **Kosten-Charts**
  - Kosten pro Monat
  - Kumulierte Kosten vs. Abschläge
  - Kontostand-Verlauf

- [ ] **Korrelations-Analyse**
  - Verbrauch vs. Außentemperatur (Scatter-Plot)
  - Verbrauch vs. Wetter
  - Identifikation von Ausreißern

### 5.2 Vergleiche & Benchmarks
- [ ] **Zeitvergleiche**
  - Woche vs. Vorwoche
  - Monat vs. Vormonat
  - Jahr vs. Vorjahr

- [ ] **Effizienz-Metriken**
  - kWh pro Grad-Tag (Heizgradtage)
  - Effizienz-Score
  - Trend-Anzeige (besser/schlechter)

---

## Phase 6: Home Assistant Integration 🏠

### 6.1 Daten VON Home Assistant
- [ ] **Automatischer Abruf**
  - Außentemperatur-Sensor
  - Innentemperatur-Sensor(en)
  - Helligkeits-/Wetter-Sensor
  - Historische Daten für Durchschnitte

- [ ] **Sensor-Auswahl UI**
  - Liste verfügbarer Sensoren
  - Einfache Zuordnung
  - Verbindungstest

### 6.2 Daten ZU Home Assistant
- [ ] **MQTT Integration**
  - Aktueller Zählerstand als Sensor
  - Tagesverbrauch als Sensor
  - Monatsverbrauch als Sensor
  - Kosten als Sensor

- [ ] **Home Assistant Automationen**
  - Trigger bei hohem Verbrauch
  - Benachrichtigung bei Ablesung fällig
  - Dashboard-Widget

---

## Phase 7: Backend & Sync 🔄

### 7.1 Server-Backend
- [ ] **Node.js API**
  - REST-Endpoints für alle Operationen
  - PostgreSQL-Datenbank
  - JWT-Authentifizierung

- [ ] **Multi-Device-Sync**
  - Daten auf Server speichern
  - Offline-First mit Background-Sync
  - Konflikt-Auflösung

### 7.2 Daten-Management
- [ ] **Import-Funktion**
  - CSV-Import (aus Excel)
  - Feld-Mapping UI
  - Validierung vor Import

- [ ] **Export-Funktion**
  - CSV-Export
  - Excel-Export (.xlsx)
  - PDF-Jahresbericht

- [ ] **Backup & Restore**
  - Manuelles Backup (JSON)
  - Automatisches Cloud-Backup
  - Restore-Funktion

---

## Phase 8: Erweiterte Features ✨

### 8.1 Erinnerungen
- [ ] **Smart Reminders**
  - Push-Benachrichtigung nach X Tagen
  - Adaptive Intervalle (lernt aus Gewohnheiten)
  - Erinnerung zu bestimmter Uhrzeit

- [ ] **Kontext-Erinnerungen**
  - "Temperatur heute niedrig → mehr Verbrauch erwartet"
  - "Monatsende → Ablesung für Statistik empfohlen"

### 8.2 Multi-Zähler
- [ ] **Weitere Zähler**
  - Stromzähler
  - Wasserzähler
  - Gaszähler
  - Eigene Zähler definieren

- [ ] **Zähler-Übersicht**
  - Dashboard mit allen Zählern
  - Gesamtenergiekosten

### 8.3 Gamification
- [ ] **Achievements**
  - "10 Ablesungen erfasst"
  - "Verbrauch um 10% gesenkt"
  - "Streak: 30 Tage regelmäßig"

- [ ] **Effizienz-Ziele**
  - Monatsziele setzen
  - Belohnung bei Erreichen

---

## Phase 9: Polish & UX 💅

### 9.1 UI/UX Verbesserungen
- [ ] **Dark Mode**
- [ ] **Onboarding-Flow** für neue Nutzer
- [ ] **Haptic Feedback** bei Aktionen
- [ ] **Animationen** (Charts, Übergänge)
- [ ] **Barrierefreiheit** (A11y)

### 9.2 Performance
- [ ] **Lazy Loading** für Charts
- [ ] **Virtualisierte Listen** für große Historien
- [ ] **Optimierte OCR** (Web Worker)
- [ ] **App-Icons** (verschiedene Größen)

---

## Daten-Schema Erweiterungen

### Reading (erweitert)
```typescript
interface Reading {
  id: number;
  timestamp: Date;
  meterValue: number;
  unit: 'kWh';

  // Berechnete Werte
  hoursSinceLastReading: number;
  daysSinceLastReading: number;
  consumption: number;        // Delta kWh
  consumptionPerDay: number;  // kWh/Tag
  consumptionPerHour: number; // kWh/Stunde
  costSinceLastReading: number; // €

  // Wetterdaten
  outdoorTemp: number;
  outdoorTempNight: number;
  indoorTemp: number;
  weather: 'sunny' | 'cloudy' | 'mixed';

  // Meta
  source: 'ocr' | 'manual';
  ocrConfidence: number;
  notes: string;
  tags: string[];  // ['Duschen', 'Heizstab']
  imageData: string;
}
```

### Tariff (neu)
```typescript
interface Tariff {
  id: number;
  validFrom: Date;
  validUntil: Date | null;

  workingPrice: number;      // €/kWh Arbeitspreis
  basePrice: number;         // €/Jahr Grundpreis
  co2Price: number;          // €/kWh CO2-Abgabe
  gasLevy: number;           // €/kWh Gasumlage
  meteringPrice: number;     // €/Jahr Messeinrichtung

  // Berechnet
  totalPricePerKwh: number;  // Summe aller kWh-Kosten
  fixedMonthly: number;      // Monatliche Fixkosten
}
```

### Payment (neu)
```typescript
interface Payment {
  id: number;
  date: Date;
  type: 'advance' | 'settlement'; // Abschlag oder Abrechnung
  amount: number;
  notes: string;
}
```

### MonthlyStats (neu)
```typescript
interface MonthlyStats {
  id: number;
  year: number;
  month: number;

  startReading: number;
  endReading: number;
  consumption: number;
  consumptionPerDay: number;

  calculatedCost: number;
  paidAdvances: number;
  balance: number;  // + = Guthaben, - = Schulden

  avgOutdoorTemp: number;
}
```

---

## Prioritäten

### Hoch (nächste Schritte)
1. Preisverwaltung (Phase 3)
2. Monatliche Auswertung (Phase 4)
3. CSV-Import für bestehende Daten
4. Erweiterte Ablesungen mit Wetterdaten

### Mittel
5. Charts & Statistiken (Phase 5)
6. Home Assistant Integration (Phase 6)
7. Erinnerungen

### Niedrig (später)
8. Backend & Multi-Device-Sync
9. Multi-Zähler
10. Gamification

---

## Notizen aus Excel-Analyse

### Beobachtungen aus deinen Daten:
- **Typischer Verbrauch**: 30-70 kWh/Tag im Winter
- **Heizstab** hat großen Einfluss
- **Duschen** verursacht messbare Spitzen
- **Außentemperatur** korreliert stark mit Verbrauch
- **Abschlag** wurde mehrfach angepasst (270€ → 180€ → 173€)
- **Preis-Steigerungen** etwa quartalsweise

### Wichtige Formeln:
- `kWh/Tag = Delta / Stunden * 24`
- `€/Tag = kWh/Tag * Arbeitspreis + (Grundpreis/365)`
- `Kosten/Monat = Verbrauch * Arbeitspreis + Grundpreis/12`
- `Kontostand = Summe(Zahlungen) - Summe(Kosten)`
