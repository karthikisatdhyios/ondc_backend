// Deterministic "best pick" scorer.
// Rules:
//  1. Disqualify any product that has ANY rating field below 2.5 / 5.
//  2. Among the qualifying products, prefer the cheapest (by effective price
//     — i.e. the card-discounted price when a discount applies).
//  3. If nothing qualifies, fall back to the cheapest product overall.

export function effectivePrice(p) {
  return p.discount?.applied && typeof p.discount.discountedPrice === "number"
    ? p.discount.discountedPrice
    : p.price;
}

function meetsQualityBar(p) {
  return Object.values(p.ratings || {}).every((score) => score >= 2.5);
}

export function pickBest(products) {
  const qualified = products.filter(meetsQualityBar);
  const pool = qualified.length ? qualified : products;
  const best = [...pool].sort((a, b) => effectivePrice(a) - effectivePrice(b))[0];
  return { bestId: best.id, usedFallback: qualified.length === 0 };
}
