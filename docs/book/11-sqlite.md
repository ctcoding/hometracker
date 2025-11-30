# Kapitel 11: SQLite & better-sqlite3 - Embedded Database

Als erfahrener Entwickler kennst du relationale Datenbanken: SQL Server, PostgreSQL, MySQL. Du weisst, wie man einen Server aufsetzt, Connections verwaltet und Query-Optimierung betreibt. SQLite ist anders - fundamental anders. Und genau das macht es so mächtig für bestimmte Anwendungsfälle.

## 11.1 Was ist SQLite?

### Serverless und Zero-Config

Bei PostgreSQL oder SQL Server installierst du einen Dienst, konfigurierst Ports, erstellst Benutzer, setzt Berechtigungen. Bei SQLite:

```typescript
import Database from 'better-sqlite3';
const db = new Database('myapp.db');
```

Das war's. Die Datenbank existiert jetzt.

SQLite ist eine **Bibliothek**, kein Server-Prozess. Dein Node.js-Prozess **ist** der Datenbank-Engine. Es gibt keinen Netzwerk-Overhead, keine Connection-Pools, keine Authentifizierung zwischen Client und Server. Die gesamte Datenbank-Engine ist in deine Anwendung eingebettet.

### Eine Datei = Ganze Datenbank

Eine SQLite-Datenbank ist eine einzelne Datei. Alles - Schema, Daten, Indexes, Triggers - in einer Datei. Das hat massive Vorteile:

```bash
# Backup? Eine Datei kopieren.
cp production.db backup-2024-01-15.db

# Deployment? Datei mitliefern.
scp myapp.db server:/data/

# Testen? Fixture-Datenbank verwenden.
const testDb = new Database('./fixtures/test-data.db');

# Debugging? Datei öffnen und durchsuchen.
sqlite3 myapp.db "SELECT * FROM users LIMIT 5"
```

Vergleiche das mit einem PostgreSQL-Backup: `pg_dump`, Credentials, Netzwerk, SQL-Export...

### Wann SQLite, wann PostgreSQL?

Die Entscheidung ist klarer als du denkst:

**SQLite ist ideal für:**

- **Single-Server-Anwendungen**: Eine Node.js-Instanz, ein Server
- **Embedded Applications**: Desktop-Apps, Mobile, IoT, CLI-Tools
- **Prototyping**: Schneller Start ohne Infrastruktur
- **Read-Heavy Workloads**: Blogs, Content-Sites, Analytics-Dashboards
- **Edge Computing**: Cloudflare Workers, Deno Deploy (via Turso)
- **Datenmenge unter 1TB**: Ja, das ist kein Tippfehler

**PostgreSQL/MySQL für:**

- **Multiple Server**: Wenn mehrere Prozesse gleichzeitig schreiben
- **High Write Concurrency**: Hunderte gleichzeitige Schreiboperationen
- **Replikation**: Master-Slave, Read-Replicas
- **Stored Procedures**: Komplexe Geschäftslogik in der Datenbank
- **Erweiterte Datentypen**: PostGIS, JSONB mit Indexes, Arrays

Die meisten Webanwendungen brauchen kein PostgreSQL. Ein einzelner Server mit SQLite handhabt problemlos tausende Requests pro Sekunde für lesende Zugriffe.

### Limits und Stärken

**Technische Limits:**

| Limit | Wert |
|-------|------|
| Maximale Datenbankgrösse | 281 TB |
| Maximale Rows pro Tabelle | 2^64 |
| Maximale Spalten pro Tabelle | 2000 (default), 32767 (compile-time) |
| Maximale String-Länge | 1 GB |
| Maximale BLOB-Grösse | 1 GB |
| Maximale SQL-Statement-Länge | 1 GB |

Diese Limits sind für 99.9% aller Anwendungen irrelevant.

**Echte Stärken:**

- **Zuverlässigkeit**: SQLite ist einer der am besten getesteten Software-Komponenten überhaupt. Der Testsuite hat 100x mehr Code als die Datenbank selbst.
- **ACID-konform**: Vollständige Transaktionen, auch bei Stromausfall
- **Zero-Maintenance**: Keine Vacuuming-Jobs, keine Log-Rotation
- **Schnelligkeit**: Für die meisten Queries schneller als PostgreSQL (kein Netzwerk!)

**Echte Schwächen:**

- **Write-Concurrency**: Nur ein Writer gleichzeitig (mit WAL-Mode gemildert)
- **Keine User-Verwaltung**: Jeder mit Dateizugriff hat vollen Zugriff
- **Keine Netzwerk-Unterstützung**: Die Datenbank muss lokal sein

## 11.2 better-sqlite3 vs andere Libraries

### Die Node.js SQLite-Landschaft

Es gibt mehrere SQLite-Bindings für Node.js:

| Library | API | Performance | Aktiv gepflegt |
|---------|-----|-------------|----------------|
| better-sqlite3 | Synchron | Exzellent | Ja |
| sql.js | Async (WASM) | Mittel | Ja |
| sqlite3 | Async (Callbacks) | Gut | Eingeschränkt |
| node-sqlite | Async (Promise) | Gut | Ja |

### Warum synchron besser ist (für SQLite)

Das klingt erstmal falsch. Asynchron ist doch besser, oder? Bei Netzwerk-I/O ja. Bei SQLite nein.

SQLite-Operationen sind **lokal**. Eine typische Query dauert Mikrosekunden bis wenige Millisekunden. Der Overhead einer Promise-Resolution (Microtask-Queue, Event-Loop-Cycle) kann länger dauern als die Query selbst.

```typescript
// Async mit sqlite3 (alte Lib)
// Jede Operation: Query + Promise-Overhead + Event-Loop-Cycle
db.get("SELECT * FROM users WHERE id = ?", [1], (err, row) => {
  db.get("SELECT * FROM orders WHERE user_id = ?", [1], (err, orders) => {
    // Callback-Hell oder Promise-Wrapping nötig
  });
});

// Synchron mit better-sqlite3
// Direkt, kein Overhead, einfach lesbar
const user = db.prepare("SELECT * FROM users WHERE id = ?").get(1);
const orders = db.prepare("SELECT * FROM orders WHERE user_id = ?").all(1);
```

**Performance-Vergleich (typische Workloads):**

```
Operation                  | better-sqlite3 | sqlite3 (async)
---------------------------|----------------|----------------
1000 INSERTs (Transaction) |     ~8ms       |     ~45ms
10000 SELECTs              |    ~15ms       |    ~180ms
Complex JOIN               |    ~0.3ms      |     ~2ms
```

Der Unterschied kommt nicht von der Query-Ausführung, sondern vom JavaScript-Overhead.

### Aber blockiert das nicht den Event-Loop?

Ja, aber das ist in Ordnung. Eine SQLite-Query blockiert für Mikrosekunden. Ein `JSON.parse()` blockiert auch. Du verwendest trotzdem `JSON.parse()`.

Bei extrem langen Queries (Reports über Millionen Rows) kannst du Worker-Threads verwenden:

```typescript
// worker.ts
import { parentPort, workerData } from 'worker_threads';
import Database from 'better-sqlite3';

const db = new Database(workerData.dbPath, { readonly: true });
const result = db.prepare(workerData.query).all(workerData.params);
parentPort?.postMessage(result);
```

Aber für normale CRUD-Operationen: Synchron ist schneller und einfacher.

## 11.3 Grundlagen

### Datenbank öffnen und erstellen

```typescript
import Database from 'better-sqlite3';

// Neue Datenbank erstellen (oder vorhandene öffnen)
const db = new Database('app.db');

// Mit Optionen
const db = new Database('app.db', {
  readonly: false,          // Default: false
  fileMustExist: false,     // Default: false - erstellt Datei wenn nicht vorhanden
  timeout: 5000,            // Millisekunden warten bei BUSY
  verbose: console.log,     // SQL-Statements loggen (Development)
});

// In-Memory Datenbank (für Tests)
const memDb = new Database(':memory:');

// Readonly-Zugriff (z.B. für Read-Replicas)
const readonlyDb = new Database('app.db', { readonly: true });
```

**Pfad-Handling in ES Modules:**

```typescript
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

// __dirname gibt es in ES Modules nicht direkt
const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, '..', 'data', 'app.db');

// Verzeichnis erstellen falls nicht vorhanden
mkdirSync(dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
```

### prepare(), run(), get(), all()

better-sqlite3 verwendet Prepared Statements. Das ist effizienter und sicherer:

```typescript
// FALSCH - String-Interpolation (SQL Injection!)
const name = "Robert'); DROP TABLE users;--";
db.exec(`INSERT INTO users (name) VALUES ('${name}')`);  // 💥

// RICHTIG - Prepared Statement
const stmt = db.prepare('INSERT INTO users (name) VALUES (?)');
stmt.run(name);  // Sicher, escaped automatisch
```

**Die vier wichtigen Methoden:**

```typescript
const db = new Database('app.db');

// prepare() - Statement vorbereiten (einmalig)
const insertUser = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)');
const selectUser = db.prepare('SELECT * FROM users WHERE id = ?');
const selectAllUsers = db.prepare('SELECT * FROM users');
const countUsers = db.prepare('SELECT COUNT(*) as count FROM users');

// run() - Für INSERT, UPDATE, DELETE (gibt Info zurück)
const info = insertUser.run('Max', 'max@example.com');
console.log(info.changes);        // Anzahl betroffener Rows
console.log(info.lastInsertRowid); // ID der eingefügten Row

// get() - Eine Row zurückgeben (oder undefined)
const user = selectUser.get(42);
console.log(user);  // { id: 42, name: 'Max', email: 'max@example.com' }

// all() - Alle Rows als Array
const users = selectAllUsers.all();
console.log(users); // [{ id: 1, ... }, { id: 2, ... }, ...]

// Scalar-Wert (erste Spalte der ersten Row)
const count = countUsers.pluck().get();
console.log(count);  // 42
```

### Parameter Binding

```typescript
// Positional Parameters (?)
const stmt = db.prepare('SELECT * FROM users WHERE age > ? AND city = ?');
const users = stmt.all(18, 'Berlin');

// Named Parameters ($name, :name, @name)
const stmt = db.prepare('SELECT * FROM users WHERE age > $minAge AND city = $city');
const users = stmt.all({ minAge: 18, city: 'Berlin' });

// Gemischt (nicht empfohlen, aber möglich)
const stmt = db.prepare('SELECT * FROM users WHERE age > ? AND city = $city');
const users = stmt.all(18, { city: 'Berlin' });
```

**Named Parameters sind lesbarer für komplexe Queries:**

```typescript
const insertReading = db.prepare(`
  INSERT INTO readings (
    timestamp, meterValue, unit, outdoorTempCurrent,
    outdoorTempNightAvg, weatherCondition, brightnessAvg
  ) VALUES (
    $timestamp, $meterValue, $unit, $outdoorTempCurrent,
    $outdoorTempNightAvg, $weatherCondition, $brightnessAvg
  )
`);

insertReading.run({
  timestamp: new Date().toISOString(),
  meterValue: 12345.67,
  unit: 'kWh',
  outdoorTempCurrent: 8.5,
  outdoorTempNightAvg: 3.2,
  weatherCondition: 'cloudy',
  brightnessAvg: 45000
});
```

**Statement-Wiederverwendung:**

```typescript
// Statement einmal vorbereiten
const insertUser = db.prepare('INSERT INTO users (name) VALUES (?)');

// Vielfach wiederverwenden - sehr effizient
for (const name of names) {
  insertUser.run(name);
}

// Oder mit bind() für fixe Parameter
const insertBerlinUser = insertUser.bind('Berlin');
insertBerlinUser.run();  // Verwendet immer 'Berlin'
```

## 11.4 Schema Management

### CREATE TABLE

SQLite's Typ-System ist anders als PostgreSQL oder MySQL. Es verwendet **Type Affinity** statt strikter Typen:

```typescript
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    -- INTEGER PRIMARY KEY ist speziel: wird ROWID-Alias
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- TEXT für Strings
    name TEXT NOT NULL,
    email TEXT UNIQUE,

    -- REAL für Floating-Point
    balance REAL DEFAULT 0.0,

    -- INTEGER für Booleans (0/1)
    active INTEGER DEFAULT 1,

    -- TEXT für Dates (ISO 8601)
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,

    -- BLOB für Binary Data
    avatar BLOB,

    -- CHECK Constraints
    age INTEGER CHECK(age >= 0 AND age < 150),

    -- Foreign Keys
    departmentId INTEGER REFERENCES departments(id)
  )
`);
```

**Type Affinity Mapping (von anderen DBs):**

| PostgreSQL/MySQL | SQLite | Hinweis |
|------------------|--------|---------|
| VARCHAR, CHAR, TEXT | TEXT | Keine Längenbeschränkung |
| INT, BIGINT, SMALLINT | INTEGER | Bis 64-bit signed |
| FLOAT, DOUBLE, DECIMAL | REAL | 64-bit IEEE floating point |
| BOOLEAN | INTEGER | 0 = false, 1 = true |
| DATE, DATETIME, TIMESTAMP | TEXT | ISO 8601 Format |
| BYTEA, BINARY | BLOB | Beliebige Bytes |
| JSON, JSONB | TEXT | Als String speichern |
| UUID | TEXT | Als String (36 Zeichen) |
| SERIAL | INTEGER PRIMARY KEY AUTOINCREMENT | |

### Migrations-Strategie ohne ORM

ORMs wie Prisma oder TypeORM bringen eigene Migration-Tools mit. Ohne ORM brauchst du eine einfache Strategie:

**Variante 1: user_version Pragma**

```typescript
const CURRENT_VERSION = 3;

function migrate(db: Database.Database) {
  const currentVersion = db.pragma('user_version', { simple: true }) as number;

  if (currentVersion < 1) {
    db.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE
      )
    `);
    db.pragma(`user_version = 1`);
  }

  if (currentVersion < 2) {
    db.exec(`ALTER TABLE users ADD COLUMN createdAt TEXT`);
    db.pragma(`user_version = 2`);
  }

  if (currentVersion < 3) {
    db.exec(`
      CREATE TABLE orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER REFERENCES users(id),
        total REAL NOT NULL
      )
    `);
    db.pragma(`user_version = 3`);
  }
}
```

**Variante 2: Migrations-Tabelle**

```typescript
interface Migration {
  version: number;
  name: string;
  sql: string;
}

const migrations: Migration[] = [
  {
    version: 1,
    name: 'create_users',
    sql: `CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)`
  },
  {
    version: 2,
    name: 'add_user_email',
    sql: `ALTER TABLE users ADD COLUMN email TEXT`
  },
  // ...
];

function runMigrations(db: Database.Database) {
  // Migrations-Tabelle erstellen
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      appliedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const applied = db.prepare('SELECT version FROM _migrations').pluck().all() as number[];
  const insertMigration = db.prepare('INSERT INTO _migrations (version, name) VALUES (?, ?)');

  const transaction = db.transaction(() => {
    for (const migration of migrations) {
      if (!applied.includes(migration.version)) {
        db.exec(migration.sql);
        insertMigration.run(migration.version, migration.name);
        console.log(`Applied migration ${migration.version}: ${migration.name}`);
      }
    }
  });

  transaction();
}
```

**Variante 3: Try-Catch für Spalten hinzufügen**

Dies ist pragmatisch für kleine Projekte:

```typescript
// Aus dem HausTracker-Projekt
try {
  db.exec(`ALTER TABLE settings ADD COLUMN indoorTempSensorEntity TEXT`);
} catch { /* column exists */ }

try {
  db.exec(`ALTER TABLE settings ADD COLUMN targetConsumptionMonthly REAL`);
} catch { /* column exists */ }
```

Das funktioniert, weil `ALTER TABLE ADD COLUMN` einen Fehler wirft, wenn die Spalte existiert.

### Pragmas

Pragmas sind SQLite-spezifische Konfigurationen. Die wichtigsten:

```typescript
// Journal Mode (WICHTIG für Performance)
db.pragma('journal_mode = WAL');  // Write-Ahead Logging

// Foreign Key Enforcement (standardmässig AUS!)
db.pragma('foreign_keys = ON');

// Synchronization Mode (Trade-off: Speed vs. Durability)
db.pragma('synchronous = NORMAL');  // Good balance
// db.pragma('synchronous = OFF');  // Fastest, unsafe bei Stromausfall
// db.pragma('synchronous = FULL'); // Safest, slower

// Cache Size (in KB, negativ = KB, positiv = Pages)
db.pragma('cache_size = -64000');  // 64MB Cache

// Busy Timeout (Millisekunden warten bei Lock)
db.pragma('busy_timeout = 5000');

// Temp Store in Memory
db.pragma('temp_store = MEMORY');

// Pragmas auslesen
console.log(db.pragma('journal_mode', { simple: true }));  // 'wal'
console.log(db.pragma('foreign_keys', { simple: true }));  // 1
```

**Empfohlene Pragmas für Produktion:**

```typescript
function configurePragmas(db: Database.Database) {
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');
  db.pragma('busy_timeout = 5000');
  db.pragma('cache_size = -64000');
  db.pragma('temp_store = MEMORY');
}
```

## 11.5 CRUD Operationen

### INSERT

```typescript
// Einfacher INSERT
const insertUser = db.prepare(`
  INSERT INTO users (name, email, createdAt)
  VALUES (?, ?, datetime('now'))
`);
const result = insertUser.run('Max Mustermann', 'max@example.com');
console.log(result.lastInsertRowid);  // 1

// INSERT OR REPLACE (UPSERT-Variante 1)
const upsert = db.prepare(`
  INSERT OR REPLACE INTO settings (key, value)
  VALUES (?, ?)
`);
upsert.run('theme', 'dark');

// INSERT ON CONFLICT (UPSERT-Variante 2, ab SQLite 3.24)
const upsertBetter = db.prepare(`
  INSERT INTO settings (key, value)
  VALUES (?, ?)
  ON CONFLICT(key) DO UPDATE SET value = excluded.value
`);
upsertBetter.run('theme', 'dark');

// INSERT mit RETURNING (ab SQLite 3.35)
const insertWithReturn = db.prepare(`
  INSERT INTO users (name, email)
  VALUES (?, ?)
  RETURNING id, createdAt
`);
const newUser = insertWithReturn.get('Anna', 'anna@example.com');
console.log(newUser);  // { id: 2, createdAt: '2024-01-15 10:30:00' }
```

### SELECT

```typescript
// Einzelne Row
const getUser = db.prepare('SELECT * FROM users WHERE id = ?');
const user = getUser.get(1);

// Alle Rows
const getAllUsers = db.prepare('SELECT * FROM users ORDER BY name');
const users = getAllUsers.all();

// Mit WHERE-Bedingungen
const searchUsers = db.prepare(`
  SELECT * FROM users
  WHERE name LIKE ?
    AND createdAt > ?
  ORDER BY name
  LIMIT ?
`);
const results = searchUsers.all('%max%', '2024-01-01', 10);

// Nur bestimmte Spalten (mit pluck für eine Spalte)
const getNames = db.prepare('SELECT name FROM users').pluck();
const names = getNames.all();  // ['Max', 'Anna', ...]

// Aggregationen
const stats = db.prepare(`
  SELECT
    COUNT(*) as total,
    AVG(balance) as avgBalance,
    MAX(createdAt) as lastCreated
  FROM users
`).get();

// JOINs
const ordersWithUsers = db.prepare(`
  SELECT
    o.id as orderId,
    o.total,
    u.name as userName,
    u.email
  FROM orders o
  JOIN users u ON o.userId = u.id
  WHERE o.total > ?
`).all(100);
```

### UPDATE

```typescript
// Einfaches UPDATE
const updateUser = db.prepare(`
  UPDATE users SET name = ?, email = ? WHERE id = ?
`);
const result = updateUser.run('Max Updated', 'max.new@example.com', 1);
console.log(result.changes);  // 1 (Anzahl geänderter Rows)

// UPDATE mit Bedingungen
const deactivateOld = db.prepare(`
  UPDATE users
  SET active = 0
  WHERE createdAt < datetime('now', '-1 year')
`);
const deactivated = deactivateOld.run();
console.log(`${deactivated.changes} users deactivated`);

// UPDATE mit RETURNING (ab SQLite 3.35)
const updateWithReturn = db.prepare(`
  UPDATE users
  SET balance = balance + ?
  WHERE id = ?
  RETURNING balance
`);
const newBalance = updateWithReturn.pluck().get(100.50, 1);
```

### DELETE

```typescript
// Einzelne Row löschen
const deleteUser = db.prepare('DELETE FROM users WHERE id = ?');
deleteUser.run(42);

// Mehrere Rows löschen
const cleanupOld = db.prepare(`
  DELETE FROM logs WHERE createdAt < datetime('now', '-30 days')
`);
const deleted = cleanupOld.run();
console.log(`Deleted ${deleted.changes} old log entries`);

// Alle löschen (mit Vorsicht!)
const clearTable = db.prepare('DELETE FROM temp_data');
clearTable.run();

// DELETE mit RETURNING
const deleteWithReturn = db.prepare(`
  DELETE FROM users WHERE id = ? RETURNING name, email
`);
const deletedUser = deleteWithReturn.get(1);
console.log(`Deleted user: ${deletedUser?.name}`);
```

### Transactions

Transaktionen sind kritisch für Datenintegrität und Performance:

```typescript
// Manuell (basic)
db.exec('BEGIN');
try {
  // ... mehrere Operationen
  db.exec('COMMIT');
} catch (error) {
  db.exec('ROLLBACK');
  throw error;
}

// Mit db.transaction() (empfohlen!)
const transferMoney = db.transaction((fromId: number, toId: number, amount: number) => {
  const withdraw = db.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?');
  const deposit = db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?');

  withdraw.run(amount, fromId);
  deposit.run(amount, toId);

  // Constraint-Check
  const fromBalance = db.prepare('SELECT balance FROM accounts WHERE id = ?')
    .pluck().get(fromId) as number;

  if (fromBalance < 0) {
    throw new Error('Insufficient funds');
  }
});

// Verwenden - bei Fehler automatischer Rollback
try {
  transferMoney(1, 2, 500);
} catch (error) {
  console.error('Transfer failed:', error.message);
}
```

**Bulk-Inserts mit Transactions (Performance-Boost!):**

```typescript
// LANGSAM: Jeder INSERT ist eine eigene Transaction
const insert = db.prepare('INSERT INTO logs (message) VALUES (?)');
for (const msg of messages) {
  insert.run(msg);  // ~20ms pro INSERT durch Disk-Sync
}

// SCHNELL: Eine Transaction für alle
const insertMany = db.transaction((messages: string[]) => {
  const insert = db.prepare('INSERT INTO logs (message) VALUES (?)');
  for (const msg of messages) {
    insert.run(msg);  // ~0.01ms pro INSERT
  }
});
insertMany(messages);  // 1000x schneller!
```

**Verschachtelte Transactions mit Savepoints:**

```typescript
const outer = db.transaction(() => {
  db.prepare('INSERT INTO users (name) VALUES (?)').run('User1');

  // Verschachtelte Transaction (wird Savepoint)
  const inner = db.transaction(() => {
    db.prepare('INSERT INTO users (name) VALUES (?)').run('User2');
    throw new Error('Inner failed');  // Rolled back nur bis zum Savepoint
  });

  try {
    inner();
  } catch {
    // Inner-Transaction rückgängig, aber User1 bleibt
  }

  db.prepare('INSERT INTO users (name) VALUES (?)').run('User3');
});

outer();  // User1 und User3 werden committed
```

### lastInsertRowid

```typescript
const insert = db.prepare('INSERT INTO users (name) VALUES (?)');
const info = insert.run('New User');

// Die ID der neuen Row
const newId = info.lastInsertRowid;  // bigint!
console.log(Number(newId));  // 42

// Vorsicht: lastInsertRowid ist ein BigInt
// Bei grossen IDs ist Number() nicht sicher
if (newId > Number.MAX_SAFE_INTEGER) {
  console.log(String(newId));  // Als String verwenden
}

// Mit RETURNING ist es eleganter
const insertWithId = db.prepare(`
  INSERT INTO users (name) VALUES (?) RETURNING id
`);
const { id } = insertWithId.get('Another User') as { id: number };
```

## 11.6 Typed Queries mit TypeScript

### Generics für Ergebnisse

better-sqlite3 ist typsicher mit TypeScript-Generics:

```typescript
import Database, { Statement } from 'better-sqlite3';

// Interfaces für deine Tabellen
interface User {
  id: number;
  name: string;
  email: string | null;
  balance: number;
  active: number;  // 0 | 1 in SQLite
  createdAt: string;
}

interface Order {
  id: number;
  userId: number;
  total: number;
  status: string;
}

// Typisierte Queries
const db = new Database('app.db');

// get<T>() für einzelne Row
const getUser = db.prepare<[number], User>('SELECT * FROM users WHERE id = ?');
const user = getUser.get(1);  // User | undefined

// all<T>() für mehrere Rows
const getAllUsers = db.prepare<[], User>('SELECT * FROM users');
const users = getAllUsers.all();  // User[]

// Mit Named Parameters
interface SearchParams {
  name: string;
  minBalance: number;
}

const searchUsers = db.prepare<[SearchParams], User>(`
  SELECT * FROM users
  WHERE name LIKE $name
    AND balance >= $minBalance
`);
const results = searchUsers.all({ name: '%max%', minBalance: 100 });
```

### Interface für Rows

**Komplexes Beispiel mit JOINs:**

```typescript
// Basis-Interfaces
interface User {
  id: number;
  name: string;
  email: string | null;
}

interface Order {
  id: number;
  userId: number;
  total: number;
  createdAt: string;
}

// Interface für JOIN-Ergebnis
interface OrderWithUser {
  orderId: number;
  orderTotal: number;
  userName: string;
  userEmail: string | null;
}

const ordersWithUsers = db.prepare<[number], OrderWithUser>(`
  SELECT
    o.id as orderId,
    o.total as orderTotal,
    u.name as userName,
    u.email as userEmail
  FROM orders o
  JOIN users u ON o.userId = u.id
  WHERE o.total > ?
`);

const results = ordersWithUsers.all(100);
results.forEach(row => {
  console.log(`${row.userName} ordered ${row.orderTotal}`);
});
```

**Typisierte Insert/Update-Parameter:**

```typescript
interface InsertUserParams {
  name: string;
  email: string | null;
  balance?: number;
}

// Für run() das Ergebnis-Type nicht spezifizieren
const insertUser = db.prepare<[InsertUserParams]>(`
  INSERT INTO users (name, email, balance)
  VALUES ($name, $email, COALESCE($balance, 0))
`);

// TypeScript prüft die Parameter
insertUser.run({ name: 'Max', email: 'max@example.com' });
insertUser.run({ name: 'Anna', email: null, balance: 100 });
// insertUser.run({ name: 'Error' });  // Fehler: email fehlt
```

**Factory-Funktion für typisierte Queries:**

```typescript
function createQueries(db: Database.Database) {
  return {
    users: {
      getById: db.prepare<[number], User>('SELECT * FROM users WHERE id = ?'),
      getAll: db.prepare<[], User>('SELECT * FROM users'),
      insert: db.prepare<[Omit<User, 'id'>]>(`
        INSERT INTO users (name, email, balance, active, createdAt)
        VALUES ($name, $email, $balance, $active, $createdAt)
      `),
      update: db.prepare<[User]>(`
        UPDATE users SET name=$name, email=$email, balance=$balance
        WHERE id = $id
      `),
      delete: db.prepare<[number]>('DELETE FROM users WHERE id = ?'),
    },
    orders: {
      // ... ähnlich
    }
  };
}

// Verwendung
const queries = createQueries(db);
const user = queries.users.getById.get(1);
queries.users.insert.run({
  name: 'New User',
  email: 'new@example.com',
  balance: 0,
  active: 1,
  createdAt: new Date().toISOString()
});
```

## 11.7 Performance

### WAL Mode

Write-Ahead Logging ist die wichtigste Performance-Optimierung für SQLite:

```typescript
db.pragma('journal_mode = WAL');
```

**Was WAL macht:**

- **Ohne WAL (Rollback Journal)**: Jeder Write blockiert alle Reads. Write-heavy = langsam.
- **Mit WAL**: Reads und Writes können gleichzeitig stattfinden. Writes blockieren nur andere Writes.

**Wann WAL verwenden:**

- ✅ Web-Anwendungen (concurrent reads)
- ✅ APIs mit vielen gleichzeitigen Requests
- ✅ Alles ausser sehr spezielle Fälle

**Wann NICHT WAL:**

- ❌ Netzwerk-Dateisysteme (NFS, SMB) - WAL funktioniert dort nicht zuverlässig
- ❌ Readonly-Datenbanken, die oft kopiert werden (WAL hat zusätzliche Dateien)

**WAL-Dateien:**

```bash
myapp.db      # Hauptdatenbank
myapp.db-wal  # Write-Ahead Log
myapp.db-shm  # Shared Memory für WAL
```

Diese Dateien gehören zusammen. Beim Backup alle drei kopieren!

```typescript
// Checkpoint erzwingen (WAL in Hauptdatei mergen)
db.pragma('wal_checkpoint(TRUNCATE)');
```

### Indexes

Indexes funktionieren wie in anderen Datenbanken:

```typescript
// Index erstellen
db.exec('CREATE INDEX idx_users_email ON users(email)');
db.exec('CREATE INDEX idx_users_name ON users(name)');

// Composite Index (für Queries mit mehreren WHERE-Bedingungen)
db.exec('CREATE INDEX idx_orders_user_date ON orders(userId, createdAt)');

// Unique Index
db.exec('CREATE UNIQUE INDEX idx_users_email_unique ON users(email)');

// Partial Index (nur für bestimmte Rows)
db.exec('CREATE INDEX idx_active_users ON users(name) WHERE active = 1');

// Expression Index (für berechnete Werte)
db.exec('CREATE INDEX idx_users_email_lower ON users(LOWER(email))');
```

**Wann Indexes anlegen:**

- Spalten in WHERE-Bedingungen
- Spalten in JOIN-Bedingungen
- Spalten in ORDER BY

**Wann keine Indexes:**

- Tabellen mit wenigen Rows (<1000)
- Spalten mit geringer Kardinalität (z.B. boolean)
- Spalten, die oft aktualisiert werden (Index-Update-Overhead)

### EXPLAIN QUERY PLAN

Verstehe, wie SQLite deine Query ausführt:

```typescript
// Query Plan anzeigen
const plan = db.prepare(`
  EXPLAIN QUERY PLAN
  SELECT * FROM users u
  JOIN orders o ON o.userId = u.id
  WHERE u.name LIKE ? AND o.total > ?
`).all('%max%', 100);

console.log(plan);
// [
//   { detail: 'SCAN users' },              // Full Table Scan - langsam!
//   { detail: 'SEARCH orders USING INDEX ...' }  // Index-Lookup - schnell!
// ]
```

**Was du sehen willst:**

- `SEARCH ... USING INDEX` - Gut! Index wird verwendet
- `SEARCH ... USING COVERING INDEX` - Sehr gut! Daten direkt aus Index
- `SCAN` - Schlecht! Full Table Scan

**Beispiel-Optimierung:**

```typescript
// Langsam: Full Table Scan
db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get('max@example.com');

// Schnell mit Expression Index
db.exec('CREATE INDEX idx_email_lower ON users(LOWER(email))');
db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get('max@example.com');
// -> SEARCH users USING INDEX idx_email_lower
```

**Query-Analyse Funktion:**

```typescript
function analyzeQuery(db: Database.Database, sql: string) {
  const plan = db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all();

  let hasFullScan = false;
  for (const step of plan) {
    const detail = (step as { detail: string }).detail;
    if (detail.startsWith('SCAN') && !detail.includes('COVERING')) {
      hasFullScan = true;
      console.warn(`⚠️  Full table scan: ${detail}`);
    } else {
      console.log(`✓ ${detail}`);
    }
  }

  return { plan, hasFullScan };
}

analyzeQuery(db, 'SELECT * FROM users WHERE email = ?');
```

## 11.8 Best Practices

### Connection Management

SQLite braucht keine Connection-Pools wie PostgreSQL. Aber du solltest die Verbindung richtig verwalten:

```typescript
// ❌ FALSCH: Für jeden Request neue Verbindung
app.get('/users', (req, res) => {
  const db = new Database('app.db');  // Langsam, unnötig
  const users = db.prepare('SELECT * FROM users').all();
  db.close();
  res.json(users);
});

// ✓ RICHTIG: Eine Verbindung für die gesamte Anwendung
const db = new Database('app.db');
db.pragma('journal_mode = WAL');

app.get('/users', (req, res) => {
  const users = db.prepare('SELECT * FROM users').all();
  res.json(users);
});

// Sauberes Herunterfahren
process.on('SIGTERM', () => {
  db.close();
  process.exit(0);
});
```

**Singleton-Pattern für Module:**

```typescript
// db.ts
import Database from 'better-sqlite3';

let instance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!instance) {
    instance = new Database('./data/app.db');
    instance.pragma('journal_mode = WAL');
    instance.pragma('foreign_keys = ON');
  }
  return instance;
}

export function closeDb(): void {
  if (instance) {
    instance.close();
    instance = null;
  }
}

// Verwendung in anderen Modulen
import { getDb } from './db';

const db = getDb();
const users = db.prepare('SELECT * FROM users').all();
```

### Error Handling

```typescript
import Database, { SqliteError } from 'better-sqlite3';

try {
  const db = new Database('app.db');
  db.prepare('INSERT INTO users (name) VALUES (?)').run('Max');
} catch (error) {
  if (error instanceof SqliteError) {
    // SQLite-spezifischer Fehler
    console.error('SQLite Error:', error.code, error.message);

    switch (error.code) {
      case 'SQLITE_CONSTRAINT_UNIQUE':
        console.log('Duplicate entry');
        break;
      case 'SQLITE_CONSTRAINT_FOREIGNKEY':
        console.log('Foreign key violation');
        break;
      case 'SQLITE_BUSY':
        console.log('Database is locked');
        break;
      case 'SQLITE_CORRUPT':
        console.log('Database file is corrupted!');
        break;
    }
  } else {
    // Anderer Fehler (z.B. Datei nicht gefunden)
    throw error;
  }
}
```

**Graceful Degradation bei BUSY:**

```typescript
function withRetry<T>(
  fn: () => T,
  maxRetries = 3,
  delayMs = 100
): T {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return fn();
    } catch (error) {
      if (error instanceof SqliteError && error.code === 'SQLITE_BUSY') {
        lastError = error;
        // Exponential backoff
        const delay = delayMs * Math.pow(2, i);
        // Synchrones sleep (für better-sqlite3 ok)
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delay);
        continue;
      }
      throw error;
    }
  }

  throw lastError;
}

// Verwendung
const users = withRetry(() =>
  db.prepare('SELECT * FROM users').all()
);
```

### Backup-Strategien

**1. Einfaches Datei-Kopieren (bei WAL mit Checkpoint):**

```typescript
function backup(db: Database.Database, backupPath: string) {
  // WAL in Hauptdatei mergen
  db.pragma('wal_checkpoint(TRUNCATE)');

  // Jetzt sicher kopieren
  const fs = require('fs');
  const dbPath = db.name;
  fs.copyFileSync(dbPath, backupPath);

  console.log(`Backup created: ${backupPath}`);
}
```

**2. Mit SQLite Backup API (während der Nutzung):**

```typescript
async function onlineBackup(db: Database.Database, backupPath: string) {
  return new Promise<void>((resolve, reject) => {
    const backup = db.backup(backupPath);

    function step() {
      const remaining = backup.remaining;
      const total = backup.pageCount;

      if (backup.step(100) === false) {
        // Fertig
        console.log(`Backup complete: ${backupPath}`);
        resolve();
      } else {
        // Fortschritt
        const progress = ((total - remaining) / total * 100).toFixed(1);
        console.log(`Backup progress: ${progress}%`);

        // Nächster Step nach kurzer Pause (anderen Operationen erlauben)
        setTimeout(step, 10);
      }
    }

    step();
  });
}
```

**3. Automatisches Backup-Schema:**

```typescript
import { join } from 'path';
import { existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs';

function setupAutoBackup(
  db: Database.Database,
  backupDir: string,
  maxBackups = 7,
  intervalHours = 24
) {
  mkdirSync(backupDir, { recursive: true });

  const performBackup = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    const backupPath = join(backupDir, `backup-${timestamp}.db`);

    db.pragma('wal_checkpoint(TRUNCATE)');
    require('fs').copyFileSync(db.name, backupPath);

    // Alte Backups löschen
    const backups = readdirSync(backupDir)
      .filter(f => f.startsWith('backup-'))
      .sort()
      .reverse();

    for (const old of backups.slice(maxBackups)) {
      unlinkSync(join(backupDir, old));
    }

    console.log(`Backup created: ${backupPath}`);
  };

  // Initial backup
  performBackup();

  // Periodische Backups
  setInterval(performBackup, intervalHours * 60 * 60 * 1000);
}
```

## 11.9 Alternativen

### Drizzle ORM

Drizzle ist ein leichtgewichtiger, TypeScript-first ORM:

```typescript
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

// Schema-Definition (type-safe!)
const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').unique(),
  balance: real('balance').default(0),
});

// Drizzle initialisieren
const sqlite = new Database('app.db');
const db = drizzle(sqlite);

// Queries (type-safe!)
const allUsers = await db.select().from(users);
const maxUsers = await db.select()
  .from(users)
  .where(like(users.name, '%max%'));

// Insert
await db.insert(users).values({
  name: 'Max',
  email: 'max@example.com'
});
```

**Vorteile:**

- Volle TypeScript-Unterstützung
- Leichtgewichtig, wenig Overhead
- SQL-nahe API
- Migrationen eingebaut

### Prisma

Prisma ist ein ausgewachsenes ORM mit Schema-first Ansatz:

```prisma
// schema.prisma
datasource db {
  provider = "sqlite"
  url      = "file:./app.db"
}

model User {
  id      Int      @id @default(autoincrement())
  name    String
  email   String?  @unique
  orders  Order[]
}

model Order {
  id     Int   @id @default(autoincrement())
  total  Float
  user   User  @relation(fields: [userId], references: [id])
  userId Int
}
```

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Type-safe queries
const users = await prisma.user.findMany({
  where: { name: { contains: 'max' } },
  include: { orders: true }
});

// Create with relations
await prisma.user.create({
  data: {
    name: 'Max',
    orders: {
      create: [
        { total: 99.99 }
      ]
    }
  }
});
```

**Vorteile:**

- Sehr gutes Developer-Experience
- Migrationen, Seeding, Studio
- Relationen automatisch

**Nachteile für SQLite:**

- Prisma Client ist async (langsamer für SQLite)
- Grosser Overhead für einfache Projekte
- Query-Engine als separate Binary

### Kysely

Kysely ist ein Type-safe SQL Query Builder:

```typescript
import { Kysely, SqliteDialect } from 'kysely';
import Database from 'better-sqlite3';

// Typen definieren
interface Database {
  users: {
    id: number;
    name: string;
    email: string | null;
  };
  orders: {
    id: number;
    userId: number;
    total: number;
  };
}

const db = new Kysely<Database>({
  dialect: new SqliteDialect({
    database: new Database('app.db'),
  }),
});

// Type-safe queries
const users = await db
  .selectFrom('users')
  .select(['id', 'name'])
  .where('name', 'like', '%max%')
  .execute();

// JOINs
const ordersWithUsers = await db
  .selectFrom('orders')
  .innerJoin('users', 'users.id', 'orders.userId')
  .select(['orders.id', 'orders.total', 'users.name'])
  .execute();
```

**Vorteile:**

- SQL-Kontrolle bei Type-Safety
- Kein Code-Generation
- Leichtgewichtig

### Vergleichsmatrix

| Feature | better-sqlite3 | Drizzle | Prisma | Kysely |
|---------|---------------|---------|--------|--------|
| Type-Safety | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Performance | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| Lernkurve | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| Relations | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Migrationen | ⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| Bundle Size | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ |

**Empfehlung:**

- **Kleine Projekte, volle Kontrolle**: better-sqlite3 pur
- **Mittlere Projekte, Type-Safety**: Drizzle oder Kysely
- **Grosse Projekte, Team-Entwicklung**: Prisma oder Drizzle

## 11.10 Praktisch: HausTracker Database

Schauen wir uns die tatsächliche Datenbank-Implementation des HausTracker-Projekts an:

### server/src/db.ts analysiert

```typescript
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, '..', 'data', 'haustracker.db');

// Ensure data directory exists
import { mkdirSync } from 'fs';
mkdirSync(join(__dirname, '..', 'data'), { recursive: true });

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
```

**Was passiert hier:**

1. **ES Module Path-Handling**: `__dirname` gibt es in ES Modules nicht, also wird es aus `import.meta.url` konstruiert
2. **Verzeichnis-Erstellung**: `mkdirSync` mit `recursive: true` erstellt den `data`-Ordner falls nötig
3. **WAL Mode**: Sofort aktiviert für bessere Performance

### Schema

Das Schema zeigt eine typische Embedded-App-Struktur:

```typescript
db.exec(`
  CREATE TABLE IF NOT EXISTS readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    meterValue REAL NOT NULL,
    unit TEXT DEFAULT 'kWh',
    outdoorTempCurrent REAL,
    outdoorTempNightAvg REAL,
    weatherCondition TEXT,
    brightnessAvg REAL,
    consumption REAL,
    hoursSinceLastReading INTEGER,
    daysSinceLastReading INTEGER,
    consumptionPerDay REAL,
    costSinceLastReading REAL,
    source TEXT DEFAULT 'manual',
    ocrConfidence REAL,
    notes TEXT,
    imageData TEXT,
    synced INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  );
```

**Design-Entscheidungen:**

1. **`timestamp TEXT`**: ISO 8601 Format für Datumsangaben. SQLite hat keinen nativen Date-Typ, aber viele eingebaute Datumsfunktionen.

2. **`REAL` für Dezimalwerte**: `meterValue`, `consumption`, etc. REAL ist ein 64-bit Float - für Energiewerte ausreichend präzise.

3. **`INTEGER` für Booleans**: `synced INTEGER DEFAULT 0` - 0/1 statt true/false.

4. **`imageData TEXT`**: Base64-encoded Bilder direkt in der Datenbank. Für kleine Apps praktisch, bei vielen/grossen Bildern besser auf Dateisystem auslagern.

5. **`source TEXT DEFAULT 'manual'`**: Enum-artige Werte als TEXT - SQLite kennt keine ENUMs.

### Settings-Tabelle (Singleton-Pattern)

```typescript
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY DEFAULT 'main',
  homeAssistantUrl TEXT,
  homeAssistantToken TEXT,
  temperatureSensorEntity TEXT,
  // ...
);

-- Insert default settings if not exists
INSERT OR IGNORE INTO settings (id) VALUES ('main');
```

Eine Tabelle mit genau einer Row - klassisches Pattern für App-Konfiguration. `INSERT OR IGNORE` ist idempotent und erstellt die Row nur beim ersten Mal.

### Migrations-Ansatz

```typescript
// Migrations for existing databases
try {
  db.exec(`ALTER TABLE settings ADD COLUMN indoorTempSensorEntity TEXT`);
} catch { /* column exists */ }
try {
  db.exec(`ALTER TABLE settings ADD COLUMN brightnessSensorEntities TEXT`);
} catch { /* column exists */ }
```

**Pragmatischer Ansatz:**

- Kein Migration-Framework
- Jede Migration ist idempotent (kann mehrfach ausgeführt werden)
- Try-Catch fängt "column already exists"-Fehler ab
- Für kleine Teams/Projekte absolut ausreichend

**Verbesserungsmöglichkeiten:**

```typescript
// Prüfen ob Spalte existiert (sauberer als try-catch)
function columnExists(db: Database.Database, table: string, column: string): boolean {
  const columns = db.pragma(`table_info(${table})`) as { name: string }[];
  return columns.some(c => c.name === column);
}

if (!columnExists(db, 'settings', 'indoorTempSensorEntity')) {
  db.exec(`ALTER TABLE settings ADD COLUMN indoorTempSensorEntity TEXT`);
}
```

### Typische Queries (Beispiele)

Basierend auf dem Schema könnten die Queries so aussehen:

```typescript
// Alle Readings abrufen
const getAllReadings = db.prepare(`
  SELECT * FROM readings
  ORDER BY timestamp DESC
`);

// Reading nach ID
const getReadingById = db.prepare(`
  SELECT * FROM readings WHERE id = ?
`);

// Neues Reading einfügen
const insertReading = db.prepare(`
  INSERT INTO readings (
    timestamp, meterValue, unit, outdoorTempCurrent,
    outdoorTempNightAvg, weatherCondition, brightnessAvg,
    consumption, hoursSinceLastReading, daysSinceLastReading,
    consumptionPerDay, costSinceLastReading, source, notes
  ) VALUES (
    $timestamp, $meterValue, $unit, $outdoorTempCurrent,
    $outdoorTempNightAvg, $weatherCondition, $brightnessAvg,
    $consumption, $hoursSinceLastReading, $daysSinceLastReading,
    $consumptionPerDay, $costSinceLastReading, $source, $notes
  )
`);

// Monatliche Aggregation
const getMonthlyStats = db.prepare(`
  SELECT
    strftime('%Y-%m', timestamp) as month,
    MIN(meterValue) as startReading,
    MAX(meterValue) as endReading,
    SUM(consumption) as totalConsumption,
    AVG(consumptionPerDay) as avgPerDay
  FROM readings
  WHERE timestamp >= date('now', '-12 months')
  GROUP BY strftime('%Y-%m', timestamp)
  ORDER BY month DESC
`);

// Settings laden
const getSettings = db.prepare(`SELECT * FROM settings WHERE id = 'main'`);

// Settings aktualisieren
const updateSettings = db.prepare(`
  UPDATE settings SET
    homeAssistantUrl = $homeAssistantUrl,
    homeAssistantToken = $homeAssistantToken,
    temperatureSensorEntity = $temperatureSensorEntity
  WHERE id = 'main'
`);
```

### Vollständiges Datenbankmodul (Erweitertes Beispiel)

So könnte eine vollständige, typisierte Datenbank-Schicht aussehen:

```typescript
// types.ts
export interface Reading {
  id: number;
  timestamp: string;
  meterValue: number;
  unit: string;
  outdoorTempCurrent: number | null;
  outdoorTempNightAvg: number | null;
  weatherCondition: string | null;
  brightnessAvg: number | null;
  consumption: number | null;
  hoursSinceLastReading: number | null;
  daysSinceLastReading: number | null;
  consumptionPerDay: number | null;
  costSinceLastReading: number | null;
  source: string;
  ocrConfidence: number | null;
  notes: string | null;
  imageData: string | null;
  synced: number;
  createdAt: string;
}

export interface Settings {
  id: string;
  homeAssistantUrl: string | null;
  homeAssistantToken: string | null;
  temperatureSensorEntity: string | null;
  // ...
}

// db.ts
import Database from 'better-sqlite3';
import type { Reading, Settings } from './types';

export function createDatabase(dbPath: string) {
  const db = new Database(dbPath);

  // Pragmas
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

  // Schema initialisieren
  initSchema(db);

  // Prepared Statements
  const statements = {
    // Readings
    getAllReadings: db.prepare<[], Reading>(`
      SELECT * FROM readings ORDER BY timestamp DESC
    `),
    getReadingById: db.prepare<[number], Reading>(`
      SELECT * FROM readings WHERE id = ?
    `),
    getLatestReading: db.prepare<[], Reading>(`
      SELECT * FROM readings ORDER BY timestamp DESC LIMIT 1
    `),
    insertReading: db.prepare<[Omit<Reading, 'id' | 'createdAt'>]>(`
      INSERT INTO readings (
        timestamp, meterValue, unit, outdoorTempCurrent,
        outdoorTempNightAvg, weatherCondition, brightnessAvg,
        consumption, hoursSinceLastReading, daysSinceLastReading,
        consumptionPerDay, costSinceLastReading, source,
        ocrConfidence, notes, imageData, synced
      ) VALUES (
        $timestamp, $meterValue, $unit, $outdoorTempCurrent,
        $outdoorTempNightAvg, $weatherCondition, $brightnessAvg,
        $consumption, $hoursSinceLastReading, $daysSinceLastReading,
        $consumptionPerDay, $costSinceLastReading, $source,
        $ocrConfidence, $notes, $imageData, $synced
      )
    `),
    deleteReading: db.prepare<[number]>(`
      DELETE FROM readings WHERE id = ?
    `),

    // Settings
    getSettings: db.prepare<[], Settings>(`
      SELECT * FROM settings WHERE id = 'main'
    `),
    updateSettings: db.prepare<[Partial<Settings>]>(`
      UPDATE settings SET
        homeAssistantUrl = COALESCE($homeAssistantUrl, homeAssistantUrl),
        homeAssistantToken = COALESCE($homeAssistantToken, homeAssistantToken),
        temperatureSensorEntity = COALESCE($temperatureSensorEntity, temperatureSensorEntity)
      WHERE id = 'main'
    `),
  };

  return {
    db,

    // Reading-Funktionen
    getAllReadings: () => statements.getAllReadings.all(),
    getReadingById: (id: number) => statements.getReadingById.get(id),
    getLatestReading: () => statements.getLatestReading.get(),
    insertReading: (reading: Omit<Reading, 'id' | 'createdAt'>) => {
      const info = statements.insertReading.run(reading);
      return Number(info.lastInsertRowid);
    },
    deleteReading: (id: number) => {
      const info = statements.deleteReading.run(id);
      return info.changes > 0;
    },

    // Settings-Funktionen
    getSettings: () => statements.getSettings.get(),
    updateSettings: (settings: Partial<Settings>) => {
      statements.updateSettings.run(settings);
    },

    // Utility
    close: () => db.close(),
    backup: (path: string) => {
      db.pragma('wal_checkpoint(TRUNCATE)');
      require('fs').copyFileSync(dbPath, path);
    }
  };
}

// Verwendung
const database = createDatabase('./data/haustracker.db');

const readings = database.getAllReadings();
const newId = database.insertReading({
  timestamp: new Date().toISOString(),
  meterValue: 12345.67,
  unit: 'kWh',
  // ...
});
```

## Zusammenfassung

SQLite mit better-sqlite3 ist die perfekte Wahl für:

- Single-Server Node.js-Anwendungen
- Prototypen und MVPs
- Embedded/Desktop-Anwendungen
- Situationen, in denen Einfachheit wichtiger ist als horizontale Skalierung

**Die wichtigsten Punkte:**

1. **WAL Mode aktivieren** - immer, ausser du hast einen guten Grund dagegen
2. **Synchrone API ist schneller** - kein Promise-Overhead für lokale Operationen
3. **Prepared Statements nutzen** - Sicherheit und Performance
4. **Transaktionen für Bulk-Operationen** - 100x schneller als einzelne Inserts
5. **TypeScript-Generics** - für type-safe Queries
6. **Einfache Migrations** - user_version oder try-catch für ADD COLUMN

SQLite ist nicht "die kleine Datenbank für Hobby-Projekte". Es ist eine der zuverlässigsten Datenspeicher-Lösungen überhaupt - verwendet in jedem Smartphone, jedem Browser, jedem macOS. Für die meisten Webanwendungen ist es die richtige Wahl.
