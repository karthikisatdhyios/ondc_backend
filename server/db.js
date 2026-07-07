import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "dhiyos.db");

export function getDb() {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      name TEXT NOT NULL,
      provider TEXT NOT NULL,
      price REAL NOT NULL,
      image TEXT NOT NULL,
      unit TEXT
    );

    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      issuer TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS card_offers (
      card_id TEXT NOT NULL,
      category TEXT NOT NULL,
      discount_percent REAL NOT NULL,
      max_discount REAL,
      PRIMARY KEY (card_id, category),
      FOREIGN KEY (card_id) REFERENCES cards(id)
    );

    CREATE TABLE IF NOT EXISTS product_ratings (
      product_id TEXT NOT NULL,
      field TEXT NOT NULL,
      score REAL NOT NULL,
      PRIMARY KEY (product_id, field),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    -- The card a user authorized for off-session (automated) payments.
    CREATE TABLE IF NOT EXISTS user_payment (
      user_id TEXT PRIMARY KEY,
      stripe_customer_id TEXT NOT NULL,
      stripe_payment_method_id TEXT NOT NULL,
      card_brand TEXT,
      card_last4 TEXT,
      authorized_at TEXT NOT NULL
    );

    -- A booking made from the cart, plus its AP2 mandates.
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      total REAL NOT NULL,
      currency TEXT NOT NULL,
      intent_mandate TEXT NOT NULL,
      payment_mandate TEXT NOT NULL
    );

    -- Per-merchant settlement within an order (one destination charge each).
    CREATE TABLE IF NOT EXISTS order_merchants (
      order_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      amount REAL NOT NULL,
      stripe_payment_intent TEXT,
      status TEXT NOT NULL,
      cart_mandate TEXT NOT NULL,
      receipt TEXT,
      PRIMARY KEY (order_id, provider),
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    -- Beckn/ONDC network order references captured during confirm.
    CREATE TABLE IF NOT EXISTS beckn_orders (
      order_id TEXT NOT NULL,
      bpp_id TEXT,
      provider TEXT,
      network_order_id TEXT,
      state TEXT,
      error TEXT
    );
  `);
  return db;
}
