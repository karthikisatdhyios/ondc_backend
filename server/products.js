const IMG = {
  potato: "https://upload.wikimedia.org/wikipedia/commons/a/ab/Patates.jpg",
  tomato: "https://upload.wikimedia.org/wikipedia/commons/8/89/Tomato_je.jpg",
  smartphone: "https://upload.wikimedia.org/wikipedia/commons/1/1a/Android_phone.jpg",
  ketchup: "https://upload.wikimedia.org/wikipedia/commons/b/bd/Ketchup.jpg",
  notebook: "https://upload.wikimedia.org/wikipedia/commons/9/93/Notebook.jpg",
  onion: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Red_Onion_on_White.JPG/500px-Red_Onion_on_White.JPG",
  maggi: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Pizza_special_Maggi_noodles_%282025%29.jpg/500px-Pizza_special_Maggi_noodles_%282025%29.jpg",
  chickenMasala: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Garam_Masala_1.jpg/500px-Garam_Masala_1.jpg",
  chickenTikkaMasala: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Chicken_Tikka_Masala_KellySue.JPG/500px-Chicken_Tikka_Masala_KellySue.JPG",
  basmatiRice: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Grano_de_arroz_basmati_integral%2C_2020-06-12%2C_DD_01-11_FS.jpg/500px-Grano_de_arroz_basmati_integral%2C_2020-06-12%2C_DD_01-11_FS.jpg",
  atta: "https://upload.wikimedia.org/wikipedia/commons/1/11/Wheat-flour.jpg",
  toorDal: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Split_pigeon_peas.jpg/500px-Split_pigeon_peas.jpg",
  sugar: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Granulated_White_Sugar_with_Large_Crystals%2C_Light_Through_the_Crystals.jpg/500px-Granulated_White_Sugar_with_Large_Crystals%2C_Light_Through_the_Crystals.jpg",
  salt: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Grain_of_Kosher_Salt.jpg/500px-Grain_of_Kosher_Salt.jpg",
  cookingOil: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Bottle_1_liter_Sunflower_refined_oil.jpg/500px-Bottle_1_liter_Sunflower_refined_oil.jpg",
  milk: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Bowl_milk_glass.jpg/500px-Bowl_milk_glass.jpg",
  eggs: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/6-Pack-Chicken-Eggs.jpg/500px-6-Pack-Chicken-Eggs.jpg",
  bread: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Fresh_made_bread_05.jpg/500px-Fresh_made_bread_05.jpg",
  paneer: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Panir_Paneer_Indian_cheese_fresh.jpg/500px-Panir_Paneer_Indian_cheese_fresh.jpg",
};

const slug = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// 3 laptops from different providers, each with its own brand image
const laptops = [
  {
    name: "Dell Inspiron 15",
    provider: "Dell",
    price: 54990,
    image: "https://upload.wikimedia.org/wikipedia/commons/7/79/Dell_Inspiron_1525.jpeg",
  },
  {
    name: "HP Pavilion 14",
    provider: "HP",
    price: 62990,
    image: "https://upload.wikimedia.org/wikipedia/commons/5/5a/HP_Pavilion_dv6000_laptop.jpg",
  },
  {
    name: "Lenovo ThinkPad E14",
    provider: "Lenovo",
    price: 48990,
    image: "https://upload.wikimedia.org/wikipedia/commons/a/ae/Lenovo_ThinkPad_E520.jpg",
  },
].map((p) => ({
  id: `laptop-${slug(p.name)}`,
  category: "laptops",
  unit: null,
  ...p,
}));

// 1 kg potato from 10 different providers: [provider, price]
const potatoProviders = [
  ["BigBasket", 32],
  ["Zepto", 29],
  ["Blinkit", 30],
  ["JioMart", 35],
  ["Amazon Fresh", 33],
  ["Flipkart Minutes", 31],
  ["DMart Ready", 28],
  ["Swiggy Instamart", 34],
  ["Otipy", 36],
  ["Country Delight", 38],
];
const potatoes = potatoProviders.map(([provider, price]) => ({
  id: `potato-${slug(provider)}`,
  category: "potato",
  name: "Potato 1kg",
  provider,
  price,
  image: IMG.potato,
  unit: "1 kg",
}));

// 1 kg tomato from 15 different providers
const tomatoProviders = [
  ["BigBasket", 40],
  ["Zepto", 38],
  ["Blinkit", 39],
  ["JioMart", 44],
  ["Amazon Fresh", 42],
  ["Flipkart Minutes", 41],
  ["DMart Ready", 36],
  ["Swiggy Instamart", 43],
  ["Otipy", 45],
  ["Country Delight", 48],
  ["Spencer's", 46],
  ["Reliance Fresh", 37],
  ["More Retail", 39],
  ["Nature's Basket", 55],
  ["FreshToHome", 50],
];
const tomatoes = tomatoProviders.map(([provider, price]) => ({
  id: `tomato-${slug(provider)}`,
  category: "tomato",
  name: "Tomato 1kg",
  provider,
  price,
  image: IMG.tomato,
  unit: "1 kg",
}));

// 4 smartphones of different brands
const smartphones = [
  { name: "Apple iPhone 15", provider: "Apple", price: 79900 },
  { name: "Samsung Galaxy S24", provider: "Samsung", price: 74999 },
  { name: "Google Pixel 8", provider: "Google", price: 59999 },
  { name: "OnePlus 12", provider: "OnePlus", price: 64999 },
].map((p) => ({
  id: `smartphone-${slug(p.name)}`,
  category: "smartphones",
  image: IMG.smartphone,
  unit: null,
  ...p,
}));

// 13 ketchups
const ketchups = [
  { name: "Kissan Fresh Tomato Ketchup", provider: "Kissan", price: 95 },
  { name: "Heinz Tomato Ketchup", provider: "Heinz", price: 180 },
  { name: "Maggi Rich Tomato Ketchup", provider: "Maggi", price: 99 },
  { name: "Del Monte Tomato Ketchup", provider: "Del Monte", price: 110 },
  { name: "Cremica Tomato Ketchup", provider: "Cremica", price: 85 },
  { name: "Veeba Tomato Ketchup", provider: "Veeba", price: 120 },
  { name: "Tops Tomato Ketchup", provider: "Tops", price: 80 },
  { name: "Fun Foods Tomato Ketchup", provider: "Fun Foods", price: 105 },
  { name: "Wingreens Tomato Ketchup", provider: "Wingreens", price: 130 },
  { name: "Mother's Recipe Tomato Ketchup", provider: "Mother's Recipe", price: 90 },
  { name: "American Garden Tomato Ketchup", provider: "American Garden", price: 150 },
  { name: "Smith & Jones Tomato Ketchup", provider: "Smith & Jones", price: 88 },
  { name: "Ching's Secret Tomato Ketchup", provider: "Ching's Secret", price: 92 },
].map((p) => ({
  id: `ketchup-${slug(p.name)}`,
  category: "ketchup",
  image: IMG.ketchup,
  unit: null,
  ...p,
}));

// 12 ruled notebooks and stationaries
const stationery = [
  { name: "Classmate Ruled Notebook", provider: "Classmate", price: 60 },
  { name: "Navneet Youva Ruled Notebook", provider: "Navneet", price: 55 },
  { name: "Camlin Ruled Notebook", provider: "Camlin", price: 50 },
  { name: "JK Paper Ruled Notebook", provider: "JK Paper", price: 65 },
  { name: "Doms Ruled Notebook", provider: "Doms", price: 58 },
  { name: "Nataraj Ruled Notebook", provider: "Nataraj", price: 45 },
  { name: "Cello Butterflow Ball Pen", provider: "Cello", price: 10 },
  { name: "Apsara Platinum Pencil", provider: "Apsara", price: 5 },
  { name: "Faber-Castell Dust-Free Eraser", provider: "Faber-Castell", price: 8 },
  { name: "Camlin Geometry Box", provider: "Camlin", price: 150 },
  { name: "Nataraj Sharpener", provider: "Nataraj", price: 6 },
  { name: "Luxor Highlighter", provider: "Luxor", price: 25 },
].map((p) => ({
  id: `stationery-${slug(p.name)}`,
  category: "stationery",
  image: IMG.notebook,
  unit: null,
  ...p,
}));

// Grocery staples: one product type per category, sold by several retailers.
// [provider, price]
const grocery = (category, name, unit, image, providerPrices) =>
  providerPrices.map(([provider, price]) => ({
    id: `${category}-${slug(provider)}`,
    category,
    name,
    provider,
    price,
    image,
    unit,
  }));

// Branded packaged foods: brand variants of the same product.
// [brand, price]
const branded = (category, baseName, unit, image, brandPrices) =>
  brandPrices.map(([brand, price]) => ({
    id: `${category}-${slug(brand)}`,
    category,
    name: `${brand} ${baseName}`,
    provider: brand,
    price,
    image,
    unit,
  }));

const RETAILERS = ["BigBasket", "Zepto", "Blinkit", "JioMart"];
const atRetailers = (prices) => RETAILERS.map((r, i) => [r, prices[i]]);

const onion = grocery("onion", "Onion 1kg", "1 kg", IMG.onion, atRetailers([40, 37, 39, 43]));
const maggi = grocery("maggi", "Maggi 2-Minute Noodles", "70 g", IMG.maggi, atRetailers([14, 13, 14, 15]));
const basmatiRice = grocery("basmati-rice", "Basmati Rice 1kg", "1 kg", IMG.basmatiRice, atRetailers([120, 115, 118, 128]));
const atta = grocery("atta", "Whole Wheat Atta 1kg", "1 kg", IMG.atta, atRetailers([52, 49, 50, 55]));
const toorDal = grocery("toor-dal", "Toor Dal 1kg", "1 kg", IMG.toorDal, atRetailers([165, 158, 160, 172]));
const sugar = grocery("sugar", "Sugar 1kg", "1 kg", IMG.sugar, atRetailers([46, 44, 45, 49]));
const salt = grocery("salt", "Iodised Salt 1kg", "1 kg", IMG.salt, atRetailers([28, 26, 27, 30]));
const cookingOil = grocery("cooking-oil", "Sunflower Oil 1L", "1 L", IMG.cookingOil, atRetailers([145, 139, 142, 150]));
const milk = grocery("milk", "Toned Milk 1L", "1 L", IMG.milk, atRetailers([66, 64, 65, 68]));
const eggs = grocery("eggs", "Farm Eggs (6 pcs)", "6 pcs", IMG.eggs, atRetailers([48, 44, 46, 52]));
const bread = grocery("bread", "Whole Wheat Bread 400g", "400 g", IMG.bread, atRetailers([48, 45, 46, 50]));
const paneer = grocery("paneer", "Fresh Paneer 200g", "200 g", IMG.paneer, atRetailers([92, 88, 90, 95]));

const chickenMasala = branded("chicken-masala", "Chicken Masala 100g", "100 g", IMG.chickenMasala, [
  ["MDH", 78],
  ["Everest", 72],
  ["Catch", 75],
  ["Eastern", 70],
]);
const chickenTikkaMasala = branded("chicken-tikka-masala", "Chicken Tikka Masala (Ready to Eat)", "285 g", IMG.chickenTikkaMasala, [
  ["MTR", 165],
  ["Kitchens of India", 185],
  ["Haldiram's", 150],
  ["Gits", 145],
]);

export const PRODUCTS = [
  ...laptops,
  ...potatoes,
  ...tomatoes,
  ...smartphones,
  ...ketchups,
  ...stationery,
  ...onion,
  ...maggi,
  ...basmatiRice,
  ...atta,
  ...toorDal,
  ...sugar,
  ...salt,
  ...cookingOil,
  ...milk,
  ...eggs,
  ...bread,
  ...paneer,
  ...chickenMasala,
  ...chickenTikkaMasala,
];
