import crypto from "crypto";
import { beckn } from "./config.js";

// Build a Beckn `context` block for an outgoing action.
// bppId/bppUri are set for point-to-point actions (select/init/confirm/status);
// they are omitted for a broadcast search that goes to the gateway.
export function buildContext(action, { transactionId, messageId, bppId, bppUri, ttl } = {}) {
  const ctx = {
    domain: beckn.domain,
    country: beckn.country,
    city: beckn.city,
    action,
    core_version: beckn.coreVersion,
    bap_id: beckn.bapId,
    bap_uri: beckn.callbackBase,
    transaction_id: transactionId || crypto.randomUUID(),
    message_id: messageId || crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ttl: ttl || "PT30S",
  };
  if (bppId) ctx.bpp_id = bppId;
  if (bppUri) ctx.bpp_uri = bppUri;
  return ctx;
}

export function newTransactionId() {
  return crypto.randomUUID();
}

export function newMessageId() {
  return crypto.randomUUID();
}
