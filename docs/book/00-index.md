# Moderne Web-Entwicklung mit React, Vite & Node.js

## Ein Praxisbuch für .NET/MVC-Entwickler

---

> **Zielgruppe:** Senior-Entwickler mit .NET/MVC/Razor-Hintergrund, die moderne JavaScript/TypeScript-basierte Web-Entwicklung lernen möchten.

---

## Inhaltsverzeichnis

### Teil I: Grundlagen & Paradigmenwechsel

| Kapitel | Titel | Beschreibung |
|---------|-------|--------------|
| [01](./01-paradigm-shift.md) | **Von .NET MVC zu Modern JavaScript** | Der große Paradigmenwechsel - Server-Side vs Client-Side, Request/Response vs Reaktive UIs |
| [02](./02-nodejs-npm.md) | **Node.js & npm** | Die JavaScript-Runtime verstehen - Event Loop, Package Management, Module-Systeme |
| [03](./03-typescript.md) | **TypeScript** | Typsicherheit für JavaScript - Mit C#-Vergleichen für schnellen Einstieg |

### Teil II: Frontend-Stack

| Kapitel | Titel | Beschreibung |
|---------|-------|--------------|
| [04](./04-react-fundamentals.md) | **React Fundamentals** | Komponenten, JSX, Props - Von Razor zu React |
| [05](./05-react-hooks.md) | **React Hooks & State** | useState, useEffect, Custom Hooks - Moderne React-Patterns |
| [06](./06-vite.md) | **Vite** | Der moderne Build-Tool-Champion - Blitzschnelle Entwicklung |
| [07](./07-tailwind.md) | **Tailwind CSS** | Utility-First CSS Revolution - Von Bootstrap zu Tailwind |
| [08](./08-zustand.md) | **Zustand** | Einfaches State Management - Ohne Redux-Overhead |
| [09](./09-react-router.md) | **React Router** | Client-Side Routing - Von MVC-Routes zu SPA-Navigation |

### Teil III: Backend-Stack

| Kapitel | Titel | Beschreibung |
|---------|-------|--------------|
| [10](./10-express.md) | **Express.js** | Minimalistisches Backend-Framework - Von ASP.NET zu Express |
| [11](./11-sqlite.md) | **SQLite & better-sqlite3** | Embedded Database - Einfach, schnell, serverless |
| [12](./12-rest-api.md) | **REST API Design** | Moderne API-Patterns - Best Practices für 2024+ |

### Teil IV: Das Gesamtbild

| Kapitel | Titel | Beschreibung |
|---------|-------|--------------|
| [13](./13-fullstack-architecture.md) | **Full-Stack Architektur** | Wie alles zusammenspielt - End-to-End Datenfluss |
| [14](./14-dev-workflow.md) | **Development Workflow** | Hot Reload, DevTools, Debugging - Moderne DX |
| [15](./15-deployment.md) | **Deployment & Production** | Build, Deploy, Hosting - Von IIS zu Vercel |

### Teil V: Meta & Zukunft

| Kapitel | Titel | Beschreibung |
|---------|-------|--------------|
| [16](./16-ai-code-generation.md) | **AI & Code-Generierung** | Warum Claude diese Technologien beherrscht |
| [17](./17-ecosystem.md) | **Ökosystem & Alternativen** | Next.js, Remix, Svelte, Vue - Die Landschaft verstehen |

---

## Wie dieses Buch zu lesen ist

### Für den schnellen Einstieg:
1. Kapitel 1 (Paradigmenwechsel) - Verstehe das "Warum"
2. Kapitel 4-5 (React) - Die Kern-Konzepte
3. Kapitel 6 (Vite) - Das Build-Tool
4. Kapitel 13 (Full-Stack) - Das Gesamtbild

### Für tiefes Verständnis:
Lies alle Kapitel der Reihe nach. Jedes Kapitel baut auf dem vorherigen auf.

### Als Referenz:
Jedes Kapitel ist eigenständig lesbar. Nutze das Inhaltsverzeichnis zum Nachschlagen.

---

## Über dieses Buch

Dieses Buch wurde speziell für erfahrene .NET-Entwickler geschrieben, die den Sprung in die moderne JavaScript/TypeScript-Welt wagen möchten.

**Was dieses Buch besonders macht:**
- Durchgehende Vergleiche zu .NET/MVC/Razor
- Praktische Beispiele aus einem echten Projekt (HausTracker)
- Ehrliche Einschätzungen zu Vor- und Nachteilen
- Mermaid-Diagramme für visuelle Lerner

**Gesamtumfang:** ~11.000 Zeilen, 17 Kapitel

---

## Das Beispielprojekt: HausTracker

Alle Beispiele in diesem Buch stammen aus einem echten Projekt - einer App zur Verfolgung von Heizungsverbrauch und Kosten.

```
haustracker/
├── src/                    # React Frontend
│   ├── components/         # UI-Komponenten
│   ├── pages/              # Seiten-Komponenten
│   ├── lib/                # Utilities, Store, API Client
│   └── types/              # TypeScript Typen
├── server/                 # Express Backend
│   └── src/
│       ├── index.ts        # Server-Einstiegspunkt
│       └── db.ts           # SQLite Datenbank
├── vite.config.ts          # Vite Konfiguration
├── tailwind.config.js      # Tailwind Konfiguration
└── package.json            # Projekt-Konfiguration
```

---

## Schnellstart-Befehle

```bash
# Dependencies installieren
npm install

# Development Server starten (Frontend + Backend)
npm run dev:all

# Nur Frontend
npm run dev

# Nur Backend
npm run server

# Production Build
npm run build
```

---

## Feedback & Fragen

Dieses Buch wurde mit Hilfe von Claude (Anthropic) erstellt - ein lebendiges Beispiel für Kapitel 16!

---

*Viel Erfolg auf deiner Reise in die moderne Web-Entwicklung!*
