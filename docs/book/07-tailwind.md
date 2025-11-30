# Kapitel 7: Tailwind CSS - Utility-First CSS Revolution

## Einleitung

Wenn du aus der Welt von Bootstrap kommst, wirst du beim ersten Blick auf Tailwind CSS vermutlich erschrecken. HTML-Elemente mit zwanzig oder mehr Klassen? Das sieht aus wie ein Alptraum aus den frühen 2000ern, als wir noch `<font color="red">` geschrieben haben. Doch dieser erste Eindruck täuscht gewaltig.

Tailwind CSS repräsentiert einen fundamentalen Paradigmenwechsel in der Art, wie wir über CSS denken. Statt vordefinierter Komponenten wie `.btn-primary` oder `.card` arbeiten wir mit atomaren Utility-Klassen, die genau eine Sache tun. Das Ergebnis? Maximale Flexibilität, keine Spezifitätskämpfe, und ein CSS-Bundle, das nur das enthält, was du tatsächlich verwendest.

In diesem Kapitel werden wir Tailwind von Grund auf verstehen - nicht nur die Syntax, sondern die Philosophie dahinter. Wir werden sehen, warum dieser Ansatz besonders gut zu komponentenbasierten Frameworks wie React passt und wie du damit produktiver wirst als je zuvor.

---

## 1. Was ist Utility-First CSS?

### Der Paradigmenwechsel von BEM/SMACSS

Jahrelang haben wir CSS nach bestimmten Methodologien geschrieben. BEM (Block Element Modifier) war dabei besonders beliebt:

```css
/* Traditionelles BEM */
.card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.card__header {
  padding: 16px;
  border-bottom: 1px solid #eee;
}

.card__title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.card__body {
  padding: 16px;
}

.card--featured {
  border: 2px solid gold;
}
```

```html
<div class="card card--featured">
  <div class="card__header">
    <h2 class="card__title">Titel</h2>
  </div>
  <div class="card__body">
    Inhalt hier...
  </div>
</div>
```

Das funktioniert, hat aber Probleme:

1. **Naming ist schwer**: Was nennst du eine Variation einer Variation?
2. **CSS wächst unbegrenzt**: Jede neue Komponente bedeutet mehr CSS
3. **Wiederverwendung ist trügerisch**: `.card__title` ist an `.card` gebunden
4. **Kontextwechsel**: Du springst ständig zwischen HTML und CSS

### Der Utility-First Ansatz

Tailwind dreht das Konzept um. Statt semantischer Klassen verwendest du atomare Utilities:

```html
<!-- Tailwind Version -->
<div class="bg-white rounded-lg shadow-md border-2 border-yellow-400">
  <div class="p-4 border-b border-gray-200">
    <h2 class="text-lg font-bold text-gray-800">Titel</h2>
  </div>
  <div class="p-4">
    Inhalt hier...
  </div>
</div>
```

Jede Klasse macht genau eine Sache:
- `bg-white` → `background-color: white`
- `rounded-lg` → `border-radius: 0.5rem`
- `shadow-md` → `box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1)`
- `p-4` → `padding: 1rem`
- `text-lg` → `font-size: 1.125rem`

### Warum "hässliches HTML" eigentlich gut ist

Der häufigste Einwand gegen Tailwind: "Das HTML sieht furchtbar aus!" Lass mich erklären, warum das ein Feature und kein Bug ist.

**Argument 1: Kolokation von Concerns**

In React schreiben wir JSX, wo HTML und JavaScript zusammenleben. Warum? Weil eine Komponente eine Einheit ist. Das Styling gehört genauso dazu:

```tsx
// Alles, was diese Komponente ausmacht, ist an einem Ort
function AlertBox({ type, children }) {
  const styles = {
    success: 'bg-green-100 border-green-500 text-green-800',
    error: 'bg-red-100 border-red-500 text-red-800',
    warning: 'bg-yellow-100 border-yellow-500 text-yellow-800',
  };

  return (
    <div className={`p-4 border-l-4 rounded ${styles[type]}`}>
      {children}
    </div>
  );
}
```

**Argument 2: Keine Abstraktion ist auch eine Abstraktion**

BEM-Klassen wie `.card__title--highlighted` sind Abstraktionen. Sie verstecken, was tatsächlich passiert. Mit Tailwind siehst du sofort: `text-yellow-600 font-bold` - gelber, fetter Text.

**Argument 3: Änderungen ohne Seiteneffekte**

Wenn du in traditionellem CSS `.card__title` änderst, änderst du jeden Card-Titel überall. Mit Tailwind änderst du nur das, was du gerade bearbeitest.

### Vergleich: Bootstrap vs Tailwind Philosophie

| Aspekt | Bootstrap | Tailwind |
|--------|-----------|----------|
| Ansatz | Komponenten-First | Utility-First |
| Button | `class="btn btn-primary btn-lg"` | `class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"` |
| Anpassung | Überschreiben von Variablen | Konfiguration + beliebige Utilities |
| Bundle-Größe | Alles oder nichts (oder mühsames Tree-Shaking) | Nur verwendete Utilities |
| Lernkurve | Schneller Einstieg, Plateau bei Anpassungen | Steiler Einstieg, dann keine Grenzen |
| Design-System | Vorgegeben | Du definierst es selbst |

Bootstrap sagt: "Hier ist ein Button, so sieht er aus."
Tailwind sagt: "Hier sind Werkzeuge, bau dir deinen Button."

---

## 2. Installation & Konfiguration

### Installation im Vite-Projekt

Für ein neues oder bestehendes Vite-Projekt:

```bash
# Tailwind und Abhängigkeiten installieren
npm install -D tailwindcss postcss autoprefixer

# Konfigurationsdateien erstellen
npx tailwindcss init -p
```

Das `-p` Flag erstellt auch gleich die PostCSS-Konfiguration.

### tailwind.config.js erklärt

Die Konfigurationsdatei ist das Herzstück von Tailwind:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  // 1. Content-Pfade: Wo soll Tailwind nach Klassen suchen?
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  // 2. Dark Mode Strategie
  darkMode: 'class', // oder 'media' für System-Präferenz

  // 3. Theme-Konfiguration
  theme: {
    // Bestehende Werte komplett überschreiben
    screens: {
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },

    // Bestehende Werte erweitern
    extend: {
      // Eigene Farben hinzufügen
      colors: {
        'brand': {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        },
      },

      // Eigene Schriften
      fontFamily: {
        'display': ['Inter', 'system-ui', 'sans-serif'],
      },

      // Eigene Spacing-Werte
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },

      // Animationen
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },

  // 4. Plugins
  plugins: [
    require('@tailwindcss/forms'),        // Bessere Form-Styles
    require('@tailwindcss/typography'),   // Prose-Klassen für Artikel
    require('@tailwindcss/aspect-ratio'), // Aspect-Ratio Utilities
  ],
}
```

**Wichtig - Der Unterschied zwischen `theme` und `theme.extend`:**

```javascript
theme: {
  // ÜBERSCHREIBT alle Standard-Farben!
  colors: {
    'brand': '#0ea5e9',
  },

  // ERWEITERT die Standard-Farben
  extend: {
    colors: {
      'brand': '#0ea5e9',
    },
  },
}
```

Verwende fast immer `extend`, es sei denn, du willst bewusst alle Standardwerte entfernen.

### postcss.config.js

PostCSS ist der Build-Prozessor, der Tailwind verarbeitet:

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

Autoprefixer fügt automatisch Vendor-Präfixe hinzu (`-webkit-`, `-moz-` etc.). In den meisten Fällen musst du hier nichts ändern.

### Content-Pfade (wichtig!)

Die `content`-Konfiguration ist kritisch. Tailwind scannt diese Dateien nach Klassennamen und generiert nur CSS für tatsächlich verwendete Klassen.

```javascript
content: [
  "./index.html",
  "./src/**/*.{js,ts,jsx,tsx}",
  // Auch Komponenten-Bibliotheken!
  "./node_modules/@tremor/**/*.{js,ts,jsx,tsx}",
],
```

**Häufige Fehler:**

```javascript
// FALSCH: Dynamische Klassennamen werden nicht erkannt!
const color = 'red';
<div className={`bg-${color}-500`}>  // Funktioniert NICHT

// RICHTIG: Vollständige Klassennamen verwenden
const colors = {
  red: 'bg-red-500',
  blue: 'bg-blue-500',
};
<div className={colors[color]}>  // Funktioniert
```

Tailwind führt keine JavaScript-Ausführung durch. Es sucht nur nach String-Patterns. `bg-red-500` muss als vollständiger String irgendwo vorkommen.

### CSS-Einstiegspunkt

Erstelle oder bearbeite deine Haupt-CSS-Datei:

```css
/* src/index.css */

/* Tailwind Base-Styles (Resets, HTML-Defaults) */
@tailwind base;

/* Tailwind Komponenten (@apply-basierte Klassen) */
@tailwind components;

/* Tailwind Utilities (alle Utility-Klassen) */
@tailwind utilities;

/* Eigene Basis-Styles */
@layer base {
  html {
    @apply antialiased;
  }

  body {
    @apply bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100;
  }
}

/* Eigene Komponenten-Klassen */
@layer components {
  .btn-primary {
    @apply px-4 py-2 bg-blue-600 text-white rounded-lg
           hover:bg-blue-700 focus:ring-2 focus:ring-blue-500
           focus:ring-offset-2 transition-colors;
  }
}

/* Eigene Utilities */
@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}
```

Die `@layer`-Direktive ist wichtig für die richtige Spezifitäts-Reihenfolge.

---

## 3. Utility Classes Deep Dive

### Layout: Flexbox

Flexbox ist der Arbeitspferd für Layouts:

```html
<!-- Horizontale Navigation -->
<nav class="flex items-center justify-between p-4">
  <div class="flex items-center gap-4">
    <img src="logo.svg" class="h-8 w-8" />
    <span class="font-bold">HausTracker</span>
  </div>
  <div class="flex gap-2">
    <a href="#" class="px-3 py-2 hover:bg-gray-100 rounded">Dashboard</a>
    <a href="#" class="px-3 py-2 hover:bg-gray-100 rounded">Einstellungen</a>
  </div>
</nav>

<!-- Zentrierter Content -->
<div class="flex items-center justify-center min-h-screen">
  <div class="text-center">
    <h1 class="text-4xl font-bold">Willkommen</h1>
  </div>
</div>

<!-- Sidebar Layout -->
<div class="flex">
  <aside class="w-64 flex-shrink-0">Sidebar</aside>
  <main class="flex-1">Main Content</main>
</div>
```

Wichtige Flex-Utilities:

| Utility | CSS | Verwendung |
|---------|-----|------------|
| `flex` | `display: flex` | Container aktivieren |
| `flex-1` | `flex: 1 1 0%` | Verfügbaren Platz füllen |
| `flex-shrink-0` | `flex-shrink: 0` | Nicht schrumpfen |
| `flex-col` | `flex-direction: column` | Vertikale Ausrichtung |
| `flex-wrap` | `flex-wrap: wrap` | Umbrechen erlauben |
| `items-center` | `align-items: center` | Vertikal zentrieren |
| `items-start` | `align-items: flex-start` | Oben ausrichten |
| `justify-center` | `justify-content: center` | Horizontal zentrieren |
| `justify-between` | `justify-content: space-between` | Verteilen mit Abstand |
| `gap-4` | `gap: 1rem` | Abstand zwischen Items |

### Layout: Grid

Für komplexere Layouts ist CSS Grid mächtiger:

```html
<!-- Responsive Karten-Grid -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <div class="bg-white p-6 rounded-lg shadow">Karte 1</div>
  <div class="bg-white p-6 rounded-lg shadow">Karte 2</div>
  <div class="bg-white p-6 rounded-lg shadow">Karte 3</div>
</div>

<!-- Dashboard Layout mit benannten Bereichen -->
<div class="grid grid-cols-12 gap-4">
  <div class="col-span-12 lg:col-span-8">
    <!-- Hauptbereich: 8 von 12 Spalten auf Large -->
    <div class="bg-white p-6 rounded-lg shadow">
      Hauptinhalt
    </div>
  </div>
  <div class="col-span-12 lg:col-span-4">
    <!-- Sidebar: 4 von 12 Spalten auf Large -->
    <div class="bg-white p-6 rounded-lg shadow">
      Sidebar
    </div>
  </div>
</div>

<!-- Auto-Fill für dynamische Spalten -->
<div class="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
  <!-- So viele Spalten wie passen, min 250px -->
</div>
```

### Container

Der Container zentriert Content mit responsiven max-widths:

```html
<div class="container mx-auto px-4">
  <!-- Zentrierter Content mit Padding -->
</div>
```

Oder mit konfigurierten Breakpoints:

```javascript
// tailwind.config.js
theme: {
  container: {
    center: true,
    padding: '1rem',
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
    },
  },
}
```

### Spacing: Padding & Margin

Tailwind verwendet eine konsistente Spacing-Skala:

| Utility | Wert | Pixel (bei 16px base) |
|---------|------|----------------------|
| `p-0` | 0 | 0px |
| `p-1` | 0.25rem | 4px |
| `p-2` | 0.5rem | 8px |
| `p-3` | 0.75rem | 12px |
| `p-4` | 1rem | 16px |
| `p-5` | 1.25rem | 20px |
| `p-6` | 1.5rem | 24px |
| `p-8` | 2rem | 32px |
| `p-10` | 2.5rem | 40px |
| `p-12` | 3rem | 48px |
| `p-16` | 4rem | 64px |

Richtungs-Modifikatoren:

```html
<div class="p-4">      <!-- Alle Seiten -->
<div class="px-4">     <!-- Links und Rechts (x-Achse) -->
<div class="py-4">     <!-- Oben und Unten (y-Achse) -->
<div class="pt-4">     <!-- Nur oben (top) -->
<div class="pr-4">     <!-- Nur rechts (right) -->
<div class="pb-4">     <!-- Nur unten (bottom) -->
<div class="pl-4">     <!-- Nur links (left) -->

<!-- Margin funktioniert identisch -->
<div class="m-4 mx-auto mt-8 mb-4">

<!-- Negative Margins -->
<div class="-mt-4">    <!-- margin-top: -1rem -->
```

### Gap für Flex/Grid

```html
<div class="flex gap-4">       <!-- Gleicher Abstand überall -->
<div class="flex gap-x-4">     <!-- Nur horizontaler Abstand -->
<div class="flex gap-y-2">     <!-- Nur vertikaler Abstand -->
```

### Typography

```html
<!-- Schriftgrößen -->
<p class="text-xs">Extra Small (12px)</p>
<p class="text-sm">Small (14px)</p>
<p class="text-base">Base (16px)</p>
<p class="text-lg">Large (18px)</p>
<p class="text-xl">Extra Large (20px)</p>
<p class="text-2xl">2XL (24px)</p>
<p class="text-3xl">3XL (30px)</p>
<p class="text-4xl">4XL (36px)</p>

<!-- Schriftstärken -->
<p class="font-light">Light (300)</p>
<p class="font-normal">Normal (400)</p>
<p class="font-medium">Medium (500)</p>
<p class="font-semibold">Semibold (600)</p>
<p class="font-bold">Bold (700)</p>

<!-- Zeilenhöhe -->
<p class="leading-none">Keine Extra-Höhe</p>
<p class="leading-tight">Eng</p>
<p class="leading-normal">Normal</p>
<p class="leading-relaxed">Entspannt</p>
<p class="leading-loose">Locker</p>

<!-- Textausrichtung -->
<p class="text-left">Links</p>
<p class="text-center">Zentriert</p>
<p class="text-right">Rechts</p>
<p class="text-justify">Blocksatz</p>

<!-- Text-Transform -->
<p class="uppercase">GROSSBUCHSTABEN</p>
<p class="lowercase">kleinbuchstaben</p>
<p class="capitalize">Erster Buchstabe Gross</p>

<!-- Textfarbe mit Opacity -->
<p class="text-gray-900">Volle Deckkraft</p>
<p class="text-gray-900/75">75% Deckkraft</p>
<p class="text-gray-900/50">50% Deckkraft</p>
```

### Colors

Tailwind kommt mit einer durchdachten Farbpalette:

```html
<!-- Hintergrundfarben -->
<div class="bg-white">Weiß</div>
<div class="bg-gray-100">Sehr helles Grau</div>
<div class="bg-gray-500">Mittleres Grau</div>
<div class="bg-gray-900">Fast Schwarz</div>

<div class="bg-blue-500">Blau</div>
<div class="bg-red-500">Rot</div>
<div class="bg-green-500">Grün</div>
<div class="bg-yellow-500">Gelb</div>

<!-- Textfarben -->
<p class="text-gray-900">Dunkler Text</p>
<p class="text-gray-600">Sekundärer Text</p>
<p class="text-gray-400">Deaktivierter Text</p>

<!-- Rahmenfarben -->
<div class="border border-gray-200">Heller Rahmen</div>
<div class="border-2 border-blue-500">Blauer Rahmen</div>

<!-- Farben mit Opacity -->
<div class="bg-black/50">50% transparentes Schwarz</div>
<div class="bg-blue-500/20">20% transparentes Blau</div>
```

Die Farbskala von 50-950:
- 50: Sehr hell (fast weiß)
- 100-200: Hell (Hintergründe)
- 300-400: Mittel-hell (Rahmen, deaktivierte Elemente)
- 500: Basis-Farbe
- 600-700: Mittel-dunkel (Hover-States, Akzente)
- 800-900: Dunkel (Text)
- 950: Sehr dunkel (fast schwarz)

### Responsive Design Modifikatoren

Tailwind ist Mobile-First. Utilities ohne Präfix gelten für alle Größen:

```html
<div class="
  text-sm        <!-- Alle Größen: klein -->
  md:text-base   <!-- Ab 768px: normal -->
  lg:text-lg     <!-- Ab 1024px: groß -->
">
  Responsiver Text
</div>

<div class="
  grid
  grid-cols-1      <!-- Mobile: 1 Spalte -->
  sm:grid-cols-2   <!-- Ab 640px: 2 Spalten -->
  md:grid-cols-3   <!-- Ab 768px: 3 Spalten -->
  lg:grid-cols-4   <!-- Ab 1024px: 4 Spalten -->
  gap-4
">
  <!-- Grid-Items -->
</div>

<div class="
  hidden           <!-- Mobile: versteckt -->
  md:block         <!-- Ab 768px: sichtbar -->
">
  Nur auf Desktop sichtbar
</div>

<nav class="
  block            <!-- Mobile: sichtbar -->
  md:hidden        <!-- Ab 768px: versteckt -->
">
  Mobile Navigation
</nav>
```

Standard-Breakpoints:
- `sm:` → `@media (min-width: 640px)`
- `md:` → `@media (min-width: 768px)`
- `lg:` → `@media (min-width: 1024px)`
- `xl:` → `@media (min-width: 1280px)`
- `2xl:` → `@media (min-width: 1536px)`

### Hover, Focus und andere States

```html
<!-- Hover -->
<button class="bg-blue-500 hover:bg-blue-600">
  Hover mich
</button>

<!-- Focus -->
<input class="border focus:border-blue-500 focus:ring-2 focus:ring-blue-200">

<!-- Active (beim Klicken) -->
<button class="bg-blue-500 active:bg-blue-700">
  Klick mich
</button>

<!-- Disabled -->
<button class="bg-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed" disabled>
  Deaktiviert
</button>

<!-- Kombinationen -->
<button class="
  bg-blue-500
  hover:bg-blue-600
  focus:ring-2
  focus:ring-blue-300
  active:bg-blue-700
  disabled:bg-gray-300
  transition-colors
">
  Interaktiver Button
</button>

<!-- Gruppe - Parent-State auf Children anwenden -->
<div class="group p-4 hover:bg-gray-100 rounded-lg cursor-pointer">
  <h3 class="font-bold group-hover:text-blue-600">Titel</h3>
  <p class="text-gray-600 group-hover:text-gray-900">Beschreibung</p>
</div>

<!-- Peer - Sibling-State -->
<input type="checkbox" class="peer" />
<label class="peer-checked:text-blue-600">
  Wird blau wenn Checkbox gecheckt
</label>
```

### Dark Mode

Mit `darkMode: 'class'` in der Konfiguration:

```html
<!-- HTML-Element steuert Dark Mode -->
<html class="dark">
  <body class="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">

    <div class="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
      <h2 class="text-gray-900 dark:text-white">Überschrift</h2>
      <p class="text-gray-600 dark:text-gray-300">Text</p>
    </div>

  </body>
</html>
```

Toggle-Logik in React:

```tsx
function DarkModeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <button onClick={() => setIsDark(!isDark)}>
      {isDark ? '☀️ Light' : '🌙 Dark'}
    </button>
  );
}
```

Mit `darkMode: 'media'` folgt Tailwind der System-Präferenz automatisch.

---

## 4. Responsive Design im Detail

### Mobile-First verstehen

Mobile-First bedeutet: Die Basis-Styles sind für Mobile, größere Screens überschreiben:

```html
<!-- FALSCH gedacht (Desktop-First) -->
<div class="text-lg sm:text-base">
  <!-- Auf Desktop groß, auf Mobile kleiner - unüblich! -->
</div>

<!-- RICHTIG (Mobile-First) -->
<div class="text-base lg:text-lg">
  <!-- Mobile: normal, Desktop: größer -->
</div>
```

### Breakpoints in der Praxis

Denke in Content-Zonen, nicht in Geräten:

```html
<article class="
  px-4 py-6
  md:px-8 md:py-10
  lg:px-12 lg:py-16
  max-w-prose
  mx-auto
">
  <h1 class="
    text-2xl font-bold mb-4
    md:text-3xl md:mb-6
    lg:text-4xl lg:mb-8
  ">
    Artikel-Titel
  </h1>

  <p class="
    text-base leading-relaxed
    md:text-lg
  ">
    Der Artikel-Text...
  </p>
</article>
```

### Komplexes Beispiel: Responsive Card Grid

```html
<div class="container mx-auto px-4 py-8">
  <h1 class="text-2xl md:text-3xl font-bold mb-6 md:mb-8">
    Produkte
  </h1>

  <div class="
    grid
    grid-cols-1
    sm:grid-cols-2
    lg:grid-cols-3
    xl:grid-cols-4
    gap-4
    md:gap-6
  ">
    <!-- Produkt-Karte -->
    <div class="
      bg-white
      rounded-lg
      shadow-sm
      hover:shadow-md
      transition-shadow
      overflow-hidden
    ">
      <img
        src="product.jpg"
        class="w-full h-48 object-cover"
      />
      <div class="p-4">
        <h2 class="font-semibold text-lg mb-2">
          Produktname
        </h2>
        <p class="text-gray-600 text-sm mb-4 line-clamp-2">
          Produktbeschreibung die eventuell abgeschnitten wird...
        </p>
        <div class="flex justify-between items-center">
          <span class="font-bold text-lg">€29,99</span>
          <button class="
            px-4 py-2
            bg-blue-600
            text-white
            rounded-lg
            hover:bg-blue-700
            text-sm
            md:text-base
          ">
            Kaufen
          </button>
        </div>
      </div>
    </div>

    <!-- Weitere Karten... -->
  </div>
</div>
```

### Responsive Navigation

Ein klassisches Hamburger-Menü Pattern:

```tsx
function Navigation() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav class="bg-white shadow">
      <div class="container mx-auto px-4">
        <div class="flex justify-between items-center h-16">
          {/* Logo */}
          <a href="/" class="font-bold text-xl">
            HausTracker
          </a>

          {/* Desktop Navigation */}
          <div class="hidden md:flex items-center gap-6">
            <a href="/dashboard" class="text-gray-600 hover:text-gray-900">
              Dashboard
            </a>
            <a href="/rooms" class="text-gray-600 hover:text-gray-900">
              Räume
            </a>
            <a href="/settings" class="text-gray-600 hover:text-gray-900">
              Einstellungen
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            class="md:hidden p-2"
            onClick={() => setIsOpen(!isOpen)}
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor">
              {isOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div class="md:hidden py-4 border-t">
            <a href="/dashboard" class="block py-2 text-gray-600">
              Dashboard
            </a>
            <a href="/rooms" class="block py-2 text-gray-600">
              Räume
            </a>
            <a href="/settings" class="block py-2 text-gray-600">
              Einstellungen
            </a>
          </div>
        )}
      </div>
    </nav>
  );
}
```

---

## 5. Custom Configuration

### Eigene Farben definieren

```javascript
// tailwind.config.js
export default {
  theme: {
    extend: {
      colors: {
        // Einfache Farbe
        'brand': '#0ea5e9',

        // Farbpalette mit Abstufungen
        'brand': {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',  // Basis
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },

        // Semantische Farben
        'success': '#22c55e',
        'warning': '#f59e0b',
        'error': '#ef4444',
      },
    },
  },
}
```

Verwendung:

```html
<div class="bg-brand-500 hover:bg-brand-600 text-white">
  Brand-Button
</div>

<div class="bg-brand-50 border border-brand-200 text-brand-800">
  Brand-Alert
</div>
```

### Eigene Fonts

```javascript
// tailwind.config.js
export default {
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'display': ['Cal Sans', 'Inter', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
    },
  },
}
```

```html
<h1 class="font-display text-4xl">Große Überschrift</h1>
<p class="font-sans">Normaler Text</p>
<code class="font-mono">Code</code>
```

### Eigene Utilities mit Plugins

```javascript
// tailwind.config.js
const plugin = require('tailwindcss/plugin');

export default {
  plugins: [
    plugin(function({ addUtilities, addComponents, theme }) {
      // Neue Utilities
      addUtilities({
        '.text-balance': {
          'text-wrap': 'balance',
        },
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },
      });

      // Komplexere Komponenten
      addComponents({
        '.card': {
          backgroundColor: theme('colors.white'),
          borderRadius: theme('borderRadius.lg'),
          padding: theme('spacing.6'),
          boxShadow: theme('boxShadow.md'),
        },
      });
    }),
  ],
}
```

### Arbitrary Values (Escape Hatch)

Wenn die vordefinierten Werte nicht reichen:

```html
<!-- Beliebige Werte mit eckigen Klammern -->
<div class="w-[137px]">Exakte 137px Breite</div>
<div class="bg-[#1a2b3c]">Beliebige Hex-Farbe</div>
<div class="grid-cols-[1fr_2fr_1fr]">Custom Grid</div>
<div class="top-[calc(100%-1rem)]">CSS calc()</div>

<!-- Mit Spaces (Unterstriche werden zu Spaces) -->
<div class="grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
  Auto-Fill Grid
</div>
```

Verwende Arbitrary Values sparsam - wenn du sie oft brauchst, erweitere lieber die Konfiguration.

---

## 6. Komponenten-Patterns

### Button Pattern

```tsx
// Flexibler Button mit Varianten
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}

function Button({
  variant = 'primary',
  size = 'md',
  children,
  disabled,
  onClick
}: ButtonProps) {
  const baseStyles = `
    inline-flex items-center justify-center
    font-medium rounded-lg
    transition-colors duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  const variants = {
    primary: `
      bg-blue-600 text-white
      hover:bg-blue-700
      focus:ring-blue-500
    `,
    secondary: `
      bg-gray-100 text-gray-900
      hover:bg-gray-200
      focus:ring-gray-500
    `,
    ghost: `
      bg-transparent text-gray-600
      hover:bg-gray-100 hover:text-gray-900
      focus:ring-gray-500
    `,
    danger: `
      bg-red-600 text-white
      hover:bg-red-700
      focus:ring-red-500
    `,
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
```

### Card Pattern

```tsx
interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

function Card({
  children,
  className = '',
  padding = 'md',
  hover = false
}: CardProps) {
  const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div className={`
      bg-white
      rounded-lg
      shadow-sm
      border border-gray-200
      ${paddingStyles[padding]}
      ${hover ? 'hover:shadow-md transition-shadow cursor-pointer' : ''}
      ${className}
    `}>
      {children}
    </div>
  );
}

// Sub-Komponenten für Struktur
function CardHeader({ children, className = '' }) {
  return (
    <div className={`pb-4 border-b border-gray-200 mb-4 ${className}`}>
      {children}
    </div>
  );
}

function CardTitle({ children, className = '' }) {
  return (
    <h3 className={`text-lg font-semibold text-gray-900 ${className}`}>
      {children}
    </h3>
  );
}

function CardContent({ children, className = '' }) {
  return (
    <div className={`text-gray-600 ${className}`}>
      {children}
    </div>
  );
}
```

### Input Pattern

```tsx
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

function Input({
  label,
  error,
  helperText,
  className = '',
  ...props
}: InputProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}

      <input
        className={`
          w-full px-3 py-2
          border rounded-lg
          text-gray-900 placeholder-gray-400
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-offset-0
          disabled:bg-gray-50 disabled:text-gray-500
          ${error
            ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
          }
          ${className}
        `}
        {...props}
      />

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {helperText && !error && (
        <p className="text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
}
```

### @apply Directive (mit Vorsicht verwenden)

Die `@apply`-Direktive erlaubt es, Tailwind-Klassen in CSS zu extrahieren:

```css
/* src/index.css */
@layer components {
  .btn {
    @apply inline-flex items-center justify-center px-4 py-2
           font-medium rounded-lg transition-colors
           focus:outline-none focus:ring-2 focus:ring-offset-2;
  }

  .btn-primary {
    @apply btn bg-blue-600 text-white hover:bg-blue-700
           focus:ring-blue-500;
  }

  .input {
    @apply w-full px-3 py-2 border border-gray-300 rounded-lg
           focus:outline-none focus:ring-2 focus:ring-blue-200
           focus:border-blue-500;
  }
}
```

**Warum vorsichtig sein mit @apply?**

1. **Du verlierst die Vorteile von Utility-First**: Die Styles sind wieder versteckt
2. **Kein automatisches Purging**: CSS-Klassen werden immer inkludiert
3. **Naming-Probleme kehren zurück**: Wie nennst du `.btn-primary-large-outline`?
4. **Weniger flexibel**: Eine Komponente in JSX ist mächtiger

**Wann @apply sinnvoll ist:**
- Für wirklich wiederverwendete Basis-Styles
- Für Styles, die du nicht in React kontrollieren kannst (z.B. CMS-Content)
- Für sehr kleine Projekte ohne Build-System

---

## 7. Best Practices

### Klassen sinnvoll gruppieren

Lange Klassenlisten werden lesbar durch Gruppierung:

```tsx
// SCHLECHT: Alles in einer Zeile
<button className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">

// BESSER: Logisch gruppiert
<button className={`
  /* Layout */
  inline-flex items-center justify-center
  /* Spacing */
  px-4 py-2
  /* Colors */
  bg-blue-600 text-white
  /* Typography */
  font-medium
  /* Border */
  rounded-lg
  /* States */
  hover:bg-blue-700
  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
  disabled:opacity-50 disabled:cursor-not-allowed
  /* Animation */
  transition-colors
`}>
```

### Konsistente Spacing-Skala

Halte dich an die Tailwind-Skala (4, 8, 12, 16, 24, 32...):

```html
<!-- SCHLECHT: Inkonsistent -->
<div class="p-[13px] mt-[7px] gap-[11px]">

<!-- GUT: Tailwind-Skala -->
<div class="p-3 mt-2 gap-3">
```

### Tailwind Merge mit clsx oder cn()

Problem: Klassen können sich überschreiben:

```tsx
// Problem: Welches bg- gewinnt?
<div className={`bg-red-500 ${isActive ? 'bg-blue-500' : ''}`}>
```

Lösung mit `tailwind-merge` und `clsx`:

```tsx
// lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Verwendung:

```tsx
import { cn } from '@/lib/utils';

function Button({ className, variant, ...props }) {
  return (
    <button
      className={cn(
        // Basis-Styles
        'px-4 py-2 rounded-lg font-medium',
        // Varianten
        variant === 'primary' && 'bg-blue-600 text-white',
        variant === 'secondary' && 'bg-gray-100 text-gray-900',
        // Externe Klassen überschreiben korrekt
        className
      )}
      {...props}
    />
  );
}

// Verwendung
<Button variant="primary" className="bg-green-600">
  // bg-green-600 überschreibt bg-blue-600 korrekt
</Button>
```

### Komponenten-Varianten mit cva

Für komplexere Komponenten ist `class-variance-authority` (cva) ideal:

```tsx
// components/Button.tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // Basis-Klassen
  `inline-flex items-center justify-center rounded-lg font-medium
   transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2
   disabled:opacity-50 disabled:pointer-events-none`,
  {
    variants: {
      variant: {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
        secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500',
        ghost: 'hover:bg-gray-100 hover:text-gray-900 focus:ring-gray-500',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-base',
        lg: 'h-12 px-6 text-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
```

---

## 8. Produktiv-Tipps

### VS Code Extensions

**1. Tailwind CSS IntelliSense** (Pflicht!)
- Autocomplete für alle Klassen
- Hover zeigt CSS-Output
- Linting für ungültige Klassen
- Color-Preview inline

**2. Headwind**
- Sortiert Tailwind-Klassen automatisch
- Konsistente Reihenfolge im Team

**3. Tailwind Documentation**
- Schnellzugriff auf Docs direkt in VS Code

### VS Code Settings für Tailwind

```json
// settings.json
{
  "tailwindCSS.includeLanguages": {
    "typescript": "javascript",
    "typescriptreact": "javascript"
  },
  "editor.quickSuggestions": {
    "strings": true
  },
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cn\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

### Tailwind Docs als Referenz

Die offizielle Dokumentation ist exzellent:
- `tailwindcss.com/docs` - Vollständige Referenz
- Suchfunktion ist schnell und präzise
- Jede Utility-Klasse hat Beispiele

**Tipp**: Bookmarke die wichtigsten Seiten:
- `/docs/customizing-colors`
- `/docs/responsive-design`
- `/docs/hover-focus-and-other-states`

### Cheat Sheet

Erstelle dir ein mentales Modell:

```
Spacing:    p-{0-12} px-* py-* pt-* pr-* pb-* pl-*
            m-{0-12} mx-* my-* mt-* mr-* mb-* ml-*
            gap-{0-12}

Sizing:     w-{0-12} w-full w-screen w-1/2 w-1/3
            h-{0-12} h-full h-screen
            min-w-* max-w-* min-h-* max-h-*

Flex:       flex flex-col flex-row flex-wrap
            items-center items-start items-end
            justify-center justify-between justify-start
            flex-1 flex-shrink-0 flex-grow

Grid:       grid grid-cols-{1-12} gap-{0-12}
            col-span-{1-12}

Text:       text-{xs|sm|base|lg|xl|2xl|3xl|4xl}
            font-{light|normal|medium|semibold|bold}
            text-{color}-{50-950}
            text-left text-center text-right

Background: bg-{color}-{50-950}
            bg-transparent bg-white bg-black

Border:     border border-{0-8} border-{color}-{50-950}
            rounded rounded-{sm|md|lg|xl|full}

Effects:    shadow shadow-{sm|md|lg|xl}
            opacity-{0-100}

States:     hover: focus: active: disabled:
            dark: sm: md: lg: xl:
```

---

## 9. Praktisch: HausTracker UI analysiert

Schauen wir uns echte Patterns aus einem HausTracker-Projekt an.

### Dashboard Layout

```tsx
// pages/Dashboard.tsx
function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                HausTracker
              </span>
            </div>
            <div className="flex items-center gap-4">
              <button className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <BellIcon className="w-6 h-6" />
              </button>
              <img
                src="/avatar.jpg"
                className="w-8 h-8 rounded-full"
              />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Räume"
            value="12"
            icon={<HomeIcon />}
            trend="+2 diese Woche"
          />
          <StatCard
            title="Aufgaben offen"
            value="5"
            icon={<TaskIcon />}
            trend="3 überfällig"
            trendType="warning"
          />
          <StatCard
            title="Letzte Wartung"
            value="vor 3 Tagen"
            icon={<WrenchIcon />}
          />
          <StatCard
            title="Nächste Wartung"
            value="in 2 Wochen"
            icon={<CalendarIcon />}
          />
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            <TaskList />
            <RecentActivity />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <UpcomingMaintenance />
            <QuickActions />
          </div>
        </div>
      </main>
    </div>
  );
}
```

### StatCard Komponente

```tsx
// components/StatCard.tsx
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendType?: 'success' | 'warning' | 'neutral';
}

function StatCard({ title, value, icon, trend, trendType = 'neutral' }: StatCardProps) {
  const trendColors = {
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-amber-600 dark:text-amber-400',
    neutral: 'text-gray-500 dark:text-gray-400',
  };

  return (
    <div className="
      bg-white dark:bg-gray-800
      rounded-xl
      p-6
      shadow-sm
      border border-gray-100 dark:border-gray-700
    ">
      <div className="flex items-center justify-between mb-4">
        <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">
          {title}
        </span>
        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="w-5 h-5 text-blue-600 dark:text-blue-400">
            {icon}
          </div>
        </div>
      </div>

      <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
        {value}
      </div>

      {trend && (
        <div className={`text-sm ${trendColors[trendType]}`}>
          {trend}
        </div>
      )}
    </div>
  );
}
```

### Raum-Liste mit Hover-Effekten

```tsx
// components/RoomList.tsx
function RoomList({ rooms }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Räume
        </h2>
      </div>

      <ul className="divide-y divide-gray-200 dark:divide-gray-700">
        {rooms.map((room) => (
          <li key={room.id}>
            <a
              href={`/rooms/${room.id}`}
              className="
                flex items-center gap-4 px-6 py-4
                hover:bg-gray-50 dark:hover:bg-gray-700/50
                transition-colors
                group
              "
            >
              {/* Room Icon */}
              <div className={`
                w-10 h-10 rounded-lg flex items-center justify-center
                ${room.color}
                group-hover:scale-110 transition-transform
              `}>
                <span className="text-xl">{room.icon}</span>
              </div>

              {/* Room Info */}
              <div className="flex-1 min-w-0">
                <h3 className="
                  text-sm font-medium text-gray-900 dark:text-white
                  group-hover:text-blue-600 dark:group-hover:text-blue-400
                  transition-colors
                ">
                  {room.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {room.itemCount} Gegenstände
                </p>
              </div>

              {/* Arrow */}
              <ChevronRightIcon className="
                w-5 h-5 text-gray-400
                group-hover:text-gray-600 dark:group-hover:text-gray-300
                group-hover:translate-x-1
                transition-all
              " />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Modal mit Backdrop

```tsx
// components/Modal.tsx
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="
          fixed inset-0
          bg-black/50
          backdrop-blur-sm
          transition-opacity
        "
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="
          relative
          w-full max-w-lg
          bg-white dark:bg-gray-800
          rounded-2xl
          shadow-xl
          transform transition-all
        ">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="
                p-2
                text-gray-400 hover:text-gray-600
                dark:hover:text-gray-300
                rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700
                transition-colors
              "
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
```

### Form mit Validierung

```tsx
// components/AddItemForm.tsx
function AddItemForm({ onSubmit }) {
  const [errors, setErrors] = useState({});

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Text Input */}
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Name *
        </label>
        <input
          id="name"
          type="text"
          className={cn(
            `w-full px-4 py-2 rounded-lg border
            bg-white dark:bg-gray-700
            text-gray-900 dark:text-white
            placeholder-gray-400 dark:placeholder-gray-500
            focus:outline-none focus:ring-2 focus:ring-offset-0
            transition-colors`,
            errors.name
              ? 'border-red-500 focus:ring-red-200 focus:border-red-500'
              : 'border-gray-300 dark:border-gray-600 focus:ring-blue-200 focus:border-blue-500'
          )}
          placeholder="z.B. Waschmaschine"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errors.name}
          </p>
        )}
      </div>

      {/* Select */}
      <div>
        <label
          htmlFor="room"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Raum *
        </label>
        <select
          id="room"
          className="
            w-full px-4 py-2 rounded-lg border
            border-gray-300 dark:border-gray-600
            bg-white dark:bg-gray-700
            text-gray-900 dark:text-white
            focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500
          "
        >
          <option value="">Raum auswählen...</option>
          <option value="kitchen">Küche</option>
          <option value="bathroom">Badezimmer</option>
          <option value="bedroom">Schlafzimmer</option>
        </select>
      </div>

      {/* Textarea */}
      <div>
        <label
          htmlFor="notes"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Notizen
        </label>
        <textarea
          id="notes"
          rows={3}
          className="
            w-full px-4 py-2 rounded-lg border
            border-gray-300 dark:border-gray-600
            bg-white dark:bg-gray-700
            text-gray-900 dark:text-white
            placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500
            resize-none
          "
          placeholder="Optionale Notizen..."
        />
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          className="
            px-4 py-2 rounded-lg
            text-gray-700 dark:text-gray-300
            hover:bg-gray-100 dark:hover:bg-gray-700
            transition-colors
          "
        >
          Abbrechen
        </button>
        <button
          type="submit"
          className="
            px-4 py-2 rounded-lg
            bg-blue-600 text-white
            hover:bg-blue-700
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            transition-colors
          "
        >
          Speichern
        </button>
      </div>
    </form>
  );
}
```

---

## Zusammenfassung

Tailwind CSS ist mehr als ein CSS-Framework - es ist eine andere Art, über Styling nachzudenken. Die wichtigsten Erkenntnisse:

1. **Utility-First bedeutet Freiheit**: Keine vordefinierten Komponenten, die du überschreiben musst
2. **Kolokation ist gut**: Styles direkt im Markup zu haben, macht Komponenten selbstbeschreibend
3. **Konfiguration vor Konvention**: Du definierst dein Design-System
4. **Mobile-First**: Die Basis sind Mobile-Styles, Desktop überschreibt
5. **Tooling ist essentiell**: VS Code Extension und Tailwind Merge sind Pflicht
6. **Komponenten abstrahieren**: In React extrahierst du wiederverwendbare Patterns in Komponenten, nicht in CSS-Klassen

Der anfängliche "das ist hässlich"-Reflex weicht schnell einer produktiveren Arbeitsweise. Du wirst feststellen, dass du weniger zwischen Dateien springst, schneller iterierst, und letztendlich bessere UIs baust.

Im nächsten Kapitel werden wir diese Styling-Kenntnisse mit React und TypeScript kombinieren, um komplette, typsichere Komponenten zu bauen.
