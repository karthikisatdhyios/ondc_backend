import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";
import { computeDiscount } from "./tools/discount.js";
import { pickBest, effectivePrice } from "./tools/recommend.js";
import { bookCart } from "./tools/book.js";
import { getDb } from "./db.js";
import { getCategories } from "./catalog.js";
import {
  stripeConfigured,
  createSetupIntent,
  savePaymentMethod,
  getUserPayment,
} from "./payments.js";
import { beckn } from "./beckn/config.js";
import { discover } from "./beckn/discovery.js";
import { search as becknSearch } from "./beckn/bap.js";
import { becknBapRouter, ondcOnboardingRouter } from "./beckn/routes.js";
import { mockBppRouter } from "./beckn/mock-bpp/index.js";
import { getKeys } from "./beckn/keys.js";

dotenv.config();

const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL;
const port = process.env.PORT || 8787;

// OpenAI powers only the chat/recipe/recommendation features. The ONDC BAP
// endpoints don't use it, so a key-less deploy (e.g. a pure ONDC gateway) is
// allowed to boot — chat endpoints just return a clear error until a key is set.
const openaiConfigured = Boolean(apiKey);
if (!openaiConfigured) {
  console.warn(
    "OPENAI_API_KEY not set — chat/recipe features are disabled; ONDC BAP endpoints still run."
  );
}

const client = openaiConfigured ? new OpenAI({ apiKey }) : null;
const db = getDb();
const app = express();
// Keep the raw body so inbound Beckn callbacks can be signature-verified.
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf.toString("utf8");
    },
  })
);

// Beckn/ONDC wiring: BAP callbacks + registry onboarding, and (in dev) the local
// mock seller that lets the whole search -> confirm loop run without onboarding.
app.use("/beckn/bap", becknBapRouter());
app.use("/", ondcOnboardingRouter());
// ONDC registers callback_url=/beckn/bap, so the registry calls
// https://<subscriber_id>/beckn/bap/on_subscribe — mirror onboarding routes there too.
app.use("/beckn/bap", ondcOnboardingRouter());
if (!beckn.enabled) {
  app.use("/mock-bpp", mockBppRouter());
}
console.log(
  `Beckn: ${beckn.enabled ? `LIVE (${beckn.env}) domain ${beckn.domain}` : "DEV (local mock BPP)"}`
);

// Non-sensitive diagnostics: confirms which env config a deployment actually
// picked up (public identity + booleans only — never returns private keys).
app.get("/beckn/health", async (_req, res) => {
  let signingKeyLoaded = false;
  let encKeyLoaded = false;
  try {
    const k = await getKeys();
    signingKeyLoaded = Boolean(k?.signing?.publicKey);
    encKeyLoaded = Boolean(k?.encryption?.privateKey);
  } catch {
    // keys not available
  }
  res.json({
    bapId: beckn.bapId,
    bapUri: beckn.bapUri,
    domain: beckn.domain,
    env: beckn.env,
    becknEnabled: beckn.enabled,
    uniqueKeyId: beckn.uniqueKeyId,
    signingKeyLoaded,
    encKeyLoaded,
    ondcEncryptionKeySet: Boolean(process.env.ONDC_ENCRYPTION_PUBLIC_KEY),
    openaiConfigured,
  });
});

// Trigger search inside the running server process so on_search callbacks land
// in the same in-memory correlation store (node -e uses a separate process).
app.post("/beckn/debug/search", async (req, res) => {
  if (!beckn.enabled) {
    return res.status(503).json({ error: "BECKN_ENABLED is false" });
  }
  try {
    const q = typeof req.body?.q === "string" ? req.body.q : "rice";
    const result = await becknSearch({ searchText: q });
    res.json({
      transactionId: result.transactionId,
      messageId: result.messageId,
      responseCount: result.responses.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ask GPT to route a message: book the cart, gather recipe ingredients,
// find a single product, or just chat?
async function interpret(message, categories) {
  const prompt = `You route requests for a shopping assistant.
Available product categories: ${categories.join(", ")}.
Given the user's message, reply with STRICT JSON only:
{"wantsBook": boolean, "wantsRecipe": boolean, "dish": string|null, "wantsProduct": boolean, "category": string|null, "search": string|null}
- wantsBook: true ONLY if the user is asking to book / place / pay for / checkout the order from their cart.
- wantsRecipe: true if the user wants to buy the ingredients needed to cook/make a dish or recipe (e.g. "buy everything I need to make butter chicken", "ingredients for poha").
- dish: the dish/recipe name when wantsRecipe is true, otherwise null.
- wantsProduct: true if the user is trying to find or buy a single physical product (even if the store may not carry it).
- category: EXACTLY one of the available categories that matches a single-product request, or null.
- search: an optional brand/keyword to filter by (e.g. "Heinz"), or null.
User message: ${JSON.stringify(message)}`;

  const completion = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const parsed = JSON.parse(completion.choices[0].message.content);
  const category = categories.includes(parsed.category) ? parsed.category : null;
  return {
    wantsBook: !!parsed.wantsBook,
    wantsRecipe: !!parsed.wantsRecipe,
    dish: typeof parsed.dish === "string" && parsed.dish.trim() ? parsed.dish.trim() : null,
    wantsProduct: !!parsed.wantsProduct,
    category,
    search: typeof parsed.search === "string" ? parsed.search : null,
  };
}

// Break a dish into its ingredients and map each one onto a stocked category
// (or null when we don't carry it). Single GPT call to keep it fast.
async function decomposeRecipe(dish, categories) {
  const prompt = `You are a cooking assistant for a grocery store.
The store stocks ONLY these product categories: ${categories.join(", ")}.
The user wants to cook: ${JSON.stringify(dish)}.
List the ingredients a typical recipe needs. For each ingredient, map it to EXACTLY one of the
store categories above if we plausibly sell it, otherwise use null.
Reply with STRICT JSON only:
{"ingredients": [{"name": string, "category": string|null, "search": string|null}]}
- name: a short human ingredient name (e.g. "Onion", "Tomato", "Paneer").
- category: one of the store categories listed above, or null if the store does not carry it.
- search: an optional brand/keyword to narrow within the category, or null.
Limit to the 12 most important ingredients. Do not invent categories that are not in the list.`;

  const completion = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const parsed = JSON.parse(completion.choices[0].message.content);
  const list = Array.isArray(parsed.ingredients) ? parsed.ingredients : [];
  return list
    .filter((i) => i && typeof i.name === "string" && i.name.trim())
    .map((i) => ({
      name: i.name.trim(),
      category: categories.includes(i.category) ? i.category : null,
      search: typeof i.search === "string" && i.search.trim() ? i.search.trim() : null,
    }));
}

// Discover products from the network (Beckn search) and apply the card-reward
// overlay. `search` is a keyword; `category` is one of the supported categories.
async function buildProducts(category, search, userCards) {
  const searchText = search || category || "";
  return discover(db, { searchText, category, userCards });
}

// Pick the best product deterministically (cheapest that clears the quality bar),
// then use GPT ONLY to explain, in the second person, why it's a good pick.
async function recommend(products, category) {
  const { bestId, usedFallback } = pickBest(products);
  const best = products.find((p) => p.id === bestId);

  const summary = {
    name: best.name,
    provider: best.provider,
    price: best.price,
    effective_price: effectivePrice(best),
    discount: best.discount?.applied
      ? `${best.discount.discountPercent}% off with ${best.discount.cardName}`
      : null,
    ratings: best.ratings,
  };

  const basis = usedFallback
    ? "It is the cheapest available option (none fully cleared our quality bar, so we picked the lowest price)."
    : "It is the cheapest option that still clears our quality bar (every rating is at least 2.5/5).";

  const prompt = `You are a shopping assistant. The user is choosing a ${category}.
We have already selected the best option for them. ${basis}
Write 1-2 short sentences, addressed to the user as "you", explaining why this is a great pick —
highlight that it is the most affordable choice without compromising on quality, and mention a
standout rating or its price/discount. Reply with STRICT JSON only: {"reason": string}.
Do not mention other products.
Product: ${JSON.stringify(summary)}`;

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });
    const parsed = JSON.parse(completion.choices[0].message.content);
    return { bestId, reason: typeof parsed.reason === "string" ? parsed.reason : null };
  } catch {
    return { bestId, reason: null };
  }
}

app.post("/api/chat", async (req, res) => {
  if (!openaiConfigured) {
    return res.status(503).json({ error: "Chat is unavailable: OPENAI_API_KEY is not configured on this server." });
  }
  const { messages } = req.body;
  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: "messages must be an array" });
  }
  try {
    const completion = await client.chat.completions.create({ model, messages });
    res.json({ reply: completion.choices[0].message.content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/discount", (req, res) => {
  const { price, userCards, allowedCards } = req.body;
  try {
    res.json(computeDiscount({ price, userCards, allowedCards }));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Orchestrates: interpret -> fetch products from DB -> price each via the
// discount tool -> return product cards (with ratings + applied card).
app.post("/api/ask", async (req, res) => {
  if (!openaiConfigured) {
    return res.status(503).json({ error: "Assistant is unavailable: OPENAI_API_KEY is not configured on this server." });
  }
  const { messages, userCards = [], cart = [] } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages must be a non-empty array" });
  }
  const last = messages[messages.length - 1];
  if (!last || last.role !== "user" || typeof last.content !== "string") {
    return res.status(400).json({ error: "last message must be a user string" });
  }

  try {
    const categories = getCategories(db);
    const route = await interpret(last.content, categories);

    // Booking request -> run the AP2 + Stripe booking tool over the cart.
    if (route.wantsBook) {
      if (!stripeConfigured()) {
        return res.json({
          type: "text",
          reply: "Payments aren't set up yet. Add your Stripe test keys to enable booking.",
        });
      }
      if (!Array.isArray(cart) || cart.length === 0) {
        return res.json({ type: "text", reply: "Your cart is empty, so there's nothing to book." });
      }
      const userPayment = getUserPayment(db);
      if (!userPayment) {
        return res.json({
          type: "text",
          reply: "Please authorize a card for automated payments first (user menu -> Authorize card).",
          needsCardAuthorization: true,
        });
      }
      const result = await bookCart({ db, cart, userPayment });
      if (!result.ok && result.reason === "empty_cart") {
        return res.json({ type: "text", reply: "Your cart is empty, so there's nothing to book." });
      }
      return res.json({ type: "booking", ...result });
    }

    // Recipe request -> decompose into ingredients and gather one pick per ingredient.
    if (route.wantsRecipe && route.dish) {
      const ingredients = await decomposeRecipe(route.dish, categories);
      const sections = [];
      const missing = [];
      const seen = new Set();
      for (const ing of ingredients) {
        if (!ing.category) {
          missing.push(ing.name);
          continue;
        }
        if (seen.has(ing.category)) continue; // don't show the same category twice
        const products = await buildProducts(ing.category, ing.search, userCards);
        if (products.length === 0) {
          missing.push(ing.name);
          continue;
        }
        seen.add(ing.category);
        const { bestId } = pickBest(products);
        sections.push({ ingredient: ing.name, category: ing.category, products, recommendation: { bestId, reason: null } });
      }
      return res.json({ type: "recipe", dish: route.dish, sections, missing });
    }

    // Not a product request -> normal chat.
    if (!route.wantsProduct) {
      const completion = await client.chat.completions.create({ model, messages });
      return res.json({ type: "text", reply: completion.choices[0].message.content });
    }

    const searchText = route.search || route.category || last.content;
    const products = await buildProducts(route.category, searchText, userCards);

    // Wants a product, but no seller on the network returned it.
    if (products.length === 0) {
      return res.json({
        type: "text",
        reply: `Sorry, no seller on the network is offering that right now. Try one of: ${categories.join(", ")}.`,
      });
    }

    const recommendation = await recommend(products, route.category);
    res.json({ type: "products", category: route.category, products, recommendation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Card authorization (sign-in): create a SetupIntent so the browser can save a card off-session.
app.post("/api/setup-intent", async (req, res) => {
  try {
    res.json(await createSetupIntent(db));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Persist the card the user authorized in the browser.
app.post("/api/payment-method", async (req, res) => {
  const { customerId, paymentMethodId } = req.body;
  if (!customerId || !paymentMethodId) {
    return res.status(400).json({ error: "customerId and paymentMethodId are required" });
  }
  try {
    res.json(await savePaymentMethod(db, { customerId, paymentMethodId }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Whether a card is already authorized (drives the UI state).
app.get("/api/payment-status", (req, res) => {
  const p = getUserPayment(db);
  res.json({
    configured: stripeConfigured(),
    authorized: Boolean(p),
    card: p ? { brand: p.card_brand, last4: p.card_last4 } : null,
  });
});

// Direct booking endpoint (used by the agent tool; also callable on its own).
app.post("/api/book", async (req, res) => {
  const { cart = [] } = req.body;
  if (!stripeConfigured()) {
    return res.status(400).json({ error: "Stripe is not configured." });
  }
  const userPayment = getUserPayment(db);
  if (!userPayment) {
    return res.status(400).json({ error: "No authorized card. Authorize a card first." });
  }
  try {
    res.json(await bookCart({ db, cart, userPayment }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port} (model: ${model})`);
});
