// Merge the on_search catalogs returned by many BPPs into the flat product
// shape the rest of the app already uses (name, provider, price, image, unit,
// ratings, ...), while carrying the Beckn identifiers needed to later
// select/init/confirm the exact item from the exact seller.

function firstImage(descriptor) {
  const imgs = descriptor?.images;
  if (!Array.isArray(imgs) || imgs.length === 0) return null;
  const first = imgs[0];
  return typeof first === "string" ? first : first?.url ?? null;
}

function toNumber(v) {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : null;
}

function unitOf(item) {
  const m = item?.quantity?.unitized?.measure || item?.quantity?.measure;
  if (m?.value && m?.unit) return `${m.value} ${m.unit}`;
  return null;
}

function ratingOf(item, provider) {
  const r = toNumber(item?.rating ?? provider?.rating);
  return r == null ? null : Math.max(0, Math.min(5, r));
}

export function mergeOnSearch(responses = []) {
  const out = [];

  for (const env of responses) {
    const bppId = env?.context?.bpp_id || null;
    const bppUri = env?.context?.bpp_uri || null;
    const catalog = env?.message?.catalog || {};
    const providers = catalog["bpp/providers"] || catalog.providers || [];

    for (const provider of providers) {
      const providerId = provider?.id || null;
      const providerName = provider?.descriptor?.name || providerId || "Seller";
      const defaultFulfillment =
        (provider?.fulfillments && provider.fulfillments[0]?.id) ||
        (catalog["bpp/fulfillments"] && catalog["bpp/fulfillments"][0]?.id) ||
        null;
      const defaultLocation = provider?.locations?.[0]?.id || null;
      const items = provider?.items || [];

      for (const item of items) {
        const price = toNumber(item?.price?.value);
        if (price == null) continue;

        const rating = ratingOf(item, provider);
        out.push({
          id: `${bppId}::${providerId}::${item.id}`,
          bpp_id: bppId,
          bpp_uri: bppUri,
          provider_id: providerId,
          item_id: item.id,
          fulfillment_id: item?.fulfillment_id || defaultFulfillment,
          location_id: item?.location_id || defaultLocation,
          name: item?.descriptor?.name || "Item",
          provider: providerName,
          price,
          currency: item?.price?.currency || "INR",
          image: firstImage(item?.descriptor),
          unit: unitOf(item),
          category: item?.category_id || null,
          rating,
          ratings: rating == null ? {} : { rating },
        });
      }
    }
  }

  return out;
}
