# Kapitel 10: Express.js - Minimalistisches Backend-Framework

Als ASP.NET-Entwickler kennen Sie die umfangreiche Infrastruktur von ASP.NET Core: Dependency Injection, umfangreiche Middleware-Pipeline, Model Binding, Routing-Attribute und vieles mehr. Express.js verfolgt einen radikal anderen Ansatz: **minimalistisch, unopinionated und flexibel**.

## 10.1 Was ist Express?

Express.js ist das de-facto Standard-Framework fuer Node.js Webserver. Mit nur wenigen hundert Zeilen Code bietet es genau das, was Sie brauchen - und nicht mehr.

### Minimal vs Batteries-Included

| Aspekt | ASP.NET Core | Express.js |
|--------|--------------|------------|
| Philosophie | Batteries-included | Minimal |
| Projektstruktur | Vorgegeben (Controllers, Views, Models) | Frei waehlbar |
| Dependency Injection | Built-in | Manuell oder via Libraries |
| Validation | DataAnnotations | Eigene Wahl (zod, express-validator) |
| ORM | Entity Framework | Eigene Wahl (Prisma, TypeORM, Drizzle) |
| Konfiguration | appsettings.json, Secrets | process.env, dotenv |
| Groesse | ~100+ MB Runtime | ~2 MB (Express selbst) |

```
ASP.NET Core Projekt:              Express.js Projekt:
------------------------           ------------------------
/Controllers                       /src
  HomeController.cs                  index.ts (alles in einer Datei
/Models                                       moeglich!)
  User.cs
/Views
  /Home
    Index.cshtml
/Services
  UserService.cs
Program.cs
Startup.cs
appsettings.json
```

### Das Middleware-Konzept

In ASP.NET Core kennen Sie die Middleware-Pipeline bereits aus `Configure()`:

```csharp
// ASP.NET Core
app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();
app.UseEndpoints(endpoints => { ... });
```

Express funktioniert **exakt nach demselben Prinzip** - nur mit anderer Syntax:

```typescript
// Express
app.use(cors());              // CORS aktivieren
app.use(express.json());      // JSON Body Parser
app.use(express.static('public')); // Statische Dateien
app.use(authMiddleware);      // Eigene Auth-Middleware
```

### Diagramm: Request Pipeline

```
                    Express.js Request Pipeline
    ============================================================

    Eingehender HTTP Request
            |
            v
    +------------------+
    |   cors()         |  <-- Prueft CORS-Header, setzt Access-Control-*
    +------------------+
            |
            v
    +------------------+
    |  express.json()  |  <-- Parsed JSON Body nach req.body
    +------------------+
            |
            v
    +------------------+
    | Custom Middleware|  <-- Logging, Auth, Rate Limiting...
    +------------------+
            |
            v
    +------------------+
    |  Route Handler   |  <-- app.get('/api/users', handler)
    +------------------+
            |
            v
    +------------------+
    | Error Middleware |  <-- Faengt Fehler ab (4 Parameter!)
    +------------------+
            |
            v
    HTTP Response zurueck an Client

    ============================================================

    Vergleich ASP.NET Core:

    HttpContext -> Middleware 1 -> Middleware 2 -> Controller -> Response
                      |               |
                      v               v
                   next()          next()
```

## 10.2 Grundstruktur

### Minimales Express-Setup

```typescript
import express from 'express';

const app = express();
const PORT = 3001;

// Eine Route
app.get('/', (req, res) => {
  res.send('Hello World');
});

// Server starten
app.listen(PORT, () => {
  console.log(`Server laeuft auf Port ${PORT}`);
});
```

Das ist **alles**. Keine Startup-Klasse, kein Program.cs mit Builder-Pattern, keine launchSettings.json.

### HTTP-Methoden: app.get/post/put/delete

```typescript
// Express
app.get('/api/readings', (req, res) => { ... });     // GET
app.post('/api/readings', (req, res) => { ... });    // POST
app.put('/api/readings/:id', (req, res) => { ... }); // PUT
app.delete('/api/readings/:id', (req, res) => { ... }); // DELETE
app.patch('/api/readings/:id', (req, res) => { ... }); // PATCH
```

**Vergleich ASP.NET Controller:**

```csharp
// ASP.NET Core
[ApiController]
[Route("api/[controller]")]
public class ReadingsController : ControllerBase
{
    [HttpGet]
    public IActionResult GetAll() { ... }

    [HttpGet("{id}")]
    public IActionResult GetById(int id) { ... }

    [HttpPost]
    public IActionResult Create([FromBody] Reading reading) { ... }

    [HttpPut("{id}")]
    public IActionResult Update(int id, [FromBody] Reading reading) { ... }

    [HttpDelete("{id}")]
    public IActionResult Delete(int id) { ... }
}
```

### Request und Response Objekte

In ASP.NET haben Sie `HttpContext`, `HttpRequest` und `HttpResponse`. Express verwendet vereinfachte Wrapper:

```typescript
app.get('/api/example', (req, res) => {
  // req = Request-Objekt
  // res = Response-Objekt

  // Request-Daten lesen:
  console.log(req.method);       // "GET"
  console.log(req.url);          // "/api/example"
  console.log(req.headers);      // Header-Objekt
  console.log(req.query);        // Query-String als Objekt
  console.log(req.params);       // URL-Parameter
  console.log(req.body);         // Request Body (nach express.json())

  // Response senden:
  res.status(200).json({ message: 'OK' });
});
```

**Konzeptuelle Zuordnung:**

| ASP.NET | Express |
|---------|---------|
| `HttpContext.Request` | `req` |
| `HttpContext.Response` | `res` |
| `Request.Query["key"]` | `req.query.key` |
| `Request.RouteValues["id"]` | `req.params.id` |
| `Request.Body` (Stream) | `req.body` (bereits geparsed) |
| `Response.StatusCode = 200` | `res.status(200)` |

## 10.3 Middleware Deep Dive

### Was ist Middleware?

Middleware sind Funktionen, die **zwischen** dem eingehenden Request und dem finalen Handler ausgefuehrt werden. Jede Middleware kann:

1. Den Request **modifizieren** (z.B. Body parsen)
2. Den Response **modifizieren** (z.B. Header setzen)
3. Die Kette **abbrechen** (z.B. bei fehlender Auth)
4. Zur **naechsten** Middleware weiterleiten

### Die Middleware-Signatur

```typescript
// Standard Middleware (3 Parameter)
function middleware(req: Request, res: Response, next: NextFunction) {
  // Logik hier
  next(); // Weiter zur naechsten Middleware
}

// Error Middleware (4 Parameter!)
function errorMiddleware(err: Error, req: Request, res: Response, next: NextFunction) {
  // Fehlerbehandlung
  res.status(500).json({ error: err.message });
}
```

### app.use() - Middleware registrieren

```typescript
// Fuer alle Requests
app.use(cors());
app.use(express.json());

// Nur fuer bestimmte Pfade
app.use('/api', apiRouter);
app.use('/admin', adminMiddleware, adminRouter);

// Inline Middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});
```

### Reihenfolge ist KRITISCH!

```typescript
// FALSCH - json() kommt nach der Route!
app.post('/api/data', (req, res) => {
  console.log(req.body); // undefined!
  res.json({ received: req.body });
});
app.use(express.json()); // Zu spaet!

// RICHTIG - json() kommt VOR den Routes
app.use(express.json());
app.post('/api/data', (req, res) => {
  console.log(req.body); // { ... } funktioniert!
  res.json({ received: req.body });
});
```

```
Middleware-Reihenfolge Diagramm:
================================

RICHTIG:                          FALSCH:
--------                          -------
1. cors()                         1. Route Handler
2. express.json()                 2. cors()
3. Logging                        3. express.json()
4. Auth
5. Route Handler                  -> Body ist undefined!
6. Error Handler                  -> CORS fehlt!
```

### Built-in Middleware

Express kommt mit drei eingebauten Middleware-Funktionen:

```typescript
// JSON Body Parser - parsed application/json
app.use(express.json());

// URL-encoded Parser - parsed application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

// Static Files - serviert statische Dateien
app.use(express.static('public'));
```

**CORS mit dem cors-Paket:**

```typescript
import cors from 'cors';

// Alle Origins erlauben (Entwicklung)
app.use(cors());

// Spezifische Konfiguration (Produktion)
app.use(cors({
  origin: 'https://meinedomain.de',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
```

### Custom Middleware schreiben

```typescript
// Logging Middleware
const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
  });

  next();
};

// Auth Middleware
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Nicht authentifiziert' });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded; // User an Request anhaengen
    next();
  } catch {
    res.status(403).json({ error: 'Ungültiger Token' });
  }
};

// Verwendung
app.use(requestLogger);
app.get('/api/protected', requireAuth, (req, res) => {
  res.json({ user: req.user });
});
```

### Vergleich zu ASP.NET Middleware Pipeline

```csharp
// ASP.NET Core Middleware
public class RequestLoggingMiddleware
{
    private readonly RequestDelegate _next;

    public RequestLoggingMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var start = DateTime.UtcNow;

        await _next(context); // Naechste Middleware

        var duration = DateTime.UtcNow - start;
        Console.WriteLine($"{context.Request.Method} {context.Request.Path} - {duration.TotalMilliseconds}ms");
    }
}

// Registrierung in Startup.cs
app.UseMiddleware<RequestLoggingMiddleware>();
```

| ASP.NET | Express |
|---------|---------|
| `RequestDelegate next` | `next: NextFunction` |
| `await _next(context)` | `next()` |
| `context.Request` | `req` |
| `context.Response` | `res` |
| Klasse + InvokeAsync | Einfache Funktion |

## 10.4 Routing

### Express Router

Fuer groessere Anwendungen organisieren Sie Routes in separate Router:

```typescript
// routes/readings.ts
import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  // GET /api/readings
});

router.get('/:id', (req, res) => {
  // GET /api/readings/123
});

router.post('/', (req, res) => {
  // POST /api/readings
});

export default router;
```

```typescript
// index.ts
import readingsRouter from './routes/readings';
import tariffsRouter from './routes/tariffs';

app.use('/api/readings', readingsRouter);
app.use('/api/tariffs', tariffsRouter);
```

### Route Groups

```typescript
// Gruppierung mit gemeinsamer Middleware
const apiRouter = Router();
apiRouter.use(authMiddleware); // Gilt fuer alle /api/* Routes

apiRouter.use('/readings', readingsRouter);
apiRouter.use('/tariffs', tariffsRouter);
apiRouter.use('/settings', settingsRouter);

app.use('/api', apiRouter);
```

### Vergleich zu [Route] Attributes

```csharp
// ASP.NET - Attribute-basiertes Routing
[ApiController]
[Route("api/[controller]")]  // -> /api/Readings
public class ReadingsController : ControllerBase
{
    [HttpGet]                    // GET /api/readings
    public IActionResult GetAll() { ... }

    [HttpGet("{id:int}")]        // GET /api/readings/5
    public IActionResult GetById(int id) { ... }

    [HttpGet("recent")]          // GET /api/readings/recent
    public IActionResult GetRecent() { ... }

    [HttpGet("year/{year:int}")] // GET /api/readings/year/2024
    public IActionResult GetByYear(int year) { ... }
}
```

```typescript
// Express - Programmatisches Routing
const router = Router();

router.get('/', getAll);           // GET /api/readings
router.get('/:id', getById);       // GET /api/readings/5
router.get('/recent', getRecent);  // GET /api/readings/recent
router.get('/year/:year', getByYear); // GET /api/readings/year/2024

app.use('/api/readings', router);
```

### Route-Parameter und Patterns

```typescript
// Einfacher Parameter
router.get('/:id', (req, res) => {
  const id = req.params.id; // String!
});

// Mehrere Parameter
router.get('/:year/:month', (req, res) => {
  const { year, month } = req.params;
});

// Optionale Parameter (via Query)
router.get('/', (req, res) => {
  const { limit, offset } = req.query;
});

// Regex-Pattern (selten genutzt)
router.get(/.*fly$/, (req, res) => {
  // Matcht butterfly, dragonfly, etc.
});
```

## 10.5 Request Handling

### req.params - Route-Parameter

```typescript
// Route: /api/readings/:id
app.get('/api/readings/:id', (req, res) => {
  const id = req.params.id; // "123" als String!
  const numId = parseInt(req.params.id, 10); // 123 als Zahl
});
```

**ASP.NET Aequivalent:**
```csharp
[HttpGet("{id}")]
public IActionResult GetById([FromRoute] int id) // Automatisch int!
{
    // id ist bereits eine Zahl
}
```

### req.query - Query-String-Parameter

```typescript
// URL: /api/readings?limit=10&offset=20&sort=desc
app.get('/api/readings', (req, res) => {
  const limit = req.query.limit;   // "10" als String
  const offset = req.query.offset; // "20" als String
  const sort = req.query.sort;     // "desc"

  // Typsichere Konvertierung
  const numLimit = parseInt(limit as string, 10) || 50;
});
```

**ASP.NET Aequivalent:**
```csharp
[HttpGet]
public IActionResult GetAll(
    [FromQuery] int limit = 50,
    [FromQuery] int offset = 0,
    [FromQuery] string sort = "asc")
{
    // Automatische Typkonvertierung und Defaults
}
```

### req.body - Request Body

```typescript
// Voraussetzung: app.use(express.json()) wurde aufgerufen!
app.post('/api/readings', (req, res) => {
  const data = req.body;

  // data ist vom Typ 'any' - keine automatische Validierung!
  console.log(data.meterValue);
  console.log(data.timestamp);
});
```

**ASP.NET Aequivalent:**
```csharp
[HttpPost]
public IActionResult Create([FromBody] ReadingDto reading)
{
    // Automatisches Model Binding
    // Automatische Validierung via DataAnnotations
    if (!ModelState.IsValid)
        return BadRequest(ModelState);
}
```

### Zusammenfassung Request-Daten

```
+----------------------------------------------------------+
|                    Request-Daten in Express               |
+----------------------------------------------------------+
|                                                          |
|  URL: POST /api/readings/123?source=manual               |
|  Body: { "meterValue": 45678.5, "notes": "Test" }        |
|                                                          |
|  +--------------------------------------------------+    |
|  |  req.params  | { id: "123" }         | [FromRoute] |    |
|  +--------------------------------------------------+    |
|  |  req.query   | { source: "manual" }  | [FromQuery] |    |
|  +--------------------------------------------------+    |
|  |  req.body    | { meterValue: 45678.5,| [FromBody]  |    |
|  |              |   notes: "Test" }     |             |    |
|  +--------------------------------------------------+    |
|  |  req.headers | { "content-type":     | [FromHeader]|    |
|  |              |   "application/json"} |             |    |
|  +--------------------------------------------------+    |
|                                                          |
+----------------------------------------------------------+
```

## 10.6 Response Senden

### res.json() - JSON-Antwort

```typescript
// Einfache JSON-Antwort
app.get('/api/readings', (req, res) => {
  const readings = db.prepare('SELECT * FROM readings').all();
  res.json(readings); // Automatisch Content-Type: application/json
});

// Mit Status-Code
app.get('/api/readings/:id', (req, res) => {
  const reading = findById(req.params.id);
  if (!reading) {
    return res.status(404).json({ error: 'Nicht gefunden' });
  }
  res.json(reading);
});
```

### res.send() - Allgemeine Antwort

```typescript
// Text senden
res.send('Hello World');

// HTML senden
res.send('<h1>Hallo</h1>');

// Buffer senden
res.send(Buffer.from('binary data'));
```

### res.status() - Status-Code setzen

```typescript
// Chainable mit json()
res.status(201).json({ id: newId });      // Created
res.status(400).json({ error: 'Invalid' }); // Bad Request
res.status(404).json({ error: 'Not found' }); // Not Found
res.status(500).json({ error: 'Server error' }); // Internal Error

// Nur Status ohne Body
res.sendStatus(204); // No Content
res.sendStatus(401); // Unauthorized
```

### Weitere Response-Methoden

```typescript
// Redirect
res.redirect('/neue-url');
res.redirect(301, '/permanent-neue-url');

// File Download
res.download('/pfad/zur/datei.pdf');

// File senden
res.sendFile('/pfad/zur/datei.html');

// Header setzen
res.set('X-Custom-Header', 'value');
res.set({
  'Content-Type': 'text/plain',
  'X-Another': 'header'
});
```

### Vergleich zu ASP.NET ActionResult

```csharp
// ASP.NET Core
[HttpGet("{id}")]
public IActionResult GetById(int id)
{
    var reading = _service.GetById(id);

    if (reading == null)
        return NotFound();                    // res.status(404).send()

    return Ok(reading);                       // res.json(reading)
}

[HttpPost]
public IActionResult Create(Reading reading)
{
    var created = _service.Create(reading);
    return CreatedAtAction(                   // res.status(201).json()
        nameof(GetById),
        new { id = created.Id },
        created
    );
}

[HttpDelete("{id}")]
public IActionResult Delete(int id)
{
    _service.Delete(id);
    return NoContent();                       // res.sendStatus(204)
}
```

| ASP.NET | Express |
|---------|---------|
| `Ok(data)` | `res.json(data)` |
| `NotFound()` | `res.status(404).json({...})` |
| `BadRequest(errors)` | `res.status(400).json(errors)` |
| `Created(...)` | `res.status(201).json({...})` |
| `NoContent()` | `res.sendStatus(204)` |
| `Redirect(url)` | `res.redirect(url)` |

## 10.7 Error Handling

### Error Middleware

Express erkennt Error-Middleware an der **4-Parameter-Signatur**:

```typescript
// MUSS 4 Parameter haben, auch wenn nicht alle genutzt werden!
const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Fehler:', err.message);
  console.error(err.stack);

  res.status(500).json({
    error: 'Interner Serverfehler',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

// MUSS als letztes registriert werden!
app.use(errorHandler);
```

### Fehler werfen und weiterleiten

```typescript
// Synchrone Fehler werden automatisch gefangen
app.get('/api/test', (req, res) => {
  throw new Error('Synchroner Fehler'); // -> Error Middleware
});

// Asynchrone Fehler MUESSEN explizit weitergeleitet werden!
app.get('/api/async', async (req, res, next) => {
  try {
    const result = await someAsyncOperation();
    res.json(result);
  } catch (err) {
    next(err); // An Error Middleware weiterleiten
  }
});

// Oder mit express-async-errors Package (empfohlen)
import 'express-async-errors';

app.get('/api/async', async (req, res) => {
  const result = await someAsyncOperation();
  res.json(result); // Fehler werden automatisch gefangen
});
```

### Custom Error Classes

```typescript
class NotFoundError extends Error {
  statusCode = 404;
  constructor(message = 'Ressource nicht gefunden') {
    super(message);
    this.name = 'NotFoundError';
  }
}

class ValidationError extends Error {
  statusCode = 400;
  errors: string[];
  constructor(errors: string[]) {
    super('Validierungsfehler');
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

// Verwendung
app.get('/api/readings/:id', (req, res) => {
  const reading = findById(req.params.id);
  if (!reading) {
    throw new NotFoundError();
  }
  res.json(reading);
});

// Error Handler mit Custom Errors
const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    error: err.name || 'Error',
    message: err.message,
    errors: err.errors, // Fuer ValidationError
  });
};
```

### Vergleich zu ASP.NET Exception Filters

```csharp
// ASP.NET - Exception Filter
public class ApiExceptionFilterAttribute : ExceptionFilterAttribute
{
    public override void OnException(ExceptionContext context)
    {
        var statusCode = context.Exception switch
        {
            NotFoundException => StatusCodes.Status404NotFound,
            ValidationException => StatusCodes.Status400BadRequest,
            _ => StatusCodes.Status500InternalServerError
        };

        context.Result = new ObjectResult(new
        {
            error = context.Exception.GetType().Name,
            message = context.Exception.Message
        })
        {
            StatusCode = statusCode
        };

        context.ExceptionHandled = true;
    }
}

// Registrierung
services.AddControllers(options =>
{
    options.Filters.Add<ApiExceptionFilterAttribute>();
});
```

```typescript
// Express - Aequivalent
const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  const statusCode =
    err instanceof NotFoundError ? 404 :
    err instanceof ValidationError ? 400 :
    500;

  res.status(statusCode).json({
    error: err.name,
    message: err.message
  });
};

app.use(errorHandler);
```

## 10.8 Validation

In ASP.NET haben Sie DataAnnotations und automatische Model-Validierung. Express bietet das nicht out-of-the-box - Sie waehlen selbst.

### Option 1: Zod (Empfohlen)

```typescript
import { z } from 'zod';

// Schema definieren
const createReadingSchema = z.object({
  timestamp: z.string().datetime(),
  meterValue: z.number().positive(),
  unit: z.enum(['kWh', 'MWh']).default('kWh'),
  notes: z.string().optional(),
});

// Typ ableiten
type CreateReadingInput = z.infer<typeof createReadingSchema>;

// Middleware fuer Validierung
const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validierungsfehler',
          details: err.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      next(err);
    }
  };
};

// Verwendung
app.post('/api/readings', validate(createReadingSchema), (req, res) => {
  // req.body ist jetzt typsicher und validiert!
  const data: CreateReadingInput = req.body;
  // ...
});
```

### Option 2: express-validator

```typescript
import { body, param, validationResult } from 'express-validator';

const createReadingValidation = [
  body('timestamp').isISO8601().withMessage('Ungueltiges Datum'),
  body('meterValue').isFloat({ min: 0 }).withMessage('Muss positiv sein'),
  body('unit').optional().isIn(['kWh', 'MWh']),
];

const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

app.post('/api/readings',
  createReadingValidation,
  handleValidationErrors,
  (req, res) => {
    // Validiert!
  }
);
```

### Vergleich zu DataAnnotations

```csharp
// ASP.NET - DataAnnotations
public class CreateReadingDto
{
    [Required]
    public DateTime Timestamp { get; set; }

    [Required]
    [Range(0, double.MaxValue, ErrorMessage = "Muss positiv sein")]
    public decimal MeterValue { get; set; }

    [StringLength(500)]
    public string? Notes { get; set; }
}

[HttpPost]
public IActionResult Create([FromBody] CreateReadingDto dto)
{
    if (!ModelState.IsValid)
        return BadRequest(ModelState);
    // ...
}
```

```typescript
// Express + Zod - Aequivalent
const createReadingSchema = z.object({
  timestamp: z.string().datetime(),              // [Required]
  meterValue: z.number().min(0),                 // [Range(0, ...)]
  notes: z.string().max(500).optional(),         // [StringLength(500)]
});
```

## 10.9 Projekt-Struktur

### Einfache Struktur (HausTracker-Style)

```
server/
  src/
    index.ts      # Alles in einer Datei
    db.ts         # Datenbank-Setup
  data/
    haustracker.db
  package.json
  tsconfig.json
```

Fuer kleine bis mittlere Projekte voellig ausreichend!

### Erweiterte Struktur (Groessere Projekte)

```
server/
  src/
    index.ts              # Entry Point, Server starten
    app.ts                # Express App Setup

    routes/
      index.ts            # Route-Aggregation
      readings.routes.ts
      tariffs.routes.ts
      settings.routes.ts

    controllers/
      readings.controller.ts
      tariffs.controller.ts

    services/
      readings.service.ts
      tariffs.service.ts

    middleware/
      auth.middleware.ts
      validation.middleware.ts
      error.middleware.ts

    models/
      reading.model.ts    # Zod Schemas oder TypeScript Interfaces
      tariff.model.ts

    utils/
      helpers.ts

    config/
      database.ts
      env.ts

  data/
  tests/
  package.json
```

### Controller-Pattern in Express

```typescript
// controllers/readings.controller.ts
import { Request, Response } from 'express';
import { readingsService } from '../services/readings.service';

export const readingsController = {
  getAll: async (req: Request, res: Response) => {
    const readings = await readingsService.findAll();
    res.json(readings);
  },

  getById: async (req: Request, res: Response) => {
    const reading = await readingsService.findById(req.params.id);
    if (!reading) {
      return res.status(404).json({ error: 'Nicht gefunden' });
    }
    res.json(reading);
  },

  create: async (req: Request, res: Response) => {
    const id = await readingsService.create(req.body);
    res.status(201).json({ id });
  },

  update: async (req: Request, res: Response) => {
    await readingsService.update(req.params.id, req.body);
    res.json({ success: true });
  },

  delete: async (req: Request, res: Response) => {
    await readingsService.delete(req.params.id);
    res.json({ success: true });
  }
};
```

```typescript
// routes/readings.routes.ts
import { Router } from 'express';
import { readingsController } from '../controllers/readings.controller';
import { validate } from '../middleware/validation.middleware';
import { createReadingSchema, updateReadingSchema } from '../models/reading.model';

const router = Router();

router.get('/', readingsController.getAll);
router.get('/:id', readingsController.getById);
router.post('/', validate(createReadingSchema), readingsController.create);
router.put('/:id', validate(updateReadingSchema), readingsController.update);
router.delete('/:id', readingsController.delete);

export default router;
```

## 10.10 Praktisch: HausTracker Server analysiert

Schauen wir uns den HausTracker-Server im Detail an. Der Code befindet sich in `/server/src/index.ts`.

### Server-Setup

```typescript
import express from 'express';
import cors from 'cors';
import db from './db.js';

const app = express();
const PORT = 3001;

app.use(cors());          // CORS fuer Frontend auf anderem Port
app.use(express.json());  // JSON Body Parser
```

**Was passiert hier?**

1. `express()` erstellt eine neue Express-Anwendung
2. `cors()` erlaubt Cross-Origin-Requests (wichtig: Frontend laeuft auf Port 5173!)
3. `express.json()` parsed eingehende JSON-Bodies

### CRUD fuer Readings

```typescript
// GET alle Readings
app.get('/api/readings', (req, res) => {
  const readings = db.prepare('SELECT * FROM readings ORDER BY timestamp DESC').all();
  res.json(readings.map(parseReading));
});
```

Die `parseReading`-Funktion transformiert Datenbank-Felder in Frontend-freundliche Namen:

```typescript
function parseReading(row: any) {
  if (!row) return null;
  return {
    ...row,
    timestamp: new Date(row.timestamp),
    synced: Boolean(row.synced),
    outdoorTemp: row.outdoorTempCurrent,      // Alias
    outdoorTempNight: row.outdoorTempNightAvg, // Alias
    weather: row.weatherCondition,             // Alias
  };
}
```

### Einzelnes Reading abrufen

```typescript
app.get('/api/readings/:id', (req, res) => {
  const reading = db.prepare('SELECT * FROM readings WHERE id = ?').get(req.params.id);
  if (!reading) return res.status(404).json({ error: 'Not found' });
  res.json(parseReading(reading));
});
```

**ASP.NET-Aequivalent:**
```csharp
[HttpGet("{id}")]
public IActionResult GetById(int id)
{
    var reading = _context.Readings.Find(id);
    if (reading == null) return NotFound();
    return Ok(reading);
}
```

### Neues Reading erstellen

```typescript
app.post('/api/readings', (req, res) => {
  const data = req.body;

  // Vorheriges Reading fuer Berechnungen holen
  const prev = db.prepare(
    'SELECT * FROM readings WHERE timestamp < ? ORDER BY timestamp DESC LIMIT 1'
  ).get(data.timestamp) as any;

  let consumption, hoursSinceLastReading, daysSinceLastReading,
      consumptionPerDay, costSinceLastReading;

  if (prev) {
    // Verbrauch berechnen
    consumption = data.meterValue - prev.meterValue;

    // Zeit seit letztem Reading
    const timeDiff = new Date(data.timestamp).getTime() -
                     new Date(prev.timestamp).getTime();
    hoursSinceLastReading = Math.round(timeDiff / (1000 * 60 * 60));
    daysSinceLastReading = timeDiff / (1000 * 60 * 60 * 24);
    consumptionPerDay = daysSinceLastReading > 0
      ? consumption / daysSinceLastReading
      : 0;

    // Kosten berechnen mit aktuellem Tarif
    const tariff = db.prepare(`
      SELECT * FROM tariffs
      WHERE validFrom <= ? AND (validUntil IS NULL OR validUntil >= ?)
      ORDER BY validFrom DESC LIMIT 1
    `).get(data.timestamp, data.timestamp) as any;

    if (tariff && consumption > 0) {
      const pricePerKwh = tariff.totalPricePerKwh || tariff.workingPrice;
      costSinceLastReading = Math.round(consumption * pricePerKwh * 100) / 100;
    }
  }

  // In Datenbank einfuegen
  const stmt = db.prepare(`
    INSERT INTO readings (
      timestamp, meterValue, unit, outdoorTempCurrent, ...
    ) VALUES (?, ?, ?, ?, ...)
  `);

  const result = stmt.run(
    data.timestamp,
    data.meterValue,
    data.unit || 'kWh',
    // ... weitere Felder
  );

  res.json({ id: result.lastInsertRowid });
});
```

**Bemerkenswert:**
- Berechnete Felder (Verbrauch, Kosten) werden serverseitig ermittelt
- Tarif-Lookup fuer Kostenberechnung
- `lastInsertRowid` gibt die neue ID zurueck

### Update und Delete

```typescript
// PUT - Reading aktualisieren
app.put('/api/readings/:id', (req, res) => {
  const data = req.body;
  const stmt = db.prepare(`
    UPDATE readings SET
      timestamp = COALESCE(?, timestamp),
      meterValue = COALESCE(?, meterValue),
      notes = COALESCE(?, notes),
      synced = COALESCE(?, synced)
    WHERE id = ?
  `);
  stmt.run(data.timestamp, data.meterValue, data.notes,
           data.synced ? 1 : 0, req.params.id);
  res.json({ success: true });
});

// DELETE - Reading loeschen
app.delete('/api/readings/:id', (req, res) => {
  db.prepare('DELETE FROM readings WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});
```

**`COALESCE`** ist hier clever: Nur uebergebene Felder werden aktualisiert, andere behalten ihren Wert.

### Settings - Singleton-Pattern

```typescript
// GET Settings
app.get('/api/settings', (req, res) => {
  const settings = db.prepare('SELECT * FROM settings WHERE id = ?')
                     .get('main') as any;

  // JSON-Array parsen (in SQLite als String gespeichert)
  if (settings?.brightnessSensorEntities) {
    try {
      settings.brightnessSensorEntities =
        JSON.parse(settings.brightnessSensorEntities);
    } catch {
      settings.brightnessSensorEntities = [];
    }
  }
  res.json(settings || {});
});
```

Settings verwendet einen Singleton-Ansatz: Es gibt nur eine Zeile mit `id = 'main'`.

### Komplexe Berechnung: Kontostand (Balance)

```typescript
app.get('/api/balance', (req, res) => {
  // Alle noetigen Daten laden
  const readings = db.prepare('SELECT * FROM readings ORDER BY timestamp ASC').all();
  const tariffs = db.prepare('SELECT * FROM tariffs ORDER BY validFrom ASC').all();
  const payments = db.prepare('SELECT * FROM payments ORDER BY date ASC').all();

  if (readings.length < 2) {
    return res.json({
      totalCost: 0,
      totalPayments: 0,
      balance: 0,
      monthlyBreakdown: [],
    });
  }

  // Readings nach Monaten gruppieren
  const monthlyReadings: Record<string, any[]> = {};
  for (const r of readings) {
    const d = new Date(r.timestamp);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyReadings[key]) monthlyReadings[key] = [];
    monthlyReadings[key].push(r);
  }

  // Pro Monat berechnen
  let totalCost = 0;
  let totalPayments = 0;
  const monthlyBreakdown = [];

  for (const month of Object.keys(monthlyReadings).sort()) {
    // Verbrauch berechnen
    // Tarif finden
    // Kosten berechnen
    // Zahlungen zuordnen
    // ... (siehe vollstaendigen Code)
  }

  res.json({
    totalCost: Math.round(totalCost * 100) / 100,
    totalPayments: Math.round(totalPayments * 100) / 100,
    balance: Math.round((totalPayments - totalCost) * 100) / 100,
    monthlyBreakdown,
  });
});
```

### Home Assistant Proxy

```typescript
// Verbindung testen
app.post('/api/ha/test', async (req, res) => {
  const { url, token } = req.body;
  try {
    const response = await fetch(`${url}/api/`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    res.json({ success: response.ok });
  } catch (err) {
    res.json({ success: false, error: String(err) });
  }
});

// Sensoren abrufen
app.post('/api/ha/sensors', async (req, res) => {
  const { url, token } = req.body;
  try {
    const response = await fetch(`${url}/api/states`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch');
    const states = await response.json() as any[];

    const sensors = states
      .filter(s => s.entity_id.startsWith('sensor.'))
      .map(s => ({
        entity_id: s.entity_id,
        name: s.attributes.friendly_name || s.entity_id,
        state: s.state,
        unit: s.attributes.unit_of_measurement,
        device_class: s.attributes.device_class,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json(sensors);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});
```

**Warum ein Proxy?**
- CORS: Browser blockiert direkte Anfragen an Home Assistant
- Sicherheit: Token wird nicht im Frontend exponiert
- Flexibilitaet: Server kann Daten transformieren/filtern

### Server starten

```typescript
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`For mobile access use: http://<your-ip>:${PORT}`);
});
```

`'0.0.0.0'` bedeutet: Auf allen Netzwerk-Interfaces lauschen - wichtig fuer Zugriff vom Smartphone!

## Zusammenfassung: Express vs ASP.NET

```
+--------------------+---------------------------+---------------------------+
|      Aspekt        |       ASP.NET Core        |        Express.js         |
+--------------------+---------------------------+---------------------------+
| Philosophie        | Batteries-included        | Minimal, unopinionated    |
| Startup            | Program.cs + Builder      | Wenige Zeilen             |
| Routing            | Attribute [Route]         | app.get(), Router         |
| Controller         | Klassen mit Actions       | Funktionen                |
| Model Binding      | Automatisch               | Manuell via Middleware    |
| Validation         | DataAnnotations           | Eigene Wahl (zod, etc.)   |
| Middleware         | Klassen + InvokeAsync     | Funktionen                |
| DI                 | Built-in                  | Manuell                   |
| Error Handling     | Exception Filters         | Error Middleware          |
| Response           | IActionResult             | res.json(), res.status()  |
| Typsicherheit      | C# - stark typisiert      | TypeScript - optional     |
| Lernkurve          | Steiler                   | Flacher                   |
| Flexibilitaet      | Vorgegeben                | Maximal                   |
+--------------------+---------------------------+---------------------------+
```

Express ist ideal fuer:
- Kleine bis mittlere APIs
- Microservices
- Schnelle Prototypen
- Teams, die ihre eigene Struktur waehlen wollen

ASP.NET Core ist besser fuer:
- Enterprise-Anwendungen
- Strenge Typsicherheit erforderlich
- Grosse Teams mit Konventionen
- Komplexe DI-Szenarien

Der HausTracker-Server zeigt: Fuer eine App mit CRUD-Operationen und etwas Business-Logik ist Express perfekt - alles in ~660 Zeilen, klar strukturiert und einfach zu verstehen.
