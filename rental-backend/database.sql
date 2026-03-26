-- ============================================================
--  Rental Clothes — SQLite Schema
--  Run this file once to set up the database
-- ============================================================

-- ── Users ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  username         TEXT NOT NULL UNIQUE,
  email            TEXT NOT NULL UNIQUE,
  password         TEXT NOT NULL,
  full_name        TEXT NOT NULL,
  phone            TEXT,
  address          TEXT,
  role             TEXT DEFAULT 'customer',
  rental_count     INTEGER DEFAULT 0,
  total_spent      REAL DEFAULT 0,
  late_count       INT UNSIGNED DEFAULT 0,
  is_blacklisted   TINYINT(1) DEFAULT 0,
  blacklist_reason TEXT,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Products ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  name           TEXT NOT NULL,
  description    TEXT,
  category       TEXT DEFAULT 'other',
  occasion       TEXT DEFAULT 'other',
  price_per_day  REAL NOT NULL,
  deposit        REAL DEFAULT 0,
  stock          INTEGER DEFAULT 1,
  sizes          TEXT,
  is_deleted     INTEGER DEFAULT 0,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Product Images ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_images (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  image_url  TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- ── Bookings ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id           INTEGER NOT NULL,
  product_id        INTEGER NOT NULL,
  rental_start      TEXT NOT NULL,
  rental_end        TEXT NOT NULL,
  size              TEXT,
  quantity          INTEGER DEFAULT 1,
  total_price       REAL NOT NULL,
  deposit_amount    REAL DEFAULT 0,
  payment_method    TEXT DEFAULT 'promptpay',
  payment_status    TEXT DEFAULT 'pending',
  payment_proof     TEXT,
  shipping_address  TEXT,
  status            TEXT DEFAULT 'waiting',
  tracking_number   TEXT,
  shipping_carrier  TEXT,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)    REFERENCES users(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);
-- Booking --
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    size TEXT,
    duration TEXT,
    total_price REAL,
    slip_image TEXT, -- เก็บชื่อไฟล์สลิป
    status TEXT DEFAULT 'pending', -- pending, approved, rejected
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);
-- เพิ่มคอลัมน์ที่ขาดไปในตาราง bookings
ALTER TABLE bookings ADD COLUMN duration TEXT;
ALTER TABLE bookings ADD COLUMN slip_image TEXT;
ALTER TABLE bookings ADD COLUMN total_price REAL;
ALTER TABLE bookings ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;

DROP TABLE IF EXISTS orders;
-- ── Seed: default admin account ────────────────────────────
-- Password: admin1234  (bcrypt hash)
INSERT OR IGNORE INTO users (username, email, password, full_name, phone, role)
VALUES (
  'admin',
  'admin@rentalclothes.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'Admin',
  '055-555-5555',
  'admin'
);