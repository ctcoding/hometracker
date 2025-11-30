# Kapitel 9: React Router - Client-Side Routing

Als ASP.NET MVC-Entwickler bist du mit Routing bestens vertraut. Du definierst Routes in `Startup.cs` oder nutzt Attribute wie `[Route("api/users/{id}")]`, und der Server entscheidet bei jedem Request, welcher Controller und welche Action aufgerufen wird. In der React-Welt funktioniert Routing fundamental anders - und genau das macht Single Page Applications so performant.

In diesem Kapitel lernst du, wie React Router das Routing komplett in den Browser verlagert, warum das zu einer dramatisch besseren User Experience führt, und wie du die Konzepte, die du aus MVC kennst, auf React Router übertragen kannst.

---

## 9.1 Server-Side vs Client-Side Routing

### Das MVC-Modell: Server entscheidet

In ASP.NET MVC läuft jeder Seitenwechsel nach dem gleichen Schema ab:

```csharp
// Startup.cs oder Program.cs
app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

// UserController.cs
public class UserController : Controller
{
    public IActionResult Details(int id)
    {
        var user = _userService.GetById(id);
        return View(user);
    }
}
```

Der Ablauf bei einem Klick auf einen Link:
1. Browser sendet HTTP-Request an Server
2. Server empfängt Request, parst die URL
3. Routing-Middleware matched Route zu Controller/Action
4. Controller führt Logik aus, lädt Daten
5. View wird gerendert zu HTML
6. Komplettes HTML wird an Browser gesendet
7. Browser verwirft aktuellen DOM, parst neues HTML
8. CSS wird neu angewendet, JavaScript neu ausgeführt

### Das SPA-Modell: Browser entscheidet

Bei einer Single Page Application mit React Router sieht das komplett anders aus:

```tsx
// App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/users/:id" element={<UserDetails />} />
      </Routes>
    </BrowserRouter>
  );
}
```

Der Ablauf bei einem Klick auf einen Link:
1. React Router fängt den Klick ab (verhindert Default-Verhalten)
2. URL im Browser wird aktualisiert (History API)
3. React Router matched neue URL zu Route
4. Entsprechende Komponente wird gerendert
5. React aktualisiert nur geänderte DOM-Teile

**Kein Server-Request, kein Page Reload, keine Wartezeit.**

### Request Flow Vergleich

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SERVER-SIDE ROUTING (MVC)                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Browser                    Internet                Server         │
│   ┌──────┐                                          ┌──────┐       │
│   │ Link │ ──── HTTP GET /users/42 ──────────────► │Route │       │
│   │Click │                                          │Match │       │
│   └──────┘                                          └──┬───┘       │
│      │                                                 │           │
│      │                                                 ▼           │
│      │                                          ┌───────────┐     │
│      │                                          │Controller │     │
│      │                                          │  Action   │     │
│      │                                          └─────┬─────┘     │
│      │                                                │           │
│      │                                                ▼           │
│      │                                          ┌───────────┐     │
│      │                                          │   View    │     │
│      │                                          │  Render   │     │
│      │                                          └─────┬─────┘     │
│      │                                                │           │
│      ▼                                                │           │
│   ┌──────┐                                            │           │
│   │Parse │ ◄────── Full HTML Response ───────────────┘           │
│   │ HTML │         (50-500kb)                                     │
│   └──────┘                                                        │
│      │                                                            │
│      ▼                                                            │
│   ┌──────┐                                                        │
│   │White │  ← Seite ist kurz weiß/leer                           │
│   │Screen│                                                        │
│   └──────┘                                                        │
│      │                                                            │
│      ▼                                                            │
│   ┌──────┐                                                        │
│   │ New  │                                                        │
│   │ Page │                                                        │
│   └──────┘                                                        │
│                                                                     │
│   Latenz: 200-1000ms (Netzwerk + Server-Rendering)                │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                   CLIENT-SIDE ROUTING (React Router)                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Browser (alles lokal!)                                           │
│   ┌──────────┐                                                     │
│   │  Link    │                                                     │
│   │  Click   │                                                     │
│   └────┬─────┘                                                     │
│        │ preventDefault()                                          │
│        ▼                                                           │
│   ┌──────────┐                                                     │
│   │ History  │ window.history.pushState()                         │
│   │  Update  │ URL: /users/42                                     │
│   └────┬─────┘                                                     │
│        │                                                           │
│        ▼                                                           │
│   ┌──────────┐                                                     │
│   │  Route   │ React Router matched /users/:id                    │
│   │  Match   │                                                     │
│   └────┬─────┘                                                     │
│        │                                                           │
│        ▼                                                           │
│   ┌──────────┐                                                     │
│   │Component │ <UserDetails /> wird gerendert                     │
│   │  Render  │                                                     │
│   └────┬─────┘                                                     │
│        │                                                           │
│        ▼                                                           │
│   ┌──────────┐                                                     │
│   │   DOM    │ React aktualisiert nur geänderte Teile             │
│   │  Update  │ (Layout bleibt, nur Content ändert sich)           │
│   └──────────┘                                                     │
│                                                                     │
│   Latenz: 10-50ms (nur JavaScript-Ausführung)                     │
│                                                                     │
│   Hinweis: Daten werden separat per API geladen (falls nötig)     │
└─────────────────────────────────────────────────────────────────────┘
```

### Wann braucht eine SPA den Server?

Eine SPA kommuniziert mit dem Server nur noch für:
- **API-Calls**: Daten laden/speichern (`GET /api/users/42`)
- **Initialer Load**: Die erste HTML-Seite mit dem React-Bundle
- **Assets**: Bilder, Fonts, etc.

Das Routing selbst ist komplett clientseitig.

---

## 9.2 React Router Grundlagen

### Installation

```bash
npm install react-router-dom
```

Die Typen sind bereits enthalten (`@types/react-router-dom` ist nicht mehr nötig ab v6).

### Die drei Kernkomponenten

#### BrowserRouter

Der `BrowserRouter` ist der äußerste Container, der die History API des Browsers nutzt:

```tsx
import { BrowserRouter } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      {/* Deine App hier */}
    </BrowserRouter>
  );
}
```

**MVC-Analogie**: Das entspricht `app.UseRouting()` in der Middleware-Pipeline.

Es gibt auch alternative Router:
- `HashRouter`: Nutzt Hash-URLs (`/#/users/42`) - nützlich wenn der Server nicht konfiguriert werden kann
- `MemoryRouter`: Hält die URL im Memory - für Tests oder Native Apps
- `StaticRouter`: Für Server-Side Rendering

#### Routes und Route

```tsx
import { Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/users" element={<UserList />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
```

**MVC-Analogie**:
```csharp
// Das entspricht etwa:
endpoints.MapControllerRoute("home", "/", new { controller = "Home", action = "Index" });
endpoints.MapControllerRoute("about", "/about", new { controller = "Home", action = "About" });
endpoints.MapControllerRoute("users", "/users", new { controller = "User", action = "List" });
// Und der Catch-All:
endpoints.MapFallbackToController("NotFound", "Error");
```

Die `*`-Route am Ende fängt alle nicht gematchten URLs - perfekt für 404-Seiten.

### Link vs a-Tag

In MVC verwendest du normale Anchor-Tags oder Html-Helper:

```html
<!-- Razor View -->
<a href="/users/42">User Details</a>
@Html.ActionLink("User Details", "Details", "User", new { id = 42 })
```

In React **musst** du die `Link`-Komponente verwenden:

```tsx
import { Link } from 'react-router-dom';

function Navigation() {
  return (
    <nav>
      {/* RICHTIG: React Router fängt den Klick ab */}
      <Link to="/users/42">User Details</Link>

      {/* FALSCH: Löst Page Reload aus! */}
      <a href="/users/42">User Details</a>
    </nav>
  );
}
```

**Warum?** Ein normales `<a>`-Tag löst einen HTTP-Request aus. Der Browser lädt die komplette Seite neu, alle React-States gehen verloren, und die SPA-Vorteile sind dahin.

`Link` hingegen:
1. Rendert ein `<a>`-Tag (für SEO und Accessibility)
2. Fängt den Click-Event ab
3. Nutzt `history.pushState()` um die URL zu ändern
4. Triggert React Router zum Re-Render

### NavLink für aktive Navigation

`NavLink` ist wie `Link`, aber mit automatischer Active-State-Erkennung:

```tsx
import { NavLink } from 'react-router-dom';

function Navigation() {
  return (
    <nav>
      <NavLink
        to="/"
        className={({ isActive }) => isActive ? 'nav-active' : ''}
      >
        Home
      </NavLink>

      <NavLink
        to="/users"
        style={({ isActive }) => ({
          fontWeight: isActive ? 'bold' : 'normal',
          color: isActive ? 'blue' : 'black'
        })}
      >
        Users
      </NavLink>
    </nav>
  );
}
```

**MVC-Analogie**: In Razor hast du vielleicht sowas gemacht:
```html
<li class="@(ViewContext.RouteData.Values["controller"].ToString() == "User" ? "active" : "")">
    @Html.ActionLink("Users", "Index", "User")
</li>
```

Mit `NavLink` ist das viel eleganter - der Active-State wird automatisch verwaltet.

---

## 9.3 Route Parameter

### Das :id Pattern

Route-Parameter kennst du aus MVC:

```csharp
// MVC
[Route("users/{id}")]
public IActionResult Details(int id) { ... }
```

In React Router sieht das sehr ähnlich aus:

```tsx
// Route Definition
<Route path="/users/:id" element={<UserDetails />} />

// Auch mehrere Parameter sind möglich
<Route path="/users/:userId/posts/:postId" element={<PostDetails />} />
```

### Der useParams Hook

Um auf die Parameter zuzugreifen, verwendest du den `useParams` Hook:

```tsx
import { useParams } from 'react-router-dom';

function UserDetails() {
  // Typisierung für TypeScript
  const { id } = useParams<{ id: string }>();

  // ACHTUNG: id ist immer ein string!
  // Für numerische IDs musst du konvertieren:
  const userId = parseInt(id ?? '0', 10);

  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUser(userId).then(setUser);
  }, [userId]);

  if (!user) return <Loading />;

  return (
    <div>
      <h1>{user.name}</h1>
      <p>ID: {user.id}</p>
    </div>
  );
}
```

**Wichtiger Unterschied zu MVC**: In ASP.NET MVC kannst du Parameter direkt als `int` deklarieren und das Framework konvertiert automatisch. In React Router sind alle Parameter **immer Strings**. Du musst selbst konvertieren und validieren.

### Vergleich zu MVC Route Constraints

MVC bietet mächtige Route Constraints:

```csharp
// MVC Route Constraints
[Route("users/{id:int}")]           // Nur Integer
[Route("users/{id:int:min(1)}")]    // Integer >= 1
[Route("users/{id:guid}")]          // Nur GUIDs
[Route("products/{slug:regex(^[a-z]+$)}")] // Regex
```

React Router hat **keine eingebauten Constraints**. Du musst die Validierung selbst implementieren:

```tsx
import { useParams, Navigate } from 'react-router-dom';

function UserDetails() {
  const { id } = useParams<{ id: string }>();

  // Eigene Validierung
  const userId = parseInt(id ?? '', 10);

  // Wenn keine gültige Zahl, zur 404 weiterleiten
  if (isNaN(userId) || userId < 1) {
    return <Navigate to="/404" replace />;
  }

  // ... Rest der Komponente
}
```

Oder als wiederverwendbare Wrapper-Komponente:

```tsx
interface ValidatedRouteProps {
  paramName: string;
  validate: (value: string) => boolean;
  children: React.ReactNode;
}

function ValidatedRoute({ paramName, validate, children }: ValidatedRouteProps) {
  const params = useParams();
  const value = params[paramName];

  if (!value || !validate(value)) {
    return <Navigate to="/404" replace />;
  }

  return <>{children}</>;
}

// Verwendung
<Route
  path="/users/:id"
  element={
    <ValidatedRoute
      paramName="id"
      validate={(v) => /^\d+$/.test(v)}
    >
      <UserDetails />
    </ValidatedRoute>
  }
/>
```

### Optionale Parameter

In MVC markierst du Parameter als optional mit `?`:

```csharp
// MVC
[Route("products/{category?}")]
public IActionResult List(string? category) { ... }
```

In React Router definierst du mehrere Routes:

```tsx
// React Router - zwei separate Routes
<Route path="/products" element={<ProductList />} />
<Route path="/products/:category" element={<ProductList />} />

// In der Komponente
function ProductList() {
  const { category } = useParams<{ category?: string }>();

  // category ist undefined wenn /products aufgerufen wird
  // category hat einen Wert bei /products/electronics
}
```

---

## 9.4 Nested Routes

### Das Konzept

In MVC hast du Layout-Pages, die den gemeinsamen Rahmen definieren:

```html
<!-- _Layout.cshtml -->
<!DOCTYPE html>
<html>
<head>...</head>
<body>
    <header>Navigation</header>
    <main>
        @RenderBody()  <!-- Hier kommt der spezifische Content -->
    </main>
    <footer>...</footer>
</body>
</html>
```

React Router bietet mit Nested Routes ein ähnliches, aber flexibleres Konzept.

### Die Outlet-Komponente

`Outlet` ist das React-Router-Äquivalent zu `@RenderBody()`:

```tsx
import { Outlet } from 'react-router-dom';

// Layout-Komponente
function AdminLayout() {
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <nav>
          <Link to="/admin/dashboard">Dashboard</Link>
          <Link to="/admin/users">Users</Link>
          <Link to="/admin/settings">Settings</Link>
        </nav>
      </aside>
      <main className="admin-content">
        <Outlet />  {/* Hier werden Child-Routes gerendert */}
      </main>
    </div>
  );
}
```

### Route-Definition mit Nested Routes

```tsx
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Öffentliche Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />

        {/* Admin-Bereich mit eigenem Layout */}
        <Route path="/admin" element={<AdminLayout />}>
          {/* Diese Routes werden im Outlet gerendert */}
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="users/:id" element={<AdminUserDetail />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

**Wichtig**: Die `index`-Route wird gerendert, wenn exakt `/admin` aufgerufen wird (ohne weitere Pfadsegmente).

### Mehrere Verschachtelungsebenen

Du kannst beliebig tief verschachteln:

```tsx
<Route path="/admin" element={<AdminLayout />}>
  <Route index element={<AdminDashboard />} />

  {/* Zweite Verschachtelungsebene */}
  <Route path="users" element={<UsersLayout />}>
    <Route index element={<UserList />} />
    <Route path=":id" element={<UserDetail />} />
    <Route path=":id/edit" element={<UserEdit />} />
  </Route>
</Route>
```

```tsx
// UsersLayout.tsx
function UsersLayout() {
  return (
    <div>
      <h2>User Management</h2>
      <nav>
        <Link to="/admin/users">Alle User</Link>
        <Link to="/admin/users/new">Neuer User</Link>
      </nav>
      <Outlet />  {/* UserList, UserDetail, oder UserEdit */}
    </div>
  );
}
```

### Layout Routes ohne Pfad

Manchmal willst du ein Layout teilen, ohne einen Pfad hinzuzufügen:

```tsx
<Routes>
  {/* Diese Route hat keinen path - nur ein Layout! */}
  <Route element={<MarketingLayout />}>
    <Route path="/" element={<Home />} />
    <Route path="/about" element={<About />} />
    <Route path="/contact" element={<Contact />} />
  </Route>

  {/* Anderes Layout */}
  <Route element={<AppLayout />}>
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/profile" element={<Profile />} />
  </Route>
</Routes>
```

---

## 9.5 Programmatic Navigation

### Der useNavigate Hook

In MVC verwendest du `RedirectToAction` für Weiterleitungen:

```csharp
// MVC Controller
public IActionResult CreateUser(UserViewModel model)
{
    if (!ModelState.IsValid)
        return View(model);

    var user = _userService.Create(model);

    // Weiterleitung nach erfolgreicher Aktion
    return RedirectToAction("Details", new { id = user.Id });
}
```

In React verwendest du den `useNavigate` Hook:

```tsx
import { useNavigate } from 'react-router-dom';

function CreateUserForm() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', email: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const user = await createUser(formData);

      // Entspricht RedirectToAction("Details", new { id = user.Id })
      navigate(`/users/${user.id}`);

    } catch (error) {
      // Fehlerbehandlung
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form Fields */}
    </form>
  );
}
```

### Navigation mit Optionen

```tsx
const navigate = useNavigate();

// Einfache Navigation
navigate('/users');

// Mit replace (ersetzt aktuellen History-Eintrag)
// Entspricht RedirectToAction mit permanent: false
navigate('/users', { replace: true });

// Zurück navigieren (wie Browser-Back-Button)
navigate(-1);

// Zwei Seiten zurück
navigate(-2);

// Vorwärts
navigate(1);

// Mit State (unsichtbare Daten mitgeben)
navigate('/confirmation', {
  state: {
    orderId: 123,
    message: 'Erfolgreich erstellt!'
  }
});
```

### State zwischen Routes übergeben

```tsx
// Seite A: State mitgeben
function OrderForm() {
  const navigate = useNavigate();

  const handleSubmit = async () => {
    const order = await createOrder(data);
    navigate('/order-confirmation', {
      state: {
        orderId: order.id,
        total: order.total
      }
    });
  };
}

// Seite B: State empfangen
import { useLocation } from 'react-router-dom';

function OrderConfirmation() {
  const location = useLocation();
  const { orderId, total } = location.state || {};

  // Fallback wenn direkt auf URL zugegriffen wird
  if (!orderId) {
    return <Navigate to="/orders" replace />;
  }

  return (
    <div>
      <h1>Bestellung #{orderId} erfolgreich!</h1>
      <p>Gesamtsumme: {total} EUR</p>
    </div>
  );
}
```

**MVC-Analogie**: Das entspricht `TempData` in ASP.NET MVC - Daten, die nur für den nächsten Request/Navigation verfügbar sind.

---

## 9.6 Query Parameters

### useSearchParams Hook

In MVC greifst du auf Query-Parameter über das Request-Objekt zu:

```csharp
// MVC: /products?category=electronics&sort=price
public IActionResult List(string? category, string sort = "name")
{
    // category = "electronics"
    // sort = "price"
}
```

In React Router verwendest du `useSearchParams`:

```tsx
import { useSearchParams } from 'react-router-dom';

function ProductList() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Lesen
  const category = searchParams.get('category');  // "electronics" oder null
  const sort = searchParams.get('sort') ?? 'name'; // Default "name"
  const page = parseInt(searchParams.get('page') ?? '1', 10);

  // Alle Werte eines Parameters (bei mehrfachen Werten)
  // /products?tag=new&tag=sale
  const tags = searchParams.getAll('tag');  // ["new", "sale"]

  return (
    <div>
      <h1>Produkte</h1>
      <p>Kategorie: {category ?? 'Alle'}</p>
      <p>Sortierung: {sort}</p>
      <p>Seite: {page}</p>
    </div>
  );
}
```

### Query Parameter ändern

```tsx
function ProductFilter() {
  const [searchParams, setSearchParams] = useSearchParams();

  const handleCategoryChange = (category: string) => {
    // Komplett neue Parameter setzen
    setSearchParams({ category, page: '1' });
  };

  const handleSortChange = (sort: string) => {
    // Bestehende Parameter erhalten, nur sort ändern
    setSearchParams(prev => {
      prev.set('sort', sort);
      return prev;
    });
  };

  const handleClearFilters = () => {
    // Alle Parameter löschen
    setSearchParams({});
  };

  const handlePageChange = (page: number) => {
    setSearchParams(prev => {
      prev.set('page', page.toString());
      return prev;
    });
  };

  return (
    <div>
      <select
        value={searchParams.get('category') ?? ''}
        onChange={(e) => handleCategoryChange(e.target.value)}
      >
        <option value="">Alle Kategorien</option>
        <option value="electronics">Elektronik</option>
        <option value="clothing">Kleidung</option>
      </select>

      <select
        value={searchParams.get('sort') ?? 'name'}
        onChange={(e) => handleSortChange(e.target.value)}
      >
        <option value="name">Name</option>
        <option value="price">Preis</option>
        <option value="date">Datum</option>
      </select>

      <button onClick={handleClearFilters}>Filter zurücksetzen</button>
    </div>
  );
}
```

### URL State Management

Ein großer Vorteil von Query Parametern: **Die URL ist teilbar und bookmarkbar.**

```tsx
// Komplexer Filter-State in der URL
// /products?category=electronics&minPrice=100&maxPrice=500&sort=price&order=asc&page=2

function useProductFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  // State aus URL lesen
  const filters = {
    category: searchParams.get('category'),
    minPrice: searchParams.get('minPrice')
      ? parseInt(searchParams.get('minPrice')!, 10)
      : undefined,
    maxPrice: searchParams.get('maxPrice')
      ? parseInt(searchParams.get('maxPrice')!, 10)
      : undefined,
    sort: searchParams.get('sort') ?? 'name',
    order: (searchParams.get('order') ?? 'asc') as 'asc' | 'desc',
    page: parseInt(searchParams.get('page') ?? '1', 10),
  };

  // State in URL schreiben
  const setFilters = (newFilters: Partial<typeof filters>) => {
    setSearchParams(prev => {
      Object.entries(newFilters).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') {
          prev.delete(key);
        } else {
          prev.set(key, String(value));
        }
      });
      return prev;
    });
  };

  return { filters, setFilters };
}
```

**Vorteile gegenüber React State**:
- URL kann geteilt werden
- Browser Back/Forward funktioniert
- Seite kann refreshed werden ohne State-Verlust
- SEO-freundlich (Suchmaschinen können filtern)

---

## 9.7 Protected Routes

### Auth-Checks implementieren

In MVC nutzt du das `[Authorize]`-Attribut:

```csharp
[Authorize]
public class AdminController : Controller
{
    public IActionResult Dashboard() { ... }
}

[Authorize(Roles = "Admin")]
public class SuperAdminController : Controller
{
    public IActionResult Settings() { ... }
}
```

In React Router erstellst du eine Wrapper-Komponente:

```tsx
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth(); // Dein Auth-Hook
  const location = useLocation();

  // Während Auth-Status geladen wird
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Nicht eingeloggt -> zum Login weiterleiten
  if (!user) {
    // state speichert woher der User kam
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Eingeloggt -> Inhalt anzeigen
  return <>{children}</>;
}
```

### Verwendung in Routes

```tsx
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Öffentliche Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Geschützte Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
```

### Layout-basierte Protected Routes

Eleganter mit Layout Routes:

```tsx
function ProtectedLayout() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  return <Outlet />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Öffentlich */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />

        {/* Alles unter dieser Route ist geschützt */}
        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

### Rollenbasierte Zugriffskontrolle

```tsx
interface RoleProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles: string[];
}

function RoleProtectedRoute({ children, requiredRoles }: RoleProtectedRouteProps) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Prüfe ob User mindestens eine der erforderlichen Rollen hat
  const hasRequiredRole = requiredRoles.some(role =>
    user.roles.includes(role)
  );

  if (!hasRequiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}

// Verwendung
<Route
  path="/admin"
  element={
    <RoleProtectedRoute requiredRoles={['Admin', 'SuperAdmin']}>
      <AdminPanel />
    </RoleProtectedRoute>
  }
/>
```

### Nach Login zurück zur ursprünglichen Seite

```tsx
function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  // Woher kam der User?
  const from = (location.state as { from?: Location })?.from?.pathname || '/dashboard';

  const handleSubmit = async (credentials: Credentials) => {
    try {
      await login(credentials);
      // Zurück zur ursprünglichen Seite
      navigate(from, { replace: true });
    } catch (error) {
      // Fehlerbehandlung
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Login Form */}
    </form>
  );
}
```

---

## 9.8 Route Loaders & Actions (v6.4+)

React Router v6.4 führte ein neues Paradigma ein: **Daten laden bevor die Komponente rendert.** Das ist näher am MVC-Modell, wo der Controller Daten lädt bevor die View gerendert wird.

### createBrowserRouter

Um Loaders und Actions zu nutzen, verwendest du `createBrowserRouter` statt `BrowserRouter`:

```tsx
import {
  createBrowserRouter,
  RouterProvider,
  useLoaderData
} from 'react-router-dom';

// Route mit Loader definieren
const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/users',
    element: <UserList />,
    loader: async () => {
      const response = await fetch('/api/users');
      return response.json();
    },
  },
  {
    path: '/users/:id',
    element: <UserDetails />,
    loader: async ({ params }) => {
      const response = await fetch(`/api/users/${params.id}`);
      if (!response.ok) {
        throw new Response('User not found', { status: 404 });
      }
      return response.json();
    },
  },
]);

function App() {
  return <RouterProvider router={router} />;
}
```

### useLoaderData

In der Komponente greifst du auf die geladenen Daten zu:

```tsx
import { useLoaderData } from 'react-router-dom';

interface User {
  id: number;
  name: string;
  email: string;
}

function UserDetails() {
  // Daten sind bereits geladen wenn die Komponente rendert!
  const user = useLoaderData() as User;

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}
```

**MVC-Analogie**: Das ist wie in MVC, wo der Controller die Daten lädt und an die View übergibt:

```csharp
// MVC - Controller lädt Daten VOR dem View-Rendering
public IActionResult Details(int id)
{
    var user = _userService.GetById(id);
    return View(user);  // Daten sind da wenn View rendert
}
```

### Form Actions

Actions ermöglichen es, Formulardaten zu verarbeiten:

```tsx
import {
  Form,
  redirect,
  useActionData
} from 'react-router-dom';

const router = createBrowserRouter([
  {
    path: '/users/new',
    element: <CreateUser />,
    action: async ({ request }) => {
      const formData = await request.formData();

      const newUser = {
        name: formData.get('name'),
        email: formData.get('email'),
      };

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });

      if (!response.ok) {
        // Fehler zurückgeben
        return { error: 'Fehler beim Erstellen' };
      }

      const user = await response.json();
      // Weiterleitung nach Erfolg
      return redirect(`/users/${user.id}`);
    },
  },
]);

function CreateUser() {
  const actionData = useActionData() as { error?: string } | undefined;

  return (
    <Form method="post">
      {actionData?.error && <div className="error">{actionData.error}</div>}

      <input name="name" placeholder="Name" required />
      <input name="email" type="email" placeholder="Email" required />
      <button type="submit">Erstellen</button>
    </Form>
  );
}
```

**Wichtig**: Verwende `<Form>` statt `<form>` - React Router fängt den Submit ab und ruft die Action auf.

### Error Boundaries für Routes

```tsx
const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <GlobalErrorPage />,
    children: [
      {
        path: 'users/:id',
        element: <UserDetails />,
        loader: userLoader,
        errorElement: <UserErrorPage />,
      },
    ],
  },
]);

function UserErrorPage() {
  const error = useRouteError();

  if (error instanceof Response && error.status === 404) {
    return <h1>User nicht gefunden</h1>;
  }

  return <h1>Ein Fehler ist aufgetreten</h1>;
}
```

---

## 9.9 Best Practices

### Route-Organisation

Für größere Projekte: Routen in separate Dateien auslagern:

```
src/
├── routes/
│   ├── index.tsx          # Haupt-Router
│   ├── publicRoutes.tsx   # Öffentliche Routes
│   ├── authRoutes.tsx     # Auth-relevante Routes
│   ├── adminRoutes.tsx    # Admin-Bereich
│   └── userRoutes.tsx     # User-spezifische Routes
```

```tsx
// routes/index.tsx
import { createBrowserRouter } from 'react-router-dom';
import { publicRoutes } from './publicRoutes';
import { authRoutes } from './authRoutes';
import { adminRoutes } from './adminRoutes';
import RootLayout from '../layouts/RootLayout';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      ...publicRoutes,
      ...authRoutes,
      ...adminRoutes,
    ],
  },
]);

// routes/adminRoutes.tsx
import { RouteObject } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import ProtectedRoute from '../components/ProtectedRoute';

export const adminRoutes: RouteObject[] = [
  {
    path: 'admin',
    element: (
      <ProtectedRoute requiredRoles={['Admin']}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <AdminDashboard /> },
      { path: 'users', element: <AdminUsers /> },
      { path: 'settings', element: <AdminSettings /> },
    ],
  },
];
```

### Lazy Loading mit React.lazy

Für bessere Performance: Komponenten erst laden wenn sie gebraucht werden:

```tsx
import { lazy, Suspense } from 'react';

// Lazy Imports
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminSettings = lazy(() => import('./pages/admin/Settings'));

// Wrapper für Suspense
function LazyLoad({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      {children}
    </Suspense>
  );
}

// In Routes verwenden
const router = createBrowserRouter([
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      {
        index: true,
        element: <LazyLoad><AdminDashboard /></LazyLoad>
      },
      {
        path: 'users',
        element: <LazyLoad><AdminUsers /></LazyLoad>
      },
    ],
  },
]);
```

Oder mit der `lazy`-Funktion von React Router (v6.4+):

```tsx
const router = createBrowserRouter([
  {
    path: '/admin',
    lazy: async () => {
      const { AdminLayout } = await import('./layouts/AdminLayout');
      return { Component: AdminLayout };
    },
    children: [
      {
        index: true,
        lazy: async () => {
          const { AdminDashboard } = await import('./pages/admin/Dashboard');
          return { Component: AdminDashboard };
        },
      },
    ],
  },
]);
```

### Route Constants

Vermeide Magic Strings:

```tsx
// constants/routes.ts
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  USERS: {
    LIST: '/users',
    DETAIL: (id: number | string) => `/users/${id}`,
    EDIT: (id: number | string) => `/users/${id}/edit`,
    NEW: '/users/new',
  },
  ADMIN: {
    ROOT: '/admin',
    DASHBOARD: '/admin/dashboard',
    SETTINGS: '/admin/settings',
  },
} as const;

// Verwendung
import { ROUTES } from '../constants/routes';

<Link to={ROUTES.USERS.DETAIL(42)}>User 42</Link>
navigate(ROUTES.ADMIN.DASHBOARD);
```

---

## 9.10 Praktisch: HausTracker Routing

Schauen wir uns das Routing in unserer HausTracker-App an:

### Die App.tsx im Detail

```tsx
// /src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Scan from './pages/Scan';
import History from './pages/History';
import Settings from './pages/Settings';
import Tariffs from './pages/Tariffs';
import Payments from './pages/Payments';
import AddReading from './pages/AddReading';
import MonthlyStats from './pages/MonthlyStats';
import Statistics from './pages/Statistics';
import Balance from './pages/Balance';
import EditReading from './pages/EditReading';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/scan" element={<Scan />} />
          <Route path="/history" element={<History />} />
          <Route path="/add-reading" element={<AddReading />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/tariffs" element={<Tariffs />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/monthly" element={<MonthlyStats />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/balance" element={<Balance />} />
          <Route path="/edit-reading/:id" element={<EditReading />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
```

### Analyse der Struktur

**1. BrowserRouter als Wrapper**
Die gesamte App ist in `BrowserRouter` gewrappt - damit funktionieren `Link`, `useNavigate` und alle anderen Router-Features.

**2. Layout als gemeinsamer Rahmen**
Das `Layout` ist *außerhalb* von `Routes` platziert. Das bedeutet:
- Das Layout wird bei jeder Route angezeigt
- Es enthält wahrscheinlich Navigation, Header, Footer
- Es wird nie neu gerendert bei Route-Wechseln

Dies ist eine Alternative zu Nested Routes - einfacher, aber weniger flexibel.

**3. Die Routes**

| Route | Komponente | Beschreibung |
|-------|------------|--------------|
| `/` | Dashboard | Startseite mit Übersicht |
| `/scan` | Scan | Zählerstand per Kamera scannen |
| `/history` | History | Verlauf aller Messungen |
| `/add-reading` | AddReading | Manuell Zählerstand eingeben |
| `/settings` | Settings | App-Einstellungen |
| `/tariffs` | Tariffs | Tarifverwaltung |
| `/payments` | Payments | Abschlagszahlungen |
| `/monthly` | MonthlyStats | Monatsstatistiken |
| `/statistics` | Statistics | Detaillierte Statistiken |
| `/balance` | Balance | Kontostand/Guthaben |
| `/edit-reading/:id` | EditReading | Bestimmten Zählerstand bearbeiten |

**4. Route Parameter**
Nur eine Route nutzt Parameter: `/edit-reading/:id`. In der `EditReading`-Komponente wird `useParams()` verwendet um die ID zu extrahieren.

### Verbesserungspotential

Die aktuelle Struktur ist funktional, aber es gibt Optimierungsmöglichkeiten:

**Mit Nested Routes:**
```tsx
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="scan" element={<Scan />} />
          <Route path="history" element={<History />} />
          <Route path="readings">
            <Route path="add" element={<AddReading />} />
            <Route path=":id/edit" element={<EditReading />} />
          </Route>
          <Route path="settings" element={<Settings />} />
          <Route path="tariffs" element={<Tariffs />} />
          <Route path="payments" element={<Payments />} />
          <Route path="statistics">
            <Route index element={<Statistics />} />
            <Route path="monthly" element={<MonthlyStats />} />
          </Route>
          <Route path="balance" element={<Balance />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

**Mit Route Constants:**
```tsx
// constants/routes.ts
export const ROUTES = {
  HOME: '/',
  SCAN: '/scan',
  HISTORY: '/history',
  READINGS: {
    ADD: '/readings/add',
    EDIT: (id: number) => `/readings/${id}/edit`,
  },
  SETTINGS: '/settings',
  TARIFFS: '/tariffs',
  PAYMENTS: '/payments',
  STATISTICS: {
    INDEX: '/statistics',
    MONTHLY: '/statistics/monthly',
  },
  BALANCE: '/balance',
} as const;
```

---

## Zusammenfassung

| Konzept | ASP.NET MVC | React Router |
|---------|-------------|--------------|
| Router Setup | `app.UseRouting()` | `<BrowserRouter>` |
| Route Definition | `MapControllerRoute` | `<Route path="..." />` |
| Route Parameter | `{id}` | `:id` |
| Parameter Zugriff | Action Parameter | `useParams()` |
| Links | `Html.ActionLink` | `<Link to="...">` |
| Redirect | `RedirectToAction` | `navigate()` |
| Query Params | `Request.Query` | `useSearchParams()` |
| Auth | `[Authorize]` | `<ProtectedRoute>` |
| Layout | `_Layout.cshtml` | `<Outlet />` |
| Daten laden | Controller | Loader (v6.4+) |

React Router transformiert deine React-App in eine vollwertige Single Page Application mit schneller, flüssiger Navigation. Das Grundprinzip bleibt gleich wie in MVC: URLs auf Komponenten mappen. Aber alles passiert im Browser - ohne Server-Roundtrips, ohne Page Reloads, ohne Wartezeiten.

Im nächsten Kapitel schauen wir uns an, wie wir mit React Hook Form Formulare elegant handhaben - ein weiterer Bereich, wo React einen anderen, aber mindestens ebenso mächtigen Ansatz bietet wie ASP.NET MVC mit seinen Model-Binding-Features.
