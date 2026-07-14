import { beckn } from "./config.js";
import { buildContext, newTransactionId, newMessageId } from "./context.js";
import { createAuthorizationHeader } from "./auth.js";
import { register, collect } from "./store.js";

// Sends a signed Beckn message. In live mode search goes to the ONDC gateway and
// point-to-point actions go to the BPP's bpp_uri; in dev mode everything goes to
// the local mock BPP so the flow can be exercised without onboarding.
async function post(url, envelope) {
  const bodyString = JSON.stringify(envelope);
  const headers = { "Content-Type": "application/json" };

  if (beckn.enabled) {
    headers.Authorization = await createAuthorizationHeader(bodyString);
  }

  const res = await fetch(url, { method: "POST", headers, body: bodyString });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* some ACKs have empty bodies */
  }
  if (!res.ok) {
    throw new Error(`Beckn ${envelope.context.action} -> ${url} failed: ${res.status}`);
  }
  return json;
}

function targetForSearch() {
  return beckn.enabled ? `${beckn.gatewayUrl}/search` : `${beckn.mockBppUrl}/search`;
}

function targetForAction(action, bppUri) {
  if (beckn.enabled) {
    if (!bppUri) throw new Error(`bpp_uri required for ${action}`);
    return `${bppUri.replace(/\/$/, "")}/${action}`;
  }
  return `${beckn.mockBppUrl}/${action}`;
}

// ---- Discovery: broadcast search, then gather on_search callbacks ----
export async function search({ searchText, category, city } = {}) {
  const transactionId = newTransactionId();
  const messageId = newMessageId();
  register(messageId);

  const intent = {};
  if (searchText) {
    intent.item = { descriptor: { name: searchText } };
  }
  if (category) {
    intent.category = { id: category };
  }
  if (!intent.item && !intent.category) {
    intent.item = { descriptor: { name: "" } };
  }

  const envelope = {
    context: buildContext("search", { transactionId, messageId, city }),
    message: { intent },
  };

  await post(targetForSearch(), envelope);

  const responses = await collect(messageId, {
    timeoutMs: beckn.enabled ? beckn.searchTimeoutMs : 1200,
    min: 1,
  });
  return { transactionId, messageId, responses };
}

// ---- Point-to-point order actions ----
async function pointToPoint(action, { bppId, bppUri, transactionId, message }) {
  const messageId = newMessageId();
  register(messageId);
  const envelope = {
    context: buildContext(action, {
      transactionId: transactionId || newTransactionId(),
      messageId,
      bppId,
      bppUri,
    }),
    message,
  };
  await post(targetForAction(action, bppUri), envelope);
  const responses = await collect(messageId, {
    timeoutMs: beckn.enabled ? beckn.actionTimeoutMs : 1200,
    min: 1,
  });
  return { messageId, responses };
}

export function select(args) {
  return pointToPoint("select", args);
}
export function init(args) {
  return pointToPoint("init", args);
}
export function confirm(args) {
  return pointToPoint("confirm", args);
}
export function status(args) {
  return pointToPoint("status", args);
}
