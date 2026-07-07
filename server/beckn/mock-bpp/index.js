import express from "express";
import crypto from "crypto";
import { beckn } from "../config.js";
import { searchProducts, buildCatalog, findProduct } from "./catalog.js";

// Dev-only mock BPP (seller). Mounted in the same process under /mock-bpp when
// BECKN_ENABLED=false. It answers Beckn actions and posts the on_* callbacks
// back to the BAP, simulating an asynchronous network seller.

function replyContext(context, action) {
  return {
    ...context,
    action,
    bpp_id: beckn.mockBppId,
    bpp_uri: beckn.mockBppUrl,
    timestamp: new Date().toISOString(),
  };
}

function fireCallback(context, action, message) {
  const url = `${(context.bap_uri || beckn.callbackBase).replace(/\/$/, "")}/${action}`;
  const envelope = { context: replyContext(context, action), message };
  // small delay to mimic async network delivery
  setTimeout(() => {
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(envelope),
    }).catch(() => {});
  }, 120);
}

const ACK = { message: { ack: { status: "ACK" } } };

function computeQuote(order) {
  const items = order?.items || [];
  const breakup = [];
  let total = 0;
  for (const it of items) {
    const product = findProduct(it.id);
    if (!product) continue;
    const count = it?.quantity?.count || 1;
    const value = product.price * count;
    total += value;
    breakup.push({
      "@ondc/org/item_id": it.id,
      "@ondc/org/title_type": "item",
      title: product.name,
      price: { currency: "INR", value: String(value) },
    });
  }
  return {
    price: { currency: "INR", value: String(total) },
    breakup,
  };
}

export function mockBppRouter() {
  const router = express.Router();

  router.post("/search", (req, res) => {
    const { context, message } = req.body || {};
    const searchText = message?.intent?.item?.descriptor?.name || "";
    const category = message?.intent?.category?.id || null;
    const products = searchProducts({ searchText, category });
    const catalog = buildCatalog(products);
    fireCallback(context, "on_search", { catalog });
    res.json(ACK);
  });

  router.post("/select", (req, res) => {
    const { context, message } = req.body || {};
    const order = message?.order || {};
    fireCallback(context, "on_select", {
      order: { provider: order.provider, items: order.items, quote: computeQuote(order) },
    });
    res.json(ACK);
  });

  router.post("/init", (req, res) => {
    const { context, message } = req.body || {};
    const order = message?.order || {};
    fireCallback(context, "on_init", {
      order: {
        provider: order.provider,
        items: order.items,
        billing: order.billing,
        fulfillments: order.fulfillments,
        quote: computeQuote(order),
        payment: {
          type: "ON-ORDER",
          collected_by: "BAP",
          status: "NOT-PAID",
        },
      },
    });
    res.json(ACK);
  });

  router.post("/confirm", (req, res) => {
    const { context, message } = req.body || {};
    const order = message?.order || {};
    const orderId = `MOCK-${crypto.randomUUID().slice(0, 8)}`;
    fireCallback(context, "on_confirm", {
      order: {
        id: orderId,
        state: "Accepted",
        provider: order.provider,
        items: order.items,
        quote: computeQuote(order),
        created_at: new Date().toISOString(),
      },
    });
    res.json(ACK);
  });

  router.post("/status", (req, res) => {
    const { context, message } = req.body || {};
    fireCallback(context, "on_status", {
      order: { id: message?.order_id, state: "Accepted" },
    });
    res.json(ACK);
  });

  return router;
}
