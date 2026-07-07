import { SignJWT, jwtVerify, exportJWK, importJWK, generateKeyPair } from "jose";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Faithful (self-implemented) AP2 layer. There is no official AP2 JS SDK, so we
// implement the v0.2 mandate model — Intent, Cart, Payment mandates and a signed
// Payment Receipt — each signed as a compact JWS (ECDSA P-256 / ES256). AP2 is
// rail-agnostic: these mandates ride ON TOP of the Stripe charge as cryptographic
// proof of user consent and of the exact amount each merchant must receive.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KEYS_PATH = path.join(__dirname, "ap2-keys.json");
const ALG = "ES256";
const ISSUER = "dhiyos-ap2";

let keysPromise = null;

async function getKeys() {
  if (keysPromise) return keysPromise;
  keysPromise = (async () => {
    if (fs.existsSync(KEYS_PATH)) {
      const { privateJwk, publicJwk } = JSON.parse(fs.readFileSync(KEYS_PATH, "utf8"));
      return {
        privateKey: await importJWK(privateJwk, ALG),
        publicKey: await importJWK(publicJwk, ALG),
        publicJwk,
      };
    }
    const { privateKey, publicKey } = await generateKeyPair(ALG, { extractable: true });
    const privateJwk = await exportJWK(privateKey);
    const publicJwk = await exportJWK(publicKey);
    fs.writeFileSync(KEYS_PATH, JSON.stringify({ privateJwk, publicJwk }, null, 2));
    return { privateKey, publicKey, publicJwk };
  })();
  return keysPromise;
}

export function sha256(obj) {
  return crypto.createHash("sha256").update(JSON.stringify(obj)).digest("hex");
}

async function sign(payload) {
  const { privateKey } = await getKeys();
  return new SignJWT(payload)
    .setProtectedHeader({ alg: ALG, typ: "ap2+jwt" })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .sign(privateKey);
}

export async function verify(jws) {
  const { publicKey } = await getKeys();
  const { payload } = await jwtVerify(jws, publicKey, { issuer: ISSUER });
  return payload;
}

export async function publicJwk() {
  return (await getKeys()).publicJwk;
}

// The user's intent to purchase the cart (AP2 IntentMandate).
export async function createIntentMandate({ userId, items, expiryMinutes = 30 }) {
  const contents = {
    type: "IntentMandate",
    user_id: userId,
    natural_language_description: `Authorize purchase of ${items.length} item(s) from the cart at the exact displayed prices.`,
    merchants: [...new Set(items.map((i) => i.merchant))],
    items: items.map((i) => ({
      product_id: i.id,
      name: i.name,
      merchant: i.merchant,
      quantity: 1,
    })),
    intent_expiry: new Date(Date.now() + expiryMinutes * 60000).toISOString(),
  };
  return { contents, jws: await sign(contents) };
}

// One CartMandate per merchant, fixing the exact amount that merchant receives.
export async function createCartMandate({ merchant, items, currency }) {
  const lineItems = items.map((i) => ({
    product_id: i.id,
    name: i.name,
    amount: i.amount,
  }));
  const total = lineItems.reduce((s, l) => s + l.amount, 0);
  const contents = {
    type: "CartMandate",
    merchant,
    cart: {
      id: `cart_${merchant}_${crypto.randomUUID()}`,
      line_items: lineItems,
      total: { currency, value: total },
    },
    cart_expiry: new Date(Date.now() + 30 * 60000).toISOString(),
  };
  return { contents, total, jws: await sign(contents) };
}

// The PaymentMandate binds the cart mandates to a payment method + user consent.
export async function createPaymentMandate({
  userId,
  cartMandates,
  currency,
  paymentMethodId,
  customerId,
  authorizedAt,
}) {
  const contents = {
    type: "PaymentMandate",
    user_id: userId,
    cart_mandate_hashes: cartMandates.map((c) => sha256(c.contents)),
    payment_details: {
      currency,
      total: cartMandates.reduce((s, c) => s + c.total, 0),
      per_merchant: cartMandates.map((c) => ({
        merchant: c.contents.merchant,
        amount: c.total,
      })),
    },
    payment_method: {
      type: "card",
      processor: "stripe",
      payment_method_id: paymentMethodId,
      customer_id: customerId,
    },
    user_authorization: {
      method: "stripe_setup_intent_off_session",
      authorized_at: authorizedAt,
      constraint: "merchant_receives_exact_displayed_amount",
    },
  };
  return { contents, jws: await sign(contents) };
}

// Signed proof a merchant was paid the exact amount (AP2 PaymentReceipt).
export async function createPaymentReceipt({
  orderId,
  merchant,
  amount,
  currency,
  stripePaymentIntent,
  status,
}) {
  const contents = {
    type: "PaymentReceipt",
    order_id: orderId,
    merchant,
    amount,
    currency,
    processor: "stripe",
    stripe_payment_intent: stripePaymentIntent,
    status,
    paid_at: new Date().toISOString(),
  };
  return { contents, jws: await sign(contents) };
}
