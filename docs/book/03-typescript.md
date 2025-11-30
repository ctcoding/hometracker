# Kapitel 3: TypeScript - Typsicherheit für JavaScript

Als C#-Entwickler kennst du die Vorteile eines starken Typsystems: IntelliSense, Compile-Zeit-Fehler, Refactoring-Sicherheit. JavaScript bietet das alles nicht - TypeScript schon. In diesem Kapitel wirst du sehen, dass der Umstieg von C# auf TypeScript überraschend einfach ist.

---

## 3.1 Warum TypeScript?

### Das JavaScript-Problem

JavaScript wurde in 10 Tagen entwickelt. Für kleine Browser-Skripte war das okay. Für Enterprise-Anwendungen ist es ein Albtraum:

```javascript
// JavaScript - alles geht, nichts ist sicher
function calculateTotal(items) {
    return items.reduce((sum, item) => sum + item.price, 0);
}

// Funktioniert
calculateTotal([{ price: 10 }, { price: 20 }]); // 30

// Funktioniert auch - aber falsch
calculateTotal("hello"); // NaN
calculateTotal(null);    // TypeError zur Laufzeit
calculateTotal([{ preis: 10 }]); // NaN - Tippfehler unbemerkt
```

In C# wäre das undenkbar. Der Compiler würde sofort meckern. JavaScript sagt: "Klar, mach ich!" - und crasht dann um 3 Uhr nachts in Production.

### Was TypeScript löst

TypeScript ist JavaScript mit Typen. Der Code wird zu JavaScript kompiliert, aber vorher prüft der Compiler alles:

```typescript
// TypeScript - der Compiler ist dein Freund
interface Item {
    price: number;
}

function calculateTotal(items: Item[]): number {
    return items.reduce((sum, item) => sum + item.price, 0);
}

calculateTotal([{ price: 10 }, { price: 20 }]); // ✓ OK
calculateTotal("hello");                         // ✗ Compile-Fehler
calculateTotal([{ preis: 10 }]);                // ✗ Compile-Fehler
```

### Adoption in der Industrie

TypeScript ist kein Experiment mehr:
- **Microsoft** (Erfinder), **Google**, **Airbnb**, **Slack** setzen es ein
- **Angular** ist komplett in TypeScript geschrieben
- **React** hat erstklassige TypeScript-Unterstützung
- **VS Code** ist in TypeScript geschrieben (über 1 Million Zeilen)
- Über 90% der Top-1000 npm-Pakete haben TypeScript-Definitionen

Die Frage ist nicht mehr "ob", sondern "wann" du TypeScript lernst.

---

## 3.2 TypeScript vs C# - Schnelleinstieg

### Syntax-Vergleichstabelle

| Konzept | C# | TypeScript |
|---------|-----|------------|
| Variable | `int x = 5;` | `let x: number = 5;` |
| Konstante | `const int X = 5;` | `const x: number = 5;` |
| String | `string s = "hi";` | `let s: string = "hi";` |
| Array | `int[] arr = {1,2,3};` | `let arr: number[] = [1,2,3];` |
| Dictionary | `Dictionary<string,int>` | `Map<string, number>` oder `{ [key: string]: number }` |
| Nullable | `int? x = null;` | `let x: number \| null = null;` |
| Funktion | `int Add(int a, int b)` | `function add(a: number, b: number): number` |
| Lambda | `(x, y) => x + y` | `(x, y) => x + y` |
| Class | `class Foo { }` | `class Foo { }` |
| Interface | `interface IFoo { }` | `interface Foo { }` |
| Generic | `List<T>` | `Array<T>` |
| Namespace | `namespace Foo { }` | `namespace Foo { }` oder ES Modules |
| Async | `async Task<int> Get()` | `async function get(): Promise<number>` |

### Variablen und Typen

```csharp
// C#
string name = "Max";
int age = 30;
double price = 19.99;
bool isActive = true;
int[] numbers = { 1, 2, 3 };
```

```typescript
// TypeScript - fast identisch!
let name: string = "Max";
let age: number = 30;        // Kein int/double Unterschied
let price: number = 19.99;
let isActive: boolean = true;
let numbers: number[] = [1, 2, 3];
```

**Wichtig:** TypeScript hat nur `number` - kein `int`, `float`, `double`. JavaScript kennt intern nur 64-bit Floats.

### Type Inference - Der Compiler denkt mit

```csharp
// C# mit var
var name = "Max";    // Compiler weiß: string
var age = 30;        // Compiler weiß: int
```

```typescript
// TypeScript - genauso!
let name = "Max";    // Compiler weiß: string
let age = 30;        // Compiler weiß: number

// Explizite Typen nur wenn nötig
let items = [];                    // any[] - schlecht!
let items: string[] = [];          // string[] - gut!
```

### Classes

```csharp
// C#
public class Person
{
    public string Name { get; set; }
    public int Age { get; private set; }

    public Person(string name, int age)
    {
        Name = name;
        Age = age;
    }

    public void SayHello()
    {
        Console.WriteLine($"Hallo, ich bin {Name}");
    }
}
```

```typescript
// TypeScript
class Person {
    public name: string;
    private _age: number;

    constructor(name: string, age: number) {
        this.name = name;
        this._age = age;
    }

    // Getter wie in C#
    get age(): number {
        return this._age;
    }

    sayHello(): void {
        console.log(`Hallo, ich bin ${this.name}`);
    }
}

// Kurzform - Parameter Properties
class Person {
    constructor(
        public name: string,
        private age: number
    ) {}
    // name und age werden automatisch als Felder angelegt!
}
```

### Interfaces

```csharp
// C#
public interface IAnimal
{
    string Name { get; }
    void MakeSound();
}

public class Dog : IAnimal
{
    public string Name { get; }
    public Dog(string name) => Name = name;
    public void MakeSound() => Console.WriteLine("Wuff!");
}
```

```typescript
// TypeScript
interface Animal {
    name: string;
    makeSound(): void;
}

class Dog implements Animal {
    constructor(public name: string) {}

    makeSound(): void {
        console.log("Wuff!");
    }
}

// ABER: Interfaces sind auch für Objekt-Shapes
interface Config {
    apiUrl: string;
    timeout: number;
    debug?: boolean;  // Optional!
}

// Kein "new", kein implements nötig:
const config: Config = {
    apiUrl: "https://api.example.com",
    timeout: 5000
    // debug ist optional, also okay ohne
};
```

**Das ist fundamental anders als C#!** In TypeScript sind Interfaces nur "Shapes" - wenn ein Objekt die richtige Form hat, passt es.

### Generics

```csharp
// C#
public class Repository<T> where T : class
{
    private List<T> _items = new();

    public void Add(T item) => _items.Add(item);
    public T? GetById(int id) => _items.FirstOrDefault();
}
```

```typescript
// TypeScript - sehr ähnlich
class Repository<T> {
    private items: T[] = [];

    add(item: T): void {
        this.items.push(item);
    }

    getById(id: number): T | undefined {
        return this.items[0];
    }
}

// Mit Constraint
class Repository<T extends { id: number }> {
    private items: T[] = [];

    getById(id: number): T | undefined {
        return this.items.find(item => item.id === id);
    }
}
```

### Null-Handling

Das ist einer der wichtigsten Bereiche:

```csharp
// C# 8+
string? nullableName = null;
string name = nullableName ?? "Default";
int length = nullableName?.Length ?? 0;

// Null-forgiving operator
string definitelyNotNull = nullableName!;
```

```typescript
// TypeScript - fast identisch!
let nullableName: string | null = null;
let name = nullableName ?? "Default";
let length = nullableName?.length ?? 0;

// Non-null assertion (wie ! in C#)
let definitelyNotNull = nullableName!;

// undefined ist auch ein Thema
let maybeUndefined: string | undefined;

// Optional Chaining - wie in C#
interface User {
    address?: {
        city?: string;
    };
}

const city = user?.address?.city ?? "Unbekannt";
```

---

## 3.3 Type System Deep Dive

### Primitive Types

```typescript
// Die Basics
let isDone: boolean = false;
let decimal: number = 6;
let hex: number = 0xf00d;
let binary: number = 0b1010;
let big: bigint = 100n;        // Für sehr große Zahlen
let name: string = "Max";
let template: string = `Hallo ${name}`;

// Spezielle Typen
let u: undefined = undefined;
let n: null = null;
let sym: symbol = Symbol("key");

// void - wie in C#
function log(msg: string): void {
    console.log(msg);
}

// never - Funktion kehrt nie zurück
function throwError(msg: string): never {
    throw new Error(msg);
}

function infiniteLoop(): never {
    while (true) {}
}
```

### Union Types - Das gibt's in C# nicht (so)

Union Types sind mächtig und haben kein direktes Pendant in C#:

```typescript
// Variable kann mehrere Typen haben
let id: string | number;
id = "abc123";  // OK
id = 42;        // OK
id = true;      // Fehler!

// In Funktionen super nützlich
function formatId(id: string | number): string {
    if (typeof id === "string") {
        return id.toUpperCase();
    }
    return id.toString();
}

// Praktisches Beispiel
type ApiResponse<T> =
    | { status: "success"; data: T }
    | { status: "error"; message: string };

function handleResponse(response: ApiResponse<User>) {
    if (response.status === "success") {
        // TypeScript weiß: hier gibt's data
        console.log(response.data.name);
    } else {
        // TypeScript weiß: hier gibt's message
        console.log(response.message);
    }
}
```

In C# würde man das mit Vererbung oder `OneOf<>` lösen - in TypeScript ist es eingebaut.

### Literal Types

```typescript
// Ein Typ der nur bestimmte Werte erlaubt
let direction: "north" | "south" | "east" | "west";
direction = "north";  // OK
direction = "up";     // Fehler!

// Super für Status-Felder
type OrderStatus = "pending" | "processing" | "shipped" | "delivered";

interface Order {
    id: number;
    status: OrderStatus;
}

// Numerische Literals
type DiceRoll = 1 | 2 | 3 | 4 | 5 | 6;
let roll: DiceRoll = 4;  // OK
let roll: DiceRoll = 7;  // Fehler!

// Boolean Literal
type True = true;
type False = false;

// Template Literal Types (TypeScript 4.1+)
type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";
type ApiEndpoint = `/api/${string}`;
type FullUrl = `https://${string}.com${ApiEndpoint}`;

let url: FullUrl = "https://example.com/api/users";  // OK
```

### Type Inference - Der Compiler ist schlau

```typescript
// Explizit (unnötig)
let name: string = "Max";

// Implizit (besser)
let name = "Max";  // TypeScript weiß: string

// Array Inference
let numbers = [1, 2, 3];           // number[]
let mixed = [1, "two"];            // (string | number)[]

// Object Inference
let person = {
    name: "Max",
    age: 30
};
// TypeScript inferiert: { name: string; age: number }

// Return Type Inference
function add(a: number, b: number) {
    return a + b;
}
// Return-Typ ist automatisch: number

// Contextual Typing
const names = ["Alice", "Bob", "Charlie"];
names.forEach(name => {
    // name ist automatisch string!
    console.log(name.toUpperCase());
});

// Bei Events
document.addEventListener("click", event => {
    // event ist automatisch MouseEvent
    console.log(event.clientX);
});
```

### Type Guards - Typen zur Laufzeit prüfen

```typescript
// typeof Guard
function padLeft(value: string, padding: string | number): string {
    if (typeof padding === "number") {
        // Hier weiß TypeScript: padding ist number
        return " ".repeat(padding) + value;
    }
    // Hier weiß TypeScript: padding ist string
    return padding + value;
}

// instanceof Guard
class Bird { fly() {} }
class Fish { swim() {} }

function move(animal: Bird | Fish) {
    if (animal instanceof Bird) {
        animal.fly();
    } else {
        animal.swim();
    }
}

// in Guard
interface Car { drive(): void; }
interface Boat { sail(): void; }

function operate(vehicle: Car | Boat) {
    if ("drive" in vehicle) {
        vehicle.drive();
    } else {
        vehicle.sail();
    }
}

// Custom Type Guard - wie eine C# is-Prüfung, aber expliziter
interface Cat { meow(): void; }
interface Dog { bark(): void; }

function isCat(pet: Cat | Dog): pet is Cat {
    return (pet as Cat).meow !== undefined;
}

function handlePet(pet: Cat | Dog) {
    if (isCat(pet)) {
        pet.meow();  // TypeScript weiß: Cat
    } else {
        pet.bark();  // TypeScript weiß: Dog
    }
}

// Discriminated Unions - Best Practice!
interface Circle {
    kind: "circle";
    radius: number;
}

interface Rectangle {
    kind: "rectangle";
    width: number;
    height: number;
}

type Shape = Circle | Rectangle;

function getArea(shape: Shape): number {
    switch (shape.kind) {
        case "circle":
            return Math.PI * shape.radius ** 2;
        case "rectangle":
            return shape.width * shape.height;
    }
}
```

---

## 3.4 Interfaces vs Types

Beide können ähnliches, aber es gibt Unterschiede:

### Interface

```typescript
// Objekt-Shape definieren
interface User {
    id: number;
    name: string;
    email?: string;  // Optional
}

// Erweitern
interface Admin extends User {
    permissions: string[];
}

// Mehrere Interfaces kombinieren
interface HasTimestamp {
    createdAt: Date;
    updatedAt: Date;
}

interface AuditedUser extends User, HasTimestamp {
    lastLogin: Date;
}

// Funktions-Signatur
interface SearchFunc {
    (source: string, query: string): boolean;
}

// Indexer
interface StringArray {
    [index: number]: string;
}

// Klassen implementieren
interface Repository<T> {
    getAll(): T[];
    getById(id: number): T | undefined;
    save(item: T): void;
}

class UserRepository implements Repository<User> {
    private users: User[] = [];

    getAll(): User[] { return this.users; }
    getById(id: number): User | undefined {
        return this.users.find(u => u.id === id);
    }
    save(item: User): void { this.users.push(item); }
}
```

### Type Alias

```typescript
// Primitive Alias
type ID = string | number;

// Object Shape (wie Interface)
type User = {
    id: ID;
    name: string;
};

// Union Types - NUR mit type möglich!
type Status = "active" | "inactive" | "pending";
type Result<T> = T | Error;

// Intersection Types
type Admin = User & { permissions: string[] };

// Tuple Types
type Point = [number, number];
type NameAge = [string, number];

// Funktion
type SearchFunc = (source: string, query: string) => boolean;

// Conditional Types - fortgeschritten
type NonNullable<T> = T extends null | undefined ? never : T;

// Mapped Types
type Readonly<T> = {
    readonly [P in keyof T]: T[P];
};
```

### Wann was verwenden?

```typescript
// ✓ INTERFACE für:
// - Objekt-Shapes die erweitert werden können
// - Klassen-Contracts
// - API-Definitionen
interface UserService {
    getUser(id: number): Promise<User>;
    saveUser(user: User): Promise<void>;
}

// ✓ TYPE für:
// - Union Types
// - Tuple Types
// - Primitive Aliases
// - Komplexe Type-Transformationen
type Result<T> = { ok: true; value: T } | { ok: false; error: Error };
type Coords = [number, number, number];
type UUID = string;
```

### Declaration Merging - Nur bei Interfaces!

```typescript
// Interface: Gleicher Name = wird gemergt
interface User {
    id: number;
}

interface User {
    name: string;
}

// Ergebnis: User hat id UND name
const user: User = { id: 1, name: "Max" };

// Type: Geht NICHT!
type User = { id: number };
type User = { name: string };  // Fehler: Duplikat!

// Praktisch für Library-Erweiterungen
declare global {
    interface Window {
        myApp: MyApp;
    }
}
// Jetzt ist window.myApp typisiert
```

---

## 3.5 Generics

### Grundlagen - Wie in C#

```typescript
// Generic Funktion
function identity<T>(arg: T): T {
    return arg;
}

let output = identity<string>("hello");
let output = identity("hello");  // Type Inference!

// Generic Interface
interface Repository<T> {
    items: T[];
    add(item: T): void;
    get(id: number): T | undefined;
}

// Generic Class
class GenericNumber<T> {
    zeroValue: T;
    add: (x: T, y: T) => T;
}

let myNumber = new GenericNumber<number>();
myNumber.zeroValue = 0;
myNumber.add = (x, y) => x + y;
```

### Constraints - Einschränkungen

```csharp
// C#
public class Repository<T> where T : class, IEntity, new()
{
    public T Create() => new T();
}
```

```typescript
// TypeScript
interface HasId {
    id: number;
}

// T muss HasId implementieren
class Repository<T extends HasId> {
    private items: T[] = [];

    getById(id: number): T | undefined {
        return this.items.find(item => item.id === id);
    }
}

// Mehrere Constraints
interface HasName {
    name: string;
}

function processEntity<T extends HasId & HasName>(entity: T): string {
    return `${entity.id}: ${entity.name}`;
}

// keyof Constraint - sehr nützlich!
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
    return obj[key];
}

const person = { name: "Max", age: 30 };
getProperty(person, "name");  // OK, returns string
getProperty(person, "age");   // OK, returns number
getProperty(person, "foo");   // Fehler!
```

### Default Type Parameters

```typescript
// Wie in C#
interface Response<T = any> {
    data: T;
    status: number;
}

let response: Response = { data: "hello", status: 200 };
let typedResponse: Response<User> = { data: user, status: 200 };

// Bei Klassen
class Container<T = string> {
    constructor(public value: T) {}
}

const strContainer = new Container("hello");        // Container<string>
const numContainer = new Container<number>(42);     // Container<number>
```

### Praktische Generic-Patterns

```typescript
// API Response Wrapper
interface ApiResponse<T> {
    data: T;
    meta: {
        page: number;
        total: number;
    };
}

async function fetchUsers(): Promise<ApiResponse<User[]>> {
    const response = await fetch("/api/users");
    return response.json();
}

// Generic React Hook Pattern
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
    const [storedValue, setStoredValue] = useState<T>(() => {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : initialValue;
    });

    const setValue = (value: T) => {
        setStoredValue(value);
        window.localStorage.setItem(key, JSON.stringify(value));
    };

    return [storedValue, setValue];
}

// Verwendung
const [user, setUser] = useLocalStorage<User>("user", defaultUser);

// Generic Factory
function createInstance<T>(ctor: new () => T): T {
    return new ctor();
}
```

---

## 3.6 Utility Types

TypeScript bringt viele eingebaute Hilfstypen mit. Diese sind Gold wert!

### Partial<T> - Alle Properties optional

```typescript
interface User {
    id: number;
    name: string;
    email: string;
}

// Für Updates - nicht alle Felder nötig
function updateUser(id: number, updates: Partial<User>) {
    // updates kann { name: "Max" } sein, ohne id und email
}

updateUser(1, { name: "Max" });  // OK
updateUser(1, { name: "Max", email: "max@example.com" });  // OK

// Partial<User> ist äquivalent zu:
interface PartialUser {
    id?: number;
    name?: string;
    email?: string;
}
```

### Required<T> - Alle Properties erforderlich

```typescript
interface Props {
    name?: string;
    age?: number;
}

// Macht alles required
type RequiredProps = Required<Props>;
// { name: string; age: number }

const props: RequiredProps = {
    name: "Max",  // Jetzt Pflicht!
    age: 30       // Jetzt Pflicht!
};
```

### Readonly<T> - Immutable machen

```typescript
interface User {
    id: number;
    name: string;
}

const user: Readonly<User> = {
    id: 1,
    name: "Max"
};

user.name = "Moritz";  // Fehler! Readonly

// Praktisch für State in React
type State = Readonly<{
    users: User[];
    loading: boolean;
}>;
```

### Pick<T, K> - Nur bestimmte Properties

```typescript
interface User {
    id: number;
    name: string;
    email: string;
    password: string;
    createdAt: Date;
}

// Nur id und name
type UserPreview = Pick<User, "id" | "name">;
// { id: number; name: string }

// Für API-Responses ohne sensitive Daten
type PublicUser = Pick<User, "id" | "name" | "email">;
```

### Omit<T, K> - Properties ausschließen

```typescript
interface User {
    id: number;
    name: string;
    email: string;
    password: string;
}

// Alles außer password
type SafeUser = Omit<User, "password">;
// { id: number; name: string; email: string }

// Mehrere ausschließen
type PublicUser = Omit<User, "password" | "email">;

// Praktisch für Create-DTOs
type CreateUserDto = Omit<User, "id">;  // id wird vom Server generiert
```

### Record<K, T> - Dictionary/Map erstellen

```typescript
// Einfaches Key-Value Mapping
type PageInfo = {
    title: string;
    url: string;
};

type Pages = Record<string, PageInfo>;

const pages: Pages = {
    home: { title: "Home", url: "/" },
    about: { title: "About", url: "/about" }
};

// Mit Union Type als Key
type Role = "admin" | "user" | "guest";
type Permissions = Record<Role, string[]>;

const permissions: Permissions = {
    admin: ["read", "write", "delete"],
    user: ["read", "write"],
    guest: ["read"]
};

// Status-Mapping
type Status = "pending" | "success" | "error";
type StatusColors = Record<Status, string>;

const colors: StatusColors = {
    pending: "yellow",
    success: "green",
    error: "red"
};
```

### Exclude<T, U> & Extract<T, U>

```typescript
// Exclude - Typen ausschließen
type T0 = Exclude<"a" | "b" | "c", "a">;  // "b" | "c"
type T1 = Exclude<string | number | boolean, string>;  // number | boolean

// Extract - Typen extrahieren
type T2 = Extract<"a" | "b" | "c", "a" | "f">;  // "a"
type T3 = Extract<string | number | boolean, string | boolean>;  // string | boolean

// Praktisch für Event-Filterung
type MouseEvents = Extract<keyof WindowEventMap, `mouse${string}`>;
// "mousedown" | "mouseup" | "mousemove" | ...
```

### NonNullable<T>

```typescript
type T = string | null | undefined;
type NonNull = NonNullable<T>;  // string

// Praktisch für Props
interface Props {
    value: string | null;
}

function process(value: NonNullable<Props["value"]>) {
    // value ist garantiert string, nicht null
    console.log(value.toUpperCase());
}
```

### ReturnType<T> & Parameters<T>

```typescript
// ReturnType - Rückgabetyp einer Funktion
function getUser() {
    return { id: 1, name: "Max" };
}

type User = ReturnType<typeof getUser>;
// { id: number; name: string }

// Parameters - Parameter einer Funktion als Tuple
function greet(name: string, age: number): void {}

type GreetParams = Parameters<typeof greet>;
// [string, number]

// Praktisch für Wrapper-Funktionen
function withLogging<T extends (...args: any[]) => any>(fn: T) {
    return (...args: Parameters<T>): ReturnType<T> => {
        console.log("Calling with:", args);
        return fn(...args);
    };
}
```

### Mapped Types - Eigene Utility Types

```typescript
// So funktioniert Readonly intern:
type MyReadonly<T> = {
    readonly [K in keyof T]: T[K];
};

// Optional machen
type MyPartial<T> = {
    [K in keyof T]?: T[K];
};

// Nullable machen
type Nullable<T> = {
    [K in keyof T]: T[K] | null;
};

// Getters generieren
type Getters<T> = {
    [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

interface User {
    name: string;
    age: number;
}

type UserGetters = Getters<User>;
// { getName: () => string; getAge: () => number }
```

---

## 3.7 tsconfig.json erklärt

Die `tsconfig.json` ist die Konfigurationsdatei für TypeScript - vergleichbar mit der `.csproj` in C#.

### Grundstruktur

```json
{
    "compilerOptions": {
        // Hier die Einstellungen
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist"]
}
```

### Wichtige Optionen

```json
{
    "compilerOptions": {
        // === Basis ===
        "target": "ES2022",           // Ziel-JavaScript-Version
        "module": "ESNext",           // Modul-System
        "lib": ["DOM", "ES2022"],     // Verfügbare APIs

        // === Strict Mode - IMMER aktivieren! ===
        "strict": true,               // Aktiviert alle strict-Optionen
        // Das beinhaltet:
        // "strictNullChecks": true,   // null/undefined prüfen
        // "strictFunctionTypes": true,
        // "strictBindCallApply": true,
        // "strictPropertyInitialization": true,
        // "noImplicitAny": true,      // Kein implizites any
        // "noImplicitThis": true,
        // "alwaysStrict": true,

        // === Module Resolution ===
        "moduleResolution": "bundler",  // Für Vite/Webpack
        "esModuleInterop": true,        // CommonJS kompatibel
        "resolveJsonModule": true,      // JSON imports
        "allowSyntheticDefaultImports": true,

        // === Output ===
        "outDir": "./dist",
        "rootDir": "./src",
        "declaration": true,            // .d.ts Dateien generieren
        "declarationMap": true,         // Source Maps für .d.ts
        "sourceMap": true,              // Debug-freundlich

        // === Checks ===
        "noUnusedLocals": true,         // Unused vars = Fehler
        "noUnusedParameters": true,     // Unused params = Fehler
        "noImplicitReturns": true,      // Alle Pfade müssen returnen
        "noFallthroughCasesInSwitch": true,
        "noUncheckedIndexedAccess": true,  // Arrays können undefined sein!

        // === Pfade ===
        "baseUrl": ".",
        "paths": {
            "@/*": ["src/*"],
            "@components/*": ["src/components/*"]
        },

        // === JSX für React ===
        "jsx": "react-jsx",             // React 17+

        // === Interop ===
        "skipLibCheck": true,           // .d.ts nicht prüfen (schneller)
        "forceConsistentCasingInFileNames": true
    }
}
```

### Empfohlene Konfigurationen

**Für React mit Vite:**

```json
{
    "compilerOptions": {
        "target": "ES2022",
        "lib": ["DOM", "DOM.Iterable", "ES2022"],
        "module": "ESNext",
        "moduleResolution": "bundler",
        "jsx": "react-jsx",
        "strict": true,
        "noUnusedLocals": true,
        "noUnusedParameters": true,
        "noFallthroughCasesInSwitch": true,
        "noUncheckedIndexedAccess": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "forceConsistentCasingInFileNames": true,
        "resolveJsonModule": true,
        "isolatedModules": true,
        "noEmit": true,
        "paths": {
            "@/*": ["./src/*"]
        }
    },
    "include": ["src"],
    "references": [{ "path": "./tsconfig.node.json" }]
}
```

**Für Node.js Backend:**

```json
{
    "compilerOptions": {
        "target": "ES2022",
        "module": "NodeNext",
        "moduleResolution": "NodeNext",
        "outDir": "./dist",
        "rootDir": "./src",
        "strict": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "forceConsistentCasingInFileNames": true,
        "declaration": true,
        "declarationMap": true,
        "sourceMap": true
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist"]
}
```

### Die wichtigsten Optionen erklärt

| Option | Was es macht | Empfehlung |
|--------|--------------|------------|
| `strict` | Alle Strict-Checks an | ✓ Immer an |
| `noImplicitAny` | Verbietet implizites `any` | ✓ Immer an |
| `strictNullChecks` | null/undefined sind eigene Typen | ✓ Immer an |
| `noUncheckedIndexedAccess` | `arr[0]` ist `T \| undefined` | ✓ Empfohlen |
| `skipLibCheck` | .d.ts nicht prüfen | ✓ Performance |
| `esModuleInterop` | CommonJS/ESM Kompatibilität | ✓ Meistens nötig |

---

## 3.8 TypeScript mit React

### Props typisieren

```typescript
// Einfache Props
interface ButtonProps {
    label: string;
    onClick: () => void;
    disabled?: boolean;
}

function Button({ label, onClick, disabled = false }: ButtonProps) {
    return (
        <button onClick={onClick} disabled={disabled}>
            {label}
        </button>
    );
}

// Mit children
interface CardProps {
    title: string;
    children: React.ReactNode;
}

function Card({ title, children }: CardProps) {
    return (
        <div className="card">
            <h2>{title}</h2>
            {children}
        </div>
    );
}

// Alternative mit React.FC (weniger empfohlen)
const Card: React.FC<CardProps> = ({ title, children }) => {
    return <div>{title}{children}</div>;
};

// Props mit Default Values
interface InputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    type?: "text" | "email" | "password";
}

function Input({
    value,
    onChange,
    placeholder = "",
    type = "text"
}: InputProps) {
    return (
        <input
            type={type}
            value={value}
            placeholder={placeholder}
            onChange={e => onChange(e.target.value)}
        />
    );
}
```

### Event Handler

```typescript
// Button Click
function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    console.log("Clicked at:", event.clientX, event.clientY);
}

// Input Change
function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    console.log("New value:", event.target.value);
}

// Form Submit
function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Form verarbeiten
}

// Keyboard Event
function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
        // Enter gedrückt
    }
}

// Drag Events
function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const files = event.dataTransfer.files;
}

// Praktisches Beispiel: Formular
function LoginForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        login(email, password);
    };

    return (
        <form onSubmit={handleSubmit}>
            <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />
            <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />
            <button type="submit">Login</button>
        </form>
    );
}
```

### useState mit TypeScript

```typescript
// Automatische Inference
const [count, setCount] = useState(0);  // number

// Expliziter Typ für komplexe States
interface User {
    id: number;
    name: string;
    email: string;
}

const [user, setUser] = useState<User | null>(null);

// Array State
const [items, setItems] = useState<string[]>([]);

// Object State
interface FormState {
    name: string;
    email: string;
    age: number;
}

const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    age: 0
});

// Update mit Spread
setForm(prev => ({ ...prev, name: "Max" }));
```

### useRef mit TypeScript

```typescript
// DOM Element Reference
const inputRef = useRef<HTMLInputElement>(null);

function focusInput() {
    inputRef.current?.focus();  // Optional Chaining!
}

return <input ref={inputRef} />;

// Mutable Value Reference (wie in C# eine Box)
const countRef = useRef<number>(0);

function increment() {
    countRef.current += 1;  // Kein Re-Render!
}

// Unterschied beachten:
useRef<HTMLElement>(null);   // Für DOM, null initial
useRef<number>(0);           // Für Values, mit Initialwert
```

### Generische Komponenten

```typescript
// Generische List-Komponente
interface ListProps<T> {
    items: T[];
    renderItem: (item: T) => React.ReactNode;
    keyExtractor: (item: T) => string | number;
}

function List<T>({ items, renderItem, keyExtractor }: ListProps<T>) {
    return (
        <ul>
            {items.map(item => (
                <li key={keyExtractor(item)}>
                    {renderItem(item)}
                </li>
            ))}
        </ul>
    );
}

// Verwendung
interface User {
    id: number;
    name: string;
}

const users: User[] = [
    { id: 1, name: "Max" },
    { id: 2, name: "Anna" }
];

<List
    items={users}
    renderItem={user => <span>{user.name}</span>}
    keyExtractor={user => user.id}
/>

// Generischer Select
interface SelectProps<T> {
    options: T[];
    value: T;
    onChange: (value: T) => void;
    getLabel: (option: T) => string;
    getValue: (option: T) => string | number;
}

function Select<T>({
    options,
    value,
    onChange,
    getLabel,
    getValue
}: SelectProps<T>) {
    return (
        <select
            value={getValue(value) as string}
            onChange={e => {
                const selected = options.find(
                    o => getValue(o).toString() === e.target.value
                );
                if (selected) onChange(selected);
            }}
        >
            {options.map(option => (
                <option key={getValue(option)} value={getValue(option)}>
                    {getLabel(option)}
                </option>
            ))}
        </select>
    );
}
```

### Custom Hooks typisieren

```typescript
// Einfacher Hook
function useToggle(initialValue: boolean = false): [boolean, () => void] {
    const [value, setValue] = useState(initialValue);
    const toggle = useCallback(() => setValue(v => !v), []);
    return [value, toggle];
}

// Generischer Fetch Hook
interface UseFetchResult<T> {
    data: T | null;
    loading: boolean;
    error: Error | null;
    refetch: () => void;
}

function useFetch<T>(url: string): UseFetchResult<T> {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(url);
            const json = await response.json();
            setData(json);
            setError(null);
        } catch (e) {
            setError(e as Error);
        } finally {
            setLoading(false);
        }
    }, [url]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { data, loading, error, refetch: fetchData };
}

// Verwendung
const { data, loading, error } = useFetch<User[]>("/api/users");

// Local Storage Hook
function useLocalStorage<T>(
    key: string,
    initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch {
            return initialValue;
        }
    });

    const setValue = (value: T | ((prev: T) => T)) => {
        const valueToStore = value instanceof Function
            ? value(storedValue)
            : value;
        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
    };

    return [storedValue, setValue];
}
```

---

## 3.9 Häufige Fehler & Lösungen

### Problem 1: "any" überall

```typescript
// ❌ SCHLECHT - any macht TypeScript nutzlos
function processData(data: any): any {
    return data.map((item: any) => item.value);
}

// ✓ GUT - Typen definieren
interface DataItem {
    value: number;
}

function processData(data: DataItem[]): number[] {
    return data.map(item => item.value);
}

// Wenn du den Typ nicht kennst, nutze unknown
function handleUnknown(data: unknown): void {
    // Muss erst geprüft werden!
    if (typeof data === "string") {
        console.log(data.toUpperCase());
    }
    if (Array.isArray(data)) {
        console.log(data.length);
    }
}
```

### Problem 2: Type Assertions missbrauchen

```typescript
// ❌ SCHLECHT - Erzwungene Typen
const user = {} as User;  // user hat keine Properties!
user.name.toUpperCase();  // Runtime Error!

// ❌ SCHLECHT - Doppel-Assertion
const value = "hello" as unknown as number;  // Lüge!

// ✓ GUT - Korrekt initialisieren
const user: User = {
    id: 1,
    name: "Max",
    email: "max@example.com"
};

// ✓ GUT - Type Guard verwenden
function isUser(obj: unknown): obj is User {
    return (
        typeof obj === "object" &&
        obj !== null &&
        "id" in obj &&
        "name" in obj
    );
}

if (isUser(data)) {
    console.log(data.name);  // Sicher!
}
```

### Problem 3: Object.keys Typisierung

```typescript
interface User {
    name: string;
    age: number;
}

const user: User = { name: "Max", age: 30 };

// ❌ Problem: key ist string, nicht keyof User
Object.keys(user).forEach(key => {
    console.log(user[key]);  // Fehler!
});

// ✓ Lösung 1: Type Assertion
(Object.keys(user) as (keyof User)[]).forEach(key => {
    console.log(user[key]);
});

// ✓ Lösung 2: Type Guard
function isKeyOf<T extends object>(obj: T, key: PropertyKey): key is keyof T {
    return key in obj;
}

Object.keys(user).forEach(key => {
    if (isKeyOf(user, key)) {
        console.log(user[key]);
    }
});

// ✓ Lösung 3: Für Iteration
for (const key in user) {
    console.log(user[key as keyof User]);
}
```

### Problem 4: null vs undefined

```typescript
// TypeScript unterscheidet zwischen null und undefined
let a: string | null = null;
let b: string | undefined = undefined;
let c: string | null | undefined;

// ✓ Nullish Coalescing - nur null/undefined
const value1 = a ?? "default";  // "default"
const value2 = "" ?? "default"; // "" (leerer String bleibt)

// ✓ Optional Chaining
interface Config {
    server?: {
        port?: number;
    };
}

const port = config?.server?.port ?? 3000;

// Achtung bei boolean/number Checks!
const count: number | undefined = 0;

// ❌ SCHLECHT - 0 ist falsy
const result = count || 10;  // 10 (falsch!)

// ✓ GUT - ?? prüft nur null/undefined
const result = count ?? 10;  // 0 (richtig!)
```

### Problem 5: Index Signature Access

```typescript
interface StringMap {
    [key: string]: string;
}

const map: StringMap = { a: "1", b: "2" };

// Mit noUncheckedIndexedAccess: true
const value = map["c"];  // string | undefined (korrekt!)

// Muss geprüft werden
if (value !== undefined) {
    console.log(value.toUpperCase());
}

// Oder Non-null Assertion wenn du sicher bist
const value = map["a"]!;  // string (auf eigene Gefahr)
```

### Problem 6: Enum vs Union Type

```typescript
// ❌ Enums haben Runtime-Overhead
enum Status {
    Active = "ACTIVE",
    Inactive = "INACTIVE"
}

// ✓ Union Type - kein Runtime-Code
type Status = "ACTIVE" | "INACTIVE";

// ✓ const Object für Werte und Typen
const Status = {
    Active: "ACTIVE",
    Inactive: "INACTIVE"
} as const;

type Status = typeof Status[keyof typeof Status];
// "ACTIVE" | "INACTIVE"
```

### Problem 7: Async/Await Typisierung

```typescript
// ❌ SCHLECHT - any Return
async function fetchUser(id: number) {
    const response = await fetch(`/api/users/${id}`);
    return response.json();  // Returns Promise<any>
}

// ✓ GUT - Expliziter Return Type
async function fetchUser(id: number): Promise<User> {
    const response = await fetch(`/api/users/${id}`);
    return response.json() as Promise<User>;
}

// ✓ BESSER - Mit Validation
async function fetchUser(id: number): Promise<User> {
    const response = await fetch(`/api/users/${id}`);
    const data = await response.json();

    // Hier könnte man zod/yup für Runtime-Validation nutzen
    if (!isUser(data)) {
        throw new Error("Invalid user data");
    }

    return data;
}
```

---

## 3.10 Migration von JavaScript

### Strategie 1: Schrittweise Migration

```json
// tsconfig.json - Erlaube JS-Dateien
{
    "compilerOptions": {
        "allowJs": true,
        "checkJs": false,  // Später auf true
        "strict": false,   // Später auf true
        "outDir": "./dist"
    },
    "include": ["src"]
}
```

1. TypeScript installieren: `npm install -D typescript`
2. `tsconfig.json` erstellen
3. `.js` Dateien nach `.ts` umbenennen (einzeln!)
4. Fehler beheben
5. Strict Mode aktivieren

### Strategie 2: JSDoc für Übergang

```javascript
// In .js Dateien - TypeScript versteht JSDoc!

/**
 * @param {string} name
 * @param {number} age
 * @returns {{ name: string, age: number }}
 */
function createUser(name, age) {
    return { name, age };
}

/**
 * @typedef {Object} User
 * @property {number} id
 * @property {string} name
 */

/**
 * @param {User[]} users
 * @returns {User | undefined}
 */
function findAdmin(users) {
    return users.find(u => u.id === 1);
}
```

### Strategie 3: Declaration Files

Für Third-Party Libraries ohne Typen:

```typescript
// src/types/legacy-lib.d.ts
declare module "legacy-lib" {
    export function doSomething(value: string): number;
    export const VERSION: string;
}

// Oder für globale Variablen
declare global {
    interface Window {
        analytics: {
            track(event: string, data?: object): void;
        };
    }
}
```

### Häufige Migrationsprobleme

```typescript
// Problem: Implizites any bei Callbacks
// JavaScript
items.map(item => item.value);

// TypeScript - explizit typisieren
interface Item { value: number; }
const items: Item[] = [];
items.map(item => item.value);  // Jetzt OK

// Problem: Dynamic Object Access
// JavaScript
const obj = {};
obj.foo = "bar";

// TypeScript
const obj: Record<string, string> = {};
obj.foo = "bar";

// Oder:
const obj: { [key: string]: string } = {};
obj.foo = "bar";

// Problem: this in Callbacks
// JavaScript
class Handler {
    value = 42;
    handle() {
        setTimeout(function() {
            console.log(this.value);  // undefined!
        }, 100);
    }
}

// TypeScript - Arrow Function
class Handler {
    value = 42;
    handle() {
        setTimeout(() => {
            console.log(this.value);  // 42 ✓
        }, 100);
    }
}
```

### Checkliste für Migration

- [ ] TypeScript und @types/* Pakete installiert
- [ ] tsconfig.json konfiguriert
- [ ] Build-Pipeline angepasst (Webpack/Vite/etc.)
- [ ] ESLint für TypeScript konfiguriert
- [ ] Dateien schrittweise umbenannt (.js → .ts)
- [ ] `any` durch echte Typen ersetzt
- [ ] `strict: true` aktiviert
- [ ] Tests laufen noch

---

## Zusammenfassung

Du hast in diesem Kapitel gelernt:

1. **TypeScript ist C# für JavaScript** - Die Syntax ist vertraut, die Konzepte ähnlich
2. **Strict Mode ist Pflicht** - Ohne ihn verliert TypeScript seinen Sinn
3. **Union Types sind mächtig** - Ein Konzept das C# so nicht hat
4. **Interfaces für Shapes, Types für alles andere**
5. **Utility Types sparen Code** - Partial, Pick, Omit, Record sind deine Freunde
6. **React und TypeScript harmonieren** - Props, Events, Hooks sind sauber typisiert
7. **any ist der Feind** - unknown und Type Guards sind die Lösung
8. **Migration ist machbar** - Schrittweise mit allowJs und checkJs

Im nächsten Kapitel bauen wir auf diesem Wissen auf und erstellen unsere erste echte React-Komponente mit TypeScript.

---

## Übungen

1. **Type Challenge:** Erstelle einen Typ `DeepReadonly<T>` der alle verschachtelten Properties readonly macht
2. **React Komponente:** Baue eine generische `Table<T>` Komponente mit typisierten Columns
3. **Migration:** Nimm eine kleine JS-Datei und migriere sie zu TypeScript mit strict mode

```typescript
// Lösung zu 1:
type DeepReadonly<T> = {
    readonly [K in keyof T]: T[K] extends object
        ? DeepReadonly<T[K]>
        : T[K];
};
```
