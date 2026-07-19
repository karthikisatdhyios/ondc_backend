import dotenv from "dotenv";

dotenv.config();

const port = process.env.PORT || 8787;

// When BECKN_ENABLED is false we talk to the local dev mock BPP instead of the
// real ONDC gateway/registry, so the whole search -> confirm loop can be
// exercised without onboarding. Flip to true once registered on pre-prod.
export const beckn = {
  enabled: String(process.env.BECKN_ENABLED || "false").toLowerCase() === "true",

  // Our identity on the network (buyer app / BAP).
  bapId: process.env.BAP_ID || `bap.dhiyos.local`,
  bapUri: process.env.BAP_URI || `http://localhost:${port}`,
  uniqueKeyId: process.env.BECKN_UNIQUE_KEY_ID || "dhiyos-bap-key-1",

  // ONDC network endpoints (pre-prod defaults; confirm against current docs).
  registryUrl: process.env.ONDC_REGISTRY_URL || "https://preprod.registry.ondc.org/ondc",
  gatewayUrl: process.env.ONDC_GATEWAY_URL || "https://preprod.gateway.ondc.org",

  domain: process.env.ONDC_DOMAIN || "ONDC:RET10", // retail - grocery
  country: process.env.ONDC_COUNTRY || "IND",
  city: process.env.ONDC_CITY || "std:080", // Bangalore
  coreVersion: process.env.ONDC_CORE_VERSION || "1.2.5",
  env: process.env.ONDC_ENV || "preprod",

  // Retail search delivery location (overrides city map when set).
  searchGps: process.env.ONDC_SEARCH_GPS || "",
  searchPincode: process.env.ONDC_SEARCH_PINCODE || "",
  finderFeeType: process.env.ONDC_FINDER_FEE_TYPE || "percent",
  finderFeeAmount: process.env.ONDC_FINDER_FEE_AMOUNT || "3",

  // Where sellers/gateway POST our callbacks. Must be publicly reachable in pre-prod.
  callbackBase: `${(process.env.BAP_URI || `http://localhost:${port}`).replace(/\/$/, "")}/beckn/bap`,

  // Local dev mock seller.
  mockBppUrl: process.env.MOCK_BPP_URL || `http://localhost:${port}/mock-bpp`,
  mockBppId: process.env.MOCK_BPP_ID || "mock-bpp.dhiyos.local",

  // How long to wait for asynchronous on_search / on_select callbacks.
  searchTimeoutMs: Number(process.env.BECKN_SEARCH_TIMEOUT_MS || 4000),
  actionTimeoutMs: Number(process.env.BECKN_ACTION_TIMEOUT_MS || 6000),
  // Pre-prod only: skip inbound signature verify when registry lookup is blocked.
  skipInboundVerify:
    String(process.env.BECKN_SKIP_INBOUND_VERIFY || "false").toLowerCase() === "true",
};

export const port_ = port;
