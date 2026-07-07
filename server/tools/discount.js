// Discount tool.
// Inputs:
//   price        - the product's original price (number)
//   userCards    - card ids the user has (string[])
//   allowedCards - cards that give a discount on this product:
//                  [{ card_id, discount_percent, max_discount? }]
// Returns the discounted price using the best-matching card the user holds.

function round2(n) {
  return Math.round(n * 100) / 100;
}

export function computeDiscount({ price, userCards = [], allowedCards = [] }) {
  if (typeof price !== "number" || !Number.isFinite(price) || price < 0) {
    throw new Error("price must be a non-negative number");
  }
  if (!Array.isArray(userCards) || !Array.isArray(allowedCards)) {
    throw new Error("userCards and allowedCards must be arrays");
  }

  const owned = new Set(userCards);

  let best = null;
  for (const offer of allowedCards) {
    if (!owned.has(offer.card_id)) continue;

    const percent = offer.discount_percent;
    const raw = (price * percent) / 100;
    const cap =
      offer.max_discount === null || offer.max_discount === undefined
        ? null
        : offer.max_discount;
    const amount = cap !== null ? Math.min(raw, cap) : raw;

    if (!best || amount > best.amount) {
      best = { card_id: offer.card_id, percent, amount, capped: cap !== null && raw > cap };
    }
  }

  if (!best) {
    return { originalPrice: price, discountedPrice: price, applied: false };
  }

  return {
    originalPrice: price,
    applied: true,
    card: best.card_id,
    discountPercent: best.percent,
    discountAmount: round2(best.amount),
    capped: best.capped,
    discountedPrice: round2(price - best.amount),
  };
}
