# Kapitel 2: Node.js & npm - Die JavaScript-Runtime verstehen

Als .NET-Entwickler bist du es gewohnt, dass dein Code in der CLR (Common Language Runtime) ausgeführt wird. In der JavaScript-Welt übernimmt Node.js diese Rolle - allerdings mit einem fundamental anderen Ausführungsmodell. In diesem Kapitel werden wir Node.js von Grund auf verstehen und lernen, wie npm als Paketmanager funktioniert.

---

## 2.1 Was ist Node.js?

Node.js ist eine JavaScript-Runtime, die außerhalb des Browsers läuft. Sie wurde 2009 von Ryan Dahl entwickelt und basiert auf Googles V8 JavaScript Engine - derselben Engine, die auch Chrome antreibt.

### Die V8 Engine

Die V8 Engine ist ein Just-In-Time (JIT) Compiler, der JavaScript direkt in Maschinencode übersetzt. Anders als bei .NET, wo du IL-Code (Intermediate Language) hast, der dann vom JIT-Compiler zur Laufzeit kompiliert wird, arbeitet V8 in mehreren Stufen:

```
JavaScript Code
      ↓
   Parser (AST)
      ↓
   Ignition (Interpreter) → Bytecode
      ↓
   TurboFan (Optimizing Compiler) → Maschinencode
```

**Vergleich zu .NET:**

| Aspekt | .NET | Node.js |
|--------|------|---------|
| Compiler | Roslyn → IL → JIT | V8 (Ignition + TurboFan) |
| Zwischencode | MSIL/CIL | Bytecode (intern) |
| Typisierung | Statisch | Dynamisch |
| Garbage Collection | Generational GC | V8 GC (Mark-Sweep, Mark-Compact) |

### Der Event Loop - Das Herzstück von Node.js

Hier liegt der fundamentale Unterschied zu klassischen Webservern wie IIS. Während IIS (oder Kestrel) für jede Anfrage einen Thread aus dem Thread-Pool verwendet, arbeitet Node.js mit einem **Single-Threaded Event Loop**.

```mermaid
graph TD
    A[Eingehende Anfragen] --> B[Event Queue]
    B --> C[Event Loop]
    C --> D{Blocking Operation?}
    D -->|Nein| E[Sofort ausführen]
    D -->|Ja| F[An Thread Pool delegieren]
    F --> G[libuv Thread Pool]
    G --> H[Callback in Queue]
    H --> B
    E --> I[Response]
```

**Der Event Loop im Detail:**

```
   ┌───────────────────────────┐
┌─>│           timers          │  ← setTimeout, setInterval
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │     pending callbacks     │  ← I/O callbacks (vorherige Iteration)
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │       idle, prepare       │  ← Interne Verwendung
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │           poll            │  ← Neue I/O Events abholen
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │           check           │  ← setImmediate callbacks
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
└──┤      close callbacks      │  ← z.B. socket.on('close')
   └───────────────────────────┘
```

### Non-blocking I/O

In .NET würdest du für asynchrone Operationen `async/await` verwenden:

```csharp
// C# - Asynchron
public async Task<string> ReadFileAsync()
{
    return await File.ReadAllTextAsync("data.txt");
}
```

In Node.js gibt es drei Ansätze, die historisch gewachsen sind:

```javascript
// 1. Callbacks (ursprünglicher Ansatz)
const fs = require('fs');

fs.readFile('data.txt', 'utf8', (err, data) => {
    if (err) {
        console.error('Fehler:', err);
        return;
    }
    console.log(data);
});

// 2. Promises
const fsPromises = require('fs').promises;

fsPromises.readFile('data.txt', 'utf8')
    .then(data => console.log(data))
    .catch(err => console.error('Fehler:', err));

// 3. Async/Await (moderner Ansatz - sehr ähnlich zu C#)
async function readFileAsync() {
    try {
        const data = await fsPromises.readFile('data.txt', 'utf8');
        return data;
    } catch (err) {
        console.error('Fehler:', err);
        throw err;
    }
}
```

### Vergleich zu IIS/Kestrel

| Aspekt | IIS/Kestrel | Node.js |
|--------|-------------|---------|
| Threading-Modell | Multi-threaded (Thread Pool) | Single-threaded Event Loop |
| Concurrency | Parallele Threads | Asynchrone Callbacks |
| CPU-intensive Tasks | Gut geeignet | Blockiert Event Loop! |
| I/O-intensive Tasks | Gut (async/await) | Exzellent (native async) |
| Memory pro Connection | Höher (Thread Stack) | Niedriger |
| Skalierung | Vertikal (mehr Threads) | Horizontal (Cluster/PM2) |

**Wichtig zu verstehen:** Node.js ist NICHT single-threaded für alles. Der Event Loop ist single-threaded, aber I/O-Operationen werden an libuv delegiert, das einen Thread Pool verwendet (standardmäßig 4 Threads, konfigurierbar via `UV_THREADPOOL_SIZE`).

```javascript
// CPU-intensive Operation - SCHLECHT für Node.js!
function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

// Dies blockiert den gesamten Event Loop!
const result = fibonacci(45); // Server reagiert nicht mehr

// Lösung: Worker Threads (seit Node.js 10.5)
const { Worker } = require('worker_threads');

function runFibonacciInWorker(n) {
    return new Promise((resolve, reject) => {
        const worker = new Worker(`
            const { parentPort, workerData } = require('worker_threads');

            function fibonacci(n) {
                if (n <= 1) return n;
                return fibonacci(n - 1) + fibonacci(n - 2);
            }

            parentPort.postMessage(fibonacci(workerData));
        `, { eval: true, workerData: n });

        worker.on('message', resolve);
        worker.on('error', reject);
    });
}
```

---

## 2.2 Installation & Versionsmanagement

### Direkte Installation

Du kannst Node.js direkt von [nodejs.org](https://nodejs.org) herunterladen. Es gibt zwei Versionen:

- **LTS (Long Term Support):** Stabile Version für Produktion (gerade Versionsnummern: 18, 20, 22)
- **Current:** Neueste Features, aber kürzerer Support

**Empfehlung:** Für Produktionsprojekte immer LTS verwenden!

### Node Version Manager (nvm)

Als Entwickler arbeitest du oft an mehreren Projekten mit unterschiedlichen Node-Versionen. Hier kommt nvm ins Spiel:

```bash
# Installation (macOS/Linux)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Nach Installation: Terminal neu starten oder:
source ~/.bashrc  # oder ~/.zshrc

# Verfügbare Versionen anzeigen
nvm ls-remote

# LTS-Version installieren
nvm install --lts

# Spezifische Version installieren
nvm install 20.10.0

# Zwischen Versionen wechseln
nvm use 18
nvm use 20

# Standard-Version setzen
nvm alias default 20

# Aktuelle Version anzeigen
node --version
nvm current

# Alle installierten Versionen
nvm ls
```

**Projekt-spezifische Version mit .nvmrc:**

```bash
# Im Projektverzeichnis
echo "20.10.0" > .nvmrc

# Dann einfach:
nvm use
# Found '/path/to/project/.nvmrc' with version <20.10.0>
# Now using node v20.10.0 (npm v10.2.3)
```

### fnm (Fast Node Manager)

fnm ist eine schnellere Alternative zu nvm, geschrieben in Rust:

```bash
# Installation macOS (Homebrew)
brew install fnm

# Shell-Integration (in .zshrc oder .bashrc)
eval "$(fnm env --use-on-cd)"

# Verwendung (sehr ähnlich zu nvm)
fnm install 20
fnm use 20
fnm default 20

# Automatischer Wechsel bei cd in Projektverzeichnis!
# (wenn .nvmrc oder .node-version existiert)
```

### Installation via Homebrew (macOS)

```bash
# Aktuelle Version
brew install node

# Spezifische Version
brew install node@20

# Wechseln zwischen Versionen
brew unlink node
brew link node@20
```

**Nachteile von Homebrew:** Schwieriger, mehrere Versionen parallel zu nutzen. Für Entwicklung empfehle ich nvm oder fnm.

### LTS vs Current - Wann was?

```
Node.js Release Schedule:

  Version    Status         Aktiver Support    Maintenance
  ─────────────────────────────────────────────────────────
  18.x       Maintenance    bis April 2025     ✓
  20.x       LTS            bis Oktober 2026   Empfohlen!
  21.x       Current        bis Juni 2024      Experimentell
  22.x       LTS            ab Oktober 2024    Zukunft
```

**Faustregel:**
- **Produktion:** Immer LTS
- **Neue Features testen:** Current
- **Legacy-Projekte:** Ältere LTS (mit Upgrade-Plan!)

---

## 2.3 npm - Node Package Manager

npm ist der Standard-Paketmanager für Node.js und wird automatisch mitinstalliert. Mit über 2 Millionen Paketen ist es das größte Software-Registry der Welt.

### package.json - Das Herzstück jedes Node.js-Projekts

Die `package.json` ist vergleichbar mit der `.csproj`-Datei in .NET. Sie enthält alle Metadaten und Abhängigkeiten deines Projekts.

```json
{
  "name": "mein-projekt",
  "version": "1.0.0",
  "description": "Eine Beschreibung des Projekts",
  "main": "index.js",
  "type": "module",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "test": "jest",
    "build": "tsc",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  },
  "keywords": ["beispiel", "tutorial"],
  "author": "Max Mustermann <max@example.com>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/user/repo.git"
  },
  "bugs": {
    "url": "https://github.com/user/repo/issues"
  },
  "homepage": "https://github.com/user/repo#readme",
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  },
  "dependencies": {
    "express": "^4.18.2",
    "lodash": "~4.17.21"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "nodemon": "^3.0.1",
    "typescript": "^5.3.2"
  },
  "peerDependencies": {
    "react": "^18.0.0"
  },
  "optionalDependencies": {
    "fsevents": "^2.3.3"
  }
}
```

**Erklärung aller Felder:**

| Feld | Beschreibung | .NET Äquivalent |
|------|--------------|-----------------|
| `name` | Paketname (lowercase, keine Spaces) | AssemblyName |
| `version` | Semantic Version (MAJOR.MINOR.PATCH) | Version |
| `description` | Kurze Beschreibung | Description |
| `main` | Einstiegspunkt für CommonJS | - |
| `module` | Einstiegspunkt für ESM | - |
| `type` | "module" für ESM, "commonjs" für CJS | - |
| `scripts` | Ausführbare Befehle | MSBuild Targets |
| `keywords` | Suchbegriffe für npm Registry | PackageTags |
| `author` | Autor(en) | Authors |
| `license` | Lizenz (SPDX Identifier) | PackageLicenseExpression |
| `repository` | Git Repository URL | RepositoryUrl |
| `engines` | Erforderliche Node/npm Version | TargetFramework |
| `dependencies` | Produktions-Abhängigkeiten | PackageReference |
| `devDependencies` | Entwicklungs-Abhängigkeiten | PackageReference (PrivateAssets) |
| `peerDependencies` | Erwartete Host-Abhängigkeiten | - |
| `optionalDependencies` | Optionale Abhängigkeiten | - |

### dependencies vs devDependencies

Dies ist ein häufiger Stolperstein für .NET-Entwickler:

```json
{
  "dependencies": {
    // Diese Pakete werden in PRODUKTION benötigt
    "express": "^4.18.2",      // Web-Framework
    "mongoose": "^8.0.0",      // Datenbank
    "jsonwebtoken": "^9.0.0"   // Auth
  },
  "devDependencies": {
    // Diese Pakete werden NUR für ENTWICKLUNG benötigt
    "jest": "^29.7.0",         // Testing
    "eslint": "^8.55.0",       // Linting
    "typescript": "^5.3.2",    // TypeScript Compiler
    "nodemon": "^3.0.1"        // Auto-Restart bei Änderungen
  }
}
```

**Wichtig:** Bei `npm install --production` werden nur `dependencies` installiert!

```bash
# Alles installieren (Entwicklung)
npm install

# Nur Produktions-Dependencies (CI/CD, Docker)
npm install --production
# oder
NODE_ENV=production npm install
```

### npm Befehle im Detail

```bash
# Projekt initialisieren
npm init              # Interaktiv
npm init -y           # Mit Defaults

# Pakete installieren
npm install           # Alle Dependencies aus package.json
npm install express   # Paket als dependency
npm install -D jest   # Paket als devDependency (--save-dev)
npm install -g nodemon # Global installieren

# Spezifische Versionen
npm install express@4.17.1        # Exakte Version
npm install express@^4.17.0       # Kompatible Version
npm install express@latest        # Neueste Version

# Pakete entfernen
npm uninstall express
npm uninstall -D jest

# Pakete aktualisieren
npm update            # Alle Pakete (innerhalb Semver-Range)
npm update express    # Spezifisches Paket
npm outdated          # Veraltete Pakete anzeigen

# Paket-Informationen
npm info express      # Details zu einem Paket
npm ls                # Dependency Tree anzeigen
npm ls --depth=0      # Nur Top-Level

# Cache
npm cache clean --force  # Cache leeren
npm cache verify         # Cache überprüfen
```

### npm Scripts - Build-Automatisierung

npm Scripts sind dein Äquivalent zu MSBuild Targets oder Cake/NUKE Build-Scripten:

```json
{
  "scripts": {
    "start": "node dist/index.js",
    "dev": "nodemon src/index.ts",
    "build": "tsc",
    "build:watch": "tsc --watch",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix",
    "format": "prettier --write .",
    "clean": "rm -rf dist node_modules",
    "prebuild": "npm run clean",
    "postbuild": "echo 'Build complete!'",
    "db:migrate": "prisma migrate dev",
    "db:seed": "node prisma/seed.js",
    "docker:build": "docker build -t myapp .",
    "docker:run": "docker run -p 3000:3000 myapp"
  }
}
```

**Ausführung:**

```bash
npm run dev           # Script ausführen
npm run build         # prebuild → build → postbuild
npm test              # Kurzform für "npm run test"
npm start             # Kurzform für "npm run start"

# Mit Argumenten
npm run test -- --watch
npm run lint -- --fix
```

**Lifecycle Hooks:**
- `pre<script>` - Läuft VOR dem Script
- `post<script>` - Läuft NACH dem Script

```json
{
  "scripts": {
    "pretest": "npm run lint",
    "test": "jest",
    "posttest": "echo 'Tests abgeschlossen'"
  }
}
```

### package-lock.json - Warum ist sie wichtig?

Die `package-lock.json` ist das Äquivalent zur `packages.lock.json` in .NET. Sie garantiert **reproduzierbare Builds**.

**Ohne Lockfile:**
```
package.json: "express": "^4.18.0"

Entwickler A (März 2024): installiert 4.18.2
Entwickler B (Juni 2024): installiert 4.19.0  ← Unterschiedliche Version!
```

**Mit Lockfile:**
```
package-lock.json: "express": { "version": "4.18.2", ... }

Entwickler A: installiert 4.18.2
Entwickler B: installiert 4.18.2  ← Identische Version!
```

**Best Practices:**
- ✅ `package-lock.json` IMMER in Git committen
- ✅ `npm ci` in CI/CD verwenden (nicht `npm install`)
- ❌ `package-lock.json` NIEMALS manuell editieren

```bash
# Für CI/CD: Saubere Installation aus Lockfile
npm ci

# Unterschied zu npm install:
# - npm install: Aktualisiert Lockfile wenn nötig
# - npm ci: Löscht node_modules, installiert EXAKT aus Lockfile
```

---

## 2.4 Alternativen: pnpm, yarn, bun

### yarn (Yet Another Resource Negotiator)

Von Facebook entwickelt, ursprünglich wegen Performance-Problemen mit npm:

```bash
# Installation
npm install -g yarn

# Oder via Corepack (empfohlen, ab Node 16.10)
corepack enable
corepack prepare yarn@stable --activate

# Verwendung
yarn init                    # npm init
yarn add express             # npm install express
yarn add -D jest             # npm install -D jest
yarn remove express          # npm uninstall express
yarn                         # npm install
yarn dev                     # npm run dev
```

**Vorteile:**
- Workspaces für Monorepos (npm hat das mittlerweile auch)
- Plug'n'Play (PnP) - keine node_modules! (optional)
- Bessere Offline-Unterstützung

**yarn.lock vs package-lock.json:**
```bash
# Nicht mischen! Entscheide dich für einen Manager
# Wenn yarn.lock existiert → yarn verwenden
# Wenn package-lock.json existiert → npm verwenden
```

### pnpm (Performant npm)

pnpm löst das größte Problem von npm: Speicherplatz.

```bash
# Installation
npm install -g pnpm

# Oder via Corepack
corepack enable
corepack prepare pnpm@latest --activate

# Verwendung (fast identisch zu npm)
pnpm init
pnpm add express
pnpm add -D jest
pnpm remove express
pnpm install
pnpm dev
```

**Das Geheimnis von pnpm - Content-addressable Storage:**

```
Traditionell (npm/yarn):
projekt-a/node_modules/lodash/   (4.5 MB)
projekt-b/node_modules/lodash/   (4.5 MB)
projekt-c/node_modules/lodash/   (4.5 MB)
                                 = 13.5 MB

Mit pnpm:
~/.pnpm-store/lodash-4.17.21/    (4.5 MB, einmalig!)
projekt-a/node_modules/lodash → Symlink
projekt-b/node_modules/lodash → Symlink
projekt-c/node_modules/lodash → Symlink
                                 = 4.5 MB total!
```

**pnpm-lock.yaml** statt package-lock.json.

### bun

bun ist ein All-in-One JavaScript Runtime/Bundler/Package Manager, geschrieben in Zig:

```bash
# Installation (macOS/Linux)
curl -fsSL https://bun.sh/install | bash

# Verwendung als Package Manager
bun init
bun add express
bun add -D jest
bun remove express
bun install

# Als Runtime (SCHNELL!)
bun run index.ts      # TypeScript ohne Kompilierung!
bun run dev           # Scripts aus package.json

# Als Test Runner
bun test
```

**Vorteile:**
- Extrem schnell (10-25x schneller als npm install)
- Native TypeScript-Unterstützung
- Eingebauter Bundler
- Kompatibel mit package.json und node_modules

**Nachteile:**
- Noch relativ jung (nicht 100% Node.js-kompatibel)
- Einige npm-Pakete funktionieren nicht

### Performance-Vergleich

```
Benchmark: npm install (clean, 500 dependencies)

npm     ████████████████████████████████████████  45.2s
yarn    ██████████████████████████████           32.1s
pnpm    ████████████████████                     18.7s
bun     ████                                      4.2s

Benchmark: Cached install

npm     █████████████████████                    22.3s
yarn    █████████████                            14.2s
pnpm    ████████                                  8.1s
bun     ██                                        1.8s
```

### Wann welches Tool?

| Situation | Empfehlung |
|-----------|------------|
| Neues Projekt, Standard-Setup | npm (Keine zusätzliche Installation) |
| Monorepo mit Workspaces | pnpm oder yarn |
| Viele Projekte, wenig Speicher | pnpm |
| Maximale Geschwindigkeit | bun |
| Enterprise, Stabilität | npm oder yarn |
| Legacy-Projekt | Das, was bereits verwendet wird |

---

## 2.5 Module-Systeme

### CommonJS (CJS) - Das Original

CommonJS war das erste Modulsystem für Node.js:

```javascript
// math.js - Modul exportieren
const PI = 3.14159;

function add(a, b) {
    return a + b;
}

function multiply(a, b) {
    return a * b;
}

// Einzelne Exports
module.exports.add = add;
module.exports.multiply = multiply;
module.exports.PI = PI;

// Oder alles auf einmal
module.exports = {
    add,
    multiply,
    PI
};

// Oder als Default
module.exports = add;
```

```javascript
// app.js - Modul importieren
const math = require('./math');
console.log(math.add(2, 3));        // 5
console.log(math.PI);               // 3.14159

// Destructuring
const { add, multiply } = require('./math');
console.log(add(2, 3));             // 5

// Node.js Built-ins
const fs = require('fs');
const path = require('path');

// npm Pakete
const express = require('express');
```

**Eigenschaften von CommonJS:**
- Synchrones Laden (blockierend)
- Dynamische Imports möglich (`require()` kann überall stehen)
- `module.exports` und `exports` sind Objekte
- Dateiendung: `.js` oder `.cjs`

### ECMAScript Modules (ESM) - Der Standard

ESM ist der offizielle JavaScript-Standard und wird seit Node.js 12 unterstützt:

```javascript
// math.mjs (oder .js mit "type": "module" in package.json)

// Named Exports
export const PI = 3.14159;

export function add(a, b) {
    return a + b;
}

export function multiply(a, b) {
    return a * b;
}

// Default Export
export default function subtract(a, b) {
    return a - b;
}
```

```javascript
// app.mjs - Importieren

// Named Imports
import { add, multiply, PI } from './math.mjs';
console.log(add(2, 3));

// Default Import
import subtract from './math.mjs';
console.log(subtract(5, 3));

// Alles importieren
import * as math from './math.mjs';
console.log(math.add(2, 3));
console.log(math.default(5, 3));  // Default export

// Node.js Built-ins (mit node: Prefix empfohlen)
import fs from 'node:fs';
import path from 'node:path';
import { readFile } from 'node:fs/promises';

// npm Pakete
import express from 'express';
```

**ESM aktivieren:**

```json
// package.json
{
  "type": "module"  // Alle .js Dateien sind ESM
}
```

Oder Dateiendungen verwenden:
- `.mjs` → Immer ESM
- `.cjs` → Immer CommonJS

### Vergleich CJS vs ESM

```javascript
// CommonJS - Dynamisch
const moduleName = './math';
const math = require(moduleName);  // Funktioniert!

if (condition) {
    const extra = require('./extra');  // Funktioniert!
}

// ESM - Statisch (Top-Level)
import { add } from './math.mjs';  // Muss am Anfang stehen!

// Dynamischer Import in ESM (async!)
const moduleName = './math.mjs';
const math = await import(moduleName);  // Gibt Promise zurück
```

| Aspekt | CommonJS | ESM |
|--------|----------|-----|
| Syntax | `require()`, `module.exports` | `import`, `export` |
| Laden | Synchron | Asynchron |
| Top-Level await | ❌ | ✅ |
| Tree Shaking | Schwierig | Einfach |
| Browser-Kompatibilität | ❌ (Bundler nötig) | ✅ (nativ) |
| `__dirname`, `__filename` | ✅ | ❌ (Workaround nötig) |
| JSON Import | ✅ `require('./data.json')` | ⚠️ Assertion nötig |

**ESM Workarounds für __dirname:**

```javascript
// CommonJS
console.log(__dirname);
console.log(__filename);

// ESM
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

**JSON Import in ESM:**

```javascript
// Node.js 18+
import data from './data.json' with { type: 'json' };

// Ältere Node.js Versionen
import { readFile } from 'node:fs/promises';
const data = JSON.parse(await readFile('./data.json', 'utf8'));

// Oder mit createRequire
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const data = require('./data.json');
```

### Wann was verwenden?

**ESM verwenden wenn:**
- Neues Projekt
- Frontend-Code (React, Vue, etc.)
- Moderne Node.js Version (18+)
- Tree Shaking wichtig ist
- Top-Level await benötigt wird

**CommonJS verwenden wenn:**
- Bestehendes Projekt mit CJS
- Abhängigkeiten nur CJS unterstützen
- Dynamisches Laden nötig ist
- Ältere Node.js Versionen (< 14)

**Empfehlung für 2024+:** ESM als Standard, außer bei Legacy-Projekten.

---

## 2.6 Globale vs lokale Pakete

### Lokale Pakete (Standard)

```bash
# Installation in node_modules des Projekts
npm install express

# Aufruf über npm scripts
# package.json:
{
  "scripts": {
    "start": "express-generator myapp"
  }
}
npm run start

# Oder über npx
npx express-generator myapp
```

### Globale Pakete

```bash
# Global installieren
npm install -g typescript

# Jetzt überall verfügbar
tsc --version

# Globale Pakete anzeigen
npm list -g --depth=0

# Global installierte Pakete Pfad
npm root -g
# /usr/local/lib/node_modules (macOS/Linux)
# C:\Users\<user>\AppData\Roaming\npm\node_modules (Windows)
```

**Wann global installieren?**

| Global installieren ✅ | Lokal installieren ✅ |
|------------------------|----------------------|
| CLI-Tools für alle Projekte | Projekt-spezifische Dependencies |
| `npm`, `pnpm`, `yarn` | `express`, `react`, `lodash` |
| `typescript` (optional) | `typescript` (empfohlen!) |
| `create-react-app` (veraltet!) | `jest`, `eslint` |

**Problem mit globalen Paketen:**
- Versionskonflikte zwischen Projekten
- Andere Entwickler haben evtl. andere Versionen
- CI/CD muss globale Pakete separat installieren

### npx - Execute npm Package Binaries

npx löst das Problem von globalen Paketen elegant:

```bash
# OHNE npx (global installieren)
npm install -g create-react-app
create-react-app my-app

# MIT npx (temporär ausführen)
npx create-react-app my-app

# npx sucht:
# 1. In node_modules/.bin (lokal)
# 2. Falls nicht gefunden: temporär herunterladen
```

**npx Use Cases:**

```bash
# Einmalige Ausführung (lädt herunter, führt aus, löscht)
npx create-react-app my-app
npx create-next-app my-app
npx degit user/repo my-project

# Lokale Binaries ausführen
npx jest --watch
npx eslint .
npx tsc --init

# Spezifische Version ausführen
npx typescript@4.9 --version
npx node@18 --version

# Pakete von anderen Registries
npx --registry https://npm.company.com internal-tool

# Mehrere Pakete
npx -p typescript -p ts-node ts-node script.ts
```

**npm exec (Alternative zu npx):**

```bash
# Äquivalent zu npx
npm exec -- create-react-app my-app
npm exec -- eslint .

# Unterschied: npm exec erwartet -- vor dem Befehl
```

---

## 2.7 Best Practices

### .npmrc - npm Konfiguration

Die `.npmrc` Datei konfiguriert npm auf verschiedenen Ebenen:

```bash
# Speicherorte (Priorität von hoch nach niedrig):
# 1. Projekt: /path/to/project/.npmrc
# 2. User: ~/.npmrc
# 3. Global: $PREFIX/etc/npmrc
# 4. Built-in: /path/to/npm/npmrc
```

**Projekt .npmrc (committen!):**

```ini
# Registry konfigurieren
registry=https://registry.npmjs.org/

# Für private Packages
@mycompany:registry=https://npm.mycompany.com/

# Engine-Checks erzwingen
engine-strict=true

# Exakte Versionen speichern (ohne ^)
save-exact=true

# package-lock.json immer erstellen
package-lock=true

# Audit bei install
audit=true

# Progress-Bar ausschalten (für CI)
progress=false
```

**User ~/.npmrc (NICHT committen!):**

```ini
# Auth Token für private Registry
//npm.mycompany.com/:_authToken=${NPM_TOKEN}

# npm Account
//registry.npmjs.org/:_authToken=npm_xxxxxxxxxxxx

# Init Defaults
init-author-name=Max Mustermann
init-author-email=max@example.com
init-license=MIT
init-version=0.1.0
```

### Sicherheit mit npm audit

```bash
# Sicherheitslücken prüfen
npm audit

# Beispiel-Output:
# found 5 vulnerabilities (2 low, 2 moderate, 1 high)
#   run `npm audit fix` to fix them

# Automatisch beheben (nur Semver-kompatible Updates)
npm audit fix

# Auch Breaking Changes erlauben (VORSICHT!)
npm audit fix --force

# Nur Produktions-Dependencies prüfen
npm audit --production

# JSON Output für CI
npm audit --json

# Details zu einer Vulnerability
npm audit --audit-level=high
```

**In CI/CD Pipeline:**

```yaml
# GitHub Actions Beispiel
- name: Security Audit
  run: npm audit --audit-level=moderate
  # Schlägt fehl bei moderate oder higher
```

### Semantic Versioning verstehen

Semantic Versioning (SemVer) ist das Versionierungsschema für npm:

```
MAJOR.MINOR.PATCH
  │     │     │
  │     │     └── Bug Fixes (abwärtskompatibel)
  │     └──────── Neue Features (abwärtskompatibel)
  └────────────── Breaking Changes (NICHT abwärtskompatibel)

Beispiel: 4.18.2
         │  │  │
         │  │  └── Patch: Bug Fix
         │  └───── Minor: Neues Feature hinzugefügt
         └──────── Major: API-Änderung (Breaking!)
```

**Version Ranges in package.json:**

```json
{
  "dependencies": {
    // Exakte Version
    "lodash": "4.17.21",

    // Caret ^ (Standard bei npm install)
    // Erlaubt MINOR und PATCH Updates
    "express": "^4.18.2",
    // Installiert: >=4.18.2 <5.0.0
    // Also: 4.18.3, 4.19.0, aber NICHT 5.0.0

    // Tilde ~
    // Erlaubt nur PATCH Updates
    "axios": "~1.6.0",
    // Installiert: >=1.6.0 <1.7.0
    // Also: 1.6.1, 1.6.2, aber NICHT 1.7.0

    // Größer/Kleiner
    "node-fetch": ">=3.0.0",
    "old-package": "<2.0.0",

    // Bereich
    "some-lib": ">=1.0.0 <2.0.0",

    // Wildcard
    "other-lib": "*",        // Jede Version (GEFÄHRLICH!)
    "another": "1.x",        // 1.0.0 - 1.999.999
    "yet-another": "1.2.x",  // 1.2.0 - 1.2.999

    // Pre-Release
    "beta-lib": "^2.0.0-beta.1",

    // Git
    "private-lib": "git+https://github.com/user/repo.git#v1.0.0",

    // Lokaler Pfad
    "local-lib": "file:../my-local-lib"
  }
}
```

**Best Practice für Versionen:**

```json
{
  "dependencies": {
    // Produktion: Caret für Flexibilität, aber regelmäßig updaten
    "express": "^4.18.2"
  },
  "devDependencies": {
    // Dev: Caret ist OK, weniger kritisch
    "jest": "^29.7.0"
  },
  "optionalDependencies": {
    // Optional: Tilde für Stabilität
    "fsevents": "~2.3.3"
  }
}
```

### Weitere Best Practices

**1. .gitignore richtig konfigurieren:**

```gitignore
# Dependencies
node_modules/

# Build Output
dist/
build/

# Logs
*.log
npm-debug.log*

# Environment
.env
.env.local
.env.*.local

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Test Coverage
coverage/

# Cache
.npm/
.eslintcache
```

**2. engines Feld nutzen:**

```json
{
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
```

```bash
# Engine-Check erzwingen
# .npmrc
engine-strict=true
```

**3. scripts für Konsistenz:**

```json
{
  "scripts": {
    "prepare": "husky install",
    "precommit": "lint-staged",
    "prepush": "npm test"
  }
}
```

**4. overrides für Dependency-Fixes:**

```json
{
  "overrides": {
    "vulnerable-package": "^2.0.0",
    "package-with-bad-dep": {
      "bad-dep": "^1.5.0"
    }
  }
}
```

---

## 2.8 Hands-On: Projekt von Null aufsetzen

Lass uns ein komplettes Node.js-Projekt von Grund auf aufsetzen. Wir erstellen eine kleine Express-API.

### Schritt 1: Verzeichnis und Git

```bash
# Projektverzeichnis erstellen
mkdir meine-api
cd meine-api

# Git initialisieren
git init

# .gitignore erstellen
cat > .gitignore << 'EOF'
node_modules/
dist/
.env
.env.local
*.log
.DS_Store
coverage/
EOF
```

### Schritt 2: Node Version festlegen

```bash
# Node Version für das Projekt festlegen
echo "20" > .nvmrc

# Version aktivieren (falls nvm installiert)
nvm use

# Verifizieren
node --version
```

### Schritt 3: npm initialisieren

```bash
# Interaktiv (beantworte die Fragen)
npm init

# Oder mit Defaults
npm init -y
```

**Resultierende package.json anpassen:**

```json
{
  "name": "meine-api",
  "version": "0.1.0",
  "description": "Eine beispielhafte REST API",
  "main": "dist/index.js",
  "type": "module",
  "scripts": {
    "start": "node dist/index.js",
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix",
    "format": "prettier --write \"src/**/*.ts\"",
    "typecheck": "tsc --noEmit"
  },
  "keywords": ["api", "express", "typescript"],
  "author": "Dein Name",
  "license": "MIT",
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### Schritt 4: TypeScript einrichten

```bash
# TypeScript und Typen installieren
npm install -D typescript @types/node

# tsconfig.json erstellen
npx tsc --init
```

**tsconfig.json anpassen:**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Schritt 5: Produktions-Dependencies

```bash
# Express Framework
npm install express

# TypeScript-Typen für Express
npm install -D @types/express

# Weitere nützliche Pakete
npm install cors helmet dotenv
npm install -D @types/cors
```

### Schritt 6: Entwicklungs-Tools

```bash
# tsx - TypeScript ausführen ohne Kompilierung
npm install -D tsx

# ESLint
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin

# Prettier
npm install -D prettier eslint-config-prettier

# Vitest für Testing
npm install -D vitest @vitest/coverage-v8
```

### Schritt 7: ESLint konfigurieren

**eslint.config.js erstellen:**

```javascript
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'warn',
    },
  },
  {
    ignores: ['dist/', 'node_modules/', 'coverage/'],
  }
);
```

### Schritt 8: Prettier konfigurieren

**.prettierrc erstellen:**

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

**.prettierignore:**

```
dist/
node_modules/
coverage/
*.md
```

### Schritt 9: Projektstruktur erstellen

```bash
# Verzeichnisse erstellen
mkdir -p src/{routes,middleware,types}
mkdir -p tests
```

**src/index.ts:**

```typescript
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// Environment Variables laden
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health Check Route
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes
app.get('/api/hello', (_req: Request, res: Response) => {
  res.json({ message: 'Hallo von der API!' });
});

app.get('/api/users/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  res.json({
    id,
    name: `User ${id}`,
    email: `user${id}@example.com`,
  });
});

// 404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not Found' });
});

// Server starten
app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
  console.log(`Health Check: http://localhost:${PORT}/health`);
});

export default app;
```

### Schritt 10: Environment Variables

**.env.example erstellen (committen!):**

```env
# Server
PORT=3000
NODE_ENV=development

# Database (Beispiel)
DATABASE_URL=postgresql://user:password@localhost:5432/mydb

# Secrets (NIE committen!)
JWT_SECRET=your-secret-here
```

**.env erstellen (NICHT committen!):**

```bash
cp .env.example .env
# Dann .env mit echten Werten füllen
```

### Schritt 11: Tests schreiben

**vitest.config.ts:**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
});
```

**tests/api.test.ts:**

```typescript
import { describe, it, expect } from 'vitest';

describe('API Tests', () => {
  it('sollte 1 + 1 = 2 berechnen', () => {
    expect(1 + 1).toBe(2);
  });

  it('sollte Strings vergleichen', () => {
    expect('hello').toMatch(/ell/);
  });
});
```

### Schritt 12: npm Scripts testen

```bash
# Entwicklungsserver starten (mit Hot Reload)
npm run dev

# In neuem Terminal:
curl http://localhost:3000/health
curl http://localhost:3000/api/hello
curl http://localhost:3000/api/users/42

# Linting
npm run lint
npm run lint:fix

# Formatierung
npm run format

# Type Check
npm run typecheck

# Tests
npm test
npm run test:coverage

# Build für Produktion
npm run build

# Produktion starten
npm start
```

### Finale Projektstruktur

```
meine-api/
├── .env                    # Lokale Environment Variables (nicht committen!)
├── .env.example            # Vorlage für .env
├── .gitignore
├── .nvmrc                  # Node Version
├── .prettierrc             # Prettier Config
├── .prettierignore
├── eslint.config.js        # ESLint Config
├── package.json
├── package-lock.json       # Lockfile (committen!)
├── tsconfig.json           # TypeScript Config
├── vitest.config.ts        # Test Config
├── src/
│   ├── index.ts            # Entry Point
│   ├── routes/             # Route Handler
│   ├── middleware/         # Custom Middleware
│   └── types/              # TypeScript Types
├── tests/
│   └── api.test.ts
└── dist/                   # Build Output (nicht committen!)
```

### Zusammenfassung der Befehle

```bash
# Tägliche Entwicklung
npm run dev          # Entwicklungsserver mit Hot Reload
npm test             # Tests ausführen
npm run lint         # Code prüfen
npm run typecheck    # TypeScript prüfen

# Vor dem Commit
npm run lint:fix     # Automatisch fixen
npm run format       # Formatieren
npm test             # Tests laufen lassen

# Deployment
npm run build        # TypeScript kompilieren
npm start            # Produktion starten
npm ci               # Clean Install (CI/CD)
```

---

## Zusammenfassung

In diesem Kapitel hast du gelernt:

1. **Node.js Grundlagen:** V8 Engine, Event Loop, Non-blocking I/O - und wie sich das von .NET unterscheidet

2. **Versionsmanagement:** Mit nvm oder fnm mehrere Node-Versionen verwalten

3. **npm im Detail:** package.json, Dependencies, Scripts und die Bedeutung der package-lock.json

4. **Alternativen:** Wann pnpm, yarn oder bun sinnvoll sind

5. **Module-Systeme:** CommonJS vs ESM und wann welches verwenden

6. **npx:** Pakete ohne globale Installation ausführen

7. **Best Practices:** Sicherheit, Versionierung, Konfiguration

8. **Hands-On:** Ein komplettes Projekt von Grund auf aufsetzen

Im nächsten Kapitel werden wir uns mit TypeScript beschäftigen - dem fehlenden Typsystem für JavaScript, das dir als C#-Entwickler sehr vertraut vorkommen wird.
