import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";

type DbHandle = InstanceType<typeof Database>;

const globalForRestaurant = globalThis as typeof globalThis & {
  restaurantDb?: DbHandle;
};

function initialize(db: DbHandle) {
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS menu_items (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      price INTEGER NOT NULL CHECK (price >= 0),
      image_url TEXT NOT NULL DEFAULT '',
      is_available INTEGER NOT NULL DEFAULT 1 CHECK (is_available IN (0, 1)),
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS reservations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      guests INTEGER NOT NULL CHECK (guests BETWEEN 1 AND 12),
      reservation_date TEXT NOT NULL,
      reservation_time TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS reservations_date_idx ON reservations(reservation_date, reservation_time);
    CREATE TABLE IF NOT EXISTS restaurant_info (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT NOT NULL,
      tagline TEXT NOT NULL,
      address TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL DEFAULT '',
      map_url TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS opening_hours (
      day_of_week INTEGER PRIMARY KEY CHECK (day_of_week BETWEEN 0 AND 6),
      label TEXT NOT NULL,
      open_time TEXT,
      close_time TEXT,
      is_closed INTEGER NOT NULL DEFAULT 0 CHECK (is_closed IN (0, 1))
    );
    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS login_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      address_hash TEXT NOT NULL,
      attempted_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS login_attempts_window_idx ON login_attempts(email, address_hash, attempted_at);
    CREATE TABLE IF NOT EXISTS reservation_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      address_hash TEXT NOT NULL,
      attempted_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS reservation_attempts_window_idx ON reservation_attempts(address_hash, attempted_at);
  `);

  db.prepare(`
    INSERT OR IGNORE INTO restaurant_info (id, name, tagline, address, phone, email, map_url)
    VALUES (1, 'Anwar Best Restaurant', 'Good food. Warm company. Come as you are.',
      '', '', '', '')
  `).run();

  const defaultHours = db.prepare(`
    INSERT OR IGNORE INTO opening_hours (day_of_week, label, open_time, close_time, is_closed)
    VALUES (?, ?, ?, ?, 0)
  `);
  ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].forEach(
    (day, index) => defaultHours.run(index, day, "12:00", "23:00"),
  );

  const addCategory = db.prepare(
    "INSERT OR IGNORE INTO categories (id, name, sort_order) VALUES (?, ?, ?)",
  );
  addCategory.run("10000000-0000-4000-8000-000000000001", "House signatures", 0);
  addCategory.run("10000000-0000-4000-8000-000000000002", "From the grill", 1);
  const addDish = db.prepare(`
    INSERT OR IGNORE INTO menu_items
      (id, category_id, name, description, price, image_url, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  addDish.run(
    "20000000-0000-4000-8000-000000000001",
    "10000000-0000-4000-8000-000000000001",
    "Lamb Karahi",
    "Slow-cooked with freshly crushed spices, ginger and green chilli.",
    2450,
    "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=960&q=85",
    0,
  );
  addDish.run(
    "20000000-0000-4000-8000-000000000002",
    "10000000-0000-4000-8000-000000000002",
    "Smoky Chicken Tikka",
    "Yogurt-marinated chicken, charred over glowing charcoal.",
    1250,
    "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=960&q=85",
    1,
  );
  addDish.run(
    "20000000-0000-4000-8000-000000000003",
    "10000000-0000-4000-8000-000000000002",
    "Saffron Seekh Kebab",
    "Hand-shaped kebabs seasoned with herbs and a hint of saffron.",
    1480,
    "https://images.unsplash.com/photo-1529042410759-befb1204b468?auto=format&fit=crop&w=960&q=85",
    2,
  );
}

export function getDb(): DbHandle {
  if (globalForRestaurant.restaurantDb) return globalForRestaurant.restaurantDb;

  const databaseFile = process.env.DATABASE_FILENAME ?? "restaurant.sqlite";
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*\.sqlite$/.test(databaseFile)) {
    throw new Error("DATABASE_FILENAME must be a plain .sqlite filename inside the data directory.");
  }
  const databasePath = path.join(process.cwd(), "data", databaseFile);
  mkdirSync(path.dirname(databasePath), { recursive: true });

  const db = new Database(databasePath);
  initialize(db);
  globalForRestaurant.restaurantDb = db;
  return db;
}

export type MenuCategory = {
  id: string;
  name: string;
  sort_order: number;
};

export type MenuItem = {
  id: string;
  category_id: string;
  category_name: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  is_available: number;
  sort_order: number;
};

export type Reservation = {
  id: string;
  name: string;
  phone: string;
  guests: number;
  reservation_date: string;
  reservation_time: string;
  note: string;
  status: "pending" | "confirmed" | "rejected";
  created_at: string;
};
