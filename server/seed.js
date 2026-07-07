import { getDb } from "./db.js";
import { CARD_OFFERS } from "./offers.js";
import { CARDS } from "../src/data/cards.js";

// Goods now come from the network (Beckn/ONDC), so we no longer seed a product
// catalog. We only seed Dhiyos' own data: the reward cards and their offers used
// by the buyer-side discount overlay.
const db = getDb();

const insertCard = db.prepare(
  `INSERT OR REPLACE INTO cards (id, name, issuer) VALUES (@id, @name, @issuer)`
);

const insertOffer = db.prepare(
  `INSERT OR REPLACE INTO card_offers (card_id, category, discount_percent, max_discount)
   VALUES (@card_id, @category, @discount_percent, @max_discount)`
);

const seed = db.transaction(() => {
  // Retire the dummy goods that used to live here.
  db.exec("DELETE FROM product_ratings");
  db.exec("DELETE FROM products");

  db.exec("DELETE FROM card_offers");
  db.exec("DELETE FROM cards");
  for (const c of CARDS) insertCard.run(c);
  for (const o of CARD_OFFERS) insertOffer.run(o);
});

seed();

const cardCount = db.prepare("SELECT COUNT(*) AS n FROM cards").get().n;
const offerCount = db.prepare("SELECT COUNT(*) AS n FROM card_offers").get().n;

console.log(`Seeded ${cardCount} cards and ${offerCount} card offers (goods come from the network).`);

db.close();
