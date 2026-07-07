import _sodium from "libsodium-wrappers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ONDC network identity keys:
//  - Ed25519 signing keypair -> signs the Beckn Authorization header
//  - X25519 encryption keypair -> used for the registry /on_subscribe challenge
// Keys are raw, base64-encoded (ONDC registry format) and persisted to disk so
// the subscriber_id <-> key mapping stays stable across restarts.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KEYS_PATH = path.join(__dirname, "..", "beckn-keys.json");

let cached = null;

async function sodiumReady() {
  await _sodium.ready;
  return _sodium;
}

export async function getKeys() {
  if (cached) return cached;

  // On cloud hosts the filesystem is often ephemeral, which would regenerate the
  // keypair on every restart and break the public key you registered with ONDC.
  // So prefer keys supplied via env (paste the beckn-keys.json contents into
  // BECKN_KEYS_JSON) to keep a stable network identity in production.
  if (process.env.BECKN_KEYS_JSON) {
    cached = JSON.parse(process.env.BECKN_KEYS_JSON);
    return cached;
  }

  if (fs.existsSync(KEYS_PATH)) {
    cached = JSON.parse(fs.readFileSync(KEYS_PATH, "utf8"));
    return cached;
  }

  const sodium = await sodiumReady();
  const signing = sodium.crypto_sign_keypair(); // Ed25519
  const encryption = sodium.crypto_box_keypair(); // X25519

  const b64 = (u8) => sodium.to_base64(u8, sodium.base64_variants.ORIGINAL);

  cached = {
    signing: {
      publicKey: b64(signing.publicKey),
      privateKey: b64(signing.privateKey),
    },
    encryption: {
      publicKey: b64(encryption.publicKey),
      privateKey: b64(encryption.privateKey),
    },
    createdAt: new Date().toISOString(),
  };

  fs.writeFileSync(KEYS_PATH, JSON.stringify(cached, null, 2));
  return cached;
}

export { sodiumReady };
