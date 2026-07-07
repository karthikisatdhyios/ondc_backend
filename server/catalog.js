// Read helpers over the seeded SQLite tables. Goods now come from the network,
// so the catalog no longer stores products; these helpers cover the card-reward
// overlay plus the fixed list of categories our BAP knows how to search for.

// Categories the assistant can route to / search the network for. Doubles as the
// ingredient-mapping vocabulary for the recipe flow.
export const SUPPORTED_CATEGORIES = [
  "laptops",
  "smartphones",
  "stationery",
  "potato",
  "tomato",
  "onion",
  "ketchup",
  "maggi",
  "basmati-rice",
  "atta",
  "toor-dal",
  "sugar",
  "salt",
  "cooking-oil",
  "milk",
  "eggs",
  "bread",
  "paneer",
  "chicken-masala",
  "chicken-tikka-masala",
];

export function getCategories() {
  return SUPPORTED_CATEGORIES;
}

// Card offers that apply to an item: the category-specific ones plus any
// platform-wide ("*") reward. Falls back gracefully for network categories we
// don't have a specific offer for.
export function getOffersForItem(db, category) {
  return db
    .prepare(
      `SELECT card_id, discount_percent, max_discount
       FROM card_offers WHERE category = ? OR category = '*'`
    )
    .all(category ?? "");
}

export function getProductsByCategory(db, category, search) {
  if (search && search.trim()) {
    const like = `%${search.trim()}%`;
    const rows = db
      .prepare(
        `SELECT id, category, name, provider, price, image, unit
         FROM products
         WHERE category = ? AND (name LIKE ? OR provider LIKE ?)`
      )
      .all(category, like, like);
    if (rows.length > 0) return rows;
    // fall back to the whole category if the search filter matched nothing
  }
  return db
    .prepare(
      `SELECT id, category, name, provider, price, image, unit
       FROM products WHERE category = ?`
    )
    .all(category);
}

export function getRatings(db, productId) {
  const rows = db
    .prepare("SELECT field, score FROM product_ratings WHERE product_id = ?")
    .all(productId);
  const out = {};
  for (const r of rows) out[r.field] = r.score;
  return out;
}

export function getOffersByCategory(db, category) {
  return db
    .prepare(
      `SELECT card_id, discount_percent, max_discount
       FROM card_offers WHERE category = ?`
    )
    .all(category);
}

export function getCardNameMap(db) {
  const rows = db.prepare("SELECT id, name FROM cards").all();
  const map = {};
  for (const r of rows) map[r.id] = r.name;
  return map;
}
