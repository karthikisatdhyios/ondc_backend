// Category-specific rating schemas. Each schema has 4 fields, scored out of 5.
// Categories in the catalog map onto one of these schemas.
export const RATING_SCHEMAS = {
  electronics: ["performance", "battery_life", "display", "build_quality"],
  food: ["freshness", "taste", "packaging", "value_for_money"],
  stationery: ["build_quality", "durability", "usability", "value_for_money"],
};

const CATEGORY_TO_SCHEMA = {
  laptops: "electronics",
  smartphones: "electronics",
  potato: "food",
  tomato: "food",
  ketchup: "food",
  stationery: "stationery",
  onion: "food",
  maggi: "food",
  "basmati-rice": "food",
  atta: "food",
  "toor-dal": "food",
  sugar: "food",
  salt: "food",
  "cooking-oil": "food",
  milk: "food",
  eggs: "food",
  bread: "food",
  paneer: "food",
  "chicken-masala": "food",
  "chicken-tikka-masala": "food",
};

export function fieldsForCategory(category) {
  const schema = CATEGORY_TO_SCHEMA[category];
  return schema ? RATING_SCHEMAS[schema] : [];
}

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// DUMMY rating out of 5, deterministic per (product, field) so re-seeding is stable.
// These are placeholder values requested for now, not real review data.
export function dummyScore(productId, field) {
  const options = [3.5, 4.0, 4.5, 5.0];
  return options[hashStr(`${productId}|${field}`) % options.length];
}
