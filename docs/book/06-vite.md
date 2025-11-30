# Kapitel 6: Vite - Der moderne Build-Tool-Champion

Als .NET-Entwickler kennst du MSBuild in- und auswendig. Du weißt, wie die `.csproj`-Datei funktioniert, wie der Build-Prozess von Compilation über Linking bis zum fertigen Assembly abläuft. In der JavaScript-Welt gibt es ein Äquivalent - und Vite ist dessen modernste Inkarnation.

In diesem Kapitel wirst du verstehen, warum Vite die Frontend-Entwicklung revolutioniert hat und wie du es optimal für dein HausTracker-Projekt einsetzt.

---

## 6.1 Was ist ein Build-Tool?

### Die Grundlagen: Bundling, Transpiling, Minification

In der .NET-Welt kompiliert der C#-Compiler deinen Code zu IL (Intermediate Language), und die CLR führt ihn aus. Browser verstehen aber kein TypeScript, kein JSX und keine ES2024-Features auf älteren Geräten. Hier kommen Build-Tools ins Spiel.

**Die drei Kernaufgaben:**

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BUILD-TOOL PIPELINE                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐         │
│   │  TRANSPILING │ -> │   BUNDLING   │ -> │ MINIFICATION │         │
│   └──────────────┘    └──────────────┘    └──────────────┘         │
│                                                                     │
│   TypeScript → JS      Viele Dateien      Whitespace weg           │
│   JSX → JS             → Eine/Wenige      Variablen kürzen         │
│   ES2024 → ES5         Tree Shaking       Dead Code weg            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Transpiling** (Vergleich mit .NET):
```
.NET:                           JavaScript:
C# 12 → IL                      TypeScript → JavaScript
Roslyn Compiler                 tsc / esbuild / swc

// C# (kompiliert zu IL)        // TypeScript (transpiliert zu JS)
var x = 5;                      const x: number = 5;
       ↓                               ↓
IL_0001: ldc.i4.5               var x = 5;
```

**Bundling** - Das Zusammenführen:
```
Ohne Bundling (100 HTTP-Requests):     Mit Bundling (3 Requests):
├── utils/format.js                     ├── vendor.js (React, etc.)
├── utils/validate.js                   ├── app.js (Dein Code)
├── components/Button.js                └── styles.css
├── components/Input.js
├── components/Modal.js
├── hooks/useAuth.js
├── ... (95 weitere Dateien)
```

**Minification** - Kleiner = Schneller:
```javascript
// Vorher (1.2 KB)
function calculateTotalCost(readings, pricePerUnit) {
  const totalUnits = readings.reduce((sum, reading) => {
    return sum + reading.value;
  }, 0);
  return totalUnits * pricePerUnit;
}

// Nachher (89 Bytes)
function c(r,p){return r.reduce((s,e)=>s+e.value,0)*p}
```

### Geschichte: Von Grunt zu Vite

Die Evolution der JavaScript-Build-Tools ähnelt der Entwicklung von NAnt über MSBuild zu den modernen .NET CLI Tools:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    EVOLUTION DER BUILD-TOOLS                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  2012        2014         2015          2020                        │
│   │           │            │             │                          │
│   ▼           ▼            ▼             ▼                          │
│ ┌─────┐    ┌─────┐    ┌─────────┐    ┌─────┐                       │
│ │Grunt│ -> │Gulp │ -> │ Webpack │ -> │Vite │                       │
│ └─────┘    └─────┘    └─────────┘    └─────┘                       │
│                                                                     │
│ Task-       Stream-    Dependency    Native ESM                     │
│ basiert     basiert    Graph         Dev Server                     │
│                                                                     │
│ Konfigu-    Schneller  Mächtig aber  Blitzschnell                  │
│ rations-    durch      komplex       und einfach                    │
│ hölle       Pipes                                                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Grunt (2012)** - Der Pionier:
```javascript
// Gruntfile.js - Task-basierte Konfiguration
grunt.initConfig({
  uglify: {
    build: {
      src: 'src/*.js',
      dest: 'dist/app.min.js'
    }
  }
});
// Problem: Langsam, viel I/O, komplexe Konfiguration
```

**Gulp (2014)** - Streams statt Dateien:
```javascript
// gulpfile.js - Pipe-basierte Verarbeitung
gulp.src('src/*.js')
    .pipe(babel())
    .pipe(uglify())
    .pipe(gulp.dest('dist'));
// Besser, aber immer noch manuell orchestriert
```

**Webpack (2015)** - Der Gamechanger:
```javascript
// webpack.config.js - Dependency Graph
module.exports = {
  entry: './src/index.js',
  output: { filename: 'bundle.js' },
  module: {
    rules: [
      { test: /\.js$/, use: 'babel-loader' },
      { test: /\.css$/, use: ['style-loader', 'css-loader'] }
    ]
  }
};
// Mächtig, aber: Konfigurationsmonster, langsamer Dev-Start
```

**Vite (2020)** - Die Revolution:
```typescript
// vite.config.ts - Minimal und schnell
export default defineConfig({
  plugins: [react()]
});
// Das war's. Ernsthaft.
```

---

## 6.2 Warum Vite?

### Native ESM im Dev-Server - Der Kernunterschied

Der fundamentale Unterschied zwischen Webpack und Vite liegt im Development-Server:

```
┌─────────────────────────────────────────────────────────────────────┐
│                  WEBPACK VS VITE: DEV SERVER                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  WEBPACK (Bundle-basiert):                                          │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │                                                         │       │
│  │   src/           Bundle              Browser            │       │
│  │   ┌───┐         ┌───────┐           ┌───────┐          │       │
│  │   │ A │──┐      │       │           │       │          │       │
│  │   ├───┤  │      │ ALL   │    GET    │       │          │       │
│  │   │ B │──┼───>  │ CODE  │ ───────>  │ Load  │          │       │
│  │   ├───┤  │      │ IN    │  bundle   │       │          │       │
│  │   │ C │──┘      │ ONE   │  .js      │       │          │       │
│  │   └───┘         └───────┘           └───────┘          │       │
│  │                                                         │       │
│  │   Erst bundlen, DANN starten                            │       │
│  │   Startup: 30-60 Sekunden bei großen Projekten          │       │
│  │                                                         │       │
│  └─────────────────────────────────────────────────────────┘       │
│                                                                     │
│  VITE (Native ESM):                                                 │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │                                                         │       │
│  │   src/              Server            Browser           │       │
│  │   ┌───┐            ┌───────┐         ┌───────┐         │       │
│  │   │ A │◄───────────│       │◄────────│import │         │       │
│  │   ├───┤  on-demand │ Vite  │  GET    │  A    │         │       │
│  │   │ B │◄───────────│ Dev   │◄────────│import │         │       │
│  │   ├───┤  transform │Server │  /A.js  │  B    │         │       │
│  │   │ C │ (nur wenn  │       │         │       │         │       │
│  │   └───┘  gebraucht)└───────┘         └───────┘         │       │
│  │                                                         │       │
│  │   Sofort starten, on-demand transformieren              │       │
│  │   Startup: < 1 Sekunde (unabhängig von Projektgröße)    │       │
│  │                                                         │       │
│  └─────────────────────────────────────────────────────────┘       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Der Trick:** Moderne Browser unterstützen ES Modules nativ:

```html
<!-- Browser versteht das direkt! -->
<script type="module">
  import { helper } from './utils.js';  // Browser macht den Request
</script>
```

Vite nutzt das aus und transformiert nur die Dateien, die der Browser tatsächlich anfragt.

### Blitzschneller Start - Zahlen, die überzeugen

```
┌─────────────────────────────────────────────────────────────────────┐
│                    STARTUP-ZEIT VERGLEICH                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Projekt mit 1000+ Modulen:                                         │
│                                                                     │
│  Webpack:  ████████████████████████████████████████  45s            │
│  Vite:     ██                                         0.8s          │
│                                                                     │
│  HMR (Hot Module Replacement):                                      │
│                                                                     │
│  Webpack:  ████████████████                          3-5s           │
│  Vite:     █                                         <50ms          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Warum so schnell?**

1. **Kein initiales Bundling** - Der Server startet sofort
2. **esbuild für Transforms** - 10-100x schneller als Babel/tsc
3. **Pre-Bundling von Dependencies** - node_modules nur einmal
4. **Native ESM** - Browser übernimmt das Module-Loading

### HMR (Hot Module Replacement) erklärt

HMR ist wie "Edit and Continue" in Visual Studio - aber besser:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    HOT MODULE REPLACEMENT                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  OHNE HMR (Full Reload):                                            │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │  1. Datei speichern                                     │       │
│  │  2. Browser: Komplette Seite neu laden                  │       │
│  │  3. React: Alle Komponenten neu mounten                 │       │
│  │  4. State verloren (Formulareingaben, Scroll, etc.)     │       │
│  │  5. Zeit: 2-5 Sekunden                                  │       │
│  └─────────────────────────────────────────────────────────┘       │
│                                                                     │
│  MIT HMR (Vite):                                                    │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │  1. Datei speichern                                     │       │
│  │  2. Vite: WebSocket-Nachricht an Browser                │       │
│  │  3. Browser: NUR geänderte Module ersetzen              │       │
│  │  4. React: NUR betroffene Komponenten re-rendern        │       │
│  │  5. State bleibt erhalten!                              │       │
│  │  6. Zeit: < 50ms                                        │       │
│  └─────────────────────────────────────────────────────────┘       │
│                                                                     │
│  WebSocket-Kommunikation:                                           │
│  ┌────────┐         ┌────────┐                                     │
│  │  Vite  │ ──────> │Browser │                                     │
│  │ Server │ ws://   │  HMR   │                                     │
│  └────────┘         │ Client │                                     │
│      │              └────────┘                                     │
│      │  { type: 'update',                                          │
│      │    path: '/src/components/Button.tsx',                      │
│      │    timestamp: 1699123456 }                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Praktisches Beispiel:**
```typescript
// Du arbeitest an einem Formular, hast Daten eingegeben
// und änderst jetzt den Button-Stil:

// Button.tsx - Zeile 15
- className="bg-blue-500"
+ className="bg-orange-500"

// HMR-Ergebnis:
// ✓ Button ist jetzt orange
// ✓ Formulardaten noch da
// ✓ Scroll-Position erhalten
// ✓ Alles in 30ms
```

### Vite vs Webpack Architektur - Das große Bild

```
┌─────────────────────────────────────────────────────────────────────┐
│                 ARCHITEKTUR-VERGLEICH                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  WEBPACK ARCHITEKTUR:                                               │
│  ════════════════════                                               │
│                                                                     │
│  ┌──────────────────────────────────────────────────────┐          │
│  │                    WEBPACK                            │          │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐ │          │
│  │  │ Loader  │  │ Loader  │  │ Plugin  │  │ Plugin  │ │          │
│  │  │ (babel) │  │  (css)  │  │(terser) │  │ (html)  │ │          │
│  │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘ │          │
│  │       │            │            │            │       │          │
│  │       └────────────┴─────┬──────┴────────────┘       │          │
│  │                          │                           │          │
│  │                    ┌─────▼─────┐                     │          │
│  │                    │ Bundling  │                     │          │
│  │                    │  Engine   │                     │          │
│  │                    └─────┬─────┘                     │          │
│  │                          │                           │          │
│  │                    ┌─────▼─────┐                     │          │
│  │                    │  Bundle   │                     │          │
│  │                    └───────────┘                     │          │
│  └──────────────────────────────────────────────────────┘          │
│                                                                     │
│  VITE ARCHITEKTUR:                                                  │
│  ═════════════════                                                  │
│                                                                     │
│  Development:                      Production:                      │
│  ┌────────────────────┐           ┌────────────────────┐           │
│  │                    │           │                    │           │
│  │  ┌──────────────┐  │           │  ┌──────────────┐  │           │
│  │  │   esbuild    │  │           │  │    Rollup    │  │           │
│  │  │  (Transform) │  │           │  │  (Bundling)  │  │           │
│  │  └──────┬───────┘  │           │  └──────┬───────┘  │           │
│  │         │          │           │         │          │           │
│  │  ┌──────▼───────┐  │           │  ┌──────▼───────┐  │           │
│  │  │ Native ESM   │  │           │  │  Optimized   │  │           │
│  │  │  Dev Server  │  │           │  │   Bundles    │  │           │
│  │  └──────────────┘  │           │  └──────────────┘  │           │
│  │                    │           │                    │           │
│  │  Schnell starten   │           │  Optimiert für     │           │
│  │  On-demand         │           │  Production        │           │
│  │                    │           │                    │           │
│  └────────────────────┘           └────────────────────┘           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6.3 Vite Konfiguration

### Die vite.config.ts im Detail

Die Konfigurationsdatei ist das Herzstück. Verglichen mit einer `.csproj` ist sie erfrischend kurz:

```typescript
// vite.config.ts - Grundstruktur
import { defineConfig } from 'vite'

export default defineConfig({
  // Alles optional! Vite hat sinnvolle Defaults
})
```

**defineConfig** ist ein Helfer für TypeScript-Autocomplete - ohne funktioniert es genauso.

### Die wichtigsten Konfigurationsoptionen

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  // ═══════════════════════════════════════════════════════════════
  // ROOT & BASE
  // ═══════════════════════════════════════════════════════════════

  root: './',              // Projekt-Root (wo index.html liegt)
  base: '/',               // Base-URL für Production
                           // Bei Subdirectory-Deploy: '/app/'

  // ═══════════════════════════════════════════════════════════════
  // PLUGINS
  // ═══════════════════════════════════════════════════════════════

  plugins: [
    react(),               // React-Unterstützung (JSX, Fast Refresh)
    // Weitere Plugins hier
  ],

  // ═══════════════════════════════════════════════════════════════
  // RESOLVE - Aliase und Erweiterungen
  // ═══════════════════════════════════════════════════════════════

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),      // @/components
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
    },
    extensions: ['.ts', '.tsx', '.js', '.jsx'],   // Standard, selten ändern
  },

  // ═══════════════════════════════════════════════════════════════
  // SERVER - Dev-Server Konfiguration
  // ═══════════════════════════════════════════════════════════════

  server: {
    port: 5173,            // Dev-Server Port
    strictPort: false,     // Bei Port belegt: nächsten freien nehmen
    host: true,            // Auch von anderen Geräten erreichbar
    open: true,            // Browser automatisch öffnen

    proxy: {               // API Proxy (später mehr)
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // BUILD - Production Build Konfiguration
  // ═══════════════════════════════════════════════════════════════

  build: {
    outDir: 'dist',        // Output-Verzeichnis
    sourcemap: true,       // Source Maps für Debugging
    minify: 'esbuild',     // 'esbuild' (schnell) oder 'terser' (kleiner)
    target: 'es2020',      // Ziel-Browser

    rollupOptions: {       // Rollup-spezifische Optionen
      output: {
        manualChunks: {    // Code Splitting Kontrolle
          vendor: ['react', 'react-dom'],
        }
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // CSS
  // ═══════════════════════════════════════════════════════════════

  css: {
    modules: {
      localsConvention: 'camelCase',  // CSS Module Klassennamen
    },
    postcss: './postcss.config.js',   // PostCSS Konfiguration
  },

  // ═══════════════════════════════════════════════════════════════
  // DEFINE - Compile-Time Konstanten
  // ═══════════════════════════════════════════════════════════════

  define: {
    __APP_VERSION__: JSON.stringify('1.0.0'),
  },
})
```

### Plugins - Das Ökosystem

Plugins erweitern Vites Funktionalität. Hier die wichtigsten:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'           // React Support
import { VitePWA } from 'vite-plugin-pwa'         // PWA Support
import basicSsl from '@vitejs/plugin-basic-ssl'   // HTTPS im Dev
import svgr from 'vite-plugin-svgr'               // SVG als React-Komponente

export default defineConfig({
  plugins: [
    // ─────────────────────────────────────────────────────────────
    // React Plugin - MUSS für React-Projekte
    // ─────────────────────────────────────────────────────────────
    react({
      // Babel-Plugins wenn nötig (selten)
      babel: {
        plugins: [
          // ['@emotion/babel-plugin']
        ]
      }
    }),

    // ─────────────────────────────────────────────────────────────
    // PWA Plugin - Progressive Web App
    // ─────────────────────────────────────────────────────────────
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Meine App',
        short_name: 'App',
        // ... mehr Manifest-Optionen
      }
    }),

    // ─────────────────────────────────────────────────────────────
    // SSL Plugin - HTTPS für Camera API etc.
    // ─────────────────────────────────────────────────────────────
    basicSsl(),  // Generiert selbstsigniertes Zertifikat

    // ─────────────────────────────────────────────────────────────
    // SVGR - SVGs als React-Komponenten
    // ─────────────────────────────────────────────────────────────
    svgr({
      svgrOptions: {
        icon: true,
      }
    }),
  ]
})
```

### Aliase - Saubere Imports

Ohne Aliase wird es schnell hässlich:

```typescript
// OHNE Aliase - Relative Import-Hölle
import { Button } from '../../../components/ui/Button';
import { useAuth } from '../../../../hooks/useAuth';
import { formatDate } from '../../../utils/format';

// MIT Aliase - Sauber und klar
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/utils/format';
```

**Konfiguration:**
```typescript
// vite.config.ts
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  }
}

// tsconfig.json - WICHTIG: Auch hier definieren!
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

## 6.4 Development vs Production

### Dev: esbuild für Speed

Im Development nutzt Vite **esbuild** für Transformationen:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ESBUILD PERFORMANCE                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Benchmark: 1000 TypeScript-Dateien transformieren                  │
│                                                                     │
│  esbuild (Go):    ██                                    0.4s        │
│  swc (Rust):      ████                                  0.8s        │
│  Babel (JS):      ████████████████████████████████████  38s         │
│  tsc (TS):        ████████████████████████████████████████████ 45s  │
│                                                                     │
│  esbuild ist 10-100x schneller als JavaScript-basierte Tools!       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Warum so schnell?**
- In Go geschrieben (compiled, nicht interpreted)
- Parallelisiert über alle CPU-Kerne
- Nutzt keine AST-Transformationen wo möglich
- Zero-Copy Parsing

### Prod: Rollup für optimierte Bundles

Für Production wechselt Vite zu **Rollup**:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DEVELOPMENT VS PRODUCTION                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  DEVELOPMENT (esbuild):           PRODUCTION (Rollup):              │
│  ┌─────────────────────┐         ┌─────────────────────┐           │
│  │ • Schnelle Trans-   │         │ • Tree Shaking      │           │
│  │   formation         │         │ • Code Splitting    │           │
│  │ • Keine Optimierung │         │ • Minification      │           │
│  │ • Source Maps       │         │ • Asset Handling    │           │
│  │ • HMR               │         │ • CSS Extraction    │           │
│  │                     │         │ • Chunk Hashing     │           │
│  │ Ziel: Schnelligkeit │         │ Ziel: Kleine Bundle │           │
│  └─────────────────────┘         └─────────────────────┘           │
│                                                                     │
│  npm run dev                      npm run build                     │
│       │                                │                            │
│       ▼                                ▼                            │
│  ┌─────────┐                     ┌─────────┐                       │
│  │ esbuild │                     │ Rollup  │                       │
│  │ Server  │                     │ Bundle  │                       │
│  └─────────┘                     └─────────┘                       │
│                                        │                            │
│                                        ▼                            │
│                                  dist/                              │
│                                  ├── index.html                     │
│                                  ├── assets/                        │
│                                  │   ├── index-a1b2c3.js           │
│                                  │   ├── vendor-d4e5f6.js          │
│                                  │   └── index-g7h8i9.css          │
│                                  └── favicon.ico                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Warum zwei Tools?**

- **esbuild**: Extrem schnell, aber weniger Features für Production-Optimierung
- **Rollup**: Ausgereifte Optimierungen, riesiges Plugin-Ökosystem

Das Beste beider Welten!

---

## 6.5 Umgebungsvariablen

### Die .env-Dateien

Wie `appsettings.json` und `appsettings.Development.json` in .NET:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ENVIRONMENT FILES                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  .NET:                            Vite:                             │
│  ├── appsettings.json             ├── .env                          │
│  ├── appsettings.Development.json ├── .env.development              │
│  ├── appsettings.Production.json  ├── .env.production               │
│  └── appsettings.local.json       └── .env.local                    │
│                                                                     │
│  Lade-Reihenfolge (später überschreibt früher):                     │
│                                                                     │
│  1. .env                    # Immer geladen                         │
│  2. .env.local              # Lokal, nicht committen                │
│  3. .env.[mode]             # z.B. .env.production                  │
│  4. .env.[mode].local       # z.B. .env.production.local            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Beispiel-Setup:**

```bash
# .env - Basis-Konfiguration (in Git)
VITE_APP_NAME=HausTracker
VITE_API_TIMEOUT=5000

# .env.local - Lokale Overrides (NICHT in Git!)
VITE_API_URL=http://localhost:3001

# .env.production - Production-Werte (in Git)
VITE_API_URL=https://api.haustracker.de

# .env.development - Development-Werte (in Git)
VITE_API_URL=http://localhost:3001
VITE_DEBUG=true
```

### Der VITE_ Prefix - Sicherheitsfeature

**WICHTIG:** Nur Variablen mit `VITE_`-Prefix werden im Client-Code verfügbar!

```bash
# .env
VITE_PUBLIC_KEY=pk_live_123      # ✓ Im Browser verfügbar
DATABASE_URL=postgres://...       # ✗ NUR serverseitig
SECRET_API_KEY=sk_live_456        # ✗ NUR serverseitig
```

Das ist ein Sicherheitsfeature! Ohne Prefix werden sensible Daten nicht versehentlich im Bundle landen.

### import.meta.env - Zugriff im Code

```typescript
// Zugriff auf Umgebungsvariablen
console.log(import.meta.env.VITE_API_URL);
console.log(import.meta.env.VITE_APP_NAME);

// Eingebaute Variablen:
import.meta.env.MODE        // 'development' oder 'production'
import.meta.env.DEV         // true im Dev-Mode
import.meta.env.PROD        // true im Prod-Mode
import.meta.env.BASE_URL    // Base-URL der App

// TypeScript-Typen für eigene Variablen:
// src/vite-env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_APP_NAME: string
  readonly VITE_DEBUG?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

**Praktisches Beispiel:**

```typescript
// src/config.ts
export const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  appName: import.meta.env.VITE_APP_NAME || 'MyApp',
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
} as const;

// Verwendung
import { config } from '@/config';

fetch(`${config.apiUrl}/api/readings`);
```

---

## 6.6 Statische Assets

### Der public/ Ordner

Dateien in `public/` werden 1:1 kopiert, ohne Processing:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PUBLIC ORDNER                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Projektstruktur:                 Nach Build:                       │
│  ├── public/                      dist/                             │
│  │   ├── favicon.ico         =>   ├── favicon.ico                   │
│  │   ├── robots.txt          =>   ├── robots.txt                    │
│  │   ├── icon.svg            =>   ├── icon.svg                      │
│  │   └── manifest.json       =>   └── manifest.json                 │
│  └── src/                         └── assets/                       │
│      └── ...                          └── index-abc123.js           │
│                                                                     │
│  Zugriff: Absoluter Pfad vom Root                                   │
│  <img src="/icon.svg" />  ✓                                         │
│  <img src="icon.svg" />   ✗ (relativ, funktioniert nicht)          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Wann public/ verwenden:**

- Dateien, die nicht verarbeitet werden sollen
- Dateien, die unter exaktem Namen verfügbar sein müssen
- robots.txt, favicon.ico, manifest.json
- Große Dateien, die nicht gehasht werden sollen

### Import von Assets (mit Processing)

Assets im `src/`-Ordner werden verarbeitet und gehasht:

```typescript
// Bild importieren - wird gehasht und optimiert
import logo from './assets/logo.png';
// logo = '/assets/logo-a1b2c3d4.png'

function Header() {
  return <img src={logo} alt="Logo" />;
}

// SVG als React-Komponente (mit vite-plugin-svgr)
import { ReactComponent as Icon } from './assets/icon.svg';

function Button() {
  return <button><Icon /> Klick mich</button>;
}

// SVG als URL
import iconUrl from './assets/icon.svg';
// iconUrl = '/assets/icon-e5f6g7h8.svg'

// CSS importieren (wird gebundelt)
import './styles/main.css';

// JSON importieren (direkt als Objekt)
import data from './data/config.json';
console.log(data.someProperty);
```

**Vorteile des Asset-Imports:**

1. **Cache-Busting**: Hash im Dateinamen ändert sich bei Änderungen
2. **Tree Shaking**: Unbenutzte Assets werden nicht gebundelt
3. **Optimierung**: Bilder können komprimiert werden
4. **Typ-Sicherheit**: TypeScript weiß über die Assets Bescheid

---

## 6.7 CSS Handling

### PostCSS - Der CSS-Prozessor

PostCSS transformiert CSS mit Plugins:

```javascript
// postcss.config.js
export default {
  plugins: {
    'tailwindcss': {},           // Tailwind CSS
    'autoprefixer': {},          // Vendor Prefixes automatisch
    'postcss-nested': {},        // Sass-like Nesting
  }
}
```

### CSS Modules - Scoped Styles

CSS Modules isolieren Styles pro Komponente:

```css
/* Button.module.css */
.button {
  background: blue;
  padding: 10px;
}

.primary {
  background: orange;
}
```

```typescript
// Button.tsx
import styles from './Button.module.css';

function Button({ primary }: { primary?: boolean }) {
  return (
    <button className={`${styles.button} ${primary ? styles.primary : ''}`}>
      Klick
    </button>
  );
}

// Generiertes HTML:
// <button class="Button_button_a1b2c Button_primary_d3e4f">
```

### Tailwind Integration

Tailwind CSS funktioniert out-of-the-box:

```typescript
// 1. Installation
// npm install -D tailwindcss postcss autoprefixer
// npx tailwindcss init -p

// 2. tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

// 3. src/index.css
@tailwind base;
@tailwind components;
@tailwind utilities;

// 4. Verwenden
function Button() {
  return (
    <button className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded">
      Klick mich
    </button>
  );
}
```

---

## 6.8 TypeScript Support

### Automatische Typ-Unterstützung

Vite unterstützt TypeScript ohne Konfiguration:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    TYPESCRIPT IN VITE                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Was Vite macht:                                                    │
│  ┌───────────────────────────────────────────────────────┐         │
│  │ • TypeScript → JavaScript Transformation (esbuild)     │         │
│  │ • Kein Type-Checking während Build (Absicht!)         │         │
│  │ • .ts, .tsx werden automatisch erkannt                 │         │
│  └───────────────────────────────────────────────────────┘         │
│                                                                     │
│  Was du separat brauchst:                                           │
│  ┌───────────────────────────────────────────────────────┐         │
│  │ • Type-Checking: tsc --noEmit (IDE oder CI)           │         │
│  │ • tsconfig.json für Konfiguration                      │         │
│  └───────────────────────────────────────────────────────┘         │
│                                                                     │
│  Warum kein Type-Checking im Build?                                 │
│  → Schnelligkeit! Type-Checking ist langsam.                        │
│  → IDE macht das sowieso in Echtzeit.                               │
│  → CI Pipeline prüft vor Deployment.                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Empfohlene tsconfig.json:**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,

    /* Paths */
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

---

## 6.9 Proxy für API-Calls

### Das CORS-Problem

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CORS PROBLEM                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Browser Sicherheit: Same-Origin Policy                             │
│                                                                     │
│  Frontend: http://localhost:5173                                    │
│  Backend:  http://localhost:3001                                    │
│                                                                     │
│  ┌─────────┐        ┌─────────┐        ┌─────────┐                 │
│  │ Browser │ ─────> │ Backend │        │         │                 │
│  │ :5173   │        │ :3001   │        │ BLOCKED │                 │
│  └─────────┘        └─────────┘        └─────────┘                 │
│       │                                     ▲                       │
│       └─── Andere Origin! ──────────────────┘                      │
│                                                                     │
│  Lösung 1: CORS-Header am Server (Access-Control-Allow-Origin)     │
│  Lösung 2: Proxy im Dev-Server (Vite macht das elegant)            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Proxy Konfiguration

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      // String-Shorthand
      '/api': 'http://localhost:3001',

      // Mit Optionen
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,  // Host-Header anpassen
        secure: false,       // Selbstsignierte Zertifikate erlauben

        // Path rewriting
        rewrite: (path) => path.replace(/^\/api/, ''),
        // /api/users → /users

        // WebSocket Support
        ws: true,
      },

      // Regex für mehrere Pfade
      '^/fallback/.*': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/fallback/, ''),
      },
    }
  }
})
```

**Wie der Proxy funktioniert:**

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PROXY FLOW                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Browser          Vite Dev Server         Backend                   │
│  ┌─────┐          ┌───────────┐          ┌─────────┐               │
│  │     │── GET ──>│           │── GET ──>│         │               │
│  │     │ /api/x   │  Proxy    │  /api/x  │ :3001   │               │
│  │     │<─────────│           │<─────────│         │               │
│  └─────┘          └───────────┘          └─────────┘               │
│                                                                     │
│  Aus Browser-Sicht: Same Origin (localhost:5173)                   │
│  Kein CORS-Problem!                                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6.10 Build Output verstehen

### Der dist/ Ordner analysiert

Nach `npm run build`:

```
dist/
├── index.html                    # Entry-Point
├── favicon.ico                   # Aus public/
├── assets/
│   ├── index-BqeWm7dT.js        # Dein App-Code (gehasht)
│   ├── index-BqeWm7dT.js.map    # Source Map
│   ├── vendor-Da3kJw9x.js       # Dependencies (React, etc.)
│   ├── index-Cx4pLm2n.css       # Extrahiertes CSS
│   └── logo-Ak8Lp3Nm.png        # Assets (gehasht)
└── manifest.json                 # PWA Manifest
```

**Warum Hashes im Dateinamen?**

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CACHE BUSTING                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Ohne Hash:                                                         │
│  app.js (Cache: 1 Jahr)                                             │
│  → Du deployst neue Version                                         │
│  → User hat alte Version im Cache                                   │
│  → Bug! "Bei mir geht's nicht" 😤                                   │
│                                                                     │
│  Mit Hash:                                                          │
│  app-a1b2c3.js (Cache: 1 Jahr)                                      │
│  → Du deployst: app-d4e5f6.js                                       │
│  → Neuer Dateiname = Browser lädt neu                               │
│  → Alle happy! ✓                                                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Code Splitting

Vite splittet Code automatisch für bessere Performance:

```typescript
// Automatisches Code Splitting durch dynamische Imports
const AdminPanel = lazy(() => import('./pages/AdminPanel'));

// Wird zu separatem Chunk: AdminPanel-x1y2z3.js
// Wird nur geladen wenn /admin besucht wird
```

**Manuelles Chunking:**

```typescript
// vite.config.ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        // Vendor-Chunk für React
        'vendor-react': ['react', 'react-dom'],

        // Separater Chunk für große Libraries
        'vendor-charts': ['recharts'],

        // Eigene Logik für Chunking
        // Funktion erhält Modul-ID
      },

      // Oder als Funktion für komplexe Logik
      manualChunks(id) {
        if (id.includes('node_modules')) {
          if (id.includes('react')) {
            return 'vendor-react';
          }
          return 'vendor';
        }
      }
    }
  }
}
```

---

## 6.11 Praktisch: HausTracker vite.config.ts

Jetzt analysieren wir die echte Konfiguration des HausTracker-Projekts Zeile für Zeile:

```typescript
// ═══════════════════════════════════════════════════════════════════
// IMPORTS
// ═══════════════════════════════════════════════════════════════════

import { defineConfig } from 'vite'
// defineConfig: TypeScript-Helfer für Autocomplete und Typsicherheit
// Nicht zwingend nötig, aber sehr praktisch in der IDE

import react from '@vitejs/plugin-react'
// Offizielles React-Plugin von Vite
// Aktiviert: JSX-Transformation, Fast Refresh, Babel-Integration

import { VitePWA } from 'vite-plugin-pwa'
// PWA-Plugin für Service Worker, Manifest, Offline-Support
// Generiert sw.js und manifest.webmanifest automatisch

import basicSsl from '@vitejs/plugin-basic-ssl'
// Generiert selbstsigniertes SSL-Zertifikat für Dev-Server
// Nötig für: Camera API, Geolocation, Clipboard API (erfordern HTTPS)

import path from 'path'
// Node.js Path-Modul für plattformunabhängige Pfade
// Wird für Alias-Konfiguration gebraucht

// ═══════════════════════════════════════════════════════════════════
// KONFIGURATION
// ═══════════════════════════════════════════════════════════════════

export default defineConfig({
  plugins: [
    // ─────────────────────────────────────────────────────────────
    // REACT PLUGIN
    // ─────────────────────────────────────────────────────────────
    react(),
    // Was es macht:
    // - Transformiert JSX zu React.createElement (oder jsx-runtime)
    // - Aktiviert React Fast Refresh (HMR für React)
    // - Injiziert React automatisch (kein "import React" nötig)

    // ─────────────────────────────────────────────────────────────
    // SSL PLUGIN - HTTPS im Development
    // ─────────────────────────────────────────────────────────────
    basicSsl(),
    // Warum? HausTracker nutzt die Camera API für OCR
    // Camera API erfordert "Secure Context" (HTTPS)
    //
    // Ohne: navigator.mediaDevices.getUserMedia() → undefined
    // Mit:  navigator.mediaDevices.getUserMedia() → funktioniert
    //
    // Beim ersten Start: Browser warnt wegen selbstsigniertem Cert
    // → "Erweitert" → "Trotzdem fortfahren"

    // ─────────────────────────────────────────────────────────────
    // PWA PLUGIN - Progressive Web App
    // ─────────────────────────────────────────────────────────────
    VitePWA({
      registerType: 'autoUpdate',
      // 'autoUpdate': Service Worker aktualisiert sich automatisch
      // 'prompt': User wird gefragt ob Update installiert werden soll
      // Für HausTracker: autoUpdate ist besser (keine User-Interaktion nötig)

      includeAssets: ['favicon.ico', 'icon.svg'],
      // Diese Dateien werden in den Service Worker Precache aufgenommen
      // Sind dann auch offline verfügbar

      manifest: {
        // ───────────────────────────────────────────────────────
        // WEB APP MANIFEST - Definiert wie sich die App verhält
        // Vergleichbar mit AssemblyInfo.cs + App.config kombiniert
        // ───────────────────────────────────────────────────────

        name: 'HausTracker - Wärmezähler App',
        // Vollständiger App-Name
        // Wird angezeigt: Splash Screen, App-Einstellungen

        short_name: 'HausTracker',
        // Kurzname für begrenzten Platz
        // Wird angezeigt: Home Screen Icon Label

        description: 'Wärmezähler-Ablesung mit Kamera-OCR und Kostenprognose',
        // Beschreibung für App Stores und Installationsdialoge

        theme_color: '#F97316',
        // Orange - Hauptfarbe der App
        // Färbt: Browser-UI, Status Bar auf Android
        // Muss zu eurem Design passen!

        background_color: '#FFFFFF',
        // Hintergrundfarbe beim App-Start (Splash Screen)
        // Weiß für schnellen, cleanen Start

        display: 'standalone',
        // Wie verhält sich die installierte App?
        // 'standalone': Wie native App, ohne Browser-UI
        // 'fullscreen': Kein Status Bar (für Spiele)
        // 'minimal-ui': Minimale Browser-Navigation
        // 'browser': Normaler Browser-Tab

        orientation: 'portrait',
        // Erzwingt Portrait-Modus
        // Sinnvoll für HausTracker: Kamera-Ablesung ist vertikal

        start_url: '/',
        // URL beim App-Start
        // '/' = immer zur Hauptseite

        scope: '/',
        // URL-Scope der PWA
        // Alles außerhalb öffnet im Browser

        icons: [
          {
            src: '/icon.svg',
            sizes: 'any',
            // 'any' bei SVG: Skaliert auf jede Größe
            type: 'image/svg+xml',
            purpose: 'any',
            // 'any': Für alle Kontexte (Home Screen, Taskbar, etc.)
          },
          {
            src: '/icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable',
            // 'maskable': Kann vom OS zugeschnitten werden
            // Android macht runde Icons → maskable erlaubt das
          },
        ],

        categories: ['utilities', 'productivity'],
        // Kategorien für App Stores
        // Hilft bei Discoverability
      },

      // ─────────────────────────────────────────────────────────
      // WORKBOX KONFIGURATION - Service Worker Verhalten
      // ─────────────────────────────────────────────────────────
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Welche Dateien soll der Service Worker cachen?
        // Alle statischen Assets für Offline-Nutzung

        runtimeCaching: [
          {
            // API-Calls cachen für Offline-Support
            urlPattern: /^https:\/\/api\.haustracker\.(de|local)\/api\/.*/i,
            // Regex: Matcht alle API-Calls zu haustracker.de oder haustracker.local

            handler: 'NetworkFirst',
            // Caching-Strategie:
            // 'NetworkFirst': Versuche Netzwerk, bei Fehler → Cache
            // 'CacheFirst': Erst Cache, dann Netzwerk (für statische Assets)
            // 'StaleWhileRevalidate': Cache sofort, Update im Hintergrund
            //
            // Für API: NetworkFirst ist ideal
            // → Frische Daten wenn online
            // → Letzte bekannte Daten wenn offline

            options: {
              cacheName: 'api-cache',
              // Eindeutiger Cache-Name für API-Responses

              networkTimeoutSeconds: 10,
              // Nach 10s ohne Antwort → Cache verwenden
              // Verhindert ewiges Warten bei schlechtem Netz

              cacheableResponse: {
                statuses: [0, 200],
                // Welche Responses cachen?
                // 0: Opaque responses (CORS)
                // 200: Erfolgreiche Responses
              },
            },
          },
        ],
      },
    }),
  ],

  // ═══════════════════════════════════════════════════════════════
  // RESOLVE - Modul-Auflösung
  // ═══════════════════════════════════════════════════════════════
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Alias: @ → ./src
      //
      // Statt: import { Button } from '../../../components/Button'
      // Jetzt: import { Button } from '@/components/Button'
      //
      // __dirname: Verzeichnis der vite.config.ts
      // path.resolve: Erzeugt absoluten Pfad
      //
      // WICHTIG: Auch in tsconfig.json definieren!
      // Sonst meckert TypeScript
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // SERVER - Development Server
  // ═══════════════════════════════════════════════════════════════
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        // Backend läuft auf Port 3001 (Express/Node)
        // Alle Requests an /api/* werden dorthin geleitet

        changeOrigin: true,
        // Ändert den Origin-Header auf target
        // Nötig wenn Backend den Host prüft
        //
        // Ohne: Host: localhost:5173 (Vite)
        // Mit:  Host: localhost:3001 (Backend)
      },
    },

    // Weitere nützliche Server-Optionen (nicht in HausTracker, aber gut zu wissen):
    // port: 5173,         // Standard-Port
    // host: true,         // Von anderen Geräten erreichbar (192.168.x.x)
    // open: true,         // Browser automatisch öffnen
    // https: true,        // Alternative zu basicSsl Plugin
  },
})
```

### Visualisierung: Wie alles zusammenspielt

```
┌─────────────────────────────────────────────────────────────────────┐
│                    HAUSTRACKER BUILD FLOW                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  DEVELOPMENT:                                                       │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │                                                         │       │
│  │   Browser (https://localhost:5173)                      │       │
│  │      │                                                  │       │
│  │      │ GET /src/App.tsx                                 │       │
│  │      ▼                                                  │       │
│  │   ┌─────────────────────────────────────────┐          │       │
│  │   │           VITE DEV SERVER               │          │       │
│  │   │   ┌─────────┐  ┌─────────┐  ┌───────┐  │          │       │
│  │   │   │  React  │  │basicSsl │  │  PWA  │  │          │       │
│  │   │   │ Plugin  │  │ Plugin  │  │Plugin │  │          │       │
│  │   │   └────┬────┘  └────┬────┘  └───┬───┘  │          │       │
│  │   │        │            │           │       │          │       │
│  │   │        └────────────┼───────────┘       │          │       │
│  │   │                     │                   │          │       │
│  │   │              ┌──────▼──────┐            │          │       │
│  │   │              │   esbuild   │            │          │       │
│  │   │              │  Transform  │            │          │       │
│  │   │              └──────┬──────┘            │          │       │
│  │   │                     │                   │          │       │
│  │   │              Native ESM Response        │          │       │
│  │   └─────────────────────┼───────────────────┘          │       │
│  │                         │                              │       │
│  │      │ GET /api/readings                               │       │
│  │      ▼                                                 │       │
│  │   ┌─────────────────────────────────────────┐          │       │
│  │   │              PROXY                      │          │       │
│  │   │   /api/* → http://localhost:3001/*     │          │       │
│  │   └─────────────────────────────────────────┘          │       │
│  │                                                         │       │
│  └─────────────────────────────────────────────────────────┘       │
│                                                                     │
│  PRODUCTION BUILD:                                                  │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │                                                         │       │
│  │   npm run build                                         │       │
│  │        │                                                │       │
│  │        ▼                                                │       │
│  │   ┌─────────────────────────────────────────┐          │       │
│  │   │              ROLLUP                     │          │       │
│  │   │   • Tree Shaking                        │          │       │
│  │   │   • Code Splitting                      │          │       │
│  │   │   • Minification                        │          │       │
│  │   │   • Asset Hashing                       │          │       │
│  │   └─────────────────────┬───────────────────┘          │       │
│  │                         │                              │       │
│  │                         ▼                              │       │
│  │   dist/                                                │       │
│  │   ├── index.html                                       │       │
│  │   ├── sw.js (Service Worker)                           │       │
│  │   ├── manifest.webmanifest                             │       │
│  │   └── assets/                                          │       │
│  │       ├── index-[hash].js                              │       │
│  │       ├── vendor-[hash].js                             │       │
│  │       └── index-[hash].css                             │       │
│  │                                                         │       │
│  └─────────────────────────────────────────────────────────┘       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Zusammenfassung

Vite hat die Frontend-Entwicklung revolutioniert. Als .NET-Entwickler wirst du die Geschwindigkeit lieben - kein Warten mehr auf langsame Builds.

**Die wichtigsten Punkte:**

1. **Native ESM** im Dev-Server = Sofortiger Start
2. **esbuild** für Development, **Rollup** für Production
3. **HMR** hält den State - du siehst Änderungen in Millisekunden
4. **Minimale Konfiguration** - die Defaults sind sinnvoll
5. **Plugins** erweitern Funktionalität (React, PWA, SSL)
6. **Proxy** löst CORS-Probleme elegant
7. **VITE_** Prefix schützt vor versehentlichem Secret-Leak

Die HausTracker-Konfiguration zeigt einen produktionsreifen Setup:
- PWA mit Offline-Support
- HTTPS für Camera API
- Saubere Import-Aliase
- API-Proxy für das Backend

Im nächsten Kapitel werden wir React genauer betrachten - und verstehen, warum es so gut mit Vite harmoniert.
