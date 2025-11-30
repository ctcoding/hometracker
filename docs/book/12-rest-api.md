# Kapitel 12: REST API Design - Moderne API-Patterns

Du arbeitest bereits mit ASP.NET Web API oder anderen REST-Frameworks? Gut. Dieses Kapitel geht davon aus, dass du die Grundlagen kennst, und konzentriert sich darauf, dein Wissen zu vertiefen und zu modernisieren. Wir werden sehen, was eine wirklich gute API ausmacht - und wo die meisten Entwickler Fehler machen.

## 12.1 REST Prinzipien - Ein kurzer Refresher

REST (Representational State Transfer) wurde 2000 von Roy Fielding in seiner Dissertation definiert. Was damals revolutionär war, ist heute Standard. Doch viele APIs, die sich "RESTful" nennen, sind es nicht wirklich.

### Die sechs Constraints

REST definiert sechs architektonische Constraints:

**1. Client-Server:** Strikte Trennung von Concerns. Der Client kümmert sich um UI, der Server um Datenhaltung und Businesslogik.

**2. Stateless:** Jeder Request muss alle Informationen enthalten, die der Server zur Verarbeitung braucht. Der Server speichert keinen Client-Zustand zwischen Requests.

```
// Schlecht: Server merkt sich Session
GET /api/cart  // Server muss wissen, welcher User das ist

// Gut: Client identifiziert sich bei jedem Request
GET /api/users/123/cart
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**3. Cacheable:** Responses müssen sich selbst als cacheable oder non-cacheable kennzeichnen.

```http
Cache-Control: max-age=3600
ETag: "abc123"
```

**4. Uniform Interface:** Dies ist das Herzstück von REST. Ressourcen werden durch URIs identifiziert, manipuliert durch Repräsentationen, mit selbstbeschreibenden Nachrichten und HATEOAS.

**5. Layered System:** Ein Client kann nicht wissen, ob er direkt mit dem Server oder mit einem Intermediary (Load Balancer, Cache, Gateway) kommuniziert.

**6. Code on Demand (optional):** Server kann ausführbaren Code an den Client senden (z.B. JavaScript).

### Ressourcen - Das Herzstück von REST

Eine Ressource ist ein Konzept, das du mit einem URI identifizierst. Nicht die Datenbankzeile, nicht das Objekt in deinem Code - das konzeptuelle Ding selbst.

```
/api/readings/42     -> Die Ablesung mit ID 42
/api/tariffs         -> Die Sammlung aller Tarife
/api/users/123/cart  -> Der Warenkorb von User 123
```

### HTTP-Verben richtig einsetzen

| Verb   | CRUD   | Idempotent | Safe | Beschreibung |
|--------|--------|------------|------|--------------|
| GET    | Read   | Ja         | Ja   | Ressource abrufen |
| POST   | Create | Nein       | Nein | Neue Ressource erstellen |
| PUT    | Update | Ja         | Nein | Ressource vollständig ersetzen |
| PATCH  | Update | Nein       | Nein | Ressource teilweise aktualisieren |
| DELETE | Delete | Ja         | Nein | Ressource löschen |

**Idempotent** bedeutet: Mehrfaches Ausführen hat denselben Effekt wie einmaliges Ausführen. PUT ist idempotent - wenn du dieselbe Ressource zweimal mit denselben Daten überschreibst, ist das Ergebnis identisch.

**Safe** bedeutet: Die Operation verändert nichts auf dem Server. GET und HEAD sind safe - sie rufen nur Daten ab.

### Das Richardson Maturity Model

Leonard Richardson definierte 2008 ein Reifegradmodell für REST-APIs:

**Level 0 - The Swamp of POX:** Ein einzelner Endpoint, alles per POST, RPC-Style.
```
POST /api
{ "action": "getReading", "id": 42 }
```

**Level 1 - Resources:** Verschiedene URIs für verschiedene Ressourcen.
```
POST /api/readings
{ "action": "get", "id": 42 }
```

**Level 2 - HTTP Verbs:** Korrekte Verwendung von HTTP-Verben.
```
GET /api/readings/42
```

**Level 3 - Hypermedia Controls (HATEOAS):** Responses enthalten Links zu verwandten Ressourcen und möglichen Aktionen.
```json
{
  "id": 42,
  "meterValue": 12345.6,
  "_links": {
    "self": { "href": "/api/readings/42" },
    "next": { "href": "/api/readings/43" },
    "tariff": { "href": "/api/tariffs/5" }
  }
}
```

Die meisten APIs in der Praxis sind auf Level 2. Level 3 (HATEOAS) ist theoretisch ideal, aber in der Praxis oft Overkill - außer du baust eine öffentliche API, die von vielen Clients genutzt wird.

## 12.2 URL Design

Das URL-Design ist die erste Entscheidung, die du triffst - und eine, mit der du lange leben musst.

### Naming Conventions

**Verwende Kleinbuchstaben und Bindestriche:**
```
✓ /api/advance-payments
✗ /api/advancePayments
✗ /api/advance_payments
```

Warum? URLs sind case-sensitive auf manchen Servern. Bindestriche sind besser lesbar und SEO-freundlich.

**Verwende Substantive, keine Verben:**
```
✓ GET /api/readings
✗ GET /api/getReadings
✗ GET /api/fetchAllReadings
```

Die Aktion steckt im HTTP-Verb, nicht in der URL.

### Plural vs. Singular

Die ewige Debatte. Meine klare Empfehlung: **Immer Plural**.

```
/api/readings       -> Sammlung aller Ablesungen
/api/readings/42    -> Eine spezifische Ablesung
```

Warum nicht Singular? Weil es konsistenter ist:
```
// Mit Plural
GET /api/readings     -> Liste
GET /api/readings/42  -> Element

// Mit Singular (inkonsistent)
GET /api/reading      -> ??? Liste oder ein Element?
GET /api/reading/42   -> Element
```

Die HausTracker-API folgt diesem Muster konsequent:
```
/api/readings
/api/tariffs
/api/payments
/api/advance-payments
```

### Nested Resources

Wenn Ressourcen in einer Beziehung stehen, kannst du das durch Verschachtelung ausdrücken:

```
/api/users/123/readings      -> Alle Ablesungen von User 123
/api/tariffs/5/price-history -> Preishistorie von Tarif 5
```

Aber Vorsicht: Nicht zu tief verschachteln!

```
// Zu tief - wird schnell unhandlich
/api/users/123/houses/456/meters/789/readings/42

// Besser: Flache Struktur mit Filterung
/api/readings/42
GET /api/readings?userId=123&meterId=789
```

Faustregel: Maximal zwei Ebenen Verschachtelung.

### Query Parameters für Filterung

Query-Parameter sind perfekt für:
- Filterung: `?status=active`
- Sortierung: `?sort=date&order=desc`
- Pagination: `?page=2&limit=20`
- Projektion: `?fields=id,name,date`

```
GET /api/readings?from=2024-01-01&to=2024-12-31&sort=timestamp&order=desc
```

### URL-Patterns vermeiden

**Keine Verben in URLs:**
```
✗ /api/readings/42/delete
✗ /api/createReading
```

**Keine File-Extensions:**
```
✗ /api/readings.json
✓ /api/readings (Accept: application/json)
```

**Keine Version in der Ressource selbst:**
```
✗ /api/v2/readings/42/v1
```

## 12.3 HTTP Status Codes richtig nutzen

Status Codes sind die erste Antwort, die der Client sieht - noch bevor er den Body parst. Sie richtig zu nutzen ist essentiell.

### 2xx - Erfolg

| Code | Name | Verwendung |
|------|------|------------|
| 200 | OK | Standarderfolg. GET liefert Daten, PUT/PATCH war erfolgreich. |
| 201 | Created | POST hat neue Ressource erstellt. Location-Header mit URL der neuen Ressource setzen! |
| 204 | No Content | Erfolgreich, aber kein Body. Typisch für DELETE. |
| 206 | Partial Content | Für Range-Requests (große Dateien, Streaming). |

```typescript
// 201 Created - Richtig gemacht
app.post('/api/readings', (req, res) => {
  const result = db.prepare('INSERT INTO readings...').run(...);
  res.status(201)
     .location(`/api/readings/${result.lastInsertRowid}`)
     .json({ id: result.lastInsertRowid });
});

// 204 No Content - Für DELETE
app.delete('/api/readings/:id', (req, res) => {
  db.prepare('DELETE FROM readings WHERE id = ?').run(req.params.id);
  res.status(204).send();
});
```

### 4xx - Client-Fehler

| Code | Name | Verwendung |
|------|------|------------|
| 400 | Bad Request | Ungültige Syntax, fehlende Pflichtfelder, falsches Format. |
| 401 | Unauthorized | Keine oder ungültige Authentifizierung. |
| 403 | Forbidden | Authentifiziert, aber nicht autorisiert. |
| 404 | Not Found | Ressource existiert nicht. |
| 405 | Method Not Allowed | HTTP-Methode nicht erlaubt für diese Ressource. |
| 409 | Conflict | Konflikt mit aktuellem Zustand (z.B. Duplikat). |
| 422 | Unprocessable Entity | Syntax ok, aber semantisch ungültig. |
| 429 | Too Many Requests | Rate Limit erreicht. |

**401 vs. 403 - Der häufige Fehler:**
```
// 401: "Wer bist du?" - Keine/ungültige Credentials
GET /api/readings
-> 401 Unauthorized (kein Token gesendet)

// 403: "Ich kenne dich, aber du darfst das nicht"
GET /api/admin/settings
Authorization: Bearer <valid-user-token>
-> 403 Forbidden (User ist kein Admin)
```

**400 vs. 422:**
```
// 400: Kann nicht geparst werden
POST /api/readings
Body: { invalid json

// 422: Geparst, aber ungültig
POST /api/readings
Body: { "meterValue": -100 }  // Negative Werte ungültig
```

### 5xx - Server-Fehler

| Code | Name | Verwendung |
|------|------|------------|
| 500 | Internal Server Error | Generischer Server-Fehler. Nie Details nach außen! |
| 502 | Bad Gateway | Upstream-Server hat Fehler geliefert. |
| 503 | Service Unavailable | Server temporär nicht verfügbar. |
| 504 | Gateway Timeout | Upstream-Server antwortet nicht. |

```typescript
// 500er: Niemals Stack Traces nach außen!
app.use((err, req, res, next) => {
  console.error(err.stack); // Intern loggen
  res.status(500).json({
    error: 'Internal Server Error',
    // NICHT: stack: err.stack
  });
});
```

### Häufige Fehler

**1. Immer 200 zurückgeben:**
```typescript
// Schlecht
app.get('/api/readings/:id', (req, res) => {
  const reading = db.get(req.params.id);
  res.json({ success: !reading ? false : true, data: reading });
});

// Gut
app.get('/api/readings/:id', (req, res) => {
  const reading = db.get(req.params.id);
  if (!reading) return res.status(404).json({ error: 'Not found' });
  res.json(reading);
});
```

**2. 404 für leere Listen:**
```typescript
// Schlecht - 404 wenn keine Daten
app.get('/api/readings', (req, res) => {
  const readings = db.all();
  if (readings.length === 0) return res.status(404).json([]);
  res.json(readings);
});

// Gut - 200 mit leerem Array
app.get('/api/readings', (req, res) => {
  const readings = db.all();
  res.json(readings); // [] ist ein valides Ergebnis
});
```

## 12.4 Request/Response Design

### JSON Best Practices

**Konsistente Struktur:**
```json
{
  "data": { ... },
  "meta": {
    "page": 1,
    "totalPages": 10,
    "totalCount": 100
  }
}
```

**CamelCase für Properties:**
```json
{
  "meterValue": 12345.6,
  "timestamp": "2024-03-15T10:30:00Z",
  "consumptionPerDay": 45.2
}
```

**ISO 8601 für Datum/Zeit:**
```json
{
  "timestamp": "2024-03-15T10:30:00Z",
  "validFrom": "2024-01-01",
  "validUntil": null
}
```

**Null vs. Undefined:**
```json
// Explizit kein Wert
{ "validUntil": null }

// Feld einfach weglassen wenn nicht relevant
{ "name": "Standard Tarif" }
```

### Pagination

Für Listen immer Pagination anbieten - auch wenn du heute nur 50 Datensätze hast. Morgen können es 50.000 sein.

**Offset-Based Pagination:**
```
GET /api/readings?page=2&limit=20

Response:
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 20,
    "totalPages": 10,
    "totalCount": 195
  }
}
```

**Cursor-Based Pagination (besser für große Datasets):**
```
GET /api/readings?cursor=abc123&limit=20

Response:
{
  "data": [...],
  "nextCursor": "def456",
  "hasMore": true
}
```

Cursor-basiert ist performanter bei großen Datenmengen, weil die Datenbank nicht die ersten N Zeilen überspringen muss.

### Filtering

```
GET /api/readings?from=2024-01-01&to=2024-03-31&minValue=100&maxValue=200
```

Komplexe Filter als JSON im Query-Parameter (URL-encoded):
```
GET /api/readings?filter={"meterValue":{"$gt":100},"timestamp":{"$gte":"2024-01-01"}}
```

### Sorting

```
GET /api/readings?sort=timestamp&order=desc
GET /api/readings?sort=-timestamp,+meterValue  // Mehrere Felder
```

Das Minus-Prefix für descending ist ein gängiges Pattern (z.B. bei Stripe).

### Partial Responses (Field Selection)

Spart Bandbreite, besonders auf mobilen Geräten:
```
GET /api/readings?fields=id,meterValue,timestamp
```

Response enthält nur die angeforderten Felder:
```json
[
  { "id": 42, "meterValue": 12345.6, "timestamp": "2024-03-15T10:30:00Z" }
]
```

### Expansion (Embedding)

Related Resources direkt einbetten statt extra Request:
```
GET /api/readings/42?expand=tariff

Response:
{
  "id": 42,
  "meterValue": 12345.6,
  "tariff": {
    "id": 5,
    "name": "Standard 2024",
    "workingPrice": 0.25
  }
}
```

## 12.5 Error Handling

### Konsistentes Error-Format

Definiere EIN Format für alle Fehler und halte dich daran:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "meterValue",
        "message": "Must be a positive number"
      },
      {
        "field": "timestamp",
        "message": "Must be a valid ISO 8601 date"
      }
    ]
  }
}
```

**Error-Codes sind wichtiger als Messages:**
```typescript
// Client kann auf Codes reagieren
if (error.code === 'RATE_LIMIT_EXCEEDED') {
  await sleep(error.retryAfter);
  return retry();
}
```

### RFC 7807 - Problem Details

Der Standard für HTTP API-Fehler:

```json
{
  "type": "https://example.com/probs/validation-error",
  "title": "Validation Error",
  "status": 422,
  "detail": "The meter value must be greater than the previous reading.",
  "instance": "/api/readings",
  "errors": [
    {
      "pointer": "/meterValue",
      "detail": "Value 12300 is less than previous reading 12345"
    }
  ]
}
```

**Felder:**
- `type`: URI, die den Fehlertyp identifiziert (kann auf Doku verlinken)
- `title`: Kurze, menschenlesbare Zusammenfassung
- `status`: HTTP Status Code
- `detail`: Spezifische Erklärung für diese Instanz
- `instance`: URI der fehlgeschlagenen Anfrage

ASP.NET Core unterstützt Problem Details out of the box:
```csharp
builder.Services.AddProblemDetails();
```

### Fehler niemals schlucken

```typescript
// Schlecht - Client weiß nicht was passiert ist
app.post('/api/readings', (req, res) => {
  try {
    // ...
  } catch (e) {
    res.json({ success: false });
  }
});

// Gut - Klare Fehlermeldung
app.post('/api/readings', (req, res) => {
  try {
    // ...
  } catch (e) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    });
  }
});
```

## 12.6 Versioning

APIs ändern sich. Die Frage ist nicht ob, sondern wie du Breaking Changes handhabst.

### URL Path Versioning

```
/api/v1/readings
/api/v2/readings
```

**Vorteile:**
- Offensichtlich und einfach zu verstehen
- Einfach zu cachen (verschiedene URLs)
- Einfach zu debuggen

**Nachteile:**
- Verletzt REST-Prinzip (URI sollte Ressource identifizieren, nicht Version)
- Clients müssen URL ändern bei Migration

### Header Versioning

```http
GET /api/readings
Accept: application/vnd.haustracker.v2+json
```

Oder Custom Header:
```http
GET /api/readings
API-Version: 2
```

**Vorteile:**
- URL bleibt stabil
- Sauberer aus REST-Sicht

**Nachteile:**
- Schwieriger zu debuggen
- Schwieriger zu cachen
- Clients müssen Header setzen

### Query Parameter Versioning

```
/api/readings?version=2
```

**Vorteile:**
- Optional (Default-Version wenn nicht angegeben)
- Einfach für Clients

**Nachteile:**
- Kann vergessen werden
- Caching komplexer

### Welche Strategie wählen?

| Situation | Empfehlung |
|-----------|------------|
| Öffentliche API | URL Versioning (v1, v2) |
| Interne API | Header Versioning |
| Einfache API | Query Parameter |
| Startup/MVP | Keine Versioning (noch nicht nötig) |

**Praxis-Tipp:** Für die meisten Projekte ist URL-Versioning der pragmatischste Ansatz. Es ist offensichtlich, funktioniert überall und Clients verstehen es sofort.

### Versioning vermeiden

Die beste Version ist keine Version. Versuche, APIs abwärtskompatibel zu gestalten:

**Erlaubt (nicht-breaking):**
- Neue Felder hinzufügen
- Neue optionale Parameter
- Neue Endpoints

**Breaking Changes (benötigen neue Version):**
- Felder entfernen oder umbenennen
- Feldtypen ändern
- Pflichtfelder hinzufügen
- URL-Struktur ändern

## 12.7 Authentication & Authorization

### JWT (JSON Web Token) erklärt

Ein JWT besteht aus drei Teilen, getrennt durch Punkte:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4iLCJpYXQiOjE1MTYyMzkwMjJ9.
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

**Header (Base64):**
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

**Payload (Base64):**
```json
{
  "sub": "1234567890",
  "name": "John",
  "iat": 1516239022,
  "exp": 1516242622
}
```

**Signature:**
```
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  secret
)
```

**Wichtig:** Der Payload ist nur Base64-encoded, nicht verschlüsselt! Jeder kann ihn lesen. Speichere dort keine sensiblen Daten.

### Bearer Token Flow

```
1. Client sendet Credentials
   POST /api/auth/login
   { "email": "user@example.com", "password": "secret" }

2. Server validiert und erstellt JWT
   -> 200 OK
   { "accessToken": "eyJ...", "refreshToken": "xyz...", "expiresIn": 3600 }

3. Client speichert Tokens und sendet bei jedem Request:
   GET /api/readings
   Authorization: Bearer eyJ...

4. Server validiert Token bei jedem Request
```

### Access Token vs. Refresh Token

| | Access Token | Refresh Token |
|---|---|---|
| Lebensdauer | Kurz (15min - 1h) | Lang (Tage/Wochen) |
| Verwendung | Jeder API-Request | Nur zum Erneuern des Access Tokens |
| Speicherort | Memory (bevorzugt) | HttpOnly Cookie |
| Bei Kompromittierung | Begrenzte Zeit gültig | Kann invalidiert werden |

**Token Refresh Flow:**
```typescript
async function apiRequest(url, options) {
  let response = await fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (response.status === 401) {
    // Access Token abgelaufen, Refresh versuchen
    const refreshResult = await fetch('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken })
    });

    if (refreshResult.ok) {
      const { accessToken: newToken } = await refreshResult.json();
      accessToken = newToken;
      // Request wiederholen mit neuem Token
      response = await fetch(url, {
        ...options,
        headers: { Authorization: `Bearer ${newToken}` }
      });
    } else {
      // Refresh Token auch ungültig -> Logout
      logout();
    }
  }

  return response;
}
```

### Sicherheits-Best-Practices

**Token-Speicherung im Browser:**
```javascript
// Schlecht - XSS-anfällig
localStorage.setItem('token', token);

// Besser - Nur für aktuelle Session
sessionStorage.setItem('token', token);

// Am besten - Nicht über JS zugreifbar
// HttpOnly Cookie (vom Server gesetzt)
```

**Token in URLs vermeiden:**
```
// Schlecht - Token im Query String (landet in Logs, Referer-Header)
GET /api/readings?token=eyJ...

// Gut - Token im Header
Authorization: Bearer eyJ...
```

## 12.8 CORS (Cross-Origin Resource Sharing)

### Was ist CORS?

CORS ist ein Sicherheitsmechanismus in Browsern. Wenn dein Frontend auf `localhost:5173` läuft und die API auf `localhost:3001`, dann ist das ein Cross-Origin Request.

### Warum existiert es?

Ohne CORS könnte jede Website im Browser HTTP-Requests an beliebige Server senden - inklusive der Cookies des Users. Das wäre ein massives Sicherheitsrisiko (CSRF).

### Wie funktioniert es?

**Simple Requests (GET, POST mit standard Content-Type):**
```
1. Browser sendet Request mit Origin-Header
   GET /api/readings
   Origin: http://localhost:5173

2. Server antwortet mit CORS-Header
   Access-Control-Allow-Origin: http://localhost:5173

3. Browser prüft Header und gibt Response an JavaScript weiter
   (oder blockt, wenn Header fehlt/nicht passt)
```

**Preflight Requests (PUT, DELETE, Custom Headers):**
```
1. Browser sendet OPTIONS-Request
   OPTIONS /api/readings/42
   Origin: http://localhost:5173
   Access-Control-Request-Method: DELETE

2. Server antwortet mit erlaubten Methoden/Headers
   Access-Control-Allow-Origin: http://localhost:5173
   Access-Control-Allow-Methods: GET, POST, PUT, DELETE
   Access-Control-Allow-Headers: Content-Type, Authorization
   Access-Control-Max-Age: 86400

3. Browser sendet eigentlichen Request (wenn Preflight ok)
   DELETE /api/readings/42
```

### Konfiguration

**Express (Node.js) - wie in HausTracker:**
```typescript
import cors from 'cors';

// Einfach: Alles erlauben (nur für Development!)
app.use(cors());

// Produktion: Spezifisch konfigurieren
app.use(cors({
  origin: ['https://haustracker.example.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,  // Erlaubt Cookies
  maxAge: 86400       // Preflight-Cache: 24h
}));
```

**ASP.NET Core:**
```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("Production", policy =>
    {
        policy.WithOrigins("https://haustracker.example.com")
              .WithMethods("GET", "POST", "PUT", "DELETE")
              .WithHeaders("Content-Type", "Authorization")
              .AllowCredentials();
    });
});

app.UseCors("Production");
```

### Häufige CORS-Fehler

**1. Wildcard mit Credentials:**
```typescript
// Funktioniert NICHT!
app.use(cors({
  origin: '*',
  credentials: true  // Nicht erlaubt mit *
}));
```

**2. Missing Preflight Handler:**
```typescript
// OPTIONS-Requests müssen beantwortet werden
app.options('*', cors());  // Express cors() handhabt das
```

**3. Wrong Order:**
```typescript
// Schlecht: CORS nach Routes
app.get('/api/readings', handler);
app.use(cors());  // Zu spät!

// Gut: CORS vor Routes
app.use(cors());
app.get('/api/readings', handler);
```

## 12.9 API Client im Frontend

### Die fetch API

```typescript
// Einfacher GET Request
const response = await fetch('/api/readings');
const data = await response.json();

// POST mit Body
const response = await fetch('/api/readings', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    meterValue: 12345.6,
    timestamp: new Date().toISOString()
  })
});
```

**Wichtig:** fetch wirft KEINEN Fehler bei 4xx/5xx!
```typescript
const response = await fetch('/api/readings/999');
// response.ok ist false bei 404, aber kein Error!

if (!response.ok) {
  throw new Error(`HTTP ${response.status}`);
}
```

### Das Wrapper-Pattern

Ein zentraler API-Client kapselt alle HTTP-Logik. Hier ist das Pattern aus HausTracker's `api.ts`:

```typescript
// /src/lib/api.ts

// Basis-URL aus Environment
const API_BASE = import.meta.env.VITE_API_URL || '';

// Zentrale fetch-Funktion
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
```

**Vorteile dieses Patterns:**
1. Einheitliche Error-Behandlung
2. Automatische JSON-Headers
3. Zentrale Basis-URL
4. TypeScript-Typen

### Ressourcen-spezifische APIs

HausTracker organisiert die API nach Ressourcen:

```typescript
// Readings API
export const readingsAPI = {
  async getAll(): Promise<Reading[]> {
    const data = await fetchAPI<any[]>('/api/readings');
    // Datums-Transformation
    return data.map(r => ({ ...r, timestamp: new Date(r.timestamp) }));
  },

  async add(reading: Omit<Reading, 'id'>): Promise<number> {
    const data = await fetchAPI<{ id: number }>('/api/readings', {
      method: 'POST',
      body: JSON.stringify({
        ...reading,
        timestamp: reading.timestamp.toISOString(),
      }),
    });
    return data.id;
  },

  async update(id: number, updates: Partial<Reading>): Promise<void> {
    await fetchAPI(`/api/readings/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...updates,
        timestamp: updates.timestamp?.toISOString(),
      }),
    });
  },

  async delete(id: number): Promise<void> {
    await fetchAPI(`/api/readings/${id}`, { method: 'DELETE' });
  },
};
```

### Datums-Handling

JSON hat keinen Date-Typ. Dates kommen als Strings und müssen transformiert werden:

```typescript
// Server sendet: "2024-03-15T10:30:00.000Z"
// Client braucht: Date-Objekt

const data = await fetchAPI<any[]>('/api/readings');
return data.map(r => ({
  ...r,
  timestamp: new Date(r.timestamp),
  validUntil: r.validUntil ? new Date(r.validUntil) : undefined,
}));

// Beim Senden zurück konvertieren
body: JSON.stringify({
  ...reading,
  timestamp: reading.timestamp.toISOString(),
});
```

### Error Handling im Client

```typescript
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, options);

  if (!response.ok) {
    // Versuche Error-Details aus Response zu lesen
    let errorDetail = '';
    try {
      const errorBody = await response.json();
      errorDetail = errorBody.message || errorBody.error || '';
    } catch {
      // Kein JSON-Body
    }

    throw new ApiError(
      response.status,
      errorDetail || response.statusText,
      endpoint
    );
  }

  return response.json();
}

// Custom Error Class
class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public endpoint: string
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isNotFound() { return this.status === 404; }
  get isUnauthorized() { return this.status === 401; }
  get isServerError() { return this.status >= 500; }
}
```

**Verwendung in Components:**
```typescript
try {
  await readingsAPI.add(newReading);
  showSuccess('Ablesung gespeichert');
} catch (error) {
  if (error instanceof ApiError) {
    if (error.isNotFound) {
      showError('Ressource nicht gefunden');
    } else if (error.isServerError) {
      showError('Server-Fehler, bitte später versuchen');
    } else {
      showError(error.message);
    }
  } else {
    showError('Netzwerkfehler');
  }
}
```

### Zentraler API-Export

```typescript
// Export alle APIs gebündelt
export const api = {
  readings: readingsAPI,
  settings: settingsAPI,
  tariffs: tariffsAPI,
  payments: paymentsAPI,
  advancePayments: advancePaymentsAPI,
  statistics: statisticsAPI,
  monthlyStats: monthlyStatsAPI,
  balance: balanceAPI,
};

export default api;

// Verwendung
import api from '@/lib/api';

const readings = await api.readings.getAll();
const stats = await api.statistics.get();
```

## 12.10 Alternativen zu REST

REST ist nicht die einzige Option. Hier ein Überblick über moderne Alternativen.

### GraphQL

Facebook entwickelte GraphQL 2015 als Alternative zu REST für komplexe Datenabfragen.

**Das Problem mit REST:**
```
// 3 Requests für eine Seite
GET /api/user/123
GET /api/user/123/posts
GET /api/user/123/followers

// Over-fetching: Ich brauche nur name und email
GET /api/user/123
-> { id, name, email, avatar, bio, createdAt, settings, ... }
```

**GraphQL-Lösung:**
```graphql
query {
  user(id: 123) {
    name
    email
    posts(limit: 5) {
      title
    }
    followersCount
  }
}
```

Ein Request, genau die Daten die du brauchst.

**Vorteile:**
- Keine Over-/Under-fetching
- Stark typisiert (Schema)
- Introspection (API dokumentiert sich selbst)
- Ideal für komplexe, vernetzte Daten

**Nachteile:**
- Komplexer zu implementieren
- Caching schwieriger (alles POST an /graphql)
- N+1 Problem bei naiver Implementierung
- Overkill für einfache CRUD-APIs

**Wann GraphQL?**
- Viele verschiedene Clients (Web, Mobile, Partner)
- Komplexe, vernetzte Datenstrukturen
- Häufig wechselnde Datenrequirements

### tRPC

tRPC ist ein TypeScript-Framework für End-to-End typsichere APIs.

**Das Problem:**
```typescript
// REST: Typ-Sicherheit endet an der API-Grenze
const response = await fetch('/api/user/123');
const user = await response.json(); // user ist any!
```

**tRPC-Lösung:**
```typescript
// Server
const appRouter = router({
  user: router({
    byId: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => {
        return db.user.findUnique({ where: { id: input.id } });
      }),
  }),
});

export type AppRouter = typeof appRouter;

// Client - Automatisch typsicher!
const user = await trpc.user.byId.query({ id: 123 });
// TypeScript kennt den exakten Typ von user
```

**Vorteile:**
- Keine API-Dokumentation nötig (Types sind die Doku)
- Keine Code-Generierung
- Autocomplete im Client
- Compile-Time Errors bei API-Änderungen

**Nachteile:**
- Nur TypeScript (Front- und Backend)
- Kein Standard (proprietär)
- Nicht für öffentliche APIs geeignet

**Wann tRPC?**
- Fullstack TypeScript (z.B. Next.js)
- Internes Team, eine Codebase
- Schnelle Entwicklung wichtiger als API-Standards

### Vergleich

| Kriterium | REST | GraphQL | tRPC |
|-----------|------|---------|------|
| Lernkurve | Niedrig | Mittel | Niedrig |
| Typ-Sicherheit | Manuell | Schema | Automatisch |
| Caching | Einfach (HTTP) | Komplex | Manuell |
| Öffentliche API | Ideal | Gut | Nicht geeignet |
| Over-fetching | Problem | Gelöst | Gelöst |
| Tooling | Universal | Speziell | TypeScript only |

## 12.11 Praktisch: HausTracker API

Schauen wir uns die reale API-Implementierung von HausTracker an.

### Endpoints-Übersicht

| Methode | Endpoint | Beschreibung |
|---------|----------|--------------|
| **Readings** |||
| GET | /api/readings | Alle Ablesungen |
| GET | /api/readings/:id | Eine Ablesung |
| POST | /api/readings | Neue Ablesung |
| PUT | /api/readings/:id | Ablesung aktualisieren |
| DELETE | /api/readings/:id | Ablesung löschen |
| **Settings** |||
| GET | /api/settings | Einstellungen abrufen |
| PUT | /api/settings | Einstellungen aktualisieren |
| **Tariffs** |||
| GET | /api/tariffs | Alle Tarife |
| POST | /api/tariffs | Neuen Tarif anlegen |
| PUT | /api/tariffs/:id | Tarif aktualisieren |
| DELETE | /api/tariffs/:id | Tarif löschen |
| **Payments** |||
| GET | /api/payments | Alle Zahlungen |
| POST | /api/payments | Neue Zahlung |
| PUT | /api/payments/:id | Zahlung aktualisieren |
| DELETE | /api/payments/:id | Zahlung löschen |
| **Advance Payments** |||
| GET | /api/advance-payments | Alle Abschläge |
| POST | /api/advance-payments | Neuen Abschlag |
| PUT | /api/advance-payments/:id | Abschlag aktualisieren |
| DELETE | /api/advance-payments/:id | Abschlag löschen |
| **Statistics** |||
| GET | /api/statistics | Verbrauchsstatistiken |
| GET | /api/monthly-stats | Monatliche Statistiken |
| GET | /api/balance | Kontostand-Berechnung |
| **Home Assistant** |||
| POST | /api/ha/test | Verbindung testen |
| POST | /api/ha/sensors | Sensoren abrufen |
| POST | /api/ha/values | Sensorwerte abrufen |

### Request/Response-Beispiele

**Neue Ablesung erstellen:**
```http
POST /api/readings
Content-Type: application/json

{
  "timestamp": "2024-03-15T10:30:00.000Z",
  "meterValue": 12456.7,
  "unit": "kWh",
  "outdoorTempCurrent": 12.5,
  "weatherCondition": "cloudy",
  "source": "manual",
  "notes": "Monatliche Ablesung"
}

Response: 201 Created (sollte sein, aktuell 200)
{
  "id": 42
}
```

**Tarif mit Preisberechnung:**
```http
POST /api/tariffs
Content-Type: application/json

{
  "name": "Standard 2024",
  "provider": "Stadtwerke",
  "validFrom": "2024-01-01T00:00:00.000Z",
  "workingPrice": 0.25,
  "basePrice": 120,
  "co2Price": 0.02,
  "gasLevy": 0,
  "meteringPrice": 36
}

Response: 200 OK
{
  "id": 5
}
```

Der Server berechnet automatisch:
- `totalPricePerKwh = workingPrice + co2Price + gasLevy`
- `fixedMonthly = (basePrice + meteringPrice) / 12`

### Der api.ts Client analysiert

Der HausTracker-Client folgt mehreren Best Practices:

**1. Zentrale Konfiguration:**
```typescript
const API_BASE = import.meta.env.VITE_API_URL || '';
```
Erlaubt verschiedene Backend-URLs für Dev/Prod.

**2. Generische Fetch-Funktion:**
```typescript
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T>
```
TypeScript-Generics für typsichere Responses.

**3. Automatische Header:**
```typescript
headers: {
  'Content-Type': 'application/json',
  ...options?.headers,
}
```
JSON ist der Default, kann aber überschrieben werden.

**4. Ressourcen-Objekte:**
```typescript
export const readingsAPI = {
  getAll: ...,
  add: ...,
  update: ...,
  delete: ...,
}
```
Gruppierung nach Ressource statt einzelner Funktionen.

**5. Datums-Transformation:**
```typescript
return data.map(r => ({ ...r, timestamp: new Date(r.timestamp) }));
```
Konvertiert ISO-Strings zu Date-Objekten bei GET.

```typescript
timestamp: reading.timestamp.toISOString(),
```
Konvertiert Date zu ISO-String bei POST/PUT.

**6. Helper-Methoden:**
```typescript
async getLast(): Promise<Reading | undefined> {
  const readings = await this.getAll();
  return readings[0];
}

async getCurrent(): Promise<Tariff | undefined> {
  const tariffs = await this.getAll();
  // Logik für aktuellen Tarif...
}
```
Business-Logik im API-Client für häufige Use-Cases.

### Verbesserungspotential

Die HausTracker-API ist funktional, aber hier sind Verbesserungsmöglichkeiten:

**1. Status Codes:**
```typescript
// Aktuell
res.json({ id: result.lastInsertRowid });

// Besser
res.status(201)
   .location(`/api/readings/${result.lastInsertRowid}`)
   .json({ id: result.lastInsertRowid });
```

**2. Validierung:**
```typescript
// Aktuell: Keine Validierung
app.post('/api/readings', (req, res) => {
  const data = req.body;
  // Direkt in DB...

// Besser: Schema-Validierung
import { z } from 'zod';

const ReadingSchema = z.object({
  timestamp: z.string().datetime(),
  meterValue: z.number().positive(),
  unit: z.enum(['kWh', 'm³']).default('kWh'),
});

app.post('/api/readings', (req, res) => {
  const result = ReadingSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(422).json({ errors: result.error.issues });
  }
  // Weiter mit result.data
});
```

**3. Konsistentes Error-Format:**
```typescript
// Error-Handler Middleware
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message,
    }
  });
});
```

**4. Pagination für Listen:**
```typescript
app.get('/api/readings', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const offset = (page - 1) * limit;

  const readings = db.prepare(
    'SELECT * FROM readings ORDER BY timestamp DESC LIMIT ? OFFSET ?'
  ).all(limit, offset);

  const total = db.prepare('SELECT COUNT(*) as count FROM readings').get();

  res.json({
    data: readings.map(parseReading),
    pagination: {
      page,
      limit,
      total: total.count,
      totalPages: Math.ceil(total.count / limit)
    }
  });
});
```

## Zusammenfassung

REST ist nach wie vor der Standard für Web-APIs - aber nur wenn es richtig gemacht wird:

1. **Ressourcen-orientiert denken:** URLs beschreiben Was, nicht Wie
2. **HTTP richtig nutzen:** Verben, Status Codes, Headers haben Bedeutung
3. **Konsistent sein:** Ein Error-Format, eine Naming-Convention, durchgehend
4. **Versionierung einplanen:** Auch wenn du heute noch nicht weißt wann
5. **Sicherheit von Anfang an:** Auth, CORS, Input-Validierung
6. **Client-Entwickler sind deine User:** Gute DX ist gutes API-Design

Die HausTracker-API zeigt ein pragmatisches Setup für eine Fullstack-TypeScript-Anwendung. Der `api.ts`-Client demonstriert, wie man eine typsichere, wartbare Abstraktion über fetch baut.

Für komplexere Anforderungen gibt es Alternativen: GraphQL für flexible Queries über vernetzte Daten, tRPC für maximale Typ-Sicherheit im TypeScript-Monorepo.

Die Wahl hängt von deinem Kontext ab - aber die Prinzipien guten API-Designs gelten überall: Konsistenz, Klarheit und Rücksicht auf die Entwickler, die deine API nutzen werden.
