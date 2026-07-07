import { getKeys, sodiumReady } from "./keys.js";
import { beckn } from "./config.js";

// Beckn / ONDC HTTP signature auth.
// The signing string is:
//   (created): <unix>
//   (expires): <unix>
//   digest: BLAKE-512=<base64 blake2b-512 of the raw request body>
// signed with Ed25519, carried in the Authorization header.

export async function blake512Digest(bodyString) {
  const sodium = await sodiumReady();
  const hash = sodium.crypto_generichash(
    64,
    sodium.from_string(bodyString)
  );
  return sodium.to_base64(hash, sodium.base64_variants.ORIGINAL);
}

function signingString({ created, expires, digestB64 }) {
  return `(created): ${created}\n(expires): ${expires}\ndigest: BLAKE-512=${digestB64}`;
}

// Build the Authorization header value for an outgoing request body.
export async function createAuthorizationHeader(bodyString, opts = {}) {
  const sodium = await sodiumReady();
  const keys = await getKeys();

  const created = opts.created ?? Math.floor(Date.now() / 1000);
  const expires = opts.expires ?? created + 3600;
  const digestB64 = await blake512Digest(bodyString);

  const message = signingString({ created, expires, digestB64 });
  const privateKey = sodium.from_base64(
    keys.signing.privateKey,
    sodium.base64_variants.ORIGINAL
  );
  const signature = sodium.to_base64(
    sodium.crypto_sign_detached(sodium.from_string(message), privateKey),
    sodium.base64_variants.ORIGINAL
  );

  const subscriberId = opts.subscriberId || beckn.bapId;
  const uniqueKeyId = opts.uniqueKeyId || beckn.uniqueKeyId;
  const keyId = `${subscriberId}|${uniqueKeyId}|ed25519`;

  return `Signature keyId="${keyId}",algorithm="ed25519",created="${created}",expires="${expires}",headers="(created) (expires) digest",signature="${signature}"`;
}

// Parse a "Signature keyId=...,signature=..." header into its fields.
export function parseAuthorizationHeader(header) {
  if (!header || typeof header !== "string") return null;
  const out = {};
  const re = /(\w+)="([^"]*)"/g;
  let m;
  while ((m = re.exec(header)) !== null) out[m[1]] = m[2];
  if (out.keyId) {
    const [subscriberId, uniqueKeyId, algorithm] = out.keyId.split("|");
    out.subscriberId = subscriberId;
    out.uniqueKeyId = uniqueKeyId;
    out.algorithm = algorithm;
  }
  return out;
}

// Verify an incoming request's Authorization header against the sender's
// Ed25519 public key (base64). rawBody must be the exact bytes received.
export async function verifyAuthorization({ header, rawBody, signingPublicKeyB64 }) {
  try {
    const sodium = await sodiumReady();
    const parsed = parseAuthorizationHeader(header);
    if (!parsed || !parsed.signature) return false;

    const digestB64 = await blake512Digest(rawBody);
    const message = signingString({
      created: parsed.created,
      expires: parsed.expires,
      digestB64,
    });

    const sig = sodium.from_base64(parsed.signature, sodium.base64_variants.ORIGINAL);
    const pub = sodium.from_base64(signingPublicKeyB64, sodium.base64_variants.ORIGINAL);

    return sodium.crypto_sign_verify_detached(sig, sodium.from_string(message), pub);
  } catch {
    return false;
  }
}
