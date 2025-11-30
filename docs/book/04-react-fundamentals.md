# Kapitel 4: React Fundamentals - Komponenten, JSX, Props

## Einleitung

Willkommen in der Welt von React! Wenn du aus der .NET/Razor-Welt kommst, wirst du einige Konzepte wiedererkennen – und andere werden völlig neu sein. In diesem Kapitel legen wir das Fundament für alles, was folgt. Wir werden React nicht nur oberflächlich behandeln, sondern tief verstehen, warum es so funktioniert, wie es funktioniert.

---

## 1. Was ist React?

React ist eine JavaScript-Bibliothek zur Erstellung von Benutzeroberflächen. Entwickelt von Facebook (heute Meta), hat es die Art, wie wir über UI-Entwicklung denken, grundlegend verändert.

### Deklarativ vs. Imperativ

Als .NET-Entwickler kennst du beide Paradigmen. Lass uns den Unterschied anhand eines konkreten Beispiels verdeutlichen:

**Imperativ (jQuery-Style):**
```javascript
// "WIE" soll es passieren?
const button = document.getElementById('counter-btn');
const display = document.getElementById('count-display');
let count = 0;

button.addEventListener('click', function() {
    count++;
    display.textContent = count;

    if (count > 10) {
        display.classList.add('warning');
    }
    if (count > 20) {
        display.classList.remove('warning');
        display.classList.add('danger');
    }
});
```

**Deklarativ (React-Style):**
```jsx
// "WAS" soll dargestellt werden?
function Counter() {
    const [count, setCount] = useState(0);

    const getClassName = () => {
        if (count > 20) return 'danger';
        if (count > 10) return 'warning';
        return '';
    };

    return (
        <div>
            <span className={getClassName()}>{count}</span>
            <button onClick={() => setCount(count + 1)}>
                Erhöhen
            </button>
        </div>
    );
}
```

**Der fundamentale Unterschied:**

| Aspekt | Imperativ | Deklarativ |
|--------|-----------|------------|
| Fokus | WIE (Schritte) | WAS (Ergebnis) |
| DOM-Manipulation | Manuell | Automatisch |
| Zustandsverwaltung | Verstreut | Zentralisiert |
| Fehleranfälligkeit | Hoch | Niedrig |

In Razor kennst du bereits deklarative Elemente:

```csharp
// Razor - auch deklarativ!
@if (Model.Count > 10)
{
    <span class="warning">@Model.Count</span>
}
else
{
    <span>@Model.Count</span>
}
```

React geht diesen Ansatz noch konsequenter – die gesamte UI ist eine Funktion des Zustands.

### Virtual DOM erklärt

Das Virtual DOM ist eines der Kernkonzepte, die React performant machen.

```
┌─────────────────────────────────────────────────────────────────┐
│                        VIRTUAL DOM PROZESS                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   1. STATE CHANGE                                                │
│   ┌──────────────┐                                              │
│   │ count: 5     │  ───>  setState({ count: 6 })                │
│   └──────────────┘                                              │
│                                                                  │
│   2. NEUES VIRTUAL DOM ERSTELLEN                                │
│   ┌─────────────────────────────────────────────────┐           │
│   │  Virtual DOM (alt)    │   Virtual DOM (neu)     │           │
│   │  ┌─────────────┐      │   ┌─────────────┐       │           │
│   │  │    div      │      │   │    div      │       │           │
│   │  │  ┌─────┐    │      │   │  ┌─────┐    │       │           │
│   │  │  │  5  │    │      │   │  │  6  │    │       │           │
│   │  │  └─────┘    │      │   │  └─────┘    │       │           │
│   │  └─────────────┘      │   └─────────────┘       │           │
│   └─────────────────────────────────────────────────┘           │
│                                                                  │
│   3. DIFFING ALGORITHMUS                                         │
│   ┌─────────────────────────────────────────────────┐           │
│   │  Vergleich: Was hat sich geändert?              │           │
│   │  → Nur der Text-Knoten: "5" → "6"               │           │
│   └─────────────────────────────────────────────────┘           │
│                                                                  │
│   4. MINIMALE DOM-UPDATES                                        │
│   ┌─────────────────────────────────────────────────┐           │
│   │  Echtes DOM: Nur der geänderte Text wird        │           │
│   │  aktualisiert - nicht das gesamte Element!      │           │
│   └─────────────────────────────────────────────────┘           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Warum ist das wichtig?**

DOM-Operationen sind teuer. Jede Änderung am echten DOM kann Layout-Neuberechnungen, Repaints und Reflows auslösen. React minimiert diese Operationen durch:

1. **Batching**: Mehrere State-Änderungen werden zusammengefasst
2. **Diffing**: Nur tatsächliche Unterschiede werden berechnet
3. **Reconciliation**: Intelligente Entscheidungen, was aktualisiert werden muss

### Vergleich zu Razor: Templating-Unterschiede

```
┌─────────────────────────────────────────────────────────────────┐
│                    RAZOR VS REACT RENDERING                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  RAZOR (Server-Side)                                            │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐      │
│  │ Request │───>│ Server  │───>│  HTML   │───>│ Browser │      │
│  └─────────┘    │ Render  │    │ String  │    │ Display │      │
│                 └─────────┘    └─────────┘    └─────────┘      │
│                                                                  │
│  Bei Änderung: Kompletter Roundtrip zum Server                  │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  REACT (Client-Side)                                            │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐                     │
│  │  State  │───>│ Virtual │───>│  DOM    │                     │
│  │ Change  │    │  DOM    │    │ Update  │                     │
│  └─────────┘    │  Diff   │    └─────────┘                     │
│                 └─────────┘                                     │
│                                                                  │
│  Alles passiert im Browser - kein Server-Roundtrip!            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

| Aspekt | Razor | React |
|--------|-------|-------|
| Rendering-Ort | Server | Client (Browser) |
| Update-Mechanismus | Page Reload / AJAX | Virtual DOM Diff |
| SEO | Gut (HTML fertig) | Erfordert SSR/SSG |
| Initiale Ladezeit | Schneller | Langsamer (JS laden) |
| Interaktivität | Erfordert JS zusätzlich | Eingebaut |
| State-Management | Session/ViewState | Component State |

---

## 2. JSX - JavaScript XML

JSX ist die Syntax-Erweiterung, die React so elegant macht. Es sieht aus wie HTML, ist aber JavaScript.

### Syntax-Grundlagen

```jsx
// Das ist JSX
const element = <h1>Hallo, Welt!</h1>;

// Was der Browser tatsächlich sieht (nach Kompilierung):
const element = React.createElement('h1', null, 'Hallo, Welt!');
```

**Wichtige Regeln:**

```jsx
// 1. Nur EIN Root-Element (oder Fragment)
// ❌ Falsch
return (
    <h1>Titel</h1>
    <p>Text</p>
);

// ✅ Richtig - mit Container
return (
    <div>
        <h1>Titel</h1>
        <p>Text</p>
    </div>
);

// ✅ Richtig - mit Fragment (kein extra DOM-Element)
return (
    <>
        <h1>Titel</h1>
        <p>Text</p>
    </>
);

// 2. className statt class (class ist reserviert in JS)
<div className="container">...</div>

// 3. htmlFor statt for (bei Labels)
<label htmlFor="email">E-Mail</label>

// 4. camelCase für Attribute
<input tabIndex={1} autoFocus />

// 5. Selbstschließende Tags müssen geschlossen werden
<img src="bild.jpg" />  // ✅
<input type="text" />   // ✅
<br />                  // ✅
```

### JSX vs Razor Syntax Vergleich

Hier eine Gegenüberstellung der Syntax-Elemente:

```csharp
// RAZOR - Variablen ausgeben
<p>@Model.Name</p>
<p>@(Model.FirstName + " " + Model.LastName)</p>
```

```jsx
// REACT - Variablen ausgeben
<p>{name}</p>
<p>{firstName + " " + lastName}</p>
```

```csharp
// RAZOR - HTML-Encoding (automatisch)
<p>@Model.UserInput</p>

// Raw HTML (gefährlich!)
@Html.Raw(Model.HtmlContent)
```

```jsx
// REACT - HTML-Encoding (automatisch)
<p>{userInput}</p>

// Raw HTML (gefährlich!) - Name ist Warnung genug!
<div dangerouslySetInnerHTML={{ __html: htmlContent }} />
```

```csharp
// RAZOR - Code-Blöcke
@{
    var total = items.Sum(x => x.Price);
    var displayText = total > 100 ? "Teuer" : "Günstig";
}
<p>@displayText</p>
```

```jsx
// REACT - Logik VOR dem Return
function PriceDisplay({ items }) {
    const total = items.reduce((sum, item) => sum + item.price, 0);
    const displayText = total > 100 ? "Teuer" : "Günstig";

    return <p>{displayText}</p>;
}
```

### Expressions in JSX

Innerhalb der geschweiften Klammern `{}` kann jeder JavaScript-Ausdruck stehen:

```jsx
function UserProfile({ user }) {
    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('de-DE');
    };

    return (
        <div className="profile">
            {/* String-Interpolation */}
            <h1>{user.firstName} {user.lastName}</h1>

            {/* Berechnungen */}
            <p>Alter: {new Date().getFullYear() - user.birthYear} Jahre</p>

            {/* Funktionsaufrufe */}
            <p>Registriert: {formatDate(user.registeredAt)}</p>

            {/* Template Literals */}
            <img
                src={`/avatars/${user.id}.jpg`}
                alt={`Avatar von ${user.firstName}`}
            />

            {/* Objekt-Zugriff */}
            <p>Adresse: {user.address.street}, {user.address.city}</p>

            {/* Array-Länge */}
            <p>Anzahl Bestellungen: {user.orders.length}</p>
        </div>
    );
}
```

**Was NICHT geht:**

```jsx
// ❌ Statements sind nicht erlaubt
<div>
    {if (condition) { return "Ja"; }}  // Fehler!
    {for (let i = 0; i < 5; i++) { }}  // Fehler!
</div>

// ✅ Stattdessen Expressions verwenden
<div>
    {condition ? "Ja" : "Nein"}
    {[0, 1, 2, 3, 4].map(i => <span key={i}>{i}</span>)}
</div>
```

### Conditional Rendering

React bietet mehrere Muster für bedingtes Rendering:

**1. Ternary Operator (? :)**

```jsx
// Razor-Äquivalent:
// @(Model.IsLoggedIn ? <span>Willkommen</span> : <a href="/login">Login</a>)

function Header({ isLoggedIn, userName }) {
    return (
        <header>
            {isLoggedIn
                ? <span>Willkommen, {userName}!</span>
                : <a href="/login">Bitte einloggen</a>
            }
        </header>
    );
}
```

**2. Logical AND (&&)**

```jsx
// Razor-Äquivalent:
// @if (Model.HasNotifications) { <span class="badge">@Model.NotificationCount</span> }

function NotificationIcon({ hasNotifications, count }) {
    return (
        <div className="notifications">
            <BellIcon />
            {hasNotifications && (
                <span className="badge">{count}</span>
            )}
        </div>
    );
}

// ⚠️ Vorsicht bei Zahlen! 0 wird gerendert!
// ❌ Falsch
{count && <span>{count}</span>}  // Zeigt "0" wenn count = 0

// ✅ Richtig
{count > 0 && <span>{count}</span>}
```

**3. Early Return**

```jsx
function UserDashboard({ user, isLoading, error }) {
    // Loading-Zustand
    if (isLoading) {
        return <LoadingSpinner />;
    }

    // Fehler-Zustand
    if (error) {
        return <ErrorMessage message={error} />;
    }

    // Kein User
    if (!user) {
        return <p>Kein Benutzer gefunden.</p>;
    }

    // Normaler Zustand
    return (
        <div className="dashboard">
            <h1>Willkommen, {user.name}!</h1>
            {/* ... */}
        </div>
    );
}
```

**4. Variable für komplexe Bedingungen**

```jsx
function ProductCard({ product }) {
    // Logik extrahieren für Lesbarkeit
    let statusBadge;
    if (product.stock === 0) {
        statusBadge = <span className="badge-red">Ausverkauft</span>;
    } else if (product.stock < 5) {
        statusBadge = <span className="badge-yellow">Nur noch {product.stock}</span>;
    } else {
        statusBadge = <span className="badge-green">Verfügbar</span>;
    }

    return (
        <div className="product-card">
            <h3>{product.name}</h3>
            {statusBadge}
            <p>{product.price} €</p>
        </div>
    );
}
```

### Listen rendern mit map()

Das Rendern von Listen ist eine der häufigsten Aufgaben:

```csharp
// RAZOR
<ul>
    @foreach (var item in Model.Items)
    {
        <li>@item.Name - @item.Price €</li>
    }
</ul>
```

```jsx
// REACT
function ItemList({ items }) {
    return (
        <ul>
            {items.map(item => (
                <li key={item.id}>
                    {item.name} - {item.price} €
                </li>
            ))}
        </ul>
    );
}
```

**Die key-Prop ist PFLICHT!**

```jsx
// ❌ Warnung: Each child should have a unique "key" prop
{items.map(item => <li>{item.name}</li>)}

// ❌ Index als Key - nur wenn Liste sich nie ändert!
{items.map((item, index) => <li key={index}>{item.name}</li>)}

// ✅ Eindeutige ID als Key
{items.map(item => <li key={item.id}>{item.name}</li>)}
```

**Warum sind Keys wichtig?**

```
┌─────────────────────────────────────────────────────────────────┐
│                     WARUM KEYS WICHTIG SIND                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  OHNE KEYS (oder mit Index):                                    │
│  ┌──────────────────────┐     ┌──────────────────────┐         │
│  │ Liste vorher:        │     │ Liste nachher:       │         │
│  │ [0] Apfel           │     │ [0] Birne  ← NEU     │         │
│  │ [1] Birne           │     │ [1] Apfel            │         │
│  │ [2] Kirsche         │     │ [2] Birne            │         │
│  └──────────────────────┘     │ [3] Kirsche         │         │
│                               └──────────────────────┘         │
│  React denkt: "Index 0 hat sich von Apfel zu Birne geändert"   │
│  → Alle Elemente werden neu gerendert!                         │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  MIT EINDEUTIGEN KEYS:                                          │
│  ┌──────────────────────┐     ┌──────────────────────┐         │
│  │ Liste vorher:        │     │ Liste nachher:       │         │
│  │ [id:1] Apfel        │     │ [id:4] Birne ← NEU   │         │
│  │ [id:2] Birne        │     │ [id:1] Apfel         │         │
│  │ [id:3] Kirsche      │     │ [id:2] Birne         │         │
│  └──────────────────────┘     │ [id:3] Kirsche      │         │
│                               └──────────────────────┘         │
│  React weiß: "Nur ein neues Element mit id:4 wurde eingefügt"  │
│  → Nur das neue Element wird gerendert!                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Komplexeres Listen-Beispiel:**

```jsx
function TaskList({ tasks, onToggle, onDelete }) {
    if (tasks.length === 0) {
        return <p className="empty-state">Keine Aufgaben vorhanden.</p>;
    }

    return (
        <ul className="task-list">
            {tasks.map(task => (
                <li
                    key={task.id}
                    className={`task-item ${task.completed ? 'completed' : ''}`}
                >
                    <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => onToggle(task.id)}
                    />
                    <span className="task-title">{task.title}</span>
                    <span className="task-due">
                        {task.dueDate && `Fällig: ${formatDate(task.dueDate)}`}
                    </span>
                    <button
                        onClick={() => onDelete(task.id)}
                        className="delete-btn"
                    >
                        Löschen
                    </button>
                </li>
            ))}
        </ul>
    );
}
```

---

## 3. Komponenten

Komponenten sind das Herzstück von React. Sie sind wiederverwendbare, isolierte Bausteine deiner UI.

### Function Components (Standard heute)

Seit React 16.8 und der Einführung von Hooks sind Function Components der Standard:

```jsx
// Einfachste Form
function Greeting() {
    return <h1>Hallo!</h1>;
}

// Mit Props
function Greeting({ name }) {
    return <h1>Hallo, {name}!</h1>;
}

// Als Arrow Function (auch verbreitet)
const Greeting = ({ name }) => {
    return <h1>Hallo, {name}!</h1>;
};

// Arrow Function mit implizitem Return
const Greeting = ({ name }) => <h1>Hallo, {name}!</h1>;

// Mit lokalem State (Hook)
function Counter() {
    const [count, setCount] = useState(0);

    return (
        <div>
            <p>Zähler: {count}</p>
            <button onClick={() => setCount(count + 1)}>+1</button>
        </div>
    );
}
```

**Anatomie einer Function Component:**

```jsx
// 1. Import-Statements
import { useState, useEffect } from 'react';
import { formatCurrency } from '../utils/format';
import './ProductCard.css';

// 2. Prop-Types (optional, aber empfohlen)
// Wird oft mit TypeScript ersetzt

// 3. Die Komponente selbst
function ProductCard({ product, onAddToCart }) {
    // 4. Hooks immer am Anfang!
    const [quantity, setQuantity] = useState(1);
    const [isHovered, setIsHovered] = useState(false);

    // 5. Berechnete Werte
    const totalPrice = product.price * quantity;
    const isOutOfStock = product.stock === 0;

    // 6. Event Handler
    const handleAddToCart = () => {
        if (!isOutOfStock) {
            onAddToCart(product.id, quantity);
        }
    };

    // 7. Frühe Returns für Sonderfälle
    if (!product) {
        return null;
    }

    // 8. Das JSX-Return
    return (
        <div
            className={`product-card ${isHovered ? 'hovered' : ''}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <img src={product.imageUrl} alt={product.name} />
            <h3>{product.name}</h3>
            <p className="price">{formatCurrency(product.price)}</p>

            <div className="quantity-selector">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>
                    -
                </button>
                <span>{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)}>
                    +
                </button>
            </div>

            <p className="total">Gesamt: {formatCurrency(totalPrice)}</p>

            <button
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className="add-to-cart-btn"
            >
                {isOutOfStock ? 'Ausverkauft' : 'In den Warenkorb'}
            </button>
        </div>
    );
}

// 9. Export
export default ProductCard;
```

### Class Components (Legacy, aber verstehen)

Class Components waren vor Hooks der Standard. Du wirst sie in älterem Code finden:

```jsx
import React, { Component } from 'react';

class Counter extends Component {
    // State-Initialisierung
    state = {
        count: 0
    };

    // Alternativ im Konstruktor:
    // constructor(props) {
    //     super(props);
    //     this.state = { count: 0 };
    // }

    // Methode als Arrow Function (bindet 'this' automatisch)
    handleIncrement = () => {
        this.setState({ count: this.state.count + 1 });

        // Oder mit Callback für asynchronen State:
        // this.setState(prevState => ({ count: prevState.count + 1 }));
    };

    // Lifecycle-Methode
    componentDidMount() {
        console.log('Komponente wurde gemountet');
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevState.count !== this.state.count) {
            console.log('Count hat sich geändert');
        }
    }

    componentWillUnmount() {
        console.log('Komponente wird entfernt');
    }

    render() {
        return (
            <div>
                <p>Zähler: {this.state.count}</p>
                <button onClick={this.handleIncrement}>+1</button>
            </div>
        );
    }
}
```

**Vergleich Class vs Function Component:**

```jsx
// CLASS COMPONENT
class UserGreeting extends Component {
    state = { isLoggedIn: false };

    componentDidMount() {
        this.checkAuthStatus();
    }

    checkAuthStatus = async () => {
        const status = await authService.check();
        this.setState({ isLoggedIn: status });
    };

    render() {
        const { name } = this.props;
        const { isLoggedIn } = this.state;

        return isLoggedIn
            ? <h1>Willkommen, {name}!</h1>
            : <h1>Bitte einloggen</h1>;
    }
}

// FUNCTION COMPONENT (Modern)
function UserGreeting({ name }) {
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            const status = await authService.check();
            setIsLoggedIn(status);
        };
        checkAuth();
    }, []);

    return isLoggedIn
        ? <h1>Willkommen, {name}!</h1>
        : <h1>Bitte einloggen</h1>;
}
```

### Wann eigene Komponente erstellen?

Eine neue Komponente macht Sinn, wenn:

**1. Wiederverwendbarkeit**
```jsx
// ❌ Copy-Paste
<button className="btn btn-primary" onClick={handleSave}>
    <SaveIcon /> Speichern
</button>
<button className="btn btn-primary" onClick={handleSubmit}>
    <SendIcon /> Absenden
</button>

// ✅ Wiederverwendbare Komponente
function PrimaryButton({ icon, children, onClick }) {
    return (
        <button className="btn btn-primary" onClick={onClick}>
            {icon} {children}
        </button>
    );
}

<PrimaryButton icon={<SaveIcon />} onClick={handleSave}>
    Speichern
</PrimaryButton>
<PrimaryButton icon={<SendIcon />} onClick={handleSubmit}>
    Absenden
</PrimaryButton>
```

**2. Komplexität reduzieren**
```jsx
// ❌ Zu viel in einer Komponente
function Dashboard() {
    return (
        <div>
            {/* 50 Zeilen Header-Logik */}
            {/* 100 Zeilen Sidebar-Logik */}
            {/* 200 Zeilen Content-Logik */}
        </div>
    );
}

// ✅ Aufgeteilt
function Dashboard() {
    return (
        <div>
            <DashboardHeader />
            <DashboardSidebar />
            <DashboardContent />
        </div>
    );
}
```

**3. Eigener State/Logik**
```jsx
// Dropdown hat eigene Open/Close-Logik
function Dropdown({ options, onSelect }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Click-Outside-Handler
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={dropdownRef} className="dropdown">
            <button onClick={() => setIsOpen(!isOpen)}>
                Auswählen
            </button>
            {isOpen && (
                <ul className="dropdown-menu">
                    {options.map(option => (
                        <li key={option.value} onClick={() => {
                            onSelect(option);
                            setIsOpen(false);
                        }}>
                            {option.label}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
```

**Faustregel:** Wenn du beim Lesen einer Komponente scrollen musst, ist sie wahrscheinlich zu groß.

---

## 4. Props

Props (Properties) sind der Mechanismus, um Daten an Komponenten zu übergeben.

### Daten an Komponenten übergeben

```jsx
// Verschiedene Prop-Typen
function UserCard({
    // Primitive
    name,           // string
    age,            // number
    isAdmin,        // boolean

    // Objekte und Arrays
    address,        // object
    hobbies,        // array

    // Funktionen
    onEdit,         // function
    onDelete,       // function

    // Andere Komponenten
    avatar,         // React element
}) {
    return (
        <div className="user-card">
            {avatar}
            <h2>{name}</h2>
            <p>Alter: {age}</p>
            {isAdmin && <span className="badge">Admin</span>}
            <p>Stadt: {address.city}</p>
            <p>Hobbies: {hobbies.join(', ')}</p>
            <button onClick={onEdit}>Bearbeiten</button>
            <button onClick={onDelete}>Löschen</button>
        </div>
    );
}

// Verwendung
<UserCard
    name="Max Mustermann"
    age={32}
    isAdmin={true}
    address={{ street: "Hauptstr. 1", city: "Berlin" }}
    hobbies={["Lesen", "Wandern", "Kochen"]}
    onEdit={() => handleEdit(userId)}
    onDelete={() => handleDelete(userId)}
    avatar={<Avatar src="/max.jpg" />}
/>

// Boolean-Shorthand: true kann weggelassen werden
<UserCard isAdmin />  // Entspricht isAdmin={true}
```

### Props sind read-only!

**Dies ist ein fundamentales React-Prinzip:**

```jsx
// ❌ NIEMALS Props mutieren!
function BadComponent({ items }) {
    items.push({ id: 99, name: 'Neu' });  // VERBOTEN!
    items[0].name = 'Geändert';           // VERBOTEN!
    return <List items={items} />;
}

// ✅ Neue Arrays/Objekte erstellen
function GoodComponent({ items }) {
    const updatedItems = [...items, { id: 99, name: 'Neu' }];
    return <List items={updatedItems} />;
}

// ✅ Für Änderungen: Callback an Parent
function GoodComponent({ items, onAddItem }) {
    const handleAdd = () => {
        onAddItem({ id: 99, name: 'Neu' });
    };

    return (
        <div>
            <List items={items} />
            <button onClick={handleAdd}>Hinzufügen</button>
        </div>
    );
}
```

**Warum read-only?**

```
┌─────────────────────────────────────────────────────────────────┐
│                UNIDIREKTIONALER DATENFLUSS                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                    ┌─────────────┐                              │
│                    │   Parent    │                              │
│                    │   State     │                              │
│                    └──────┬──────┘                              │
│                           │                                      │
│                    Props ↓↓↓                                     │
│                           │                                      │
│              ┌────────────┼────────────┐                        │
│              │            │            │                        │
│        ┌─────▼─────┐ ┌────▼────┐ ┌─────▼─────┐                 │
│        │  Child A  │ │ Child B │ │  Child C  │                 │
│        └─────┬─────┘ └────┬────┘ └─────┬─────┘                 │
│              │            │            │                        │
│              └────────────┼────────────┘                        │
│                           │                                      │
│                  Callbacks ↑↑↑ (Events)                         │
│                           │                                      │
│                    ┌──────┴──────┐                              │
│                    │   Parent    │                              │
│                    │  Handlers   │                              │
│                    └─────────────┘                              │
│                                                                  │
│  • Daten fließen nach UNTEN (Props)                             │
│  • Änderungen werden nach OBEN kommuniziert (Callbacks)         │
│  • Vorhersehbarer, debugbarer Code                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Default Props

```jsx
// Methode 1: Default Parameter (empfohlen)
function Button({
    variant = 'primary',
    size = 'medium',
    disabled = false,
    children
}) {
    return (
        <button
            className={`btn btn-${variant} btn-${size}`}
            disabled={disabled}
        >
            {children}
        </button>
    );
}

// Methode 2: defaultProps (Legacy, aber noch verbreitet)
function Button({ variant, size, disabled, children }) {
    return (
        <button
            className={`btn btn-${variant} btn-${size}`}
            disabled={disabled}
        >
            {children}
        </button>
    );
}

Button.defaultProps = {
    variant: 'primary',
    size: 'medium',
    disabled: false
};

// Verwendung - Defaults werden automatisch angewendet
<Button>Klick mich</Button>
// Entspricht:
<Button variant="primary" size="medium" disabled={false}>Klick mich</Button>
```

### Children Prop

Die spezielle `children`-Prop enthält alles zwischen dem öffnenden und schließenden Tag:

```jsx
// Definition
function Card({ title, children }) {
    return (
        <div className="card">
            <h2 className="card-title">{title}</h2>
            <div className="card-content">
                {children}
            </div>
        </div>
    );
}

// Verwendung - alles zwischen <Card> und </Card> wird zu children
<Card title="Benutzerinfo">
    <p>Name: Max Mustermann</p>
    <p>E-Mail: max@example.com</p>
    <button>Profil bearbeiten</button>
</Card>

// Children können auch Komponenten sein
<Card title="Dashboard">
    <UserStats />
    <RecentOrders />
    <Notifications />
</Card>
```

**Praktisches Beispiel - Modal:**

```jsx
function Modal({ isOpen, onClose, title, children }) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{title}</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    {children}
                </div>
            </div>
        </div>
    );
}

// Verwendung
<Modal
    isOpen={showDeleteConfirm}
    onClose={() => setShowDeleteConfirm(false)}
    title="Löschen bestätigen"
>
    <p>Möchten Sie diesen Eintrag wirklich löschen?</p>
    <p>Diese Aktion kann nicht rückgängig gemacht werden.</p>
    <div className="button-group">
        <button onClick={handleDelete}>Ja, löschen</button>
        <button onClick={() => setShowDeleteConfirm(false)}>Abbrechen</button>
    </div>
</Modal>
```

### Prop Destructuring

```jsx
// ❌ Ohne Destructuring - unübersichtlich
function UserProfile(props) {
    return (
        <div>
            <h1>{props.user.name}</h1>
            <p>{props.user.email}</p>
            <button onClick={props.onLogout}>Abmelden</button>
        </div>
    );
}

// ✅ Mit Destructuring in den Parametern
function UserProfile({ user, onLogout }) {
    return (
        <div>
            <h1>{user.name}</h1>
            <p>{user.email}</p>
            <button onClick={onLogout}>Abmelden</button>
        </div>
    );
}

// ✅ Verschachteltes Destructuring
function UserProfile({ user: { name, email }, onLogout }) {
    return (
        <div>
            <h1>{name}</h1>
            <p>{email}</p>
            <button onClick={onLogout}>Abmelden</button>
        </div>
    );
}

// ✅ Rest-Operator für "durchreichen"
function Button({ variant, size, ...restProps }) {
    return (
        <button
            className={`btn btn-${variant} btn-${size}`}
            {...restProps}  // onClick, disabled, type, etc.
        />
    );
}

// Alle anderen Props werden durchgereicht
<Button
    variant="primary"
    size="large"
    onClick={handleClick}
    disabled={isLoading}
    type="submit"
>
    Speichern
</Button>
```

---

## 5. Component Composition

Composition ist das Designprinzip, mit dem React-Anwendungen skalieren.

### Komponenten verschachteln

```jsx
// Kleine, fokussierte Komponenten
function Avatar({ src, alt, size = 'medium' }) {
    return (
        <img
            src={src}
            alt={alt}
            className={`avatar avatar-${size}`}
        />
    );
}

function UserName({ children, isOnline }) {
    return (
        <span className="user-name">
            {children}
            {isOnline && <span className="online-indicator" />}
        </span>
    );
}

function UserBio({ text }) {
    return <p className="user-bio">{text}</p>;
}

// Zusammengesetzte Komponente
function UserCard({ user }) {
    return (
        <div className="user-card">
            <Avatar
                src={user.avatarUrl}
                alt={`Avatar von ${user.name}`}
                size="large"
            />
            <div className="user-info">
                <UserName isOnline={user.isOnline}>
                    {user.name}
                </UserName>
                <UserBio text={user.bio} />
            </div>
        </div>
    );
}

// Noch weiter komponiert
function UserList({ users }) {
    return (
        <div className="user-list">
            {users.map(user => (
                <UserCard key={user.id} user={user} />
            ))}
        </div>
    );
}
```

### Lifting State Up

Wenn mehrere Komponenten denselben State teilen müssen, wird er in den gemeinsamen Parent "gehoben":

```jsx
// ❌ Problem: Zwei Inputs sollen synchron sein
function TemperatureInput() {
    const [celsius, setCelsius] = useState(0);
    return <input value={celsius} onChange={e => setCelsius(e.target.value)} />;
}

function TemperatureConverter() {
    return (
        <div>
            <TemperatureInput />  {/* Hat eigenen State */}
            <TemperatureInput />  {/* Hat eigenen State - nicht synchron! */}
        </div>
    );
}

// ✅ Lösung: State im Parent halten
function TemperatureInput({ value, onChange, label }) {
    return (
        <div>
            <label>{label}</label>
            <input
                value={value}
                onChange={e => onChange(e.target.value)}
            />
        </div>
    );
}

function TemperatureConverter() {
    const [celsius, setCelsius] = useState(0);

    const fahrenheit = (celsius * 9/5) + 32;

    const handleCelsiusChange = (value) => {
        setCelsius(parseFloat(value) || 0);
    };

    const handleFahrenheitChange = (value) => {
        const f = parseFloat(value) || 0;
        setCelsius((f - 32) * 5/9);
    };

    return (
        <div>
            <TemperatureInput
                label="Celsius"
                value={celsius}
                onChange={handleCelsiusChange}
            />
            <TemperatureInput
                label="Fahrenheit"
                value={fahrenheit}
                onChange={handleFahrenheitChange}
            />
        </div>
    );
}
```

```
┌─────────────────────────────────────────────────────────────────┐
│                      LIFTING STATE UP                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  VORHER:                         NACHHER:                       │
│                                                                  │
│  ┌───────────┐ ┌───────────┐    ┌─────────────────────┐        │
│  │ Input A   │ │ Input B   │    │      Parent         │        │
│  │ state: X  │ │ state: Y  │    │    state: value     │        │
│  └───────────┘ └───────────┘    └──────────┬──────────┘        │
│                                             │                    │
│  Nicht synchron!                   Props ↓  │  ↓ Props          │
│                                             │                    │
│                                  ┌──────────┴──────────┐        │
│                                  │                     │        │
│                             ┌────▼────┐          ┌─────▼────┐   │
│                             │ Input A │          │ Input B  │   │
│                             │ (kein   │          │ (kein    │   │
│                             │  State) │          │  State)  │   │
│                             └────┬────┘          └─────┬────┘   │
│                                  │                     │        │
│                                  └──────────┬──────────┘        │
│                                             │                    │
│                                    Callbacks ↑                   │
│                                                                  │
│  Synchron! Beide zeigen denselben Wert.                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Prop Drilling Problem (Vorschau)

Wenn State durch viele Ebenen gereicht werden muss:

```jsx
// Das Problem: Props durch 4+ Ebenen durchreichen

function App() {
    const [user, setUser] = useState(null);
    const [theme, setTheme] = useState('light');

    return (
        <Layout user={user} theme={theme} setTheme={setTheme}>
            <Sidebar user={user} />
            <Main user={user} theme={theme}>
                <Dashboard user={user} theme={theme}>
                    <UserWidget user={user} />
                </Dashboard>
            </Main>
        </Layout>
    );
}

// Layout braucht user nicht selbst, reicht es nur durch
function Layout({ user, theme, setTheme, children }) { ... }

// Main braucht user nicht selbst, reicht es nur durch
function Main({ user, theme, children }) { ... }

// Dashboard braucht user nicht selbst, reicht es nur durch
function Dashboard({ user, theme, children }) { ... }

// Erst UserWidget braucht user tatsächlich!
function UserWidget({ user }) {
    return <div>Hallo, {user.name}!</div>;
}
```

**Lösungen (werden in späteren Kapiteln behandelt):**

1. **React Context** - für App-weite Daten wie Theme, Auth
2. **State Management Libraries** - Redux, Zustand, Jotai
3. **Component Composition** - Manchmal ist bessere Strukturierung die Lösung

```jsx
// Composition-Alternative zum Prop Drilling
function App() {
    const [user, setUser] = useState(null);

    // UserWidget wird hier erstellt, wo user verfügbar ist
    const userWidget = <UserWidget user={user} />;

    return (
        <Layout>
            <Sidebar />
            <Main>
                <Dashboard userWidget={userWidget} />
            </Main>
        </Layout>
    );
}

// Dashboard bekommt fertige Komponente, nicht rohe Daten
function Dashboard({ userWidget }) {
    return (
        <div className="dashboard">
            {userWidget}
        </div>
    );
}
```

---

## 6. Styling in React

React ist styling-agnostisch – du hast viele Optionen.

### Inline Styles

```jsx
// Inline Styles sind JavaScript-Objekte
function InlineExample() {
    const containerStyle = {
        padding: '20px',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        // camelCase statt kebab-case!
        marginBottom: '16px',
        // Zahlen werden zu Pixeln (außer bei unitless wie zIndex, opacity)
        fontSize: 14,
    };

    const dynamicStyle = {
        color: isActive ? 'green' : 'red',
        fontWeight: isImportant ? 'bold' : 'normal',
    };

    return (
        <div style={containerStyle}>
            <p style={dynamicStyle}>Dynamischer Text</p>
            {/* Inline auch möglich, aber unübersichtlich */}
            <span style={{ color: 'blue', textDecoration: 'underline' }}>
                Link-Style
            </span>
        </div>
    );
}
```

**Vor- und Nachteile:**

| Pro | Contra |
|-----|--------|
| Kein CSS-Konflikt | Keine Pseudo-Selektoren (:hover) |
| Dynamisch | Keine Media Queries |
| Keine Extra-Dateien | Verbose |
| Co-located mit Logik | Keine Wiederverwendung |

### CSS Modules

CSS Modules generieren eindeutige Klassennamen automatisch:

```css
/* Button.module.css */
.button {
    padding: 10px 20px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.primary {
    background-color: #007bff;
    color: white;
}

.secondary {
    background-color: #6c757d;
    color: white;
}

.large {
    padding: 15px 30px;
    font-size: 18px;
}
```

```jsx
// Button.jsx
import styles from './Button.module.css';

function Button({ variant = 'primary', size, children, ...props }) {
    // Klassen kombinieren
    const className = [
        styles.button,
        styles[variant],
        size === 'large' && styles.large,
    ].filter(Boolean).join(' ');

    return (
        <button className={className} {...props}>
            {children}
        </button>
    );
}

// Im Browser wird daraus:
// <button class="Button_button__x7h2s Button_primary__k3j4l">
```

**Mit classnames/clsx Library (empfohlen):**

```jsx
import styles from './Button.module.css';
import clsx from 'clsx';

function Button({ variant = 'primary', size, disabled, children }) {
    return (
        <button
            className={clsx(
                styles.button,
                styles[variant],
                {
                    [styles.large]: size === 'large',
                    [styles.disabled]: disabled,
                }
            )}
            disabled={disabled}
        >
            {children}
        </button>
    );
}
```

### Tailwind CSS (Vorschau)

Tailwind ist ein Utility-First CSS Framework, das in modernen React-Projekten sehr beliebt ist:

```jsx
// Tailwind - Utility Classes direkt im JSX
function ProductCard({ product }) {
    return (
        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <img
                src={product.image}
                alt={product.name}
                className="w-full h-48 object-cover rounded-md mb-4"
            />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {product.name}
            </h3>
            <p className="text-gray-600 text-sm mb-4">
                {product.description}
            </p>
            <div className="flex justify-between items-center">
                <span className="text-xl font-bold text-blue-600">
                    {product.price} €
                </span>
                <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors">
                    In den Warenkorb
                </button>
            </div>
        </div>
    );
}
```

Tailwind wird in Kapitel 6 ausführlich behandelt.

---

## 7. Events

Event-Handling in React ist dem DOM-Event-Handling ähnlich, aber mit wichtigen Unterschieden.

### onClick, onChange, etc.

```jsx
function EventExamples() {
    // Event-Handler Funktionen
    const handleClick = () => {
        console.log('Button geklickt!');
    };

    const handleChange = (event) => {
        console.log('Neuer Wert:', event.target.value);
    };

    const handleSubmit = (event) => {
        event.preventDefault();  // Formular nicht absenden
        console.log('Formular verarbeiten...');
    };

    const handleKeyDown = (event) => {
        if (event.key === 'Enter') {
            console.log('Enter gedrückt!');
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            {/* Click Event */}
            <button type="button" onClick={handleClick}>
                Klick mich
            </button>

            {/* Change Event */}
            <input
                type="text"
                onChange={handleChange}
                onKeyDown={handleKeyDown}
            />

            {/* Focus Events */}
            <input
                type="email"
                onFocus={() => console.log('Fokussiert')}
                onBlur={() => console.log('Fokus verloren')}
            />

            {/* Mouse Events */}
            <div
                onMouseEnter={() => console.log('Maus rein')}
                onMouseLeave={() => console.log('Maus raus')}
            >
                Hover über mich
            </div>

            <button type="submit">Absenden</button>
        </form>
    );
}
```

**React Events vs. DOM Events:**

```jsx
// React (camelCase, function reference)
<button onClick={handleClick}>

// DOM/HTML (lowercase, string)
<button onclick="handleClick()">

// React Event-Objekt ist ein "SyntheticEvent"
// Wrapper um das native Event für Cross-Browser-Kompatibilität
const handleClick = (event) => {
    event.preventDefault();   // Funktioniert
    event.stopPropagation(); // Funktioniert
    event.nativeEvent;       // Zugriff auf natives Event
};
```

### Event Handler Patterns

**1. Inline Handler (für einfache Fälle)**
```jsx
<button onClick={() => setCount(count + 1)}>+1</button>
<button onClick={() => deleteItem(item.id)}>Löschen</button>
```

**2. Separate Handler-Funktion (empfohlen bei Komplexität)**
```jsx
function TodoItem({ todo, onToggle, onDelete }) {
    const handleToggle = () => {
        // Komplexere Logik möglich
        onToggle(todo.id);
    };

    const handleDelete = () => {
        if (window.confirm('Wirklich löschen?')) {
            onDelete(todo.id);
        }
    };

    return (
        <li>
            <input
                type="checkbox"
                checked={todo.completed}
                onChange={handleToggle}
            />
            <span>{todo.title}</span>
            <button onClick={handleDelete}>🗑️</button>
        </li>
    );
}
```

**3. Event mit Parameter übergeben**
```jsx
// ❌ FALSCH - Funktion wird sofort aufgerufen!
<button onClick={deleteItem(id)}>Löschen</button>

// ✅ RICHTIG - Arrow Function
<button onClick={() => deleteItem(id)}>Löschen</button>

// ✅ RICHTIG - Curried Function
const handleDelete = (id) => () => {
    deleteItem(id);
};
<button onClick={handleDelete(id)}>Löschen</button>

// ✅ RICHTIG - data-Attribut (nützlich in Listen)
const handleClick = (event) => {
    const id = event.currentTarget.dataset.id;
    deleteItem(id);
};
<button data-id={item.id} onClick={handleClick}>Löschen</button>
```

### Vergleich zu jQuery/Razor Events

```javascript
// JQUERY
$('#myButton').on('click', function(e) {
    e.preventDefault();
    var id = $(this).data('id');
    $.ajax({
        url: '/api/items/' + id,
        method: 'DELETE'
    });
});
```

```csharp
// RAZOR mit jQuery
<button id="deleteBtn-@item.Id" data-id="@item.Id" class="delete-btn">
    Löschen
</button>

@section Scripts {
    <script>
        $('.delete-btn').click(function() {
            var id = $(this).data('id');
            // ...
        });
    </script>
}
```

```jsx
// REACT - deklarativ und co-located
function ItemList({ items, onDelete }) {
    return (
        <ul>
            {items.map(item => (
                <li key={item.id}>
                    {item.name}
                    <button onClick={() => onDelete(item.id)}>
                        Löschen
                    </button>
                </li>
            ))}
        </ul>
    );
}
```

**Vorteile des React-Ansatzes:**
- Event-Handler direkt am Element definiert
- Keine globalen Selektoren nötig
- Automatisches Cleanup (keine Memory Leaks)
- TypeScript-Unterstützung für Events

---

## 8. Praktisches Beispiel

Lassen wir das Gelernte zusammenfließen mit einer realistischen Komponente, wie sie in HausTracker vorkommen könnte.

### Eine Wartungsaufgaben-Komponente

```jsx
// MaintenanceTaskCard.jsx
import { useState } from 'react';
import styles from './MaintenanceTaskCard.module.css';

// Hilfsfunktionen
const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

const getDaysUntil = (dateString) => {
    const today = new Date();
    const dueDate = new Date(dateString);
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};

// Sub-Komponenten für bessere Übersichtlichkeit
function PriorityBadge({ priority }) {
    const priorityConfig = {
        high: { label: 'Hoch', className: styles.priorityHigh },
        medium: { label: 'Mittel', className: styles.priorityMedium },
        low: { label: 'Niedrig', className: styles.priorityLow }
    };

    const config = priorityConfig[priority] || priorityConfig.medium;

    return (
        <span className={`${styles.badge} ${config.className}`}>
            {config.label}
        </span>
    );
}

function DueDate({ date }) {
    const daysUntil = getDaysUntil(date);

    let statusClass = styles.dueDateNormal;
    let statusText = `in ${daysUntil} Tagen`;

    if (daysUntil < 0) {
        statusClass = styles.dueDateOverdue;
        statusText = `${Math.abs(daysUntil)} Tage überfällig`;
    } else if (daysUntil === 0) {
        statusClass = styles.dueDateToday;
        statusText = 'Heute fällig';
    } else if (daysUntil <= 7) {
        statusClass = styles.dueDateSoon;
    }

    return (
        <div className={`${styles.dueDate} ${statusClass}`}>
            <span className={styles.dueDateLabel}>Fällig:</span>
            <span className={styles.dueDateValue}>{formatDate(date)}</span>
            <span className={styles.dueDateStatus}>{statusText}</span>
        </div>
    );
}

function TaskDetails({ task, isExpanded }) {
    if (!isExpanded) return null;

    return (
        <div className={styles.details}>
            {task.description && (
                <p className={styles.description}>{task.description}</p>
            )}

            {task.estimatedCost && (
                <div className={styles.detailRow}>
                    <span>Geschätzte Kosten:</span>
                    <span>{task.estimatedCost.toFixed(2)} €</span>
                </div>
            )}

            {task.assignedTo && (
                <div className={styles.detailRow}>
                    <span>Zuständig:</span>
                    <span>{task.assignedTo}</span>
                </div>
            )}

            {task.notes && task.notes.length > 0 && (
                <div className={styles.notes}>
                    <h4>Notizen:</h4>
                    <ul>
                        {task.notes.map((note, index) => (
                            <li key={index}>{note}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

// Haupt-Komponente
function MaintenanceTaskCard({
    task,
    onComplete,
    onEdit,
    onDelete,
    isCompletable = true
}) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Early return für ungültige Daten
    if (!task) {
        return null;
    }

    const handleComplete = () => {
        if (onComplete) {
            onComplete(task.id);
        }
    };

    const handleDelete = () => {
        if (window.confirm(`"${task.title}" wirklich löschen?`)) {
            setIsDeleting(true);
            // Optimistic UI - zeige Lösch-Animation
            setTimeout(() => {
                if (onDelete) {
                    onDelete(task.id);
                }
            }, 300);
        }
    };

    const handleEdit = () => {
        if (onEdit) {
            onEdit(task);
        }
    };

    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    return (
        <div
            className={`
                ${styles.card}
                ${task.completed ? styles.completed : ''}
                ${isDeleting ? styles.deleting : ''}
            `}
        >
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.titleRow}>
                    {isCompletable && (
                        <input
                            type="checkbox"
                            checked={task.completed}
                            onChange={handleComplete}
                            className={styles.checkbox}
                            aria-label={`${task.title} als erledigt markieren`}
                        />
                    )}
                    <h3
                        className={styles.title}
                        onClick={toggleExpand}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && toggleExpand()}
                    >
                        {task.title}
                    </h3>
                    <PriorityBadge priority={task.priority} />
                </div>

                {task.category && (
                    <span className={styles.category}>{task.category}</span>
                )}
            </div>

            {/* Fälligkeitsdatum */}
            {task.dueDate && !task.completed && (
                <DueDate date={task.dueDate} />
            )}

            {/* Erledigt-Info */}
            {task.completed && task.completedAt && (
                <div className={styles.completedInfo}>
                    Erledigt am {formatDate(task.completedAt)}
                </div>
            )}

            {/* Erweiterte Details */}
            <TaskDetails task={task} isExpanded={isExpanded} />

            {/* Aktionen */}
            <div className={styles.actions}>
                <button
                    onClick={toggleExpand}
                    className={styles.expandButton}
                    aria-expanded={isExpanded}
                >
                    {isExpanded ? 'Weniger' : 'Mehr'}
                </button>

                <div className={styles.actionButtons}>
                    <button
                        onClick={handleEdit}
                        className={styles.editButton}
                        aria-label="Aufgabe bearbeiten"
                    >
                        Bearbeiten
                    </button>
                    <button
                        onClick={handleDelete}
                        className={styles.deleteButton}
                        aria-label="Aufgabe löschen"
                    >
                        Löschen
                    </button>
                </div>
            </div>
        </div>
    );
}

export default MaintenanceTaskCard;
```

**Die dazugehörige CSS Module-Datei:**

```css
/* MaintenanceTaskCard.module.css */
.card {
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    padding: 16px;
    margin-bottom: 12px;
    transition: all 0.3s ease;
}

.card:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.card.completed {
    opacity: 0.7;
    background: #f8f9fa;
}

.card.deleting {
    opacity: 0;
    transform: translateX(-100%);
}

.header {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.titleRow {
    display: flex;
    align-items: center;
    gap: 12px;
}

.checkbox {
    width: 20px;
    height: 20px;
    cursor: pointer;
}

.title {
    flex: 1;
    margin: 0;
    font-size: 1.1rem;
    cursor: pointer;
}

.title:hover {
    color: #007bff;
}

.completed .title {
    text-decoration: line-through;
    color: #6c757d;
}

.badge {
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
}

.priorityHigh {
    background: #dc3545;
    color: white;
}

.priorityMedium {
    background: #ffc107;
    color: #212529;
}

.priorityLow {
    background: #28a745;
    color: white;
}

.category {
    font-size: 0.85rem;
    color: #6c757d;
    background: #e9ecef;
    padding: 2px 8px;
    border-radius: 4px;
    align-self: flex-start;
}

.dueDate {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-top: 12px;
    padding: 8px;
    border-radius: 4px;
    font-size: 0.9rem;
}

.dueDateNormal {
    background: #e9ecef;
}

.dueDateSoon {
    background: #fff3cd;
}

.dueDateToday {
    background: #ffc107;
    font-weight: 600;
}

.dueDateOverdue {
    background: #f8d7da;
    color: #721c24;
}

.dueDateLabel {
    color: #6c757d;
}

.dueDateStatus {
    margin-left: auto;
    font-weight: 500;
}

.completedInfo {
    margin-top: 8px;
    font-size: 0.85rem;
    color: #28a745;
}

.details {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #e9ecef;
}

.description {
    color: #495057;
    line-height: 1.6;
}

.detailRow {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid #f1f1f1;
}

.notes h4 {
    margin: 16px 0 8px;
    font-size: 0.9rem;
}

.notes ul {
    margin: 0;
    padding-left: 20px;
}

.notes li {
    padding: 4px 0;
    color: #495057;
}

.actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid #e9ecef;
}

.expandButton {
    background: none;
    border: none;
    color: #007bff;
    cursor: pointer;
    font-size: 0.9rem;
}

.actionButtons {
    display: flex;
    gap: 8px;
}

.editButton,
.deleteButton {
    padding: 6px 12px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.85rem;
    transition: background-color 0.2s;
}

.editButton {
    background: #e9ecef;
    color: #495057;
}

.editButton:hover {
    background: #dee2e6;
}

.deleteButton {
    background: #f8d7da;
    color: #721c24;
}

.deleteButton:hover {
    background: #f5c6cb;
}
```

**Verwendung der Komponente:**

```jsx
// MaintenanceTaskList.jsx
import { useState } from 'react';
import MaintenanceTaskCard from './MaintenanceTaskCard';

function MaintenanceTaskList() {
    const [tasks, setTasks] = useState([
        {
            id: 1,
            title: 'Heizungswartung',
            category: 'Heizung',
            priority: 'high',
            dueDate: '2024-01-15',
            description: 'Jährliche Wartung der Gasheizung durch Fachbetrieb',
            estimatedCost: 150,
            assignedTo: 'Firma Müller',
            completed: false,
            notes: ['Termin telefonisch vereinbaren', 'Wartungsvertrag prüfen']
        },
        {
            id: 2,
            title: 'Rauchmelder Batteriewechsel',
            category: 'Sicherheit',
            priority: 'medium',
            dueDate: '2024-01-20',
            description: 'Batterien in allen Rauchmeldern wechseln',
            estimatedCost: 20,
            completed: false
        },
        // ... weitere Aufgaben
    ]);

    const handleComplete = (taskId) => {
        setTasks(tasks.map(task =>
            task.id === taskId
                ? { ...task, completed: !task.completed, completedAt: new Date().toISOString() }
                : task
        ));
    };

    const handleDelete = (taskId) => {
        setTasks(tasks.filter(task => task.id !== taskId));
    };

    const handleEdit = (task) => {
        // Modal öffnen oder Navigation zur Edit-Seite
        console.log('Edit task:', task);
    };

    // Aufgaben sortieren: überfällige zuerst, dann nach Datum
    const sortedTasks = [...tasks].sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
    });

    return (
        <div className="task-list">
            <h2>Wartungsaufgaben</h2>

            {sortedTasks.length === 0 ? (
                <p className="empty-state">
                    Keine Wartungsaufgaben vorhanden.
                    Erstelle deine erste Aufgabe!
                </p>
            ) : (
                sortedTasks.map(task => (
                    <MaintenanceTaskCard
                        key={task.id}
                        task={task}
                        onComplete={handleComplete}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                    />
                ))
            )}
        </div>
    );
}

export default MaintenanceTaskList;
```

---

## Zusammenfassung

In diesem Kapitel haben wir die Grundlagen von React behandelt:

| Konzept | Kernaussage |
|---------|-------------|
| **Deklarativ** | Beschreibe WAS angezeigt werden soll, nicht WIE |
| **Virtual DOM** | Effiziente Updates durch Diffing-Algorithmus |
| **JSX** | HTML-ähnliche Syntax in JavaScript |
| **Komponenten** | Wiederverwendbare, isolierte UI-Bausteine |
| **Props** | Unidirektionaler Datenfluss, read-only |
| **Events** | camelCase, SyntheticEvents, Handler-Patterns |

**Die wichtigsten Unterschiede zu Razor:**

1. **Client-Side** statt Server-Side Rendering
2. **Komponenten** statt Partial Views
3. **Props** statt ViewData/Model
4. **State** statt Session/PostBack
5. **JSX** statt Razor-Syntax

Im nächsten Kapitel tauchen wir in **React Hooks** ein – useState, useEffect und mehr. Du wirst lernen, wie du State verwaltest, Seiteneffekte handhabst und eigene Hooks erstellst.

---

## Übungen

1. **Komponente erstellen:** Baue eine `RoomCard`-Komponente für HausTracker, die Rauminformationen anzeigt (Name, Größe, Stockwerk).

2. **Props und Events:** Erweitere die Komponente um einen "Bearbeiten"-Button, der eine Callback-Prop aufruft.

3. **Conditional Rendering:** Zeige einen "Warnung"-Badge an, wenn der Raum mehr als 3 überfällige Aufgaben hat.

4. **Listen:** Erstelle eine `RoomList`-Komponente, die mehrere `RoomCard`-Komponenten rendert.

5. **Vergleich:** Implementiere die gleiche UI einmal in Razor und einmal in React. Vergleiche den Code.
