import Stripe from "stripe";

// Stripe payments layer. The platform saves the user's card once (off-session),
// then on booking runs one off-session PaymentIntent per merchant for that
// merchant's exact amount. (Stripe Connect — which would route funds to each
// merchant's own bank account — isn't available to India-registered platforms,
// so settlement to merchants is tracked in the order_merchants ledger and
// attested by the signed AP2 PaymentReceipt.)

export const CURRENCY = (process.env.STRIPE_CURRENCY || "usd").toLowerCase();
const USER_ID = "demo-user";

let stripe = null;

export function getStripe() {
  if (stripe) return stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "Stripe is not configured. Add STRIPE_SECRET_KEY (sk_test_...) to .env."
    );
  }
  stripe = new Stripe(key);
  return stripe;
}

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export const demoUserId = () => USER_ID;

function toMinorUnits(amount) {
  return Math.round(amount * 100);
}

// Create (or reuse) a Stripe customer for the user and a SetupIntent to authorize a card.
export async function createSetupIntent(db) {
  const s = getStripe();
  const existing = db
    .prepare("SELECT stripe_customer_id FROM user_payment WHERE user_id = ?")
    .get(USER_ID);

  const customerId = existing
    ? existing.stripe_customer_id
    : (await s.customers.create({ metadata: { user_id: USER_ID } })).id;

  const setupIntent = await s.setupIntents.create({
    customer: customerId,
    usage: "off_session",
    payment_method_types: ["card"],
  });

  return { clientSecret: setupIntent.client_secret, customerId };
}

// After the user confirms the SetupIntent in the browser, persist the saved card.
export async function savePaymentMethod(db, { customerId, paymentMethodId }) {
  const s = getStripe();
  const pm = await s.paymentMethods.retrieve(paymentMethodId);
  if (pm.customer !== customerId) {
    await s.paymentMethods.attach(paymentMethodId, { customer: customerId });
  }
  await s.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });

  const card = pm.card || {};
  const authorizedAt = new Date().toISOString();
  db.prepare(
    `INSERT INTO user_payment (user_id, stripe_customer_id, stripe_payment_method_id, card_brand, card_last4, authorized_at)
     VALUES (@user_id, @customer, @pm, @brand, @last4, @at)
     ON CONFLICT(user_id) DO UPDATE SET
       stripe_customer_id = @customer,
       stripe_payment_method_id = @pm,
       card_brand = @brand,
       card_last4 = @last4,
       authorized_at = @at`
  ).run({
    user_id: USER_ID,
    customer: customerId,
    pm: paymentMethodId,
    brand: card.brand || null,
    last4: card.last4 || null,
    at: authorizedAt,
  });

  return { brand: card.brand || null, last4: card.last4 || null, authorizedAt };
}

export function getUserPayment(db) {
  return db.prepare("SELECT * FROM user_payment WHERE user_id = ?").get(USER_ID) || null;
}

// Off-session charge of the saved card for one merchant's exact amount.
export async function chargeMerchant({
  amount,
  customerId,
  paymentMethodId,
  description,
  metadata,
}) {
  const s = getStripe();
  return s.paymentIntents.create({
    amount: toMinorUnits(amount),
    currency: CURRENCY,
    customer: customerId,
    payment_method: paymentMethodId,
    off_session: true,
    confirm: true,
    description,
    metadata,
    expand: ["latest_charge"],
  });
}
