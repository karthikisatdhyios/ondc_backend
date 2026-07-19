import { beckn } from "./config.js";

// Default delivery locations aligned with common ONDC std codes (GPS has no spaces).
const CITY_LOCATIONS = {
  "std:080": { gps: "12.971600,77.594600", area_code: "560001" },
  "std:011": { gps: "28.613900,77.209000", area_code: "110001" },
  "std:022": { gps: "19.076000,72.877700", area_code: "400001" },
  "std:040": { gps: "17.385000,78.486700", area_code: "500001" },
  "std:0124": { gps: "28.459500,77.026600", area_code: "122001" },
};

const FALLBACK = CITY_LOCATIONS["std:080"];

export function resolveDeliveryLocation(city) {
  const std = city || beckn.city;
  const mapped = CITY_LOCATIONS[std] || FALLBACK;
  return {
    gps: beckn.searchGps || mapped.gps,
    area_code: beckn.searchPincode || mapped.area_code,
  };
}

// Retail search intent for ONDC RET10 / core 1.2.5 — gateway requires delivery location.
export function buildSearchIntent({ searchText, category, city } = {}) {
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

  const { gps, area_code } = resolveDeliveryLocation(city);
  intent.fulfillment = {
    type: "Delivery",
    end: {
      location: {
        gps,
        address: { area_code },
      },
    },
  };

  if (beckn.finderFeeType && beckn.finderFeeAmount) {
    intent.payment = {
      "@ondc/org/buyer_app_finder_fee_type": beckn.finderFeeType,
      "@ondc/org/buyer_app_finder_fee_amount": beckn.finderFeeAmount,
    };
  }

  return intent;
}
