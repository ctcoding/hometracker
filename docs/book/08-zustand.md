# Kapitel 8: Zustand - Einfaches State Management

Als .NET-Entwickler kennst du das Problem: Zustand muss irgendwo leben. In ASP.NET Core hast du Dependency Injection, Scoped Services, vielleicht einen Redis-Cache. In React? Willkommen in der wunderbaren Welt des State Managements, wo gefühlt jede Woche eine neue Library erscheint.

Dieses Kapitel zeigt dir **Zustand** - eine State-Management-Bibliothek, die so minimal ist, dass du dich fragst, warum alle anderen so kompliziert sein müssen.

---

## 8.1 Das State-Management-Problem

### Was ist eigentlich das Problem?

In React fließt Zustand von oben nach unten. Eine Komponente hat State, und wenn eine Kind-Komponente diesen State braucht, wird er als Prop weitergegeben. Simpel, oder?

```tsx
// Einfach: Parent hat State, Child braucht ihn
function Parent() {
  const [user, setUser] = useState<User | null>(null);
  return <Child user={user} />;
}

function Child({ user }: { user: User | null }) {
  return <div>Hallo {user?.name}</div>;
}
```

Das funktioniert wunderbar - bis dein Component Tree wächst.

### Prop Drilling: Der Schmerz

**Prop Drilling** bedeutet: Du reichst Props durch viele Komponenten-Ebenen, obwohl die Zwischenkomponenten sie gar nicht brauchen.

```
┌─────────────────────────────────────────────────────────────┐
│                         App                                  │
│                    [user, theme]                             │
│                         │                                    │
│           ┌─────────────┼─────────────┐                      │
│           │             │             │                      │
│           ▼             ▼             ▼                      │
│       ┌───────┐    ┌────────┐    ┌────────┐                  │
│       │Header │    │ Main   │    │ Footer │                  │
│       │ user  │    │ user   │    │ theme  │                  │
│       └───┬───┘    └────┬───┘    └────────┘                  │
│           │             │                                    │
│           ▼             ▼                                    │
│      ┌────────┐   ┌──────────┐                               │
│      │UserMenu│   │ Content  │                               │
│      │  user  │   │   user   │                               │
│      └────────┘   └─────┬────┘                               │
│                         │                                    │
│                         ▼                                    │
│                  ┌────────────┐                               │
│                  │ DeepChild  │  ← Braucht user               │
│                  │   user     │    (6 Ebenen tief!)           │
│                  └────────────┘                               │
└─────────────────────────────────────────────────────────────┘
```

In Code sieht das so aus:

```tsx
// ❌ Prop Drilling - der Alptraum
function App() {
  const [user, setUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  return (
    <Layout user={user} theme={theme}>
      <Header user={user} theme={theme} />
      <Main user={user} theme={theme}>
        <Sidebar user={user} />        {/* Braucht user nicht, gibt nur weiter */}
        <Content user={user}>          {/* Braucht user nicht, gibt nur weiter */}
          <Article user={user}>        {/* Braucht user nicht, gibt nur weiter */}
            <Comments user={user} />   {/* Braucht user endlich! */}
          </Article>
        </Content>
      </Main>
    </Layout>
  );
}
```

**Was ist daran schlecht?**

1. **Boilerplate**: Jede Zwischenkomponente muss Props deklarieren und weitergeben
2. **Änderungen schmerzen**: Neues Prop? Ändere 6 Komponenten
3. **Performance**: Jede Zwischenkomponente re-rendert, wenn sich der Prop ändert
4. **Lesbarkeit**: Was braucht die Komponente wirklich vs. was leitet sie nur durch?

### Wann braucht man globalen State?

Die Frage ist nicht "Prop Drilling = schlecht", sondern: **Wann ist globaler State die richtige Lösung?**

| Situation | Lösung |
|-----------|--------|
| State wird von Parent + 1 Child gebraucht | Props |
| State wird von 2-3 nahen Komponenten geteilt | Props oder Context |
| State wird überall gebraucht (User, Theme) | Globaler State |
| State ist Server-Daten | React Query (Kapitel 7) |
| State ist URL-State (Filter, Suche) | URL-Parameter |
| State ist nur für Formular | `useState` im Formular |

**Typische Kandidaten für globalen State:**

- Authentifizierter Benutzer
- Theme / Dark Mode
- Spracheinstellung
- Shopping Cart
- Benachrichtigungen / Toasts
- Modals und Overlays
- UI-State (Sidebar offen/zu)

**Keine guten Kandidaten:**

- Server-Daten (→ React Query)
- Formular-State (→ lokaler State)
- Temporärer UI-State einer Komponente

### Vergleich mit .NET

In .NET hättest du verschiedene Service-Lifetimes:

| .NET | React Äquivalent |
|------|------------------|
| `Transient` | `useState` in Komponente |
| `Scoped` | Context für Teilbaum |
| `Singleton` | Globaler Store |

```csharp
// .NET: Dependency Injection
services.AddSingleton<IUserService, UserService>();

// Component greift zu
public class MyController : Controller {
    private readonly IUserService _userService;
    public MyController(IUserService userService) {
        _userService = userService; // Injected!
    }
}
```

```tsx
// React mit Zustand: Ähnliches Konzept
const useUserStore = create<UserState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));

// Component greift zu
function MyComponent() {
  const user = useUserStore((state) => state.user); // "Injected"!
}
```

Der große Unterschied: In React ist alles reaktiv. Wenn sich `user` ändert, rendert die Komponente automatisch neu.

---

## 8.2 Die State-Management-Landschaft

Bevor wir zu Zustand kommen, ein Überblick über die Optionen.

### Context API (Built-in)

React hat eine eingebaute Lösung: Context.

```tsx
// 1. Context erstellen
const UserContext = createContext<User | null>(null);

// 2. Provider in der App
function App() {
  const [user, setUser] = useState<User | null>(null);
  return (
    <UserContext.Provider value={user}>
      <TheRestOfYourApp />
    </UserContext.Provider>
  );
}

// 3. Konsumieren
function DeepChild() {
  const user = useContext(UserContext);
  return <div>{user?.name}</div>;
}
```

**Vorteile:**
- Eingebaut, keine Dependency
- Einfach für simple Use Cases

**Nachteile:**
- Performance-Probleme: Alle Konsumenten re-rendern bei jeder Änderung
- Kein eingebauter Mechanismus für Updates (musst du selbst bauen)
- Bei komplexem State: Viele verschachtelte Provider ("Provider Hell")

```tsx
// ❌ Provider Hell
function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <LocaleProvider>
          <NotificationProvider>
            <CartProvider>
              <ModalProvider>
                <ActualApp />  {/* 6 Ebenen tief... */}
              </ModalProvider>
            </CartProvider>
          </NotificationProvider>
        </LocaleProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
```

### Redux: Das "Enterprise"-Monster

Redux ist der 800-Pfund-Gorilla des React State Managements. Wenn du von Redux gehört hast, dann wahrscheinlich im Zusammenhang mit "viel Boilerplate".

```
┌─────────────────────────────────────────────────────────────────┐
│                     Redux Architektur                            │
│                                                                  │
│   ┌──────────┐     dispatch      ┌──────────┐                   │
│   │Component │ ─────────────────▶│  Action  │                   │
│   └──────────┘                   └────┬─────┘                   │
│        ▲                              │                          │
│        │                              ▼                          │
│        │ select             ┌──────────────┐                    │
│        │                    │   Reducer    │                    │
│        │                    │ (pure func)  │                    │
│        │                    └──────┬───────┘                    │
│        │                           │                             │
│        │                           ▼                             │
│   ┌────┴─────┐              ┌─────────────┐                     │
│   │Selector  │◀─────────────│    Store    │                     │
│   └──────────┘              │ (single!)   │                     │
│                             └─────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
```

Redux-Konzepte:
- **Store**: Ein einziger, globaler State-Container
- **Actions**: Objekte die beschreiben, WAS passieren soll
- **Reducers**: Pure Functions die beschreiben, WIE State sich ändert
- **Dispatch**: Sendet Actions an den Store
- **Selectors**: Lesen State aus dem Store

```typescript
// Redux: Eine einfache Counter-Action
// 1. Action Types
const INCREMENT = 'INCREMENT';
const DECREMENT = 'DECREMENT';

// 2. Action Creators
const increment = () => ({ type: INCREMENT });
const decrement = () => ({ type: DECREMENT });

// 3. Reducer
const counterReducer = (state = 0, action: Action) => {
  switch (action.type) {
    case INCREMENT:
      return state + 1;
    case DECREMENT:
      return state - 1;
    default:
      return state;
  }
};

// 4. Store erstellen
const store = createStore(counterReducer);

// 5. In Component verwenden
function Counter() {
  const count = useSelector((state: RootState) => state.counter);
  const dispatch = useDispatch();

  return (
    <div>
      <span>{count}</span>
      <button onClick={() => dispatch(increment())}>+</button>
    </div>
  );
}
```

**Redux Toolkit** macht es etwas besser:

```typescript
// Redux Toolkit: Weniger Boilerplate
import { createSlice } from '@reduxjs/toolkit';

const counterSlice = createSlice({
  name: 'counter',
  initialState: 0,
  reducers: {
    increment: (state) => state + 1,
    decrement: (state) => state - 1,
  },
});

export const { increment, decrement } = counterSlice.actions;
export default counterSlice.reducer;
```

**Wann Redux?**
- Sehr große Apps mit komplexem State
- Teams die strikte Patterns brauchen
- Wenn du Redux DevTools Time-Travel-Debugging brauchst
- Enterprise-Umgebungen mit existierendem Redux-Know-how

**Wann NICHT Redux?**
- Kleine bis mittlere Apps
- Wenn du schnell produktiv sein willst
- Wenn du die Lernkurve scheust

### Andere Optionen

| Library | Konzept | Größe | Lernkurve |
|---------|---------|-------|-----------|
| **MobX** | Observables, automatisches Tracking | ~16KB | Mittel |
| **Jotai** | Primitive Atoms | ~2KB | Niedrig |
| **Recoil** | Facebook's Atom-basiert | ~20KB | Mittel |
| **Valtio** | Proxy-basiert | ~3KB | Niedrig |
| **Zustand** | Minimaler Hook-Store | ~1KB | Sehr niedrig |

### Zustand: Der pragmatische Mittelweg

Zustand (deutsch für "State" - ja, wirklich!) wurde von den Machern von React Three Fiber entwickelt.

Das Motto: **"Ein kleiner, schneller und skalierbarer State-Management-Lösung."**

```
┌─────────────────────────────────────────────────────────────────┐
│                    Zustand vs Redux                              │
│                                                                  │
│    Redux:                          Zustand:                      │
│    ┌──────────┐                    ┌──────────┐                 │
│    │ Provider │                    │          │                 │
│    │   │      │                    │ create() │──▶ Hook!        │
│    │   ▼      │                    │          │                 │
│    │ Store    │                    └──────────┘                 │
│    │   │      │                          │                      │
│    │   ▼      │                          │                      │
│    │Reducers  │                          │                      │
│    │   │      │                          │                      │
│    │   ▼      │                          ▼                      │
│    │Actions   │                    ┌──────────┐                 │
│    │   │      │                    │Component │                 │
│    │   ▼      │                    │useStore()│                 │
│    │Selectors │                    └──────────┘                 │
│    └──────────┘                                                 │
│                                                                  │
│    ~40KB + Setup                   ~1KB, kein Setup             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8.3 Warum Zustand?

### Minimale API

Die gesamte API besteht aus einer Funktion: `create`.

```typescript
import { create } from 'zustand';

const useStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));
```

Das war's. Keine Provider, keine Actions, keine Reducers.

### Keine Provider nötig

Das ist der Killer-Feature für mich:

```tsx
// ❌ Context/Redux: Provider wrappen
function App() {
  return (
    <Provider store={store}>
      <MyApp />
    </Provider>
  );
}

// ✅ Zustand: Einfach importieren und benutzen
function App() {
  return <MyApp />;
}

// Irgendwo tief in der App
function DeepComponent() {
  const count = useStore((state) => state.count);  // Just works!
}
```

### TypeScript-First

Zustand wurde mit TypeScript im Sinn entwickelt:

```typescript
interface BearState {
  bears: number;
  increase: (by: number) => void;
  reset: () => void;
}

const useBearStore = create<BearState>((set) => ({
  bears: 0,
  increase: (by) => set((state) => ({ bears: state.bears + by })),
  reset: () => set({ bears: 0 }),
}));
```

Volle Typ-Inferenz, kein `any`, keine Typgymnastik.

### Nur ~1KB

```
Bundle Size Vergleich:
┌────────────────────────────────────────────────────────┐
│                                                        │
│  Redux + React-Redux:  ████████████████████████  ~20KB │
│  Redux Toolkit:        ██████████████████████████ 27KB │
│  MobX + mobx-react:    ████████████████  ~16KB         │
│  Recoil:               ████████████████████  ~20KB     │
│  Jotai:                ██  ~2KB                        │
│  Zustand:              █  ~1KB                         │
│                                                        │
└────────────────────────────────────────────────────────┘
```

Bei einer PWA wie HausTracker zählt jedes Kilobyte.

---

## 8.4 Zustand Basics

### Store erstellen

Ein Store ist einfach ein Objekt mit State und Actions:

```typescript
import { create } from 'zustand';

// Einfachster Store
const useCounterStore = create((set) => ({
  // State
  count: 0,

  // Actions
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  reset: () => set({ count: 0 }),
}));
```

`set` ist die Funktion zum Aktualisieren des States. Sie funktioniert wie `setState` in React - sie merged den neuen State mit dem alten.

### State lesen

```tsx
function Counter() {
  // ❌ Nicht empfohlen: Ganzen Store lesen
  const store = useCounterStore();

  // ✅ Besser: Nur was du brauchst (Selektor)
  const count = useCounterStore((state) => state.count);
  const increment = useCounterStore((state) => state.increment);

  return (
    <div>
      <span>{count}</span>
      <button onClick={increment}>+</button>
    </div>
  );
}
```

### Actions definieren

Actions sind einfach Funktionen im Store:

```typescript
const useTodoStore = create((set, get) => ({
  todos: [] as Todo[],

  // Einfache Action
  addTodo: (text: string) =>
    set((state) => ({
      todos: [...state.todos, { id: Date.now(), text, done: false }],
    })),

  // Action die aktuellen State liest
  toggleTodo: (id: number) =>
    set((state) => ({
      todos: state.todos.map((todo) =>
        todo.id === id ? { ...todo, done: !todo.done } : todo
      ),
    })),

  // Action mit get() für State-Zugriff außerhalb von set
  removeDone: () => {
    const currentTodos = get().todos;
    set({ todos: currentTodos.filter((t) => !t.done) });
  },
}));
```

**`set` vs `get`:**
- `set`: State aktualisieren (merged automatisch)
- `get`: Aktuellen State lesen (für komplexe Logik)

### Selektoren für Performance

**Das ist wichtig!** Wenn du den ganzen Store liest, rendert deine Komponente bei JEDER State-Änderung neu:

```tsx
// ❌ SCHLECHT: Re-renders bei jeder Änderung
function BadComponent() {
  const store = useStore();  // Ganzer Store!
  return <div>{store.count}</div>;
}

// ✅ GUT: Re-renders nur wenn count sich ändert
function GoodComponent() {
  const count = useStore((state) => state.count);
  return <div>{count}</div>;
}
```

```
Performance Vergleich:
┌─────────────────────────────────────────────────────────────────┐
│  Store: { count: 1, name: "Test", items: [...], settings: {...}}│
│                                                                  │
│  Ohne Selektor:                                                 │
│  ┌─────────────┐                                                │
│  │ Component   │◀── Re-render bei: count, name, items, settings │
│  │ useStore()  │                                                │
│  └─────────────┘                                                │
│                                                                  │
│  Mit Selektor:                                                  │
│  ┌─────────────┐                                                │
│  │ Component   │◀── Re-render nur bei: count                    │
│  │ state.count │                                                │
│  └─────────────┘                                                │
└─────────────────────────────────────────────────────────────────┘
```

**Mehrere Werte selektieren:**

```tsx
// Option 1: Mehrere Hooks
function Component() {
  const count = useStore((s) => s.count);
  const name = useStore((s) => s.name);
}

// Option 2: Shallow comparison für Objekte
import { shallow } from 'zustand/shallow';

function Component() {
  const { count, name } = useStore(
    (state) => ({ count: state.count, name: state.name }),
    shallow  // Wichtig! Sonst immer neue Referenz
  );
}
```

---

## 8.5 TypeScript Integration

### Store typisieren

Die beste Praxis: Interface zuerst, dann Store:

```typescript
import { create } from 'zustand';

// 1. Interface definieren
interface UserState {
  // State
  user: User | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

// 2. Store mit Generic
const useUserStore = create<UserState>((set) => ({
  // Initial State
  user: null,
  isLoading: false,
  error: null,

  // Actions
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const user = await authApi.login(email, password);
      set({ user, isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  logout: () => set({ user: null }),

  clearError: () => set({ error: null }),
}));
```

### Actions typisieren

TypeScript inferiert die Action-Parameter automatisch aus dem Interface:

```typescript
interface TodoState {
  todos: Todo[];
  addTodo: (text: string) => void;           // text ist string
  toggleTodo: (id: number) => void;          // id ist number
  updateTodo: (id: number, text: string) => void;
}

const useTodoStore = create<TodoState>((set) => ({
  todos: [],

  // TypeScript weiß: text ist string
  addTodo: (text) =>
    set((state) => ({
      todos: [...state.todos, { id: Date.now(), text, done: false }],
    })),

  // TypeScript weiß: id ist number
  toggleTodo: (id) =>
    set((state) => ({
      todos: state.todos.map((t) =>
        t.id === id ? { ...t, done: !t.done } : t
      ),
    })),

  updateTodo: (id, text) =>
    set((state) => ({
      todos: state.todos.map((t) =>
        t.id === id ? { ...t, text } : t
      ),
    })),
}));
```

### Typen exportieren für Konsumenten

```typescript
// store.ts
export interface AppState {
  count: number;
  increment: () => void;
}

export const useStore = create<AppState>((set) => ({
  count: 0,
  increment: () => set((s) => ({ count: s.count + 1 })),
}));

// Abgeleitete Typen für Selektoren
export type AppStateSelector<T> = (state: AppState) => T;

// components/Counter.tsx
import { useStore, AppState } from '../store';

function Counter() {
  // Voll typisiert!
  const count = useStore((state: AppState) => state.count);
  const increment = useStore((state: AppState) => state.increment);
}
```

---

## 8.6 Middleware

Zustand hat ein leichtgewichtiges Middleware-System für erweiterte Funktionalität.

### persist: localStorage Persistierung

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  theme: 'light' | 'dark';
  language: string;
  setTheme: (theme: 'light' | 'dark') => void;
  setLanguage: (lang: string) => void;
}

const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'light',
      language: 'de',
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'settings-storage',  // localStorage key
    }
  )
);
```

**Optionen für persist:**

```typescript
persist(
  (set) => ({ /* ... */ }),
  {
    name: 'my-storage',

    // Nur bestimmte Felder persistieren
    partialize: (state) => ({
      theme: state.theme,
      // user-sensitive Daten NICHT persistieren
    }),

    // Custom Storage (z.B. sessionStorage, IndexedDB)
    storage: createJSONStorage(() => sessionStorage),

    // Version für Migrations
    version: 1,
    migrate: (persistedState, version) => {
      if (version === 0) {
        // Migration von v0 zu v1
      }
      return persistedState as SettingsState;
    },
  }
)
```

### devtools: Redux DevTools Integration

Das Beste aus beiden Welten - Zustand's Einfachheit mit Redux DevTools Debugging:

```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const useStore = create<AppState>()(
  devtools(
    (set) => ({
      count: 0,
      increment: () =>
        set(
          (state) => ({ count: state.count + 1 }),
          false,
          'increment'  // Action name in DevTools
        ),
    }),
    {
      name: 'MyApp Store',  // Name in DevTools
    }
  )
);
```

```
┌─────────────────────────────────────────────────────────────────┐
│  Redux DevTools                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Actions:                        │ State:                  │  │
│  │                                 │                         │  │
│  │ ▶ @@INIT                        │ {                       │  │
│  │ ▶ increment          12:34:01   │   count: 3              │  │
│  │ ▶ increment          12:34:02   │ }                       │  │
│  │ ▶ increment          12:34:03   │                         │  │
│  │ ▶ reset              12:34:05   │ Diff:                   │  │
│  │                                 │ count: 3 → 0            │  │
│  │ [Jump] [Skip]                   │                         │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Time-Travel Debugging funktioniert!                            │
└─────────────────────────────────────────────────────────────────┘
```

### immer: Immutable Updates einfacher

Normalerweise musst du bei State-Updates immutable arbeiten:

```typescript
// ❌ Ohne Immer: Spread-Operator-Hölle
set((state) => ({
  user: {
    ...state.user,
    address: {
      ...state.user.address,
      city: 'Berlin',
    },
  },
}));
```

Mit Immer kannst du mutieren (intern wird es immutable):

```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

const useStore = create<AppState>()(
  immer((set) => ({
    user: { name: 'Max', address: { city: 'München' } },

    // ✅ Mit Immer: Mutiere einfach!
    updateCity: (city) =>
      set((state) => {
        state.user.address.city = city;  // Sieht aus wie Mutation
      }),
  }))
);
```

### Middleware kombinieren

```typescript
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

const useStore = create<AppState>()(
  devtools(
    persist(
      immer((set) => ({
        // Store definition
      })),
      { name: 'app-storage' }
    ),
    { name: 'App Store' }
  )
);
```

**Reihenfolge der Middleware:**
Die äußerste Middleware wird zuerst ausgeführt. Typische Reihenfolge:
1. `devtools` (außen) - sieht alle Actions
2. `persist` - speichert State
3. `immer` (innen) - transformiert Updates

---

## 8.7 Patterns & Best Practices

### Store-Struktur

**Klein anfangen, bei Bedarf aufteilen:**

```typescript
// ✅ Für kleine/mittlere Apps: Ein Store
const useStore = create<AppState>((set) => ({
  // User
  user: null,
  setUser: (user) => set({ user }),

  // UI
  sidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  // Settings
  theme: 'light',
  setTheme: (theme) => set({ theme }),
}));
```

### Slices Pattern

Für größere Apps: Teile den Store in "Slices" auf:

```typescript
// slices/userSlice.ts
export interface UserSlice {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const createUserSlice = (set: SetState<UserSlice>): UserSlice => ({
  user: null,
  setUser: (user) => set({ user }),
  logout: () => set({ user: null }),
});

// slices/uiSlice.ts
export interface UISlice {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const createUISlice = (set: SetState<UISlice>): UISlice => ({
  sidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
});

// store.ts - Alles zusammenführen
import { create, StateCreator } from 'zustand';
import { createUserSlice, UserSlice } from './slices/userSlice';
import { createUISlice, UISlice } from './slices/uiSlice';

type AppState = UserSlice & UISlice;

const useStore = create<AppState>()((...a) => ({
  ...createUserSlice(...a),
  ...createUISlice(...a),
}));

export default useStore;
```

```
Slices Architektur:
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ userSlice   │  │  uiSlice    │  │settingsSlice│             │
│  │             │  │             │  │             │             │
│  │ user        │  │ sidebarOpen │  │ theme       │             │
│  │ setUser()   │  │ toggleSidebar│ │ language    │             │
│  │ logout()    │  │             │  │ setTheme()  │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                     │
│         └────────────────┼────────────────┘                     │
│                          │                                      │
│                          ▼                                      │
│                  ┌───────────────┐                              │
│                  │   useStore    │                              │
│                  │  (combined)   │                              │
│                  └───────────────┘                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Async Actions

Async Actions sind ganz normale async Funktionen:

```typescript
interface DataState {
  data: Item[];
  isLoading: boolean;
  error: string | null;

  fetchData: () => Promise<void>;
  createItem: (item: Omit<Item, 'id'>) => Promise<void>;
}

const useDataStore = create<DataState>((set, get) => ({
  data: [],
  isLoading: false,
  error: null,

  fetchData: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/items');
      const data = await response.json();
      set({ data, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false
      });
    }
  },

  createItem: async (newItem) => {
    set({ isLoading: true });
    try {
      const response = await fetch('/api/items', {
        method: 'POST',
        body: JSON.stringify(newItem),
      });
      const created = await response.json();
      // Optimistic Update: Füge zum bestehenden State hinzu
      set((state) => ({
        data: [...state.data, created],
        isLoading: false
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },
}));
```

**Tipp: Für Server-Daten besser React Query verwenden!**

Zustand ist ideal für Client-State. Für Server-State (API-Daten) ist React Query (Kapitel 7) oft die bessere Wahl:

```typescript
// ✅ Kombination: Zustand für UI-State, React Query für Server-State
const useUIStore = create<UIState>((set) => ({
  selectedItemId: null,
  setSelectedItem: (id) => set({ selectedItemId: id }),
}));

function ItemList() {
  // Server-State via React Query
  const { data: items } = useQuery(['items'], fetchItems);

  // UI-State via Zustand
  const selectedId = useUIStore((s) => s.selectedItemId);
  const setSelected = useUIStore((s) => s.setSelectedItem);

  return (
    <ul>
      {items?.map((item) => (
        <li
          key={item.id}
          className={item.id === selectedId ? 'selected' : ''}
          onClick={() => setSelected(item.id)}
        >
          {item.name}
        </li>
      ))}
    </ul>
  );
}
```

---

## 8.8 Vergleich: Zustand vs Redux

### Code-Vergleich: Counter

**Redux (mit Redux Toolkit):**

```typescript
// store/counterSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CounterState {
  value: number;
}

const initialState: CounterState = {
  value: 0,
};

export const counterSlice = createSlice({
  name: 'counter',
  initialState,
  reducers: {
    increment: (state) => {
      state.value += 1;
    },
    decrement: (state) => {
      state.value -= 1;
    },
    incrementByAmount: (state, action: PayloadAction<number>) => {
      state.value += action.payload;
    },
  },
});

export const { increment, decrement, incrementByAmount } = counterSlice.actions;
export default counterSlice.reducer;

// store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import counterReducer from './counterSlice';

export const store = configureStore({
  reducer: {
    counter: counterReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// hooks.ts
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './store';

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// App.tsx
import { Provider } from 'react-redux';
import { store } from './store';

function App() {
  return (
    <Provider store={store}>
      <Counter />
    </Provider>
  );
}

// Counter.tsx
import { useAppSelector, useAppDispatch } from '../hooks';
import { increment, decrement } from '../store/counterSlice';

function Counter() {
  const count = useAppSelector((state) => state.counter.value);
  const dispatch = useAppDispatch();

  return (
    <div>
      <span>{count}</span>
      <button onClick={() => dispatch(increment())}>+</button>
      <button onClick={() => dispatch(decrement())}>-</button>
    </div>
  );
}
```

**Zustand:**

```typescript
// store.ts
import { create } from 'zustand';

interface CounterState {
  count: number;
  increment: () => void;
  decrement: () => void;
  incrementByAmount: (amount: number) => void;
}

export const useCounterStore = create<CounterState>((set) => ({
  count: 0,
  increment: () => set((s) => ({ count: s.count + 1 })),
  decrement: () => set((s) => ({ count: s.count - 1 })),
  incrementByAmount: (amount) => set((s) => ({ count: s.count + amount })),
}));

// Counter.tsx
import { useCounterStore } from './store';

function Counter() {
  const count = useCounterStore((s) => s.count);
  const increment = useCounterStore((s) => s.increment);
  const decrement = useCounterStore((s) => s.decrement);

  return (
    <div>
      <span>{count}</span>
      <button onClick={increment}>+</button>
      <button onClick={decrement}>-</button>
    </div>
  );
}

// App.tsx - KEIN Provider nötig!
function App() {
  return <Counter />;
}
```

### Vergleichstabelle

| Aspekt | Redux Toolkit | Zustand |
|--------|---------------|---------|
| **Dateien für Counter** | 4-5 | 1-2 |
| **Zeilen Code** | ~60 | ~20 |
| **Provider nötig** | Ja | Nein |
| **Bundle Size** | ~27KB | ~1KB |
| **Lernkurve** | Mittel-Hoch | Niedrig |
| **DevTools** | Eingebaut | Via Middleware |
| **TypeScript** | Gut | Exzellent |
| **Async** | Redux Thunk/Saga | Native async/await |
| **Middleware** | Umfangreich | Minimalistisch |
| **Community** | Riesig | Wachsend |
| **Dokumentation** | Umfangreich | Gut |

### Wann Redux, wann Zustand?

**Redux wählen wenn:**
- Sehr große App mit 50+ Entwicklern
- Du strenge Patterns und Konventionen brauchst
- Du das Redux-Ökosystem bereits kennst
- Du komplexe Middleware-Pipelines brauchst
- Enterprise-Umgebung mit Redux-Erfahrung

**Zustand wählen wenn:**
- Kleine bis mittelgroße App
- Du schnell produktiv sein willst
- Du TypeScript liebst
- Bundle-Größe wichtig ist
- Du nicht viel Boilerplate willst
- Es dein erstes React-Projekt ist

**Für HausTracker:** Zustand ist die perfekte Wahl. Die App ist überschaubar, wir brauchen nur wenig globalen State, und die minimale API passt zum pragmatischen Ansatz.

---

## 8.9 Praktisch: HausTracker Store

Jetzt schauen wir uns den echten Store von HausTracker an.

### src/lib/store.ts - Vollständige Analyse

```typescript
import { create } from 'zustand';
import type { Reading, Settings, ReadingStatistics } from '../types';
```

**Zeile 1-2: Imports**

Wir importieren nur `create` von Zustand - das ist alles was wir brauchen. Die Typen kommen aus unserem `types`-Modul.

```typescript
interface AppState {
  // Readings State
  readings: Reading[];
  statistics: ReadingStatistics | null;
  isLoadingReadings: boolean;

  // Settings State
  settings: Settings | null;

  // UI State
  showOnboarding: boolean;

  // Actions
  setReadings: (readings: Reading[]) => void;
  setStatistics: (statistics: ReadingStatistics) => void;
  setSettings: (settings: Settings) => void;
  setShowOnboarding: (show: boolean) => void;
  setIsLoadingReadings: (loading: boolean) => void;
}
```

**Zeile 4-22: Das Interface**

Hier definieren wir die komplette Struktur unseres Stores. Als .NET-Entwickler kannst du dir das wie ein C# Interface vorstellen:

```csharp
// C# Äquivalent
public interface IAppState
{
    List<Reading> Readings { get; }
    ReadingStatistics? Statistics { get; }
    bool IsLoadingReadings { get; }
    Settings? Settings { get; }
    bool ShowOnboarding { get; }

    void SetReadings(List<Reading> readings);
    void SetStatistics(ReadingStatistics statistics);
    // ... etc
}
```

**Die State-Kategorien:**

1. **Readings State** (Zeile 5-7):
   - `readings`: Array aller Zählerablesungen
   - `statistics`: Berechnete Statistiken (Durchschnitt, Total, etc.)
   - `isLoadingReadings`: Loading-Flag für UI

2. **Settings State** (Zeile 9-10):
   - `settings`: App-Einstellungen (Home Assistant URL, Reminder, etc.)

3. **UI State** (Zeile 12-13):
   - `showOnboarding`: Zeigt Onboarding-Flow für neue User

4. **Actions** (Zeile 15-21):
   - Setter-Funktionen für jeden State-Bereich
   - Einfaches Pattern: Eine Action pro State-Feld

```typescript
export const useStore = create<AppState>((set) => ({
```

**Zeile 24: Store erstellen**

`create<AppState>` erstellt einen typisierten Store und gibt einen React Hook zurück. `set` ist die Funktion zum Aktualisieren des States.

```typescript
  // Initial State
  readings: [],
  statistics: null,
  settings: null,
  isLoadingReadings: false,
  showOnboarding: false,
```

**Zeile 25-30: Initial State**

Alle State-Felder bekommen Initialwerte:
- Arrays starten leer (`[]`)
- Objekte die geladen werden starten mit `null`
- Booleans starten mit `false`

**Warum `null` statt `undefined`?**

`null` ist explizit: "Es gibt keinen Wert." Das unterscheidet sich von "noch nicht initialisiert" (`undefined`). In TypeScript macht das einen Unterschied bei Type Guards:

```typescript
// Mit null - explizit prüfbar
if (settings !== null) {
  // settings ist Settings
}

// Mit undefined - könnte auch "vergessen" sein
if (settings !== undefined) {
  // Ist der Key überhaupt da?
}
```

```typescript
  // Actions
  setReadings: (readings) => set({ readings }),
  setStatistics: (statistics) => set({ statistics }),
  setSettings: (settings) => set({ settings }),
  setShowOnboarding: (show) => set({ showOnboarding: show }),
  setIsLoadingReadings: (loading) => set({ isLoadingReadings: loading }),
}));
```

**Zeile 32-37: Actions**

Jede Action ist eine Funktion die `set` aufruft. `set` merged den neuen State mit dem existierenden:

```typescript
// Was passiert intern:
set({ readings })
// Wird zu:
state = { ...state, readings: readings }
```

**Shorthand Property Names:**

```typescript
setReadings: (readings) => set({ readings }),
// Ist das gleiche wie:
setReadings: (readings) => set({ readings: readings }),
```

### Verwendung im Code

**In einer Komponente:**

```tsx
// ReadingList.tsx
function ReadingList() {
  // Nur die Daten die wir brauchen selektieren
  const readings = useStore((state) => state.readings);
  const isLoading = useStore((state) => state.isLoadingReadings);

  if (isLoading) return <Loading />;
  if (readings.length === 0) return <EmptyState />;

  return (
    <ul>
      {readings.map((reading) => (
        <ReadingItem key={reading.id} reading={reading} />
      ))}
    </ul>
  );
}
```

**Beim Laden von Daten:**

```tsx
// Irgendwo in der App
async function loadReadings() {
  const setReadings = useStore.getState().setReadings;
  const setLoading = useStore.getState().setIsLoadingReadings;

  setLoading(true);
  try {
    const readings = await api.getReadings();
    setReadings(readings);
  } finally {
    setLoading(false);
  }
}
```

**Außerhalb von React:**

```typescript
// store ist auch außerhalb von React verfügbar!
const currentReadings = useStore.getState().readings;
useStore.setState({ readings: [] });

// Subscribe to changes
const unsubscribe = useStore.subscribe(
  (state) => console.log('State changed:', state)
);
```

### Die Types

Der Store verwendet diese Typen aus `/src/types/index.ts`:

```typescript
export interface Reading {
  id?: number;
  timestamp: Date;
  meterValue: number;
  unit: 'kWh';

  // Berechnete Werte
  hoursSinceLastReading?: number;
  daysSinceLastReading?: number;
  consumption?: number;
  consumptionPerDay?: number;
  costSinceLastReading?: number;

  // Wetterdaten
  outdoorTemp?: number;
  outdoorTempNight?: number;
  indoorTemp?: number;
  weather?: 'sunny' | 'cloudy' | 'mixed' | 'unknown';

  // Meta
  source: 'ocr' | 'manual' | 'import';
  ocrConfidence?: number;
  notes?: string;
  tags?: string[];
  imageData?: string;
  synced: boolean;
}

export interface ReadingStatistics {
  totalReadings: number;
  averageConsumption: number;
  averageConsumptionPerDay: number;
  totalConsumption: number;
  lastReading?: Reading;
  daysSinceLastReading: number;

  // Kosten
  currentMonthCost?: number;
  currentMonthConsumption?: number;
  projectedMonthlyCost?: number;
  currentBalance?: number;
}

export interface Settings {
  id: 'main';

  // Home Assistant
  homeAssistantUrl?: string;
  homeAssistantToken?: string;
  temperatureSensorEntity?: string;
  indoorTempSensorEntity?: string;
  brightnessSensorEntities?: string[];

  // ELWA Heizstab
  elwaPowerSensorEntity?: string;
  elwaWaterTempBottomEntity?: string;
  elwaWaterTempTopEntity?: string;

  // Erinnerungen
  reminderIntervalDays: number;
  reminderEnabled: boolean;

  // Ziele
  targetConsumptionMonthly?: number;
  targetConsumptionYearly?: number;
}
```

### Warum so einfach?

Du fragst dich vielleicht: "Ist das nicht zu simpel? Keine async Actions? Keine komplexere Logik?"

**Die Antwort:** Absichtlich!

Der HausTracker Store hält nur UI-State:
- Was wurde geladen? (`readings`, `statistics`, `settings`)
- Was ist der UI-Zustand? (`isLoadingReadings`, `showOnboarding`)

Die eigentliche Datenbeschaffung passiert woanders:
- API-Calls in Service-Funktionen
- React Query für Server-State (falls später hinzugefügt)
- Der Store ist nur der "Ort wo Daten leben"

Das ist ein gutes Pattern: **Single Responsibility**. Der Store speichert, er fetched nicht.

### Mögliche Erweiterungen

**Mit persist Middleware:**

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      // ... gleicher Code
    }),
    {
      name: 'haustracker-storage',
      partialize: (state) => ({
        // Nur Settings persistieren, nicht Readings
        settings: state.settings,
        showOnboarding: state.showOnboarding,
      }),
    }
  )
);
```

**Mit devtools:**

```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export const useStore = create<AppState>()(
  devtools(
    (set) => ({
      readings: [],
      setReadings: (readings) =>
        set({ readings }, false, 'setReadings'),
      // ...
    }),
    { name: 'HausTracker' }
  )
);
```

---

## Zusammenfassung

| Konzept | Beschreibung |
|---------|--------------|
| **Prop Drilling** | Problem: Props durch viele Ebenen weitergeben |
| **Zustand** | Minimale State-Management-Library (~1KB) |
| **create()** | Erstellt Store und gibt Hook zurück |
| **set()** | Funktion zum State-Update (merged automatisch) |
| **get()** | Funktion zum State-Lesen |
| **Selektoren** | Nur benötigten State abonnieren für Performance |
| **Middleware** | persist, devtools, immer |
| **Slices** | Pattern für große Stores |

**Wann Zustand verwenden:**
- Client-State (UI-Zustand, lokale Daten)
- Wenn Props zu weit gereicht werden müssen
- Wenn Context zu viele Re-renders verursacht

**Wann NICHT Zustand:**
- Server-State → React Query
- Formular-State → lokaler useState
- URL-State → Router

---

## Weiterführende Ressourcen

- [Zustand GitHub](https://github.com/pmndrs/zustand)
- [Zustand Dokumentation](https://docs.pmnd.rs/zustand)
- [Why Zustand](https://blog.bitsrc.io/zustand-a-minimal-state-management-library-for-react-5f25b0c2c0c3)

---

Im nächsten Kapitel schauen wir uns an, wie wir mit **React Hook Form** Formulare bauen - typsicher und performant.
