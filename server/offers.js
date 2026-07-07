// Per-category card discounts. Each row: a card gives discount_percent off any
// product in that category, capped at max_discount (in rupees).
// Categories in the catalog: laptops, smartphones, potato, tomato, ketchup, stationery.
export const CARD_OFFERS = [
  // HDFC Regalia - premium electronics rewards
  { card_id: "hdfc-regalia", category: "laptops", discount_percent: 7.5, max_discount: 2000 },
  { card_id: "hdfc-regalia", category: "smartphones", discount_percent: 7.5, max_discount: 2000 },

  // HDFC Millennia - online shopping cashback
  { card_id: "hdfc-millennia", category: "laptops", discount_percent: 5, max_discount: 1000 },
  { card_id: "hdfc-millennia", category: "smartphones", discount_percent: 5, max_discount: 1000 },

  // HDFC Diners Club Black - top-tier electronics
  { card_id: "hdfc-diners-black", category: "laptops", discount_percent: 10, max_discount: 3000 },
  { card_id: "hdfc-diners-black", category: "smartphones", discount_percent: 10, max_discount: 3000 },

  // ICICI Amazon Pay - strong on everyday categories
  { card_id: "icici-amazon-pay", category: "potato", discount_percent: 5, max_discount: 150 },
  { card_id: "icici-amazon-pay", category: "tomato", discount_percent: 5, max_discount: 150 },
  { card_id: "icici-amazon-pay", category: "ketchup", discount_percent: 5, max_discount: 150 },
  { card_id: "icici-amazon-pay", category: "stationery", discount_percent: 5, max_discount: 150 },

  // SBI Cashback - 5% on online spends
  { card_id: "sbi-cashback", category: "laptops", discount_percent: 5, max_discount: 1000 },
  { card_id: "sbi-cashback", category: "smartphones", discount_percent: 5, max_discount: 1000 },
  { card_id: "sbi-cashback", category: "ketchup", discount_percent: 5, max_discount: 100 },
  { card_id: "sbi-cashback", category: "stationery", discount_percent: 5, max_discount: 100 },

  // SBI SimplyCLICK - online reward accelerator
  { card_id: "sbi-simplyclick", category: "smartphones", discount_percent: 5, max_discount: 500 },
  { card_id: "sbi-simplyclick", category: "stationery", discount_percent: 5, max_discount: 100 },

  // Axis Magnus - premium high-cap rewards
  { card_id: "axis-magnus", category: "laptops", discount_percent: 8, max_discount: 2500 },
  { card_id: "axis-magnus", category: "smartphones", discount_percent: 8, max_discount: 2500 },

  // Axis Flipkart - broad 5% / 4% offers
  { card_id: "axis-flipkart", category: "laptops", discount_percent: 5, max_discount: 1500 },
  { card_id: "axis-flipkart", category: "smartphones", discount_percent: 5, max_discount: 1500 },
  { card_id: "axis-flipkart", category: "potato", discount_percent: 4, max_discount: 100 },
  { card_id: "axis-flipkart", category: "tomato", discount_percent: 4, max_discount: 100 },
  { card_id: "axis-flipkart", category: "ketchup", discount_percent: 4, max_discount: 100 },

  // Amex Platinum Travel
  { card_id: "amex-platinum-travel", category: "laptops", discount_percent: 5, max_discount: 1000 },

  // Amex Membership Rewards
  { card_id: "amex-mrcc", category: "smartphones", discount_percent: 5, max_discount: 800 },
  { card_id: "amex-mrcc", category: "stationery", discount_percent: 5, max_discount: 100 },
];

// Everyday grocery + packaged food categories added later. Two cards carry
// broad everyday offers, so these get a realistic discount too.
const NEW_FOOD_CATEGORIES = [
  "onion",
  "maggi",
  "basmati-rice",
  "atta",
  "toor-dal",
  "sugar",
  "salt",
  "cooking-oil",
  "milk",
  "eggs",
  "bread",
  "paneer",
  "chicken-masala",
  "chicken-tikka-masala",
];

for (const category of NEW_FOOD_CATEGORIES) {
  CARD_OFFERS.push(
    { card_id: "icici-amazon-pay", category, discount_percent: 5, max_discount: 150 },
    { card_id: "axis-flipkart", category, discount_percent: 4, max_discount: 100 }
  );
}

// Platform-wide reward offers ("*"). Because goods now come from the network and
// sellers use ONDC category codes we may not have a specific mapping for, these
// keep the card-reward experience working over whatever category is returned.
CARD_OFFERS.push(
  { card_id: "icici-amazon-pay", category: "*", discount_percent: 5, max_discount: 150 },
  { card_id: "axis-flipkart", category: "*", discount_percent: 4, max_discount: 100 },
  { card_id: "hdfc-millennia", category: "*", discount_percent: 5, max_discount: 1000 }
);
