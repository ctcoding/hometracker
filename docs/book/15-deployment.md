# Kapitel 15: Deployment & Production

## Von der Entwicklungsumgebung in die echte Welt

Du hast eine funktionierende Anwendung auf deinem Rechner. Der nächste Schritt ist der wichtigste und oft unterschätzte: Wie kommt sie zu den Nutzern? Wenn du aus der .NET/Azure-Welt kommst, kennst du Web Deploy, Azure App Service und IIS. Die JavaScript-Welt hat eigene Patterns entwickelt - oft simpler, manchmal komplexer, aber definitiv anders.

Dieses Kapitel führt dich durch den gesamten Deployment-Prozess: vom Build über verschiedene Hosting-Optionen bis hin zu Monitoring und Security.

---

## 1. Der Build-Prozess

### Was macht `npm run build`?

In deiner `package.json` findest du typischerweise:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

`npm run build` startet den Production Build. Aber was passiert dabei genau?

### Die Build-Pipeline im Detail

```
Quellcode (.tsx, .ts, .css)
         ↓
    TypeScript Compiler
         ↓
    Bundler (Vite/esbuild)
         ↓
    Tree Shaking
         ↓
    Minification
         ↓
    Code Splitting
         ↓
    Asset Optimization
         ↓
    dist/ Ordner
```

#### 1. TypeScript Compilation

TypeScript wird zu JavaScript kompiliert. Alle Typ-Annotationen verschwinden - sie existieren nur zur Entwicklungszeit:

```typescript
// Vorher: src/utils/calculate.ts
function calculateTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// Nachher: (vereinfacht)
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

#### 2. Bundling

Hunderte Module werden zu wenigen Dateien zusammengefasst:

```
src/
├── main.tsx
├── App.tsx
├── components/
│   ├── Header.tsx
│   ├── Footer.tsx
│   └── ...50 weitere
├── hooks/
│   └── ...20 Dateien
└── utils/
    └── ...30 Dateien

→ wird zu →

dist/
├── index.html
├── assets/
│   ├── index-a1b2c3d4.js      (Hauptbundle)
│   ├── vendor-e5f6g7h8.js     (Dependencies)
│   └── index-i9j0k1l2.css     (Styles)
```

#### 3. Tree Shaking

Unbenutzter Code wird entfernt:

```typescript
// lodash hat 300+ Funktionen
import { debounce } from 'lodash-es';

// Nur debounce landet im Bundle, nicht die anderen 299 Funktionen
```

**Wichtig:** Tree Shaking funktioniert nur mit ES Modules (`import/export`), nicht mit CommonJS (`require`).

#### 4. Minification

```javascript
// Vorher (lesbar, 847 Bytes):
function calculateShippingCost(weight, distance, expressDelivery) {
  const baseRate = 5.99;
  const weightFactor = weight * 0.5;
  const distanceFactor = distance * 0.1;

  let total = baseRate + weightFactor + distanceFactor;

  if (expressDelivery) {
    total = total * 1.5;
  }

  return Math.round(total * 100) / 100;
}

// Nachher (minified, 156 Bytes):
function calculateShippingCost(e,t,n){const r=5.99+.5*e+.1*t;return Math.round(100*(n?1.5*r:r))/100}
```

#### 5. Code Splitting

Große Bundles werden aufgeteilt für bessere Ladezeiten:

```typescript
// Lazy Loading einer Route
const AdminPanel = lazy(() => import('./pages/AdminPanel'));

// Wird zu separatem Chunk:
// dist/assets/AdminPanel-x1y2z3.js
```

### Der dist/ Ordner

Nach `npm run build` enthält `dist/`:

```
dist/
├── index.html                    # Entry Point
├── assets/
│   ├── index-[hash].js          # App Code (~150-300 KB)
│   ├── vendor-[hash].js         # React, Router etc. (~150 KB)
│   ├── [ChunkName]-[hash].js    # Lazy-loaded Chunks
│   ├── index-[hash].css         # Alle Styles (~20-50 KB)
│   └── logo-[hash].svg          # Statische Assets
└── favicon.ico
```

**Die Hashes im Dateinamen** (`a1b2c3d4`) ändern sich bei jeder Änderung. Das ermöglicht aggressives Caching - ändert sich der Hash, ist es eine neue Datei.

### Build analysieren

```bash
# Bundle-Größe visualisieren
npm install -D rollup-plugin-visualizer

# In vite.config.ts:
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: 'dist/stats.html',
      open: true
    })
  ]
});
```

Das erzeugt eine interaktive Treemap, die zeigt, welche Dependencies wie viel Platz brauchen.

---

## 2. Frontend Hosting

### Static Files = Einfach!

Das Schöne am Frontend-Build: Das Ergebnis sind **statische Dateien**. Kein Server-Prozess, kein Runtime, keine komplexe Infrastruktur. Jeder Webserver kann sie ausliefern.

```
Client Request → CDN/Webserver → Statische Datei → Response
```

Vergleich zu IIS:
- IIS: Application Pool, Worker Process, .NET Runtime
- Static Hosting: Nur Dateien ausliefern

### Option 1: Vercel

Vercel (von den Next.js-Machern) ist der einfachste Weg:

```bash
# Global installieren
npm install -g vercel

# Im Projektordner
vercel

# Das war's. Ernsthaft.
```

Vercel erkennt automatisch:
- Framework (Vite, React, Next.js...)
- Build Command (`npm run build`)
- Output Directory (`dist/`)

**vercel.json** für Anpassungen:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```

**Kosten:** Hobby-Tier kostenlos, Pro ab $20/Monat

### Option 2: Netlify

Sehr ähnlich zu Vercel:

```bash
npm install -g netlify-cli
netlify deploy --prod
```

**netlify.toml:**

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

### Option 3: Cloudflare Pages

Schnellstes globales CDN, großzügiges Free Tier:

```bash
npm install -g wrangler
wrangler pages deploy dist
```

**Vorteile:**
- 100 Länder mit Edge-Servern
- Unbegrenzte Bandbreite im Free Tier
- Automatische Brotli-Kompression

### Option 4: AWS S3 + CloudFront

Die Enterprise-Lösung mit maximaler Kontrolle:

```bash
# S3 Bucket erstellen
aws s3 mb s3://meine-app-frontend

# Dateien hochladen
aws s3 sync dist/ s3://meine-app-frontend --delete

# Static Website Hosting aktivieren
aws s3 website s3://meine-app-frontend \
  --index-document index.html \
  --error-document index.html
```

**CloudFront Distribution:**

```json
{
  "Origins": [{
    "DomainName": "meine-app-frontend.s3.amazonaws.com",
    "S3OriginConfig": {
      "OriginAccessIdentity": ""
    }
  }],
  "DefaultCacheBehavior": {
    "ViewerProtocolPolicy": "redirect-to-https",
    "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6"
  },
  "CustomErrorResponses": [{
    "ErrorCode": 404,
    "ResponseCode": 200,
    "ResponsePagePath": "/index.html"
  }]
}
```

### Vergleich zu IIS

| Aspekt | IIS | Vercel/Netlify |
|--------|-----|----------------|
| Setup | Server, Rollen, Konfiguration | `vercel` tippen |
| SSL | Zertifikat kaufen/installieren | Automatisch |
| CDN | Separat (Azure CDN) | Inklusive |
| Skalierung | Manuell | Automatisch |
| Kosten | Server-Lizenz + Hosting | Oft kostenlos |
| Deployment | Web Deploy, FTP | Git Push |

### SPA Routing Fix

**Wichtig:** Single Page Apps brauchen einen Fallback zu `index.html`:

```
User navigiert zu /dashboard
→ Server sucht /dashboard/index.html
→ 404 (existiert nicht)
→ FALSCH!

Richtig:
User navigiert zu /dashboard
→ Server liefert /index.html
→ React Router übernimmt
→ Dashboard wird gerendert
```

Jeder Hosting-Anbieter hat dafür eine Konfiguration (siehe Beispiele oben).

---

## 3. Backend Hosting

Das Backend ist komplexer: Ein Node.js-Prozess muss **dauerhaft laufen**.

### Das Problem

```bash
# Das funktioniert NICHT in Production:
node server.js

# Warum?
# - Prozess stirbt bei Fehler
# - Kein Neustart nach Server-Reboot
# - Keine Logs
# - Keine Metriken
```

### Lösung 1: PM2 (Process Manager)

PM2 hält Node.js-Prozesse am Leben:

```bash
# Installation
npm install -g pm2

# App starten
pm2 start server.js --name "haustracker-api"

# Mit Cluster Mode (nutzt alle CPU-Kerne)
pm2 start server.js -i max --name "haustracker-api"

# Status
pm2 status

# Logs
pm2 logs haustracker-api

# Neustart bei Dateiänderung
pm2 start server.js --watch

# Autostart nach Server-Reboot
pm2 startup
pm2 save
```

**ecosystem.config.js** für komplexere Setups:

```javascript
module.exports = {
  apps: [{
    name: 'haustracker-api',
    script: './dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    // Neustart bei Memory-Leak
    max_memory_restart: '500M',
    // Graceful Shutdown
    kill_timeout: 5000,
    // Logs
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    merge_logs: true,
    // Neustart-Limits
    max_restarts: 10,
    restart_delay: 1000
  }]
};
```

```bash
pm2 start ecosystem.config.js --env production
```

### Lösung 2: Docker

Container sind der Standard für reproduzierbare Deployments:

**Dockerfile:**

```dockerfile
# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Dependencies zuerst (besseres Caching)
COPY package*.json ./
RUN npm ci --only=production

# Source Code
COPY . .
RUN npm run build

# Production Stage
FROM node:20-alpine

WORKDIR /app

# Nur Production Dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Non-root User
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "dist/server.js"]
```

**.dockerignore:**

```
node_modules
dist
.git
.env
*.log
Dockerfile
.dockerignore
```

**Befehle:**

```bash
# Image bauen
docker build -t haustracker-api:latest .

# Container starten
docker run -d \
  --name haustracker \
  -p 3000:3000 \
  -e DATABASE_URL=/data/database.db \
  -v haustracker-data:/data \
  haustracker-api:latest

# Logs
docker logs -f haustracker

# Shell im Container
docker exec -it haustracker sh
```

### Docker Compose für Multi-Container

**docker-compose.yml:**

```yaml
version: '3.8'

services:
  api:
    build: ./server
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=/data/database.db
    volumes:
      - api-data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build: ./client
    ports:
      - "80:80"
    depends_on:
      - api
    restart: unless-stopped

volumes:
  api-data:
```

### Platform-as-a-Service Optionen

#### Railway

```bash
# CLI installieren
npm install -g @railway/cli

# Login und Deploy
railway login
railway init
railway up
```

**railway.json:**

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node dist/server.js",
    "healthcheckPath": "/health",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

**Kosten:** $5 Guthaben/Monat kostenlos, dann Pay-as-you-go

#### Render

1. GitHub Repository verbinden
2. "New Web Service" klicken
3. Konfigurieren:
   - Build Command: `npm install && npm run build`
   - Start Command: `node dist/server.js`

**render.yaml:**

```yaml
services:
  - type: web
    name: haustracker-api
    env: node
    buildCommand: npm install && npm run build
    startCommand: node dist/server.js
    healthCheckPath: /health
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        sync: false  # Manuell setzen
```

**Kosten:** Free Tier (schläft nach 15min Inaktivität), ab $7/Monat always-on

#### Fly.io

Besonders gut für Edge-Deployments:

```bash
# CLI installieren
curl -L https://fly.io/install.sh | sh

# App erstellen
fly launch

# Deployen
fly deploy
```

**fly.toml:**

```toml
app = "haustracker-api"
primary_region = "fra"  # Frankfurt

[build]
  dockerfile = "Dockerfile"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

[checks]
  [checks.health]
    port = 3000
    type = "http"
    interval = "30s"
    timeout = "5s"
    path = "/health"

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 256
```

### Vergleich zu Azure App Service

| Aspekt | Azure App Service | Railway/Render |
|--------|-------------------|----------------|
| Setup | Portal, ARM Templates | Git Push |
| Skalierung | App Service Plan wählen | Automatisch |
| Preis | Ab ~$13/Monat (B1) | Ab $0-7/Monat |
| Features | Viele Azure-Integrationen | Fokussiert |
| Vendor Lock-in | Hoch | Niedrig |
| Deployment | Azure DevOps, GitHub Actions | Git Push |

---

## 4. Environment Variables

### Das Problem mit Secrets

```javascript
// NIEMALS SO:
const apiKey = 'sk-1234567890abcdef';
const dbPassword = 'super-secret-password';

// Das landet im Git-Repository und ist öffentlich!
```

### Die Lösung: Environment Variables

```javascript
// server/config.ts
export const config = {
  port: parseInt(process.env.PORT || '3000'),
  databaseUrl: process.env.DATABASE_URL || './data/database.db',
  jwtSecret: process.env.JWT_SECRET,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Validierung
  validate() {
    if (!this.jwtSecret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    if (this.nodeEnv === 'production' && !process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL required in production');
    }
  }
};

// Beim Start validieren
config.validate();
```

### Development: .env Dateien

```bash
# .env.development (nicht committen!)
PORT=3000
DATABASE_URL=./data/dev.db
JWT_SECRET=dev-secret-not-for-production
LOG_LEVEL=debug

# .env.production (Template, Werte auf Server setzen)
PORT=3000
DATABASE_URL=
JWT_SECRET=
LOG_LEVEL=info
```

**.gitignore:**

```
.env
.env.local
.env.*.local
```

**dotenv laden:**

```javascript
// Nur in Development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
```

### Production: Secrets Management

#### Bei Hosting-Providern

```bash
# Vercel
vercel env add JWT_SECRET production

# Railway
railway variables set JWT_SECRET=xxx

# Fly.io
fly secrets set JWT_SECRET=xxx

# Render: Dashboard → Environment
```

#### Für eigene Server

```bash
# Systemd Service
# /etc/systemd/system/haustracker.service
[Unit]
Description=Haustracker API
After=network.target

[Service]
Type=simple
User=nodejs
WorkingDirectory=/opt/haustracker
ExecStart=/usr/bin/node dist/server.js
Restart=on-failure
Environment=NODE_ENV=production
Environment=PORT=3000
EnvironmentFile=/etc/haustracker/secrets

[Install]
WantedBy=multi-user.target
```

```bash
# /etc/haustracker/secrets (nur root lesbar)
JWT_SECRET=production-secret-here
DATABASE_URL=/var/lib/haustracker/database.db
```

### Frontend Environment Variables

**Achtung:** Frontend-Variablen sind **öffentlich** im Bundle!

```javascript
// Vite: Nur VITE_* Variablen
const apiUrl = import.meta.env.VITE_API_URL;

// .env
VITE_API_URL=https://api.example.com
VITE_GA_ID=UA-12345678-1  // OK - nicht geheim

// NIEMALS im Frontend:
VITE_SECRET_KEY=xxx  // Wird im Bundle sichtbar!
```

---

## 5. Datenbank in Production

### SQLite in Production

SQLite ist absolut produktionstauglich für:
- Single-Server Deployments
- Moderate Last (< 1000 gleichzeitige Nutzer)
- Lesedominierte Workloads

#### Backup-Strategien

```bash
# Einfaches Backup (Datei kopieren)
# ACHTUNG: Nur wenn keine Schreiboperationen!
cp database.db backup-$(date +%Y%m%d).db

# Sicheres Backup mit SQLite Tools
sqlite3 database.db ".backup backup-$(date +%Y%m%d).db"

# Online Backup (während App läuft)
sqlite3 database.db "VACUUM INTO 'backup-$(date +%Y%m%d).db'"
```

**Automatisches Backup-Script:**

```bash
#!/bin/bash
# /opt/haustracker/backup.sh

BACKUP_DIR="/var/backups/haustracker"
DB_PATH="/var/lib/haustracker/database.db"
RETENTION_DAYS=30

# Backup erstellen
sqlite3 "$DB_PATH" ".backup $BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).db"

# Alte Backups löschen
find "$BACKUP_DIR" -name "backup-*.db" -mtime +$RETENTION_DAYS -delete

# Optional: Zu S3 hochladen
aws s3 cp "$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).db" \
  s3://my-backups/haustracker/
```

**Cron Job:**

```bash
# Täglich um 3 Uhr
0 3 * * * /opt/haustracker/backup.sh
```

#### SQLite Performance-Optimierung

```sql
-- In Production aktivieren
PRAGMA journal_mode = WAL;  -- Write-Ahead Logging
PRAGMA synchronous = NORMAL; -- Guter Kompromiss
PRAGMA cache_size = -64000;  -- 64MB Cache
PRAGMA temp_store = MEMORY;  -- Temp Tables im RAM
```

### Wann zu PostgreSQL wechseln?

**Wechseln wenn:**
- Mehrere Server (horizontal scaling)
- Über 10.000 gleichzeitige Connections
- Komplexe Queries mit vielen JOINs
- Full-Text Search benötigt
- Geografische Daten (PostGIS)

**Migration:**

```bash
# SQLite exportieren
sqlite3 database.db .dump > dump.sql

# In PostgreSQL importieren (nach Anpassungen)
psql -d haustracker -f dump.sql
```

**Drizzle ORM macht's einfach:**

```typescript
// Nur die Connection ändern
// Von:
import { drizzle } from 'drizzle-orm/better-sqlite3';

// Zu:
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client);
```

---

## 6. CI/CD mit GitHub Actions

### Grundlagen

GitHub Actions automatisiert Build, Test und Deployment bei jedem Push.

**.github/workflows/ci.yml:**

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type Check
        run: npm run typecheck

      - name: Lint
        run: npm run lint

      - name: Test
        run: npm test

      - name: Build
        run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Deploy to Railway
        uses: railwayapp/railway-action@v1
        with:
          service: haustracker-api
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

### Separate Workflows für Frontend und Backend

**.github/workflows/deploy-frontend.yml:**

```yaml
name: Deploy Frontend

on:
  push:
    branches: [main]
    paths:
      - 'client/**'
      - '.github/workflows/deploy-frontend.yml'

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: client/package-lock.json

      - name: Install & Build
        working-directory: ./client
        run: |
          npm ci
          npm run build
        env:
          VITE_API_URL: ${{ vars.API_URL }}

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./client
```

**.github/workflows/deploy-backend.yml:**

```yaml
name: Deploy Backend

on:
  push:
    branches: [main]
    paths:
      - 'server/**'
      - '.github/workflows/deploy-backend.yml'

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Login to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and Push
        uses: docker/build-push-action@v5
        with:
          context: ./server
          push: true
          tags: ghcr.io/${{ github.repository }}/api:latest

      - name: Deploy to Fly.io
        uses: superfly/flyctl-actions/setup-flyctl@master
      - run: flyctl deploy --remote-only
        working-directory: ./server
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

### Secrets in GitHub Actions

```bash
# Über GitHub CLI
gh secret set RAILWAY_TOKEN --body "xxx"
gh secret set VERCEL_TOKEN --body "xxx"

# Oder im Repository: Settings → Secrets → Actions
```

---

## 7. Monitoring & Logging

### Was loggen?

```typescript
// server/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty' }
    : undefined,
});

// Strukturiertes Logging
logger.info({ userId: 123, action: 'login' }, 'User logged in');
logger.error({ err, requestId }, 'Database query failed');
```

**Was loggen:**

```typescript
// Request Logging
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: Date.now() - start,
      userAgent: req.get('user-agent'),
      ip: req.ip,
    });
  });

  next();
});

// Fehler loggen
app.use((err, req, res, next) => {
  logger.error({
    err: {
      message: err.message,
      stack: err.stack,
    },
    requestId: req.id,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({ error: 'Internal Server Error' });
});

// Business Events
logger.info({
  event: 'order_created',
  orderId: order.id,
  total: order.total,
  items: order.items.length
});
```

**Nicht loggen:**
- Passwörter
- API Keys
- Persönliche Daten (DSGVO!)
- Kreditkartennummern

### Sentry für Error Tracking

```bash
npm install @sentry/node
```

```typescript
// server/instrument.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,  // 10% der Requests tracen

  // Sensitive Daten filtern
  beforeSend(event) {
    if (event.request?.headers) {
      delete event.request.headers['authorization'];
    }
    return event;
  },
});

// In Express
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());

// Manuell Fehler melden
try {
  await riskyOperation();
} catch (error) {
  Sentry.captureException(error);
  throw error;
}
```

### Frontend Error Tracking

```typescript
// client/src/main.tsx
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [
    Sentry.browserTracingIntegration(),
  ],
  tracesSampleRate: 0.1,
});

// Error Boundary
<Sentry.ErrorBoundary fallback={<ErrorPage />}>
  <App />
</Sentry.ErrorBoundary>
```

### Health Checks

```typescript
// server/routes/health.ts
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: 'ok',
      memory: 'ok',
    },
  };

  // Datenbankverbindung prüfen
  try {
    await db.execute(sql`SELECT 1`);
  } catch {
    health.status = 'degraded';
    health.checks.database = 'error';
  }

  // Memory prüfen
  const memUsage = process.memoryUsage();
  if (memUsage.heapUsed > 500 * 1024 * 1024) {  // > 500MB
    health.checks.memory = 'warning';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});
```

---

## 8. Performance

### Lighthouse

Lighthouse ist in Chrome DevTools integriert oder als CLI verfügbar:

```bash
npm install -g lighthouse
lighthouse https://meine-app.com --view
```

**Automatisiert in CI:**

```yaml
- name: Lighthouse CI
  uses: treosh/lighthouse-ci-action@v10
  with:
    urls: |
      https://meine-app.com
      https://meine-app.com/dashboard
    budgetPath: ./lighthouse-budget.json
```

**lighthouse-budget.json:**

```json
[
  {
    "path": "/*",
    "timings": [
      { "metric": "first-contentful-paint", "budget": 2000 },
      { "metric": "interactive", "budget": 3500 },
      { "metric": "largest-contentful-paint", "budget": 2500 }
    ],
    "resourceSizes": [
      { "resourceType": "script", "budget": 300 },
      { "resourceType": "total", "budget": 500 }
    ]
  }
]
```

### Core Web Vitals

Die drei wichtigsten Metriken:

1. **LCP (Largest Contentful Paint)** < 2.5s
   - Größtes Element geladen

2. **FID (First Input Delay)** < 100ms
   - Zeit bis zur ersten Interaktion

3. **CLS (Cumulative Layout Shift)** < 0.1
   - Visuelle Stabilität

**Messen im Code:**

```typescript
// client/src/vitals.ts
import { onCLS, onFID, onLCP } from 'web-vitals';

function sendToAnalytics(metric) {
  fetch('/api/metrics', {
    method: 'POST',
    body: JSON.stringify({
      name: metric.name,
      value: metric.value,
      id: metric.id,
    }),
  });
}

onCLS(sendToAnalytics);
onFID(sendToAnalytics);
onLCP(sendToAnalytics);
```

### Performance-Optimierungen

```typescript
// 1. Code Splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));

// 2. Bilder optimieren
<img
  src={smallImage}
  srcSet={`${smallImage} 400w, ${largeImage} 800w`}
  loading="lazy"
  alt="..."
/>

// 3. Fonts optimieren
// In index.html:
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preload" href="/fonts/Inter.woff2" as="font" crossorigin>

// 4. API Response cachen
app.get('/api/products', async (req, res) => {
  res.set('Cache-Control', 'public, max-age=300');  // 5 Minuten
  // ...
});
```

---

## 9. Security Checklist

### HTTPS

**Immer HTTPS.** Hosting-Provider wie Vercel, Netlify machen das automatisch.

Für eigene Server:

```bash
# Certbot für Let's Encrypt
sudo certbot --nginx -d api.example.com
```

```nginx
# nginx.conf
server {
    listen 80;
    server_name api.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate /etc/letsencrypt/live/api.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;

    # Modern SSL Config
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
}
```

### CORS

```typescript
import cors from 'cors';

// Entwicklung: Alles erlauben
app.use(cors());

// Production: Spezifisch
app.use(cors({
  origin: ['https://meine-app.com', 'https://www.meine-app.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
```

### Security Headers

```typescript
import helmet from 'helmet';

app.use(helmet());

// Oder manuell:
app.use((req, res, next) => {
  // XSS Protection
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // HSTS
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains'
  );

  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"
  );

  next();
});
```

### npm audit

```bash
# Vulnerabilities prüfen
npm audit

# Automatisch fixen (wenn möglich)
npm audit fix

# In CI erzwingen
npm audit --audit-level=high
```

**.github/workflows/security.yml:**

```yaml
name: Security

on:
  schedule:
    - cron: '0 0 * * *'  # Täglich
  push:
    branches: [main]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm audit --audit-level=high
```

### Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 Minuten
  max: 100,  // 100 Requests pro Fenster
  message: { error: 'Too many requests' },
  standardHeaders: true,
});

app.use('/api/', limiter);

// Strengeres Limit für Auth-Endpoints
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 Stunde
  max: 5,  // 5 Versuche
  message: { error: 'Too many login attempts' },
});

app.use('/api/auth/login', authLimiter);
```

### Input Validation

```typescript
import { z } from 'zod';

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  name: z.string().min(1).max(100),
});

app.post('/api/users', async (req, res) => {
  const result = createUserSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: result.error.issues
    });
  }

  // result.data ist typsicher
  await createUser(result.data);
});
```

### SQL Injection Prevention

```typescript
// NIEMALS String-Concatenation:
const BAD = `SELECT * FROM users WHERE id = ${userId}`;

// Drizzle ORM ist sicher:
const user = await db.select()
  .from(users)
  .where(eq(users.id, userId));

// Prepared Statements mit sql:
const result = await db.execute(
  sql`SELECT * FROM users WHERE id = ${userId}`
);
```

---

## Deployment Checklist

Vor jedem Production-Deployment:

```markdown
### Build
- [ ] `npm run build` erfolgreich
- [ ] Keine TypeScript Fehler
- [ ] Keine ESLint Warnings
- [ ] Tests bestanden

### Environment
- [ ] Alle Environment Variables gesetzt
- [ ] Secrets nicht im Code
- [ ] NODE_ENV=production

### Database
- [ ] Migrations ausgeführt
- [ ] Backup erstellt
- [ ] Connection String korrekt

### Security
- [ ] HTTPS aktiviert
- [ ] CORS konfiguriert
- [ ] npm audit clean
- [ ] Rate Limiting aktiv

### Monitoring
- [ ] Health Check Endpoint
- [ ] Error Tracking (Sentry)
- [ ] Logging konfiguriert

### Performance
- [ ] Lighthouse Score > 90
- [ ] Bundle Size akzeptabel
- [ ] Caching Headers gesetzt
```

---

## Zusammenfassung

Deployment in der JavaScript-Welt ist oft einfacher als in traditionellen Enterprise-Umgebungen:

- **Frontend:** Statische Dateien auf CDN - Vercel, Netlify, Cloudflare Pages
- **Backend:** Container oder PaaS - Railway, Render, Fly.io, Docker
- **Datenbank:** SQLite für einfache Fälle, PostgreSQL wenn nötig
- **CI/CD:** GitHub Actions automatisiert alles
- **Monitoring:** Sentry für Fehler, strukturierte Logs
- **Security:** HTTPS, Helmet, Rate Limiting, npm audit

Der wichtigste Unterschied zu IIS/Azure: Weniger Konfiguration, mehr Convention. Ein `git push` kann das gesamte Deployment auslösen.

Im nächsten Kapitel schauen wir uns an, wie wir unsere Anwendung testen - von Unit Tests bis End-to-End.
