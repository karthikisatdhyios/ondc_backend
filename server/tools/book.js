import crypto from "crypto";
import {
  createIntentMandate,
  createCartMandate,
  createPaymentMandate,
  createPaymentReceipt,
} from "../ap2.js";
import { CURRENCY, demoUserId, chargeMerchant } from "../payments.js";
import { placeNetworkOrders } from "../beckn/order.js";

// Final amount for a cart item = the price shown on screen (discounted if a card applied).
function finalAmount(item) {
  const d = item.discount;
  if (d && d.applied && typeof d.discountedPrice === "number") return d.discountedPrice;
  return item.price;
}

// The booking tool. Executes when the user asks the agent to book the cart.
// Builds AP2 mandates, then runs one off-session destination charge per merchant
// so each merchant receives the exact displayed amount.
export async function bookCart({ db, cart, userPayment }) {
  const items = cart
    .filter((i) => i && i.id && i.provider && typeof i.price === "number")
    .map((i) => ({
      id: i.id,
      name: i.name,
      merchant: i.provider,
      amount: finalAmount(i),
    }));

  if (items.length === 0) {
    return { ok: false, reason: "empty_cart" };
  }

  const userId = demoUserId();
  const orderId = `order_${crypto.randomUUID()}`;

  // Place the order on the network (Beckn select -> init -> confirm) per seller,
  // before the AP2 consent + payment layer. Best-effort and recorded per group.
  let networkOrders = [];
  try {
    networkOrders = await placeNetworkOrders(cart);
  } catch (err) {
    networkOrders = [{ error: err.message }];
  }

  const intent = await createIntentMandate({ userId, items });

  // Group items by merchant and build one signed CartMandate per merchant.
  const byMerchant = new Map();
  for (const item of items) {
    if (!byMerchant.has(item.merchant)) byMerchant.set(item.merchant, []);
    byMerchant.get(item.merchant).push(item);
  }

  const cartMandates = [];
  for (const [merchant, merchantItems] of byMerchant) {
    cartMandates.push(
      await createCartMandate({ merchant, items: merchantItems, currency: CURRENCY })
    );
  }

  const total = cartMandates.reduce((s, c) => s + c.total, 0);

  const payment = await createPaymentMandate({
    userId,
    cartMandates,
    currency: CURRENCY,
    paymentMethodId: userPayment.stripe_payment_method_id,
    customerId: userPayment.stripe_customer_id,
    authorizedAt: userPayment.authorized_at,
  });

  // Persist the order + per-merchant rows before charging.
  db.prepare(
    `INSERT INTO orders (id, user_id, created_at, total, currency, intent_mandate, payment_mandate)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(orderId, userId, new Date().toISOString(), total, CURRENCY, intent.jws, payment.jws);

  const insertMerchant = db.prepare(
    `INSERT INTO order_merchants (order_id, provider, amount, status, cart_mandate)
     VALUES (?, ?, ?, ?, ?)`
  );
  for (const c of cartMandates) {
    insertMerchant.run(orderId, c.contents.merchant, c.total, "pending", c.jws);
  }

  // Record the network (Beckn) order references alongside our order.
  const insertBeckn = db.prepare(
    `INSERT INTO beckn_orders (order_id, bpp_id, provider, network_order_id, state, error)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  for (const n of networkOrders) {
    insertBeckn.run(
      orderId,
      n.bppId ?? null,
      n.provider ?? null,
      n.networkOrderId ?? null,
      n.state ?? null,
      n.error ?? null
    );
  }

  // Charge each merchant for their exact amount.
  const results = [];
  for (const c of cartMandates) {
    const merchant = c.contents.merchant;
    try {
      const pi = await chargeMerchant({
        amount: c.total,
        customerId: userPayment.stripe_customer_id,
        paymentMethodId: userPayment.stripe_payment_method_id,
        description: `Dhiyos order ${orderId} — ${merchant}`,
        metadata: { order_id: orderId, merchant },
      });

      const receipt = await createPaymentReceipt({
        orderId,
        merchant,
        amount: c.total,
        currency: CURRENCY,
        stripePaymentIntent: pi.id,
        status: pi.status,
      });

      db.prepare(
        `UPDATE order_merchants SET status = ?, stripe_payment_intent = ?, receipt = ?
         WHERE order_id = ? AND provider = ?`
      ).run(pi.status, pi.id, receipt.jws, orderId, merchant);

      results.push({
        merchant,
        amount: c.total,
        status: pi.status,
        paymentIntent: pi.id,
        receiptUrl: pi.latest_charge?.receipt_url || null,
        receiptJws: receipt.jws,
      });
    } catch (err) {
      db.prepare(
        `UPDATE order_merchants SET status = ? WHERE order_id = ? AND provider = ?`
      ).run("failed", orderId, merchant);
      results.push({ merchant, amount: c.total, status: "failed", error: err.message });
    }
  }

  return {
    ok: true,
    orderId,
    total,
    currency: CURRENCY,
    merchants: results,
    networkOrders,
    intentMandateJws: intent.jws,
    paymentMandateJws: payment.jws,
  };
}
