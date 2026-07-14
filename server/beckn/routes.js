import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { beckn } from "./config.js";
import { ingest } from "./store.js";
import { parseAuthorizationHeader, verifyAuthorization } from "./auth.js";
import { lookupSigningKey, decryptChallenge } from "./registry.js";
import { getKeys, sodiumReady } from "./keys.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ACK = { message: { ack: { status: "ACK" } } };
const NACK = (msg) => ({
  message: { ack: { status: "NACK" } },
  error: { message: msg },
});

// Verify the inbound Beckn signature in live mode. Skipped in dev (mock BPP is
// unsigned and same-origin), so the loopback works without a registry.
async function verified(req) {
  if (!beckn.enabled || beckn.skipInboundVerify) return true;
  try {
    const parsed = parseAuthorizationHeader(req.headers["authorization"]);
    if (!parsed) {
      console.warn("[beckn] inbound verify failed: missing Authorization header");
      return false;
    }
    const pub = await lookupSigningKey(parsed.subscriberId, parsed.uniqueKeyId);
    if (!pub) {
      console.warn("[beckn] inbound verify failed: registry lookup miss for", parsed.subscriberId);
      return false;
    }
    const ok = await verifyAuthorization({
      header: req.headers["authorization"],
      rawBody: req.rawBody ?? JSON.stringify(req.body),
      signingPublicKeyB64: pub,
    });
    if (!ok) console.warn("[beckn] inbound verify failed: bad signature for", parsed.subscriberId);
    return ok;
  } catch (err) {
    console.warn("[beckn] inbound verify error:", err.message);
    return false;
  }
}

function callbackHandler(req, res) {
  verified(req).then((ok) => {
    if (!ok) return res.status(401).json(NACK("signature verification failed"));
    const messageId = req.body?.context?.message_id;
    if (messageId) ingest(messageId, req.body);
    res.json(ACK);
  });
}

export function becknBapRouter() {
  const router = express.Router();

  for (const action of ["on_search", "on_select", "on_init", "on_confirm", "on_status"]) {
    router.post(`/${action}`, callbackHandler);
  }

  return router;
}

// Onboarding endpoints live at the site root, per ONDC requirements.
export function ondcOnboardingRouter() {
  const router = express.Router();

  // Registry challenge during subscription.
  router.post("/on_subscribe", async (req, res) => {
    try {
      const { challenge } = req.body || {};
      if (!challenge) return res.status(400).json({ error: "missing challenge" });
      const answer = await decryptChallenge(challenge);
      res.json({ answer });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Domain-verification page. On cloud hosts the filesystem is ephemeral, so we
  // generate it on demand from ONDC_REQUEST_ID (the request_id ONDC issues during
  // subscribe) by signing it with our signing key. Falls back to a static file
  // (written by the onboarding CLI) for local use.
  router.get("/ondc-site-verification.html", async (req, res) => {
    const requestId = process.env.ONDC_REQUEST_ID;
    if (requestId) {
      try {
        const sodium = await sodiumReady();
        const keys = await getKeys();
        const priv = sodium.from_base64(keys.signing.privateKey, sodium.base64_variants.ORIGINAL);
        const signed = sodium.to_base64(
          sodium.crypto_sign_detached(sodium.from_string(requestId), priv),
          sodium.base64_variants.ORIGINAL
        );
        return res
          .type("html")
          .send(
            `<html><head><meta name='ondc-site-verification' content='${signed}' /></head><body>ONDC Site Verification Page</body></html>`
          );
      } catch (err) {
        return res.status(500).send(`site verification error: ${err.message}`);
      }
    }
    res.sendFile(path.join(__dirname, "ondc-site-verification.html"), (err) => {
      if (err) res.status(404).send("site verification file not generated yet");
    });
  });

  return router;
}
