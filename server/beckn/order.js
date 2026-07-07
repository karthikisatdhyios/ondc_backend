import { select, init, confirm } from "./bap.js";
import { newTransactionId } from "./context.js";

// Drive the Beckn order flow (select -> init -> confirm) against each seller for
// the items in the cart. One network order per (bpp, provider). Best-effort: the
// AP2 + Stripe layer remains the source of truth for money movement, so a
// network hiccup here is captured per group rather than failing the whole book.
function groupByProvider(cart) {
  const groups = new Map();
  for (const i of cart) {
    if (!i || !i.bpp_id || !i.item_id) continue;
    const key = `${i.bpp_id}|${i.provider_id}`;
    if (!groups.has(key)) {
      groups.set(key, {
        bppId: i.bpp_id,
        bppUri: i.bpp_uri,
        providerId: i.provider_id,
        provider: i.provider,
        items: [],
      });
    }
    groups.get(key).items.push(i);
  }
  return [...groups.values()];
}

function orderMessage(group) {
  return {
    order: {
      provider: { id: group.providerId },
      items: group.items.map((i) => ({ id: i.item_id, quantity: { count: i.count || 1 } })),
      fulfillments: group.items[0]?.fulfillment_id
        ? [{ id: group.items[0].fulfillment_id }]
        : undefined,
    },
  };
}

export async function placeNetworkOrders(cart) {
  const groups = groupByProvider(cart);
  const results = [];

  for (const g of groups) {
    const transactionId = newTransactionId();
    const message = orderMessage(g);
    try {
      await select({ bppId: g.bppId, bppUri: g.bppUri, transactionId, message });
      await init({ bppId: g.bppId, bppUri: g.bppUri, transactionId, message });
      const { responses } = await confirm({
        bppId: g.bppId,
        bppUri: g.bppUri,
        transactionId,
        message,
      });
      const order = responses?.[0]?.message?.order;
      results.push({
        bppId: g.bppId,
        provider: g.provider,
        networkOrderId: order?.id || null,
        state: order?.state || null,
        error: null,
      });
    } catch (err) {
      results.push({
        bppId: g.bppId,
        provider: g.provider,
        networkOrderId: null,
        state: null,
        error: err.message,
      });
    }
  }

  return results;
}
