// Dev-only fixture. Turns the old dummy product list into a Beckn catalog so the
// BAP has a seller to talk to during local loopback testing. NOT a product
// feature and NOT Dhiyos inventory.
import { PRODUCTS } from "../../products.js";
import { fieldsForCategory, dummyScore } from "../../ratings.js";

const slug = (s) =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function avgRating(p) {
  const fields = fieldsForCategory(p.category);
  if (!fields.length) return null;
  const sum = fields.reduce((s, f) => s + dummyScore(p.id, f), 0);
  return Math.round((sum / fields.length) * 10) / 10;
}

function parseMeasure(unit) {
  if (!unit) return null;
  const m = String(unit).match(/^([\d.]+)\s*(.+)$/);
  return m ? { value: m[1], unit: m[2] } : { value: "1", unit: String(unit) };
}

export function findProduct(itemId) {
  return PRODUCTS.find((p) => p.id === itemId) || null;
}

export function searchProducts({ searchText, category }) {
  let list = PRODUCTS;
  if (category) {
    const inCat = PRODUCTS.filter((p) => p.category === category);
    if (inCat.length) list = inCat;
  }
  if (searchText && searchText.trim()) {
    const q = searchText.trim().toLowerCase();
    const byText = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.provider.toLowerCase().includes(q)
    );
    if (byText.length) list = byText;
  }
  return list;
}

export function buildCatalog(products) {
  const byProvider = new Map();

  for (const p of products) {
    const pid = slug(p.provider);
    if (!byProvider.has(pid)) {
      byProvider.set(pid, {
        id: pid,
        descriptor: { name: p.provider },
        locations: [{ id: `${pid}-loc-1` }],
        fulfillments: [{ id: `${pid}-ful-1` }],
        items: [],
      });
    }
    const rating = avgRating(p);
    const item = {
      id: p.id,
      descriptor: { name: p.name, images: [p.image] },
      price: { currency: "INR", value: String(p.price) },
      category_id: p.category,
      fulfillment_id: `${pid}-ful-1`,
      location_id: `${pid}-loc-1`,
    };
    const measure = parseMeasure(p.unit);
    if (measure) item.quantity = { unitized: { measure } };
    if (rating != null) item.rating = String(rating);
    byProvider.get(pid).items.push(item);
  }

  return {
    "bpp/descriptor": { name: "Dhiyos Mock Seller" },
    "bpp/providers": [...byProvider.values()],
  };
}
