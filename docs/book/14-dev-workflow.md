# Kapitel 14: Development Workflow - Hot Reload, DevTools, Debugging

## Der moderne Developer Experience (DX)

Wenn du aus der Visual Studio-Welt kommst, kennst du den Workflow: Code ändern, F5 drücken, warten bis der Compiler durchgelaufen ist, die Anwendung startet, du dich wieder zum richtigen Zustand durchklickst... und dann feststellst, dass du einen Tippfehler gemacht hast. Repeat.

Die moderne JavaScript/TypeScript-Entwicklung funktioniert fundamental anders. Änderungen sind in Millisekunden sichtbar - nicht Sekunden oder Minuten. Dieser Unterschied klingt klein, verändert aber die Art, wie du entwickelst.

### Warum ist moderne Entwicklung schneller?

```
Visual Studio (klassisch):
┌─────────────────────────────────────────────────────────────┐
│ Code ändern → Kompilieren → Linken → App starten → State   │
│              (2-30 Sek)   (1-5s)    (2-10s)      aufbauen  │
│                                                   (manuell)│
│ Gesamtzeit: 5-60 Sekunden pro Änderung                     │
└─────────────────────────────────────────────────────────────┘

Vite + React:
┌─────────────────────────────────────────────────────────────┐
│ Code ändern → HMR → Fertig (State bleibt erhalten!)        │
│              <50ms                                          │
│                                                             │
│ Gesamtzeit: Unter 100 Millisekunden                        │
└─────────────────────────────────────────────────────────────┘
```

Der Unterschied entsteht durch mehrere Faktoren:

1. **Keine vollständige Kompilierung** - Nur geänderte Module werden neu geladen
2. **Kein App-Neustart** - Der Browser bleibt offen
3. **State bleibt erhalten** - Du musst dich nicht neu durchklicken
4. **Native ES Modules** - Der Browser lädt nur was er braucht

### Der Vergleich in Zahlen

| Aktion | Visual Studio | Vite |
|--------|---------------|------|
| Erster Start | 30-120 Sek | 1-3 Sek |
| Code-Änderung | 5-30 Sek | <100ms |
| CSS-Änderung | Gleich wie Code | <50ms |
| State nach Änderung | Verloren | Erhalten |

---

## Hot Module Replacement (HMR)

HMR ist die Technologie, die diesen Geschwindigkeitsvorteil ermöglicht. Statt die ganze Seite neu zu laden, werden nur die geänderten Module ausgetauscht - während die Anwendung läuft.

### Wie funktioniert HMR?

```
┌─────────────────────────────────────────────────────────────┐
│                    HMR Architektur                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐         WebSocket          ┌───────────┐ │
│  │ Vite Server  │◄─────────────────────────►│  Browser  │ │
│  └──────────────┘                            └───────────┘ │
│         │                                          │        │
│         │ Datei-Watcher                           │        │
│         ▼                                          ▼        │
│  ┌──────────────┐                         ┌───────────────┐│
│  │ Button.tsx   │  ──── Änderung ────►   │ Nur Button    ││
│  │ geändert     │                         │ wird ersetzt  ││
│  └──────────────┘                         └───────────────┘│
│                                                             │
│  Rest der App bleibt unberührt!                            │
└─────────────────────────────────────────────────────────────┘
```

Der Ablauf im Detail:

```typescript
// 1. Du änderst eine Datei
// src/components/Button.tsx
export function Button({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="bg-blue-500 hover:bg-blue-600"  // Farbe geändert!
    >
      {children}
    </button>
  );
}

// 2. Vite erkennt die Änderung (Datei-Watcher)
// 3. Vite kompiliert NUR diese Datei neu
// 4. Vite sendet Update über WebSocket an Browser
// 5. Browser ersetzt das alte Modul durch das neue
// 6. React rendert die betroffenen Komponenten neu
```

### State bleibt erhalten!

Das ist der entscheidende Punkt. Stell dir vor, du hast ein Formular mit 10 Feldern ausgefüllt und willst nur das Styling eines Buttons ändern:

```typescript
// Dein Formular-State
const [formData, setFormData] = useState({
  name: "Max Mustermann",        // Bereits eingegeben
  email: "max@example.com",      // Bereits eingegeben
  address: "Musterstraße 123",   // Bereits eingegeben
  // ... 7 weitere Felder
});

// Du änderst den Submit-Button
<button className="bg-green-500">  {/* War blue-500 */}
  Absenden
</button>

// Nach HMR:
// ✅ Button ist jetzt grün
// ✅ Alle Formulardaten sind noch da!
// ✅ Scroll-Position ist erhalten
// ✅ Modale/Dialoge bleiben offen
```

### Fast Refresh in React

React hat eine eigene HMR-Implementation namens "Fast Refresh". Sie ist speziell für React optimiert:

```typescript
// Fast Refresh Regeln:

// ✅ Funktioniert perfekt
export function MyComponent() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}

// ✅ Funktioniert auch
export default function AnotherComponent() {
  return <div>Hello</div>;
}

// ⚠️ Erzwingt vollständigen Reload
export function helper() { }  // Nicht-Komponenten-Export
export function MyComponent() { }

// ⚠️ Verliert State
// Wenn du die Hooks-Reihenfolge änderst
// Wenn du einen Hook hinzufügst/entfernst
```

**Best Practice für optimales Fast Refresh:**

```typescript
// Eine Komponente pro Datei
// src/components/UserCard.tsx
export function UserCard({ user }) {
  // Komponenten-Logik
}

// Helfer in separate Dateien
// src/utils/formatters.ts
export function formatDate(date: Date) {
  // Utility-Logik
}
```

### HMR in der Praxis sehen

Öffne die Browser-Console während der Entwicklung:

```
[vite] hot updated: /src/components/Button.tsx
[vite] hot updated: /src/pages/Dashboard.tsx
[vite] css hot updated: /src/styles/main.css
```

Wenn du siehst:
```
[vite] page reload - /src/main.tsx
```

...bedeutet das, dass ein vollständiger Reload nötig war. Das passiert bei:
- Änderungen an der Root-Datei
- Syntax-Fehlern, die behoben wurden
- Änderungen an Nicht-Komponenten

---

## Browser DevTools

Die Browser-DevTools sind dein wichtigstes Debugging-Werkzeug. Sie sind mächtiger als der VS-Debugger für Web-Entwicklung.

### Öffnen

| Browser | Shortcut |
|---------|----------|
| Chrome/Edge | F12 oder Cmd+Option+I (Mac) / Ctrl+Shift+I (Win) |
| Firefox | F12 oder Cmd+Option+I (Mac) / Ctrl+Shift+I (Win) |
| Safari | Cmd+Option+I (erst in Einstellungen aktivieren) |

### Elements Tab

Hier siehst du den DOM-Baum deiner Anwendung:

```
┌─────────────────────────────────────────────────────────────┐
│ Elements │ Console │ Network │ Application │ ...            │
├─────────────────────────────────────────────────────────────┤
│ <html>                                                      │
│   <body>                                                    │
│     <div id="root">                                         │
│       <div class="app">                                     │
│         <header class="bg-white shadow">                    │
│           <nav>...</nav>           ◄── Rechtsklick:        │
│         </header>                       "Edit as HTML"      │
│         <main>                          "Copy selector"     │
│           ...                           "Force state"       │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ Styles          Computed    Layout                          │
│ ────────────────────────────────────────                    │
│ .bg-white {                                                 │
│   background-color: #ffffff;  ◄── Live editierbar!         │
│ }                                                           │
│                                                             │
│ .shadow {                                                   │
│   box-shadow: 0 1px 3px...    ◄── Checkbox zum Toggling    │
│ }                                                           │
└─────────────────────────────────────────────────────────────┘
```

**Praktische Tricks:**

```javascript
// Im Elements Tab, dann Console:
$0  // Gibt das aktuell ausgewählte Element zurück
$0.textContent  // Text des Elements
$0.classList.add('debug-border')  // Klasse hinzufügen

// Direktes Auswählen
$$('button')  // Alle Buttons (wie querySelectorAll)
$('nav')      // Erstes nav-Element (wie querySelector)
```

### Console Tab

Die Console ist mehr als nur `console.log`:

```javascript
// Basis
console.log('Einfache Nachricht');
console.error('Fehler!');  // Rot, mit Stack-Trace
console.warn('Warnung');   // Gelb

// Objekte schön formatiert
console.log({ user, settings, data });  // Aufklappbar

// Tabellen für Arrays
console.table([
  { name: 'Max', age: 30 },
  { name: 'Anna', age: 25 }
]);
// Zeigt eine sortierbare Tabelle!

// Gruppierung
console.group('API Call');
console.log('URL:', url);
console.log('Response:', response);
console.groupEnd();

// Zeit messen
console.time('render');
// ... Code ...
console.timeEnd('render');  // render: 23.5ms

// Bedingtes Logging
console.assert(user !== null, 'User sollte existieren!');

// Stack Trace
console.trace('Wie bin ich hierher gekommen?');

// Styling (ja, wirklich)
console.log(
  '%c WARNUNG %c Dieser Vorgang kann nicht rückgängig gemacht werden',
  'background: red; color: white; padding: 2px 4px;',
  'color: red;'
);
```

### Network Tab

Essentiell für API-Debugging:

```
┌─────────────────────────────────────────────────────────────┐
│ Filter: [All] [Fetch/XHR] [JS] [CSS] [Img] [Media] ...     │
├─────────────────────────────────────────────────────────────┤
│ Name          Status  Type    Size    Time                  │
│ ────────────────────────────────────────────────────────    │
│ api/users     200     fetch   2.3kB   45ms   ◄── Klicken   │
│ api/posts     200     fetch   15kB    120ms                 │
│ api/comments  404     fetch   0.1kB   30ms   ◄── Fehler!   │
├─────────────────────────────────────────────────────────────┤
│ Headers   Preview   Response   Timing   Cookies             │
│ ────────────────────────────────────────────────────────    │
│ Request Headers:                                            │
│   Authorization: Bearer eyJhbG...                           │
│   Content-Type: application/json                            │
│                                                             │
│ Response Headers:                                           │
│   Content-Type: application/json                            │
│   X-RateLimit-Remaining: 98                                 │
└─────────────────────────────────────────────────────────────┘
```

**Nützliche Features:**

- **Throttling**: Simuliere langsame Verbindungen (3G, Slow 3G)
- **Offline**: Teste Offline-Verhalten
- **Disable cache**: Während DevTools offen - kein Caching
- **Copy as cURL**: Rechtsklick auf Request → In Terminal testen

### Application Tab

Hier findest du:

```
┌─────────────────────────────────────────────────────────────┐
│ Application                                                 │
├─────────────────────────────────────────────────────────────┤
│ Storage                                                     │
│   Local Storage    ◄── Persistente Key-Value Daten         │
│     └─ localhost:5173                                       │
│   Session Storage  ◄── Nur für diese Session               │
│   IndexedDB        ◄── Strukturierte Datenbank             │
│   Cookies          ◄── Klassische Cookies                  │
│                                                             │
│ Cache                                                       │
│   Cache Storage    ◄── Service Worker Cache                │
│                                                             │
│ Background Services                                         │
│   Service Workers                                           │
└─────────────────────────────────────────────────────────────┘
```

**Praktisch für Debugging:**

```javascript
// Local Storage inspizieren und manipulieren
localStorage.setItem('debug', 'true');
localStorage.getItem('user');
localStorage.clear();  // Alles löschen

// Im Application Tab kannst du:
// - Werte direkt editieren
// - Einzelne Keys löschen
// - Den gesamten Storage leeren
```

### React DevTools Extension

Installiere die "React Developer Tools" Browser Extension. Sie fügt zwei neue Tabs hinzu:

**Components Tab:**

```
┌─────────────────────────────────────────────────────────────┐
│ ⚛️ Components                                               │
├─────────────────────────────────────────────────────────────┤
│ <App>                                                       │
│   <AuthProvider>                                            │
│     <QueryClientProvider>                                   │
│       <Router>                                              │
│         <Dashboard>            ◄── Ausgewählt              │
│           <Header />                                        │
│           <Sidebar />                                       │
│           <MainContent>                                     │
│             <PropertyList>                                  │
│               <PropertyCard />                              │
│               <PropertyCard />                              │
├─────────────────────────────────────────────────────────────┤
│ props                          state                        │
│ ─────                          ─────                        │
│ user: {                        isLoading: false             │
│   id: 1,                       selectedTab: "overview"      │
│   name: "Max"                  filters: {                   │
│ }                                status: "active"           │
│                                }                            │
│                                                             │
│ [Edit props/state live!]                                    │
└─────────────────────────────────────────────────────────────┘
```

**Profiler Tab:**

Für Performance-Analyse - zeigt dir, welche Komponenten wie oft rendern.

### Redux/Zustand DevTools

Wenn du Zustand (oder Redux) verwendest, installiere die "Redux DevTools" Extension:

```typescript
// Zustand mit DevTools
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const useStore = create(
  devtools(
    (set) => ({
      count: 0,
      increment: () => set(
        (state) => ({ count: state.count + 1 }),
        false,
        'increment'  // Action-Name für DevTools
      ),
    }),
    { name: 'MyStore' }  // Store-Name in DevTools
  )
);
```

Die DevTools zeigen dir:

```
┌─────────────────────────────────────────────────────────────┐
│ Redux DevTools                                              │
├─────────────────────────────────────────────────────────────┤
│ Actions:                    State:                          │
│ ─────────                   ──────                          │
│ @@INIT                      {                               │
│ increment          ◄──      count: 1,                      │
│ increment                    user: null,                    │
│ setUser                      properties: []                 │
│ fetchProperties             }                               │
│                                                             │
│ [Time Travel] [Export] [Import]                            │
└─────────────────────────────────────────────────────────────┘
```

**Time Travel Debugging**: Du kannst zu jedem vorherigen State springen!

---

## VS Code Setup

VS Code ist der de-facto Standard-Editor für Web-Entwicklung. Hier ist ein optimales Setup.

### Essenzielle Extensions

```
Muss haben:
─────────────
1. ESLint
   - Zeigt Fehler inline
   - Auto-Fix on Save

2. Prettier - Code formatter
   - Konsistente Formatierung
   - Format on Save

3. TypeScript + JavaScript
   - Bereits integriert
   - IntelliSense, Go to Definition

4. Tailwind CSS IntelliSense
   - Autocomplete für Klassen
   - Hover zeigt CSS

5. Auto Rename Tag
   - Ändert schließenden Tag automatisch

6. Error Lens
   - Zeigt Fehler inline (nicht nur unterstrichen)

Sehr empfohlen:
───────────────
7. GitLens
   - Git Blame inline
   - History, Vergleiche

8. Thunder Client
   - REST Client in VS Code
   - Wie Postman, aber integriert

9. Pretty TypeScript Errors
   - Macht TS-Fehler lesbar

10. Import Cost
    - Zeigt Größe von Imports
```

### settings.json Empfehlungen

Öffne mit `Cmd+Shift+P` → "Preferences: Open Settings (JSON)":

```json
{
  // Editor
  "editor.fontSize": 14,
  "editor.tabSize": 2,
  "editor.wordWrap": "on",
  "editor.minimap.enabled": false,
  "editor.bracketPairColorization.enabled": true,
  "editor.guides.bracketPairs": true,
  "editor.stickyScroll.enabled": true,

  // Format on Save - WICHTIG!
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "explicit"
  },

  // TypeScript
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.suggest.autoImports": true,
  "typescript.updateImportsOnFileMove.enabled": "always",

  // File Associations
  "files.associations": {
    "*.css": "tailwindcss"
  },

  // Exclude from Search
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.git": true
  },

  // Terminal
  "terminal.integrated.fontSize": 13,

  // Sprachspezifisch
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[json]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

### Keyboard Shortcuts

Diese Shortcuts solltest du im Schlaf können:

```
Navigation:
───────────
Cmd+P           Datei öffnen (fuzzy search)
Cmd+Shift+P     Command Palette
Cmd+B           Sidebar toggle
Cmd+J           Terminal toggle
Cmd+\           Editor splitten
Cmd+1/2/3       Zwischen Editoren wechseln

Suchen:
───────
Cmd+F           In Datei suchen
Cmd+Shift+F     In allen Dateien suchen
Cmd+Shift+H     Suchen und Ersetzen (alle Dateien)
Cmd+D           Nächstes gleiches Wort auswählen
Cmd+Shift+L     Alle gleichen Wörter auswählen

Code:
─────
Cmd+.           Quick Fix / Vorschläge
F2              Rename Symbol (refactoring!)
Cmd+Shift+O     Go to Symbol in Datei
F12             Go to Definition
Shift+F12       Find All References
Cmd+/           Zeile auskommentieren

Zeilen:
───────
Alt+↑/↓         Zeile verschieben
Shift+Alt+↑/↓   Zeile duplizieren
Cmd+Shift+K     Zeile löschen
Cmd+Enter       Neue Zeile darunter
Cmd+Shift+Enter Neue Zeile darüber

Multi-Cursor:
─────────────
Alt+Click       Cursor hinzufügen
Cmd+Alt+↑/↓     Cursor darüber/darunter
Cmd+D           Nächstes Match auswählen
```

**Pro-Tipp**: `Cmd+K Cmd+S` öffnet die Keyboard Shortcuts Übersicht.

---

## Debugging

### console.log (ja, wirklich)

Der pragmatische Ansatz. Für 90% der Debugging-Fälle ist `console.log` völlig ausreichend:

```typescript
// Einfaches Debugging
function processOrder(order: Order) {
  console.log('Order erhalten:', order);

  const total = calculateTotal(order.items);
  console.log('Berechnete Summe:', total);

  if (total > 1000) {
    console.log('Großbestellung erkannt');
    // ...
  }
}

// Strukturiertes Debugging
function complexFunction(data: ComplexData) {
  console.group('complexFunction');
  console.log('Input:', data);

  const step1 = processStep1(data);
  console.log('Nach Step 1:', step1);

  const step2 = processStep2(step1);
  console.log('Nach Step 2:', step2);

  console.groupEnd();
  return step2;
}

// Conditional Debugging
const DEBUG = import.meta.env.DEV;  // true in Development

function apiCall(endpoint: string) {
  if (DEBUG) {
    console.log(`[API] Calling ${endpoint}`);
  }
  // ...
}

// Object Destructuring für bessere Labels
const user = { name: 'Max', age: 30, role: 'admin' };
console.log({ user });  // Zeigt: { user: { name: 'Max', ... } }

// Statt:
console.log(user);  // Zeigt: { name: 'Max', ... } - welches Objekt?
```

**Wann console.log NICHT reicht:**

- Komplexe State-Abhängigkeiten
- Race Conditions
- Performance-Probleme
- Breakpoints an spezifischen Bedingungen

### VS Code Debugger Setup

Für komplexere Fälle: Der VS Code Debugger.

**Launch Configuration erstellen:**

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Chrome",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}/src",
      "sourceMaps": true
    },
    {
      "name": "Debug Node Backend",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/server/index.ts",
      "runtimeExecutable": "npx",
      "runtimeArgs": ["ts-node"],
      "console": "integratedTerminal"
    },
    {
      "name": "Attach to Node",
      "type": "node",
      "request": "attach",
      "port": 9229
    }
  ]
}
```

**Breakpoints setzen:**

```typescript
function calculateDiscount(order: Order): number {
  const subtotal = order.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // Klicke links neben die Zeilennummer für einen Breakpoint
  // Roter Punkt erscheint

  let discount = 0;

  if (subtotal > 100) {    // ← Breakpoint hier
    discount = subtotal * 0.1;
  }

  if (order.isVIP) {       // ← Conditional Breakpoint:
    discount += 20;        //   Rechtsklick → "Add Conditional Breakpoint"
  }                        //   Bedingung: order.isVIP === true

  return discount;
}
```

**Debugger Controls:**

```
┌─────────────────────────────────────────────────────────────┐
│  ▶️ Continue (F5)     - Weiter bis zum nächsten Breakpoint  │
│  ⏭️ Step Over (F10)   - Nächste Zeile (nicht in Funktion)   │
│  ⏬ Step Into (F11)   - In die Funktion hinein              │
│  ⏫ Step Out (⇧F11)   - Aus der Funktion heraus             │
│  🔄 Restart (⇧⌘F5)   - Debugging neu starten               │
│  ⏹️ Stop (⇧F5)       - Debugging beenden                   │
└─────────────────────────────────────────────────────────────┘
```

### Node.js Debugging

Für Backend-Code:

```bash
# Starte Node mit Inspector
node --inspect server/index.js

# Oder mit ts-node
npx ts-node --inspect server/index.ts

# Oder via npm Script
# package.json:
{
  "scripts": {
    "debug": "node --inspect dist/index.js",
    "debug:ts": "node --inspect -r ts-node/register src/index.ts"
  }
}
```

Dann in VS Code: "Run and Debug" → "Attach to Node"

### React Component Debugging

Spezielle Techniken für React:

```typescript
// 1. useEffect Debugging - Warum rendert es?
useEffect(() => {
  console.log('Effect ausgeführt wegen:', {
    user,
    settings,
    // Liste alle Dependencies
  });
}, [user, settings]);

// 2. Render Counting
function MyComponent() {
  const renderCount = useRef(0);
  renderCount.current++;

  console.log(`MyComponent Render #${renderCount.current}`);

  return <div>...</div>;
}

// 3. Why Did You Render (npm package)
// In Development einbinden:
import React from 'react';

if (process.env.NODE_ENV === 'development') {
  const whyDidYouRender = require('@welldone-software/why-did-you-render');
  whyDidYouRender(React, {
    trackAllPureComponents: true,
  });
}

// Dann an Komponente:
MyComponent.whyDidYouRender = true;

// 4. React DevTools Profiler
// Im Browser: React DevTools → Profiler → Record
// Zeigt genau welche Komponenten wann rendern
```

---

## Linting & Formatting

### ESLint erklärt

ESLint findet Probleme in deinem Code - nicht nur Syntax-Fehler, sondern auch potenzielle Bugs und schlechte Praktiken.

```javascript
// eslint.config.js (ESLint 9+ Flat Config)
import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react': reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      // TypeScript
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',

      // React
      'react/prop-types': 'off',  // TypeScript macht das
      'react/react-in-jsx-scope': 'off',  // React 17+

      // React Hooks - WICHTIG!
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Allgemein
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
    },
  },
];
```

**Was ESLint findet:**

```typescript
// ❌ ESLint Fehler/Warnungen:

// no-unused-vars
const unusedVariable = 5;  // Variable wird nie verwendet

// react-hooks/rules-of-hooks
if (condition) {
  const [state, setState] = useState();  // Hook in Bedingung!
}

// react-hooks/exhaustive-deps
useEffect(() => {
  fetchUser(userId);
}, []);  // userId fehlt in Dependencies!

// no-explicit-any
function process(data: any) { }  // Vermeide any

// prefer-const
let name = 'Max';  // name wird nie reassigned → const
```

### Prettier erklärt

Prettier kümmert sich um die Formatierung - Einrückung, Zeilenumbrüche, Anführungszeichen, etc.

```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 80,
  "bracketSpacing": true,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

**Was Prettier macht:**

```typescript
// Vorher (dein Code):
const user={name:"Max",age:30,email:"max@example.com",address:{street:"Hauptstraße",number:42,city:"Berlin"}}

// Nachher (Prettier):
const user = {
  name: 'Max',
  age: 30,
  email: 'max@example.com',
  address: {
    street: 'Hauptstraße',
    number: 42,
    city: 'Berlin',
  },
};
```

### Zusammenspiel ESLint + Prettier

ESLint prüft Code-Qualität, Prettier formatiert. Sie können sich überschneiden, deshalb:

```bash
# Installiere die Integration
npm install -D eslint-config-prettier
```

```javascript
// eslint.config.js
import prettier from 'eslint-config-prettier';

export default [
  // ... deine anderen Configs
  prettier,  // Am Ende! Deaktiviert ESLint-Regeln die mit Prettier kollidieren
];
```

**Workflow:**

```
┌─────────────────────────────────────────────────────────────┐
│                    On Save                                  │
│                       │                                     │
│                       ▼                                     │
│             ┌─────────────────┐                            │
│             │     Prettier    │  ← Formatiert Code         │
│             └────────┬────────┘                            │
│                      │                                     │
│                      ▼                                     │
│             ┌─────────────────┐                            │
│             │     ESLint      │  ← Fixt Probleme           │
│             └────────┬────────┘                            │
│                      │                                     │
│                      ▼                                     │
│              Sauberer Code ✅                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Git Workflow

### Feature Branches

Nie direkt auf `main` entwickeln:

```bash
# Neues Feature starten
git checkout main
git pull origin main
git checkout -b feature/add-user-settings

# Arbeiten...

# Änderungen committen
git add .
git commit -m "feat: add user settings page"

# Zum Remote pushen
git push -u origin feature/add-user-settings

# Pull Request erstellen (GitHub/GitLab)
# Nach Review: Merge in main
```

**Branch-Naming Konventionen:**

```
feature/   - Neue Features
           feature/add-dark-mode
           feature/user-authentication

bugfix/    - Bug-Fixes
           bugfix/login-redirect
           bugfix/calculation-error

hotfix/    - Dringende Fixes für Production
           hotfix/security-vulnerability

refactor/  - Code-Verbesserungen ohne neue Features
           refactor/extract-api-client

docs/      - Dokumentation
           docs/api-documentation
```

### Conventional Commits

Ein Standard-Format für Commit-Messages:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**

```
feat:     Neues Feature
fix:      Bug-Fix
docs:     Dokumentation
style:    Formatierung (kein Code-Change)
refactor: Code-Änderung ohne Feature/Fix
test:     Tests hinzufügen/ändern
chore:    Build, Dependencies, etc.
```

**Beispiele:**

```bash
# Feature
git commit -m "feat(auth): add password reset functionality"

# Bug Fix
git commit -m "fix(api): handle null response in user fetch"

# Mit Body für mehr Kontext
git commit -m "fix(dashboard): correct calculation of monthly totals

The previous calculation didn't account for partial months.
This fix uses the actual days in month instead of assuming 30."

# Breaking Change
git commit -m "feat(api)!: change response format for user endpoint

BREAKING CHANGE: The user endpoint now returns an object instead of array"
```

**Warum Conventional Commits?**

1. Automatische Changelog-Generierung
2. Semantische Versionierung (semver)
3. Klare History
4. Trigger für CI/CD

---

## Nützliche Terminal-Befehle

### npm Scripts

Definiere häufige Befehle in `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix",
    "format": "prettier --write src/",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",

    // Kombinierte Befehle
    "check": "npm run type-check && npm run lint && npm run test",
    "prepare": "husky install"
  }
}
```

**Ausführen:**

```bash
npm run dev        # Startet Entwicklungsserver
npm run build      # Erstellt Production Build
npm run lint:fix   # Fixt alle ESLint-Probleme
npm test           # Führt Tests aus

# Shorthand für häufige Befehle
npm start          # = npm run start
npm test           # = npm run test
```

### Concurrent Development

Frontend und Backend gleichzeitig starten:

```bash
# Installation
npm install -D concurrently
```

```json
{
  "scripts": {
    "dev:client": "vite",
    "dev:server": "tsx watch server/index.ts",
    "dev": "concurrently \"npm:dev:client\" \"npm:dev:server\"",

    // Mit Labels und Farben
    "dev:all": "concurrently -n client,server -c blue,green \"npm:dev:client\" \"npm:dev:server\""
  }
}
```

**Output:**

```
[client] VITE v5.0.0 ready in 300ms
[client] ➜ Local: http://localhost:5173/
[server] Server running on port 3000
[client] [vite] hot updated: /src/App.tsx
[server] GET /api/users 200 45ms
```

### Weitere nützliche Befehle

```bash
# Dependency Management
npm outdated           # Zeigt veraltete Packages
npm update             # Updated auf neueste kompatible Version
npx npm-check-updates  # Zeigt Major-Updates

# Cache leeren
npm cache clean --force
rm -rf node_modules
npm install

# Package Info
npm info react         # Info über ein Package
npm ls react           # Zeigt installierte Version + Dependencies

# Schnelle Projekt-Analyse
npx depcheck           # Findet unbenutzte Dependencies
npx madge --circular . # Findet zirkuläre Imports

# Git Shortcuts
git status -s          # Kurze Status-Ausgabe
git log --oneline -10  # Letzte 10 Commits kompakt
git diff --stat        # Änderungen als Statistik
git stash              # Änderungen temporär speichern
git stash pop          # Gespeicherte Änderungen wiederherstellen
```

---

## Zusammenfassung

Der moderne Development Workflow unterscheidet sich fundamental von der klassischen IDE-Entwicklung:

| Aspekt | Klassisch (VS) | Modern (Vite + VS Code) |
|--------|----------------|-------------------------|
| Feedback-Zeit | Sekunden-Minuten | Millisekunden |
| State nach Änderung | Verloren | Erhalten |
| Debugging | Primär Debugger | console.log + DevTools |
| Formatierung | Manuell/IDE | Automatisch (Prettier) |
| Code-Qualität | Compiler | ESLint + TypeScript |
| Git | GUI-Client | Terminal + VS Code |

**Die wichtigsten Takeaways:**

1. **HMR verändert deinen Workflow** - Nutze es, um in Echtzeit zu entwickeln
2. **Browser DevTools sind mächtig** - Lerne sie kennen, besonders Network und React DevTools
3. **VS Code richtig einrichten** - Format on Save + ESLint Fix on Save sind essentiell
4. **console.log ist okay** - Für 90% der Fälle völlig ausreichend
5. **Conventional Commits** - Machen deine Git-History wertvoll
6. **npm Scripts** - Automatisiere wiederkehrende Befehle

Im nächsten Kapitel schauen wir uns an, wie du deine Anwendung für Production baust und deployst.
