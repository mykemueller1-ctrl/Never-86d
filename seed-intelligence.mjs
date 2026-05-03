/**
 * Seed script for the AI-Native Intelligence Layer
 * Seeds: knowledge entries, vendor products, rewards, achievement definitions, photo missions
 * Run: node seed-intelligence.mjs
 */

import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "./drizzle/schema.ts";

const db = drizzle(process.env.DATABASE_URL);

async function seedKnowledge() {
  console.log("🧠 Seeding knowledge entries...");
  const entries = [
    // ===== PIZZA LINE =====
    { station: "pizza_line", category: "recipe", question: "How much cheese on a large pizza?", answer: "12 oz mozzarella blend, spread evenly to 1/2 inch from edge. Use Arrezzio Imperial Low Moisture Part Skim Mozzarella (Sysco SKU 2388791).", confidence: "high", source: "imported" },
    { station: "pizza_line", category: "recipe", question: "What are the specialty pizzas?", answer: "14 specialties: Community Special, Meatlovers, Taco Pizza, Philly Pizza, C-Mac Pizza, Buffalo Chicken, Crab Rangoon, Brisket Pizza, Pickle Wrap, BBQ Jam, Margherita, Hawaiian, Veggie, Supreme. Each has a specific build card.", confidence: "high", source: "imported" },
    { station: "pizza_line", category: "recipe", question: "What sizes do we offer for pizza?", answer: "Mini (personal), Small (10\"), Medium (12\"), Large (14\"). Price range $6.99-$27.99. GF crust available in 12\" only (Arrezzio Parbaked Neapolitan GF, Sysco SKU 7278698).", confidence: "high", source: "imported" },
    { station: "pizza_line", category: "process", question: "How long to cook a pizza?", answer: "Conveyor oven: 6-7 minutes at standard temp. GF crust needs 30 seconds less. Check cheese is bubbly and crust is golden. Pull and let rest 60 seconds before cutting.", confidence: "high", source: "imported" },
    { station: "pizza_line", category: "location", question: "Where is the pizza dough stored?", answer: "Walk-in cooler, bottom shelf, left side. Dough balls are pre-portioned by size. Pull 30 min before use to come to room temp for easier stretching.", confidence: "medium", source: "imported" },
    { station: "pizza_line", category: "allergen", question: "Do we have gluten-free pizza options?", answer: "Yes — 12\" GF crust only (Arrezzio Parbaked Neapolitan GF). IMPORTANT: Use clean cutting board, clean pizza cutter, and separate prep area. Change gloves. Cannot guarantee no cross-contamination due to shared oven.", confidence: "high", source: "imported" },

    // ===== FRY LINE =====
    { station: "fry_line", category: "recipe", question: "What are the chicken strip flavors?", answer: "6 flavors: Original, Smoky BBQ, Garlic Herb, Buffalo, Bayou Cajun, Caribbean Jerk. All start with same base strip, tossed in sauce after frying. 6pc basket $8.95, 12pc basket $17.99.", confidence: "high", source: "imported" },
    { station: "fry_line", category: "recipe", question: "What goes in the fish basket?", answer: "3 pieces beer-battered cod, served with fries, coleslaw, and tartar sauce. $12.99. Friday special: all-you-can-eat fish fry.", confidence: "high", source: "imported" },
    { station: "fry_line", category: "process", question: "What temperature should the fryer be?", answer: "350°F for most items. Chicken strips: 5-6 min until golden and 165°F internal. French fries: 3-4 min. Onion rings: 2-3 min. Fish: 4-5 min until golden and flaky. Always shake basket after 1 min.", confidence: "high", source: "imported" },
    { station: "fry_line", category: "process", question: "When do we change fryer oil?", answer: "Every 3-4 days or when oil darkens significantly. Filter daily at close. Keep oil level at the fill line. Never mix old and new oil. Log oil changes on the kitchen whiteboard.", confidence: "high", source: "imported" },
    { station: "fry_line", category: "location", question: "Where are the wing sauces?", answer: "Sauce station next to fryer: Buffalo, Korean BBQ, Sweet Chili, Spicy Garlic, Spicy BBQ, Honey BBQ, Nashville Hot, Sriracha Bourbon, Garlic Parmesan, Sassy Orange, Wow Wow Sauce. Extra sauce $0.99.", confidence: "high", source: "imported" },
    { station: "fry_line", category: "recipe", question: "How many wings in an order?", answer: "6pc wings $10.99, 12pc wings $18.99. Can be bone-in or boneless. Toss in sauce after frying. Serve with celery and ranch or blue cheese.", confidence: "high", source: "imported" },

    // ===== BAR =====
    { station: "bar", category: "recipe", question: "How to make a Moscow Mule?", answer: "1.5 oz Ketel One vodka, 0.5 oz fresh lime juice, top with ginger beer. Serve in copper mug with ice, garnish with lime wedge.", confidence: "high", source: "imported" },
    { station: "bar", category: "recipe", question: "How to make a Margarita?", answer: "1.5 oz Jose Cuervo tequila, 1 oz Cointreau, 1 oz fresh lime juice, 0.5 oz simple syrup. Shake with ice, strain into salt-rimmed glass. Frozen option: blend with ice.", confidence: "high", source: "imported" },
    { station: "bar", category: "recipe", question: "How to make an Old Fashioned?", answer: "2 oz Woodford Reserve bourbon, 0.25 oz simple syrup, 2-3 dashes Angostura bitters. Stir with ice in rocks glass, garnish with orange peel and cherry.", confidence: "high", source: "imported" },
    { station: "bar", category: "recipe", question: "How to make a Whiskey Sour?", answer: "1.5 oz Makers Mark bourbon, 1 oz fresh lemon juice, 0.75 oz simple syrup, egg white optional. Shake vigorously, strain into rocks glass with ice, garnish with cherry and orange.", confidence: "high", source: "imported" },
    { station: "bar", category: "process", question: "What are the bar opening duties?", answer: "1. Stock ice wells 2. Cut fruit (limes, lemons, oranges) 3. Check juice levels (cranberry, OJ, pineapple) 4. Verify beer taps are flowing 5. Stock glassware 6. Check syrup bottles 7. Wipe down bar top 8. Turn on TVs 9. Check POS is working 10. Review daily specials.", confidence: "high", source: "imported" },
    { station: "bar", category: "process", question: "What are the bar closing duties?", answer: "1. Last call 30 min before close 2. Wash all tools and shakers 3. Empty and clean ice wells 4. Wipe down all surfaces 5. Restock bottles for next shift 6. Count cash drawer 7. Run end-of-day report 8. Lock liquor storage 9. Take out trash 10. Mop behind bar.", confidence: "high", source: "imported" },
    { station: "bar", category: "vendor", question: "Where does our liquor come from?", answer: "Iowa is a control state — all liquor prices set by Iowa ABD (Alcoholic Beverages Division). We purchase through Hy-Vee Wine & Spirits. Ashley Holding manages all beer and liquor ordering.", confidence: "high", source: "imported" },
    { station: "bar", category: "menu_info", question: "What beers do we have on tap?", answer: "Rotating taps — check the tap board. Staples include: Bud Light, Coors Light, Miller Lite, Blue Moon, local craft options. Full bottle/can list: 40+ options including Corona, Stella, Heineken, Guinness, White Claw, Carbliss, Angry Orchard.", confidence: "medium", source: "imported" },

    // ===== WAITSTAFF =====
    { station: "waitstaff", category: "menu_info", question: "What are today's specials?", answer: "Check the daily briefing board. Common specials: Monday - Burger Night, Tuesday - Taco Tuesday, Wednesday - Wing Wednesday, Thursday - Steak Night, Friday - Fish Fry, Saturday - Prime Rib, Sunday - Brunch.", confidence: "medium", source: "imported" },
    { station: "waitstaff", category: "allergen", question: "What items are gluten-free?", answer: "GF pizza crust (12\" only), all salads (no croutons), grilled proteins, most sides (fries cooked in shared fryer — warn customer). Always check with kitchen for current GF options. CANNOT guarantee no cross-contamination.", confidence: "high", source: "imported" },
    { station: "waitstaff", category: "menu_info", question: "What is the kids menu?", answer: "All $7.99: Hamburger, Cheeseburger, Grilled Cheese, Chicken Strips (3pc), Mini Cheese Pizza. All come with fries and a drink. Ages 12 and under.", confidence: "high", source: "imported" },
    { station: "waitstaff", category: "process", question: "How do I handle a food allergy request?", answer: "1. Take it seriously — write it on the ticket in RED 2. Inform the kitchen verbally AND on the ticket 3. Common allergens: gluten, dairy, nuts, shellfish 4. When in doubt, ask a manager 5. Never say 'it's fine' — always verify with kitchen 6. Separate prep area required for severe allergies.", confidence: "high", source: "imported" },
    { station: "waitstaff", category: "menu_info", question: "What are the steak options?", answer: "Smoked Iowa Chop $17.95, Steak Sandwich $15.95, 8oz Sirloin $19.99, 10oz Ribeye $24.99, 16oz Porterhouse $29.99, Prime King $34.99. All steaks come with choice of 2 sides. Cook temps: rare, medium-rare, medium, medium-well, well-done.", confidence: "high", source: "imported" },

    // ===== BBQ ROOM =====
    { station: "bbq_room", category: "process", question: "What is the smoking schedule?", answer: "Brisket: start at 4 AM, 225°F, 12-14 hours. Pulled pork: start at 6 AM, 225°F, 10-12 hours. Ribs: start at 8 AM, 250°F, 5-6 hours. Iowa chops: 2 hours at 225°F then sear. Always use post oak or hickory.", confidence: "high", source: "imported" },
    { station: "bbq_room", category: "recipe", question: "What BBQ items are on the menu?", answer: "Smoked Brisket, Pulled Pork, Smoked Ribs, Smoked Iowa Chop, Smoked Chicken. Available as plates with 2 sides, on sandwiches, on salads, or as pizza toppings. BBQ sauces: house BBQ, spicy BBQ, honey BBQ.", confidence: "high", source: "imported" },
    { station: "bbq_room", category: "equipment", question: "How to maintain the smoker?", answer: "Daily: clean grates, empty ash. Weekly: deep clean interior, check seals, oil hinges. Monthly: inspect thermometer calibration, check gas lines if applicable. Always keep a log of wood usage and temp readings.", confidence: "high", source: "imported" },

    // ===== STORE ROOM =====
    { station: "store_room", category: "vendor", question: "Who are our main food vendors?", answer: "1. PFG (Performance Food Group/RFS Cedar Rapids) — MAIN vendor, 2x/week orders, $2,800-3,400/order. Account 06528, rep Scott Selim. 2. Sysco — specialty items, account 567872. 3. Pepsi — all fountain beverages. 4. Hy-Vee Wine & Spirits — liquor and beer (Ashley orders).", confidence: "high", source: "imported" },
    { station: "store_room", category: "vendor", question: "When do PFG orders come in?", answer: "PFG delivers twice weekly. Orders placed by Tom Dorothy. Typical order: $2,800-3,400. Check delivery against order sheet — verify quantities, check temps on cold items, inspect for damage. Report discrepancies immediately.", confidence: "high", source: "imported" },
    { station: "store_room", category: "location", question: "How is the walk-in organized?", answer: "Top shelf: dairy (cheese, buttermilk, sour cream). Middle shelf: proteins (chicken, beef, pork — raw below cooked). Bottom shelf: produce, dough. Door shelves: sauces, dressings, juices. FIFO always — new stock goes behind old stock.", confidence: "medium", source: "imported" },
    { station: "store_room", category: "process", question: "What is FIFO?", answer: "First In, First Out. When stocking: new product goes BEHIND existing product. When using: always grab from the FRONT. This ensures oldest product is used first, reducing waste and preventing spoilage. Check dates on everything.", confidence: "high", source: "imported" },

    // ===== GENERAL =====
    { station: "general", category: "safety", question: "What is the handwashing procedure?", answer: "20 seconds with soap and warm water. Required: before handling food, after touching raw meat, after using restroom, after touching face/hair, after handling trash, after handling money. Sanitizer is NOT a substitute for handwashing.", confidence: "high", source: "imported" },
    { station: "general", category: "safety", question: "What are the safe food temperatures?", answer: "Hot hold: 140°F minimum. Cold hold: 41°F or below. Chicken internal: 165°F. Ground beef: 155°F. Steaks: 145°F (medium). Reheating: 165°F within 2 hours. Danger zone: 41°F-135°F — food cannot be in this range for more than 4 hours total.", confidence: "high", source: "imported" },
    { station: "general", category: "process", question: "What are the restaurant hours?", answer: "Check current hours — typically: Mon-Thu 11AM-10PM, Fri-Sat 11AM-11PM, Sun 11AM-9PM. Kitchen closes 30 min before. Bar closes at posted time. Brunch hours on Sunday.", confidence: "medium", source: "imported" },
    { station: "general", category: "process", question: "Who do I call if there's an emergency?", answer: "1. 911 for fire/medical/police 2. Mychael Mueller (owner) — for any operational emergency 3. Gavin Thomas (key manager) — if Mychael unavailable 4. For equipment failure: note the issue, inform manager, do NOT attempt repair.", confidence: "high", source: "imported" },
  ];

  for (const entry of entries) {
    await db.insert(schema.knowledgeEntries).values(entry);
  }
  console.log(`  ✅ Seeded ${entries.length} knowledge entries`);
}

async function seedVendorProducts() {
  console.log("📦 Seeding vendor products...");
  const products = [
    // PFG Products (from actual orders)
    { vendorName: "PFG", productName: "Pizza Box 14\" Corrugated", category: "paper", unit: "case", lastPrice: "42.50", parLevel: 5, orderFrequency: "twice_weekly" },
    { vendorName: "PFG", productName: "Mozzarella Cheese Feather Shred", category: "dairy", unit: "case (4/5lb)", lastPrice: "68.90", parLevel: 4, orderFrequency: "twice_weekly" },
    { vendorName: "PFG", productName: "Jalapeno Nacho Sliced", category: "produce", unit: "case (#10 can)", lastPrice: "28.75", parLevel: 2, orderFrequency: "weekly" },
    { vendorName: "PFG", productName: "Mushroom Pieces & Stems", category: "produce", unit: "case (#10 can)", lastPrice: "32.40", parLevel: 2, orderFrequency: "weekly" },
    { vendorName: "PFG", productName: "Vinyl Gloves Medium", category: "paper", unit: "case (10/100ct)", lastPrice: "38.95", parLevel: 3, orderFrequency: "weekly" },
    { vendorName: "PFG", productName: "Can Liner 33 Gallon Black", category: "paper", unit: "case (250ct)", lastPrice: "45.20", parLevel: 2, orderFrequency: "biweekly" },
    { vendorName: "PFG", productName: "Food Release Spray", category: "chemicals", unit: "case (6ct)", lastPrice: "28.50", parLevel: 2, orderFrequency: "monthly" },
    { vendorName: "PFG", productName: "Garlic Toast Frozen", category: "bread", unit: "case", lastPrice: "24.80", parLevel: 3, orderFrequency: "twice_weekly" },
    { vendorName: "PFG", productName: "Breadsticks Frozen", category: "bread", unit: "case", lastPrice: "22.50", parLevel: 3, orderFrequency: "twice_weekly" },
    { vendorName: "PFG", productName: "Hoagie Rolls 8\"", category: "bread", unit: "case (6/12ct)", lastPrice: "35.60", parLevel: 3, orderFrequency: "twice_weekly" },
    { vendorName: "PFG", productName: "Brioche Buns", category: "bread", unit: "case (6/12ct)", lastPrice: "38.90", parLevel: 3, orderFrequency: "twice_weekly" },
    { vendorName: "PFG", productName: "French Fries Straight Cut", category: "frozen", unit: "case (6/5lb)", lastPrice: "42.30", parLevel: 5, orderFrequency: "twice_weekly" },
    { vendorName: "PFG", productName: "Chicken Strips Breaded", category: "frozen", unit: "case (2/5lb)", lastPrice: "52.80", parLevel: 4, orderFrequency: "twice_weekly" },
    { vendorName: "PFG", productName: "Cod Fillets Beer Battered", category: "frozen", unit: "case (10lb)", lastPrice: "68.50", parLevel: 3, orderFrequency: "weekly" },
    { vendorName: "PFG", productName: "Onion Rings Breaded", category: "frozen", unit: "case (6/2.5lb)", lastPrice: "38.40", parLevel: 3, orderFrequency: "weekly" },

    // Sysco Products (from actual order)
    { vendorName: "Sysco", sku: "2388791", productName: "Cheese Mozzarella Low Moisture Part Skim", category: "dairy", unit: "case (8/6#AVG)", lastPrice: "98.76", parLevel: 7, orderFrequency: "weekly", notes: "Arrezzio Imperial brand. Primary pizza cheese." },
    { vendorName: "Sysco", sku: "2548162", productName: "Bacon Bits Real Cooked 0.75in", category: "meat", unit: "case (2/5lb)", lastPrice: "66.49", parLevel: 2, orderFrequency: "weekly", notes: "Sysco Classic brand. For salads, baked potatoes, pizza topping." },
    { vendorName: "Sysco", sku: "1073402", productName: "Bacon Layflat 18-22 Per Lb Smoked", category: "meat", unit: "case (1/15lb)", lastPrice: "64.95", parLevel: 1, orderFrequency: "weekly", notes: "Sysco Reliance brand. For burgers, sandwiches, BLTs." },
    { vendorName: "Sysco", sku: "5072137", productName: "Mushroom Pieces & Stems", category: "produce", unit: "case (6/#10)", lastPrice: "60.45", parLevel: 2, orderFrequency: "weekly", notes: "Arrezzio Classic brand. For pizza, pasta, steaks." },
    { vendorName: "Sysco", sku: "2819458", productName: "Cheese Cheddar Jack Feather Shredded", category: "dairy", unit: "case (4/5lb)", lastPrice: "56.72", parLevel: 1, orderFrequency: "weekly", notes: "Casa Solana Imperial. For nachos, quesadillas, mac & cheese." },
    { vendorName: "Sysco", sku: "7149096", productName: "Buttermilk 1 Percent", category: "dairy", unit: "case (6/.5gal)", lastPrice: "18.79", parLevel: 2, orderFrequency: "weekly", notes: "Louis Kemps brand. For ranch dressing, batter, biscuits." },
    { vendorName: "Sysco", sku: "7278698", productName: "Pizza Crust Parbaked Neapolitan GF 12in", category: "bread", unit: "case (12/12in)", lastPrice: "41.70", parLevel: 1, orderFrequency: "biweekly", notes: "Arrezzio Imperial. Gluten-free option — separate prep required." },

    // Liquor (Iowa ABD pricing)
    { vendorName: "Hy-Vee Wine & Spirits", productName: "Ketel One Vodka 1.75L", category: "liquor", unit: "bottle", lastPrice: "38.99", parLevel: 2, orderFrequency: "weekly" },
    { vendorName: "Hy-Vee Wine & Spirits", productName: "Absolut Citron 750ml", category: "liquor", unit: "bottle", lastPrice: "22.99", parLevel: 1, orderFrequency: "weekly" },
    { vendorName: "Hy-Vee Wine & Spirits", productName: "Makers Mark Bourbon 1.75L", category: "liquor", unit: "bottle", lastPrice: "52.99", parLevel: 2, orderFrequency: "weekly" },
    { vendorName: "Hy-Vee Wine & Spirits", productName: "Woodford Reserve Bourbon 750ml", category: "liquor", unit: "bottle", lastPrice: "38.99", parLevel: 1, orderFrequency: "weekly" },
    { vendorName: "Hy-Vee Wine & Spirits", productName: "Jameson Irish Whiskey 1.75L", category: "liquor", unit: "bottle", lastPrice: "46.99", parLevel: 1, orderFrequency: "weekly" },
    { vendorName: "Hy-Vee Wine & Spirits", productName: "Jose Cuervo Gold 1.75L", category: "liquor", unit: "bottle", lastPrice: "32.99", parLevel: 2, orderFrequency: "weekly" },
    { vendorName: "Hy-Vee Wine & Spirits", productName: "Tanqueray Gin 1.75L", category: "liquor", unit: "bottle", lastPrice: "38.99", parLevel: 1, orderFrequency: "biweekly" },
    { vendorName: "Hy-Vee Wine & Spirits", productName: "Bacardi Superior Rum 1.75L", category: "liquor", unit: "bottle", lastPrice: "24.99", parLevel: 1, orderFrequency: "weekly" },
    { vendorName: "Hy-Vee Wine & Spirits", productName: "Captain Morgan Spiced Rum 1.75L", category: "liquor", unit: "bottle", lastPrice: "28.99", parLevel: 2, orderFrequency: "weekly" },
    { vendorName: "Hy-Vee Wine & Spirits", productName: "Kahlua Coffee Liqueur 750ml", category: "liquor", unit: "bottle", lastPrice: "26.99", parLevel: 1, orderFrequency: "biweekly" },
    { vendorName: "Hy-Vee Wine & Spirits", productName: "Baileys Irish Cream 750ml", category: "liquor", unit: "bottle", lastPrice: "28.99", parLevel: 1, orderFrequency: "biweekly" },

    // Pepsi
    { vendorName: "Pepsi", productName: "Pepsi Fountain Syrup BIB", category: "soda", unit: "BIB", lastPrice: "85.00", parLevel: 3, orderFrequency: "weekly" },
    { vendorName: "Pepsi", productName: "Mountain Dew Fountain Syrup BIB", category: "soda", unit: "BIB", lastPrice: "85.00", parLevel: 2, orderFrequency: "weekly" },
    { vendorName: "Pepsi", productName: "Sierra Mist Fountain Syrup BIB", category: "soda", unit: "BIB", lastPrice: "85.00", parLevel: 2, orderFrequency: "weekly" },
  ];

  for (const product of products) {
    await db.insert(schema.vendorProducts).values(product);
  }
  console.log(`  ✅ Seeded ${products.length} vendor products`);
}

async function seedRewards() {
  console.log("🎁 Seeding rewards...");
  const rewardDefs = [
    { tier: "bronze", name: "Shift Meal", description: "Free meal on your next shift — any menu item up to $15", pointsCost: 100, type: "meal" },
    { tier: "bronze", name: "Free Appetizer", description: "Any appetizer on the house for you and a friend", pointsCost: 75, type: "meal" },
    { tier: "bronze", name: "Free Dessert", description: "Any dessert item on the house", pointsCost: 50, type: "meal" },
    { tier: "silver", name: "N86 T-Shirt", description: "Never 86'd branded crew t-shirt", pointsCost: 250, type: "merch" },
    { tier: "silver", name: "Priority Shift Pick", description: "First pick on next week's schedule — choose your preferred shifts", pointsCost: 300, type: "schedule" },
    { tier: "silver", name: "N86 Hat", description: "Never 86'd branded snapback hat", pointsCost: 200, type: "merch" },
    { tier: "gold", name: "N86 Hoodie", description: "Never 86'd branded hoodie — premium quality", pointsCost: 500, type: "merch" },
    { tier: "gold", name: "Double Points Day", description: "Earn 2x points on your next shift", pointsCost: 400, type: "schedule" },
    { tier: "platinum", name: "$25 Gift Card", description: "$25 gift card of your choice (Amazon, Walmart, etc.)", pointsCost: 1000, type: "gift_card" },
    { tier: "platinum", name: "Bring a Friend Meal", description: "Free meal for you and a guest — any menu items", pointsCost: 800, type: "meal" },
    { tier: "diamond", name: "Half-Day Paid", description: "4 hours paid time off — use anytime within 30 days", pointsCost: 2500, type: "time_off" },
    { tier: "legend", name: "$100 Cash Bonus", description: "Cash bonus for legendary performance — paid next paycheck", pointsCost: 5000, type: "cash" },
  ];

  for (const r of rewardDefs) {
    await db.insert(schema.rewards).values(r);
  }
  console.log(`  ✅ Seeded ${rewardDefs.length} rewards`);
}

async function seedAchievements() {
  console.log("🏆 Seeding achievement definitions...");
  const defs = [
    { slug: "rookie", name: "Rookie", description: "Complete 5 shifts", badge: "🟢", category: "onboarding", thresholdType: "cumulative", thresholdValue: 5, bonusPoints: 25, difficulty: "easy" },
    { slug: "iron_streak", name: "Iron Streak", description: "14-day consecutive on-time streak", badge: "🔥", category: "reliability", thresholdType: "consecutive", thresholdValue: 14, resetEvent: "late_clock_in", bonusPoints: 50, difficulty: "medium" },
    { slug: "clean_hands", name: "Clean Hands", description: "Zero voids in a full 30-day period", badge: "💎", category: "quality", thresholdType: "window", thresholdValue: 30, windowDays: 30, resetEvent: "void_created", bonusPoints: 75, difficulty: "hard" },
    { slug: "machine", name: "Machine", description: "Complete 100 checklists", badge: "⚙️", category: "reliability", thresholdType: "cumulative", thresholdValue: 100, bonusPoints: 50, difficulty: "medium" },
    { slug: "voice", name: "Voice", description: "Submit 50 feedback entries", badge: "🎤", category: "engagement", thresholdType: "cumulative", thresholdValue: 50, bonusPoints: 50, difficulty: "medium" },
    { slug: "mentor", name: "Mentor", description: "Train 3 new employees on a station", badge: "🎓", category: "leadership", thresholdType: "cumulative", thresholdValue: 3, bonusPoints: 75, difficulty: "hard" },
    { slug: "ambassador", name: "Ambassador", description: "Post 10 social media posts tagged to the restaurant", badge: "📱", category: "engagement", thresholdType: "cumulative", thresholdValue: 10, bonusPoints: 50, difficulty: "medium" },
    { slug: "night_owl", name: "Night Owl", description: "Work 50 closing shifts", badge: "🦉", category: "longevity", thresholdType: "cumulative", thresholdValue: 50, bonusPoints: 50, difficulty: "medium" },
    { slug: "early_bird", name: "Early Bird", description: "Work 50 opening shifts", badge: "🐦", category: "longevity", thresholdType: "cumulative", thresholdValue: 50, bonusPoints: 50, difficulty: "medium" },
    { slug: "key_holder", name: "Key Holder", description: "Promoted to key employee status", badge: "🔑", category: "leadership", thresholdType: "milestone", thresholdValue: 1, bonusPoints: 100, difficulty: "hard" },
    { slug: "centurion", name: "Centurion", description: "Work 100 total shifts", badge: "💯", category: "longevity", thresholdType: "cumulative", thresholdValue: 100, bonusPoints: 75, difficulty: "medium" },
    { slug: "veteran", name: "Veteran", description: "1 year of active employment", badge: "⭐", category: "longevity", thresholdType: "cumulative", thresholdValue: 365, bonusPoints: 150, difficulty: "legendary" },
    { slug: "shutterbug", name: "Shutterbug", description: "Submit 25 verified photos", badge: "📸", category: "engagement", thresholdType: "cumulative", thresholdValue: 25, bonusPoints: 50, difficulty: "medium" },
    { slug: "brain_builder", name: "Brain Builder", description: "Contribute 10 approved knowledge corrections", badge: "🧠", category: "engagement", thresholdType: "cumulative", thresholdValue: 10, bonusPoints: 75, difficulty: "hard" },
  ];

  for (const def of defs) {
    await db.insert(schema.achievementDefinitions).values(def);
  }
  console.log(`  ✅ Seeded ${defs.length} achievement definitions`);
}

async function seedPhotoMissions() {
  console.log("📸 Seeding photo missions...");
  const missions = [
    { name: "Walk-In Inventory Snapshot", description: "Photo every shelf in the walk-in cooler. Help the brain learn where everything is stored.", category: "walk_in", pointsPerPhoto: 5, bonusPoints: 25, targetPhotoCount: 10 },
    { name: "Station Setup Check", description: "Photo your station at the start of shift. Shows the brain what a properly set up station looks like.", category: "station_setup", pointsPerPhoto: 5, bonusPoints: 15, targetPhotoCount: 8 },
    { name: "Invoice Capture Sprint", description: "Photo every invoice that comes in this week. The brain extracts prices and builds vendor intelligence.", category: "invoice", pointsPerPhoto: 10, bonusPoints: 50, targetPhotoCount: 10 },
    { name: "Equipment Health Check", description: "Photo all major equipment. The brain tracks condition over time and flags maintenance needs.", category: "equipment", pointsPerPhoto: 5, bonusPoints: 20, targetPhotoCount: 12 },
    { name: "Prep Station Documentation", description: "Photo your prep work — portioning, mise en place, batch prep. Teaches the brain what correct prep looks like.", category: "prep", pointsPerPhoto: 5, bonusPoints: 15, targetPhotoCount: 8 },
    { name: "Plate Presentation Gallery", description: "Photo finished plates before they go out. Builds a visual standard for every menu item.", category: "plate", pointsPerPhoto: 5, bonusPoints: 20, targetPhotoCount: 15 },
  ];

  for (const mission of missions) {
    await db.insert(schema.photoMissions).values(mission);
  }
  console.log(`  ✅ Seeded ${missions.length} photo missions`);
}

async function seedBriefingMemories() {
  console.log("💭 Seeding briefing memories...");
  const memories = [
    { factType: "event_pattern", fact: "Friday nights average 40% more revenue than weekdays. Staff accordingly — need 2 extra on bar, 1 extra on fry line.", relevanceScore: 90 },
    { factType: "event_pattern", fact: "4-7 PM generates 40% of daily revenue in just 3 hours. All hands on deck during this window.", relevanceScore: 85 },
    { factType: "event_pattern", fact: "2-3 PM is the dead zone — labor bleeds here. Consider staggered breaks and prep tasks during this window.", relevanceScore: 75 },
    { factType: "event_pattern", fact: "10 PM-midnight runs 160%+ labor cost. Reduce to skeleton crew by 10:15 PM on weeknights.", relevanceScore: 80 },
    { factType: "staff_pattern", fact: "Moe Thomas has the highest comp rate at $128.59/month — 22% of total monthly leakage. Monitor closely.", relevanceScore: 70 },
    { factType: "vendor_change", fact: "PFG is the primary food vendor. Orders 2x/week, $2,800-3,400 per order. Account 06528, rep Scott Selim.", relevanceScore: 60 },
    { factType: "seasonal", fact: "Iowa State football Saturdays drive 2x normal traffic. Pre-prep extra wings, pizza dough, and stock extra beer.", relevanceScore: 65 },
    { factType: "equipment_issue", fact: "Fryer oil should be changed every 3-4 days. Filter daily at close. Track on kitchen whiteboard.", relevanceScore: 50 },
  ];

  for (const memory of memories) {
    await db.insert(schema.briefingMemory).values(memory);
  }
  console.log(`  ✅ Seeded ${memories.length} briefing memories`);
}

async function main() {
  console.log("🚀 Starting AI-Native Intelligence Layer seed...\n");
  try {
    await seedKnowledge();
    await seedVendorProducts();
    await seedRewards();
    await seedAchievements();
    await seedPhotoMissions();
    await seedBriefingMemories();
    console.log("\n✅ All intelligence layer data seeded successfully!");
  } catch (error) {
    console.error("❌ Seed failed:", error);
  }
  process.exit(0);
}

main();
