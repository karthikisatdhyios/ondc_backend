import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { beckn } from "./config.js";
import { ingest } from "./store.js";
import { parseAuthorizationHeader, verifyAuthorization } from "./auth.js";
import { lookupSigningKey, decryptChallenge } from "./registry.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ACK = { message: { ack: { status: "ACK" } } };
const NACK = (msg) => ({
  message: { ack: { status: "NACK" } },
  error: { message: msg },
});

// Verify the inbound Beckn signature in live mode. Skipped in dev (mock BPP is
// unsigned and same-origin), so the loopback works without a registry.
async function verified(req) {
  if (!beckn.enabled) return true;
  try {
    const parsed = parseAuthorizationHeader(req.headers["authorization"]);
    if (!parsed) return false;
    const pub = await lookupSigningKey(parsed.subscriberId, parsed.uniqueKeyId);
    if (!pub) return false;
    return verifyAuthorization({
      header: req.headers["authorization"],
      rawBody: req.rawBody ?? JSON.stringify(req.body),
      signingPublicKeyB64: pub,
    });
  } catch {
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

  // Static domain-verification file (content written by the onboarding CLI).
  router.get("/ondc-site-verification.html", (_req, res) => {
    res.sendFile(path.join(__dirname, "ondc-site-verification.html"), (err) => {
      if (err) res.status(404).send("site verification file not generated yet");
    });
  });

  return router;
}
