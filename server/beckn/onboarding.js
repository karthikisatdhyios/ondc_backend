import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getKeys, sodiumReady } from "./keys.js";
import { beckn } from "./config.js";
import { buildSubscribePayload } from "./registry.js";
import { createAuthorizationHeader } from "./auth.js";

// ONDC onboarding helper CLI.
//   node server/beckn/onboarding.js keys                 -> show public keys
//   node server/beckn/onboarding.js site <request_id>    -> write site-verification file
//   node server/beckn/onboarding.js subscribe [ops_no]   -> POST /subscribe to the registry
//
// Pre-prod go-live still requires: a publicly reachable BAP_URI, and ONDC having
// whitelisted your subscriber_id. This tool prepares/performs the mechanical steps.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_FILE = path.join(__dirname, "ondc-site-verification.html");

async function showKeys() {
  const keys = await getKeys();
  console.log("subscriber_id     :", beckn.bapId);
  console.log("unique_key_id     :", beckn.uniqueKeyId);
  console.log("signing_public_key:", keys.signing.publicKey);
  console.log("encr_public_key   :", keys.encryption.publicKey);
  console.log("subscriber_url    :", beckn.bapUri);
  console.log("callback_url      :", "/beckn/bap");
}

async function writeSiteVerification(requestId) {
  if (!requestId) throw new Error("request_id is required: onboarding.js site <request_id>");
  const sodium = await sodiumReady();
  const keys = await getKeys();
  const priv = sodium.from_base64(keys.signing.privateKey, sodium.base64_variants.ORIGINAL);
  const signed = sodium.to_base64(
    sodium.crypto_sign_detached(sodium.from_string(requestId), priv),
    sodium.base64_variants.ORIGINAL
  );
  const html = `<html><head><meta name='ondc-site-verification' content='${signed}' /></head><body>ONDC Site Verification Page</body></html>`;
  fs.writeFileSync(SITE_FILE, html);
  console.log(`Wrote ${SITE_FILE}. It will be served at /ondc-site-verification.html`);
}

async function subscribe(opsNo) {
  const payload = await buildSubscribePayload({ opsNo: Number(opsNo) || 1 });
  const bodyString = JSON.stringify(payload);
  const auth = await createAuthorizationHeader(bodyString);
  const res = await fetch(`${beckn.registryUrl}/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: auth },
    body: bodyString,
  });
  console.log("subscribe status:", res.status);
  console.log(await res.text());
}

const [cmd, arg] = process.argv.slice(2);
const run = { keys: showKeys, site: () => writeSiteVerification(arg), subscribe: () => subscribe(arg) }[cmd];

if (!run) {
  console.log("usage: onboarding.js <keys|site <request_id>|subscribe [ops_no]>");
  process.exit(1);
}
run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
