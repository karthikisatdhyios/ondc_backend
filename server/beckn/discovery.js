import { search } from "./bap.js";
import { mergeOnSearch } from "./normalize.js";
import { computeDiscount } from "../tools/discount.js";
import { getOffersForItem, getCardNameMap } from "../catalog.js";

// Network discovery: broadcast a Beckn search, gather the on_search catalogs,
// normalize them, then apply Dhiyos' card-reward overlay on top of the live
// seller prices. Returns products in the same shape the UI already renders.
export async function discover(db, { searchText, category, userCards = [] }) {
  const { responses } = await search({ searchText, category });
  let items = mergeOnSearch(responses);

  if (searchText && searchText.trim()) {
    const q = searchText.trim().toLowerCase();
    const filtered = items.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.category || "").toLowerCase().includes(q) ||
        p.provider.toLowerCase().includes(q)
    );
    if (filtered.length) items = filtered;
  }

  const cardNames = getCardNameMap(db);
  return items.map((p) => {
    const allowedCards = getOffersForItem(db, p.category);
    const discount = computeDiscount({ price: p.price, userCards, allowedCards });
    return {
      ...p,
      discount: {
        ...discount,
        cardName: discount.applied ? cardNames[discount.card] ?? discount.card : null,
      },
    };
  });
}
