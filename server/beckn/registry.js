import crypto from "crypto";
import { beckn } from "./config.js";
import { getKeys } from "./keys.js";

// ---- Registry lookup (resolve + cache a subscriber's signing public key) ----

const keyCache = new Map(); // `${subscriberId}|${uniqueKeyId}` -> signing_public_key

export async function lookupSigningKey(subscriberId, uniqueKeyId) {
  const cacheKey = `${subscriberId}|${uniqueKeyId || ""}`;
  if (keyCache.has(cacheKey)) return keyCache.get(cacheKey);

  const res = await fetch(`${beckn.registryUrl}/lookup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscriber_id: subscriberId }),
  });
  if (!res.ok) throw new Error(`registry lookup failed: ${res.status}`);

  const list = await res.json();
  const match =
    (uniqueKeyId && list.find((e) => e.ukId === uniqueKeyId || e.unique_key_id === uniqueKeyId)) ||
    list[0];
  const key = match?.signing_public_key || null;
  if (key) keyCache.set(cacheKey, key);
  return key;
}

// ---- X25519 raw <-> DER helpers (Node needs DER-wrapped keys) ----

const X25519_SPKI_PREFIX = Buffer.from("302a300506032b656e032100", "hex");
const X25519_PKCS8_PREFIX = Buffer.from("302e020100300506032b656e04220420", "hex");

function x25519PublicFromRaw(rawB64) {
  const der = Buffer.concat([X25519_SPKI_PREFIX, Buffer.from(rawB64, "base64")]);
  return crypto.createPublicKey({ key: der, format: "der", type: "spki" });
}

function x25519PrivateFromRaw(rawB64) {
  const der = Buffer.concat([X25519_PKCS8_PREFIX, Buffer.from(rawB64, "base64")]);
  return crypto.createPrivateKey({ key: der, format: "der", type: "pkcs8" });
}

// ---- /on_subscribe challenge decryption ----
// The registry AES-256-ECB encrypts a challenge with the X25519 shared secret
// between our encryption private key and ONDC's public encryption key.
export async function decryptChallenge(challengeB64) {
  const ondcPublicKey = process.env.ONDC_ENCRYPTION_PUBLIC_KEY;
  if (!ondcPublicKey) {
    throw new Error(
      "ONDC_ENCRYPTION_PUBLIC_KEY is not set. Add ONDC's pre-prod public encryption key to .env."
    );
  }
  const keys = await getKeys();

  const privateKey = x25519PrivateFromRaw(keys.encryption.privateKey);
  const publicKey = x25519PublicFromRaw(ondcPublicKey);
  const sharedSecret = crypto.diffieHellman({ privateKey, publicKey });

  const decipher = crypto.createDecipheriv("aes-256-ecb", sharedSecret, null);
  decipher.setAutoPadding(false);
  let decrypted = decipher.update(Buffer.from(challengeB64, "base64"));
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  // strip any trailing padding bytes
  return decrypted.toString("utf8").replace(/[\x00-\x1F]+$/g, "");
}

// ---- Subscribe payload (used by the onboarding CLI) ----

export async function buildSubscribePayload({ opsNo = 1, requestId } = {}) {
  const keys = await getKeys();
  const now = new Date();
  const validUntil = new Date(now.getTime() + 365 * 24 * 3600 * 1000);
  const host = beckn.bapUri.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return {
    context: { operation: { ops_no: opsNo } },
    message: {
      request_id: requestId || crypto.randomUUID(),
      timestamp: now.toISOString(),
      entity: {
        gst: { legal_entity_name: "Dhiyos", business_address: "", city_code: [beckn.city], gst_no: "" },
        pan: { name_as_per_pan: "Dhiyos", pan_no: "", date_of_incorporation: "" },
        name_of_authorised_signatory: "",
        address_of_authorised_signatory: "",
        email_id: "",
        mobile_no: "",
        country: beckn.country,
        subscriber_id: beckn.bapId,
        unique_key_id: beckn.uniqueKeyId,
        callback_url: "/beckn/bap",
        key_pair: {
          signing_public_key: keys.signing.publicKey,
          encryption_public_key: keys.encryption.publicKey,
          valid_from: now.toISOString(),
          valid_until: validUntil.toISOString(),
        },
      },
      network_participant: [
        {
          subscriber_url: `https://${host}`,
          domain: beckn.domain,
          type: "buyerApp",
          msn: false,
          city_code: [beckn.city],
        },
      ],
    },
  };
}
