/**
 * CTAP Knowledge Brain Seed — Community Tap & Pizza
 * Seeds the knowledge_entries, achievement_definitions, rewards,
 * vendor_products, order_guide_templates, and photo_missions tables.
 *
 * Run: node seed-knowledge.mjs
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const db = await mysql.createConnection(process.env.DATABASE_URL);

// Helper to insert a knowledge entry
async function k(station, category, question, answer, tags = [], confidence = "high", source = "imported") {
  await db.execute(
    `INSERT INTO knowledge_entries (station, category, question, answer, confidence, source, tags, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [station, category, question, answer, confidence, source, JSON.stringify(tags)]
  );
}

// Helper to insert a vendor product
async function vp(vendorName, sku, productName, category, unit, lastPrice, parLevel, orderFrequency, notes) {
  await db.execute(
    `INSERT INTO vendor_products (vendorName, sku, productName, category, unit, lastPrice, parLevel, orderFrequency, notes, active, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, true, NOW(), NOW())`,
    [vendorName, sku, productName, category, unit, lastPrice, parLevel, orderFrequency, notes]
  );
}

console.log("🧠 Seeding CTAP Knowledge Brain...\n");

// ============================================================
// STATION: PIZZA LINE
// ============================================================
console.log("🍕 Pizza Line knowledge...");

await k("pizza_line", "recipe", "How do I make pizza dough?", "Use GP928 High Gluten Flour (50lb bag). Standard batch: 50lb flour, water at 105°F, yeast, salt, sugar, olive oil. Mix in Hobart mixer 8-10 min on speed 2. Let rise 1 hour covered. Portion: Mini=8oz, Small=12oz, Medium=16oz, Large=22oz. Stretch by hand, never use rolling pin. Dough lasts 3 days refrigerated.", ["dough", "flour", "recipe", "prep"]);

await k("pizza_line", "recipe", "What goes on the Community Special pizza?", "Community Special: Pizza sauce, mozzarella, pepperoni, Italian sausage, mushrooms, green peppers, onions, black olives. This is the #1 seller. Prices: Mini $10.99, Small $14.99, Medium $20.99, Large $24.99.", ["community_special", "pizza", "menu"]);

await k("pizza_line", "recipe", "What goes on the Meatlovers pizza?", "Meatlovers: Pizza sauce, mozzarella, pepperoni, Italian sausage, bacon bits, ham, ground beef. Prices: Mini $10.99, Small $14.99, Medium $20.99, Large $24.99.", ["meatlovers", "pizza", "menu"]);

await k("pizza_line", "recipe", "What goes on the Taco pizza?", "Taco Pizza: Refried beans (instead of sauce), mozzarella, cheddar jack, seasoned ground beef, lettuce, tomato, black olives, sour cream drizzle. Top with crushed tortilla chips after baking. Prices: Mini $10.99, Small $14.99, Medium $20.99, Large $24.99.", ["taco", "pizza", "menu"]);

await k("pizza_line", "recipe", "What goes on the Philly pizza?", "Philly Pizza: Garlic butter base (no red sauce), mozzarella, provolone, shaved steak, green peppers, onions, mushrooms. Prices: Mini $10.99, Small $14.99, Medium $20.99, Large $24.99.", ["philly", "pizza", "menu"]);

await k("pizza_line", "recipe", "What goes on the C-Mac pizza?", "C-Mac Pizza: Garlic butter base, mozzarella, mac & cheese (use J2724 elbow macaroni), bacon bits, cheddar jack. Prices: Mini $10.99, Small $14.99, Medium $20.99, Large $24.99.", ["cmac", "pizza", "mac_cheese", "menu"]);

await k("pizza_line", "recipe", "What goes on the Buffalo Chicken pizza?", "Buffalo Chicken Pizza: Buffalo sauce base (F6357), mozzarella, grilled chicken, onions, drizzle ranch on top after baking. Prices: Mini $10.99, Small $14.99, Medium $20.99, Large $24.99.", ["buffalo_chicken", "pizza", "menu"]);

await k("pizza_line", "recipe", "What goes on the Crab Rangoon pizza?", "Crab Rangoon Pizza: Garlic butter base, mozzarella, cream cheese (N1462) dollops, surimi crab meat (57778 Hidden Bay), green onions, drizzle sweet chili sauce after baking. Prices: Mini $10.99, Small $14.99, Medium $20.99, Large $24.99. Crab meat is expensive — portion carefully.", ["crab_rangoon", "pizza", "menu"]);

await k("pizza_line", "recipe", "What goes on the Brisket pizza?", "Brisket Pizza: BBQ sauce base, mozzarella, smoked brisket (chopped), red onion, pickled jalapenos. Prices: Mini $10.99, Small $14.99, Medium $20.99, Large $24.99.", ["brisket", "pizza", "bbq", "menu"]);

await k("pizza_line", "recipe", "What goes on the Pickle Wrap pizza?", "Pickle Wrap Pizza: Cream cheese base, mozzarella, deli ham, dill pickle spears (chopped), everything bagel seasoning on top. Iowa specialty — very popular. Prices: Mini $10.99, Small $14.99, Medium $20.99, Large $24.99.", ["pickle_wrap", "pizza", "iowa", "menu"]);

await k("pizza_line", "recipe", "What goes on the BBQ Jam pizza?", "BBQ Jam Pizza: BBQ sauce base, mozzarella, bacon, caramelized onions, jalapenos, drizzle pepper jelly/jam after baking. Prices: Mini $10.99, Small $14.99, Medium $20.99, Large $24.99.", ["bbq_jam", "pizza", "menu"]);

await k("pizza_line", "process", "What are the pizza sizes and how many slices?", "Mini (10\"): 6 slices, personal size. Small (12\"): 8 slices, 1-2 people. Medium (14\"): 10 slices, 2-3 people. Large (16\"): 12 slices, 3-4 people. Use matching pizza circles: PB996 (10\"), PC004 (14\"), PC006 (16\"). Use matching boxes: TH428 (10\"), TH430 (14\"), TH432 (16\").", ["pizza_sizes", "slices", "boxes"]);

await k("pizza_line", "process", "What temperature is the pizza oven?", "Pizza oven runs at 475-500°F. Cook times: Mini 8-10 min, Small 10-12 min, Medium 12-14 min, Large 14-16 min. GF crusts (Sysco 7278698) cook faster — check at 8 min. Rotate halfway through for even browning. Use 91430 silicone liners on the screen.", ["oven", "temperature", "cook_time"]);

await k("pizza_line", "process", "How do I handle a gluten-free pizza order?", "Use Sysco GF crusts (SKU 7278698, 12\" parbaked Neapolitan). These are PRE-BAKED so cook time is shorter (8-10 min). Use CLEAN cutting board and pizza cutter — NO cross-contamination. Change gloves. Use separate sauce ladle if possible. Mark the box 'GF'. If customer asks about allergens, always say 'prepared in a kitchen that handles gluten' — we cannot guarantee 100% GF.", ["gluten_free", "allergen", "safety"]);

await k("pizza_line", "location", "Where is the pizza sauce stored?", "Pizza sauce (San Benito 24482, 6/#10 cans): Unopened cases in dry storage, bottom shelf near pizza supplies. Opened cans in walk-in cooler, top shelf left side, covered with plastic wrap. Label with open date. Use within 5 days of opening. We go through 2-4 cases per week.", ["pizza_sauce", "storage", "walk_in"]);

await k("pizza_line", "location", "Where are the pizza boxes?", "Pizza boxes stored in dry storage, stacked by size: 16\" (TH432) on bottom, 14\" (TH430) middle, 10\" (TH428) top. Keep backup stack near pizza station for quick access. Community Tap branded. Reorder when down to 1 case of any size.", ["pizza_boxes", "storage", "dry_storage"]);

// ============================================================
// STATION: FRY LINE
// ============================================================
console.log("🍟 Fry Line knowledge...");

await k("fry_line", "process", "How often do I change the fryer oil?", "Change fryer oil (DV470 Soy Clear Fry, 35lb jugs) every 3-4 days or when it gets dark/foamy. Filter daily at end of shift. We use 2-4 cases per week. Oil is stored in dry storage near the back door. NEVER pour hot oil — let it cool first. Use the oil caddy for disposal.", ["fryer_oil", "maintenance", "safety"]);

await k("fry_line", "process", "What are the fry times for appetizers?", "Fry times at 350°F: Cheese Balls 3-4 min (golden brown). Onion Rings 2-3 min. Mozzarella Sticks 2-3 min (watch — they burst if overcooked). Fried Pickles 2-3 min. Jalapeno Poppers 3-4 min. Breaded Mushrooms (G6232) 3-4 min. Green Beans (RV370) 2-3 min. Chicken Gizzards (F7438) 4-5 min. Pretzel Bites (CR782) 2-3 min (just warming — they're prebaked).", ["fry_times", "appetizers", "temperature"]);

await k("fry_line", "process", "What are the fry times for fries?", "Fry times at 350°F: French Fries 3-4 min. Waffle Fries 3-4 min. Sweet Potato Fries (31836) 3-4 min (these burn faster — watch closely). All fries should be golden, not dark brown. Shake basket halfway through. Season immediately after pulling — salt sticks better when hot.", ["fries", "fry_times", "temperature"]);

await k("fry_line", "process", "What are the chicken strip cook times and flavors?", "Chicken strips: Fry at 350°F for 5-6 min until internal temp 165°F. 6 flavors available: Original (plain), Smoky BBQ, Garlic Herb, Buffalo (use F6357 sauce), Bayou Cajun (use CE729 seasoning), Caribbean Jerk. Toss in sauce AFTER frying. 3pc basket $8.95, 5pc basket $12.95. Kids strips $7.99 (3pc, original only).", ["chicken_strips", "flavors", "baskets"]);

await k("fry_line", "process", "How do I make the fish basket?", "Fish basket: Battered fish fillets, fry at 350°F for 5-6 min until golden and internal 145°F. Serve with waffle fries, coleslaw, tartar sauce, lemon wedge. Price: $13.99. Friday is biggest fish day.", ["fish", "basket", "menu"]);

await k("fry_line", "process", "How do I make the shrimp basket?", "Shrimp basket: Breaded shrimp, fry at 350°F for 3-4 min until golden and curled. Serve with waffle fries, coleslaw, cocktail sauce, lemon wedge. Price: $14.99. Don't overcook — they get rubbery.", ["shrimp", "basket", "menu"]);

await k("fry_line", "equipment", "What do I do if the fryer isn't heating?", "Check: 1) Is it plugged in / gas on? 2) Check thermostat setting (should be 350°F). 3) Check pilot light if gas. 4) Check high-limit reset button (red button on back). If none of that works, tell a manager — do NOT try to fix electrical. Use the other fryer and adjust cook order priority.", ["fryer", "troubleshooting", "equipment"]);

await k("fry_line", "safety", "What do I do if there's a grease fire?", "NEVER use water on a grease fire. 1) Turn off the fryer. 2) Cover with the metal lid if safe to do so. 3) Use the Class K fire extinguisher (mounted on wall near fry station, red with K label). 4) If it spreads, evacuate and call 911. The Ansul suppression system above the fryers should activate automatically for large fires.", ["fire", "safety", "emergency"]);

// ============================================================
// STATION: BAR
// ============================================================
console.log("🍸 Bar knowledge...");

await k("bar", "recipe", "How do I make a Moscow Mule?", "Moscow Mule: 1.5oz Ketel One vodka, 0.5oz fresh lime juice, top with ginger beer. Serve in copper mug with ice, garnish with lime wheel and mint sprig. $9-11 depending on vodka choice.", ["moscow_mule", "cocktail", "vodka"]);

await k("bar", "recipe", "How do I make a Margarita?", "House Margarita: 1.5oz Jose Cuervo tequila, 1oz margarita mix, 0.5oz Cointreau, fresh lime juice. Shake with ice, strain into salt-rimmed rocks glass. For frozen: blend with ice. Premium: use Margaritaville tequila. Cadillac: float Gran Marnier on top.", ["margarita", "cocktail", "tequila"]);

await k("bar", "recipe", "How do I make an Old Fashioned?", "Old Fashioned: 2oz Makers Mark bourbon (or Woodford Reserve for premium), 2 dashes Angostura bitters, 1 sugar cube (or 0.5oz simple syrup), splash of water. Muddle sugar and bitters, add bourbon and ice, stir. Garnish with orange peel and cherry. Serve in rocks glass.", ["old_fashioned", "cocktail", "bourbon"]);

await k("bar", "recipe", "How do I make a Mojito?", "Mojito: 1.5oz Bacardi white rum, 1oz fresh lime juice, 0.75oz simple syrup, 6-8 fresh mint leaves. Muddle mint gently with lime and syrup (don't shred it). Add rum and ice, top with club soda. Garnish with mint sprig and lime wheel. Serve in English highball glass.", ["mojito", "cocktail", "rum"]);

await k("bar", "recipe", "How do I make an Espresso Martini?", "Espresso Martini: 1.5oz vodka, 1oz Kahlua, 1oz fresh espresso (cooled). Shake vigorously with ice for 15 seconds (this creates the foam). Double strain into martini glass. Garnish with 3 coffee beans on the foam.", ["espresso_martini", "cocktail", "vodka", "kahlua"]);

await k("bar", "recipe", "How do I make a Long Island Iced Tea?", "Long Island: 0.5oz vodka, 0.5oz gin (Tanqueray), 0.5oz rum (Bacardi), 0.5oz tequila (Jose Cuervo), 0.5oz Cointreau, 1oz sweet & sour mix, splash of Pepsi. Build in pint glass with ice. Garnish with lemon wedge. Strong drink — limit 2 per customer.", ["long_island", "cocktail"]);

await k("bar", "recipe", "How do I make a Rusty Nail?", "Rusty Nail: 1.5oz Scotch whisky, 0.75oz Drambuie. Build in rocks glass over ice, stir gently. Garnish with lemon twist. Classic cocktail — mostly ordered by older regulars.", ["rusty_nail", "cocktail", "scotch", "drambuie"]);

await k("bar", "recipe", "How do I make a Cosmopolitan?", "Cosmopolitan: 1.5oz Absolut Citron vodka, 0.75oz Cointreau, 0.75oz cranberry juice, 0.5oz fresh lime juice. Shake with ice, strain into martini glass. Garnish with lime wheel or orange twist.", ["cosmopolitan", "cocktail", "vodka"]);

await k("bar", "recipe", "How do I make a French 75?", "French 75: 1oz gin (Hendricks or Bombay Sapphire), 0.5oz fresh lemon juice, 0.5oz simple syrup. Shake with ice, strain into champagne flute, top with champagne. Garnish with lemon twist.", ["french_75", "cocktail", "gin", "champagne"]);

await k("bar", "recipe", "How do I make a Whiskey Sour?", "Whiskey Sour: 2oz Makers Mark bourbon, 1oz fresh lemon juice, 0.75oz simple syrup, optional egg white for foam. Dry shake (no ice) first if using egg white, then shake with ice. Strain into rocks glass. Garnish with cherry and orange slice.", ["whiskey_sour", "cocktail", "bourbon"]);

await k("bar", "process", "What's the bar opening checklist?", "Bar Opening: 1) Check all coolers are at temp (beer 36-38°F). 2) Cut fruit — limes, lemons, oranges (enough for the shift). 3) Fill ice bins. 4) Check juice levels (cranberry, OJ, pineapple, grapefruit). 5) Stock beer cooler from walk-in. 6) Check syrup levels (simple, thyme, honey, cucumber). 7) Verify garnish containers are full. 8) Wipe down bar top and speed rail. 9) Check POS is on and drawer is counted.", ["opening", "checklist", "bar_setup"]);

await k("bar", "process", "What's the bar closing checklist?", "Bar Closing: 1) Last call 30 min before close. 2) Clear all tabs — NO open tabs overnight. 3) Wash all glassware, run through sanitizer. 4) Wipe down bar top, speed rail, back bar. 5) Cover all juice containers, refrigerate. 6) Empty ice bins, clean wells. 7) Restock beer cooler for tomorrow. 8) Count drawer, run POS end-of-day report. 9) Take trash out. 10) Lock liquor cabinet.", ["closing", "checklist", "bar_cleanup"]);

await k("bar", "process", "How do I handle an ID check?", "Check ID for anyone who looks under 35. Iowa legal drinking age is 21. Accept: valid driver's license, state ID, passport, military ID. Reject: expired IDs, vertical IDs from other states (may be under 21), anything that looks altered. If unsure, ask a manager. NEVER serve someone without valid ID if they look young. You are personally liable — Iowa DRAM shop law.", ["id_check", "legal", "alcohol", "safety"]);

await k("bar", "vendor", "How does Iowa liquor pricing work?", "Iowa is a CONTROL STATE. The Iowa ABD (Alcoholic Beverages Division) sets the wholesale price for ALL spirits — up to 50% markup on supplier cost (Iowa Code §123.24). Every retailer pays the same state price. We buy through Hy-Vee Wine & Spirits. The gap between ABD price and what Hy-Vee charges = their markup. ABD prices are public: https://data.iowa.gov. Wine and beer are NOT state-controlled — those go through private distributors.", ["iowa", "liquor", "pricing", "abd", "control_state"]);

await k("bar", "vendor", "What is the Southern Glazer's case and why does it matter?", "The FTC sued Southern Glazer's Wine & Spirits (the #1 US distributor, $24B+ revenue) in Dec 2024 for illegal price discrimination under the Robinson-Patman Act. They charged small retailers drastically higher prices than chains like Total Wine/Costco for identical bottles. Case is ongoing in federal court. For us: spirits are protected (Iowa control state = same price for everyone), but WINE distribution is private and we may be affected. Ashley should track wine costs and compare against what chains pay.", ["southern_glazers", "ftc", "pricing", "wine", "legal"]);

// ============================================================
// STATION: WAITSTAFF
// ============================================================
console.log("🍽️ Waitstaff knowledge...");

await k("waitstaff", "menu_info", "What are our wing flavors and prices?", "Wings come in 6pc ($10.99) or 12pc ($17.99). 11 sauces: Buffalo, Korean BBQ, Sweet Chili, Spicy Garlic, Spicy BBQ, Honey BBQ, Nashville Hot, Sriracha Bourbon, Garlic Parmesan, Sassy Orange, Wow Wow Sauce. Extra sauce $0.99. Can mix 2 flavors on 12pc order. Served with celery and ranch or blue cheese.", ["wings", "flavors", "menu", "pricing"]);

await k("waitstaff", "menu_info", "What are the steak options and prices?", "Steaks: 8oz Sirloin $17.99, 10oz Ribeye $27.95 (lip-on Angus), 16oz Porterhouse $30.99, Smoked Iowa Chop (pork) $18.95, Steak Sandwich $14.95, Prime King (special, market price). All steaks come with choice of 2 sides. Ask for temp: rare, medium-rare, medium, medium-well, well-done. Iowa Chop is smoked — no temp choice.", ["steaks", "menu", "pricing"]);

await k("waitstaff", "menu_info", "What sides are available?", "Sides ($4.99-$5.99): French Fries, Waffle Fries, Sweet Potato Fries, Baked Potato (loaded +$1), Mac & Cheese, Cottage Cheese, Coleslaw, Cornbread, BBQ Baked Beans, Side Salad, Cup of Soup. Kids meals include fries. Pasta dishes include garlic bread.", ["sides", "menu", "pricing"]);

await k("waitstaff", "menu_info", "What are the kids menu options?", "Kids Menu (all $7.99, includes fries): Hamburger, Cheeseburger, Grilled Cheese, Chicken Strips (3pc original), Mini Cheese Pizza. Ages 12 and under. No substitutions on sides for kids meals.", ["kids_menu", "pricing"]);

await k("waitstaff", "allergen", "What items are gluten-free?", "GF options: Salads (no croutons), GF pizza crust available (12\" only, +$3), grilled steaks with GF sides (baked potato, coleslaw, cottage cheese), wings (check sauce — most are GF but verify). Fries are NOT guaranteed GF (shared fryer). ALWAYS tell customer: 'Prepared in a kitchen that handles gluten — we cannot guarantee zero cross-contamination.' When in doubt, ask the kitchen.", ["gluten_free", "allergen", "dietary"]);

await k("waitstaff", "allergen", "What about dairy allergies?", "Almost everything has dairy (cheese, butter, ranch, sour cream). Safest options: plain grilled chicken, plain burger no cheese, salad with oil & vinegar, wings with Buffalo or BBQ sauce (check labels). Pizza dough contains no dairy but all pizzas have cheese. Fries are dairy-free. ALWAYS verify with kitchen for specific items.", ["dairy", "allergen", "dietary"]);

await k("waitstaff", "process", "How do I handle a large party (8+)?", "Large parties (8+): 1) Notify kitchen ASAP — they need prep time. 2) Auto-gratuity of 18% is added for parties of 8+. 3) Take drink orders first, appetizers second, entrees third. 4) Suggest family-style pizzas and apps to simplify. 5) Separate checks — ask upfront, not at the end. 6) If 15+, may need to pre-order. Call ahead parties should be noted in the book.", ["large_party", "service", "gratuity"]);

await k("waitstaff", "process", "What's the table turn process?", "After guests leave: 1) Bus immediately — don't let dirty tables sit. 2) Wipe table and seats with sanitizer. 3) Reset: napkin roll with silverware, clean menus, condiments (ketchup, mustard, salt, pepper). 4) Check floor under table for debris. 5) Flip the table sign or notify host. Goal: 5 minutes from departure to ready.", ["table_turn", "bussing", "service"]);

// ============================================================
// STATION: BBQ ROOM
// ============================================================
console.log("🔥 BBQ Room knowledge...");

await k("bbq_room", "process", "How do I smoke brisket?", "Brisket: Season with salt, pepper, garlic powder. Smoke at 225°F for 12-14 hours (fat side up). Wrap in butcher paper at 165°F internal (the stall). Pull at 200-205°F internal when probe slides in like butter. Rest minimum 1 hour in cooler wrapped in towels. Slice against the grain. Used in: Brisket pizza, brisket salad, brisket sandwich.", ["brisket", "smoking", "bbq", "prep"]);

await k("bbq_room", "process", "How do I smoke the Iowa Chop?", "Iowa Chop (thick-cut pork chop): Brine overnight in salt/sugar/water solution. Season with house rub. Smoke at 250°F until internal hits 145°F (about 2-3 hours depending on thickness). Rest 10 min. Serve with 2 sides. Price: $18.95. This is a signature item — Iowa pride.", ["iowa_chop", "pork", "smoking", "bbq"]);

await k("bbq_room", "process", "How do I smoke pulled pork?", "Pulled Pork: Pork butt/shoulder, season with house rub. Smoke at 225°F for 10-12 hours. Wrap at 165°F internal. Pull at 200-205°F. Rest 1 hour, then pull/shred with forks or claws. Mix with BBQ sauce. Used in: Smoked pork salad, BBQ pulled pork sandwich, BBQ items.", ["pulled_pork", "smoking", "bbq", "prep"]);

await k("bbq_room", "equipment", "How do I maintain the smoker?", "After each use: 1) Clean grates with wire brush while warm. 2) Empty ash/grease trap. 3) Check pellet/wood chip levels for next use. Before each use: 1) Preheat 30 min. 2) Check temp probe accuracy with boiling water (212°F). 3) Ensure water pan is filled. Weekly: deep clean interior, check seals, oil hinges.", ["smoker", "maintenance", "equipment"]);

// ============================================================
// STATION: STORE ROOM
// ============================================================
console.log("📦 Store Room knowledge...");

await k("store_room", "process", "How do I receive a PFG delivery?", "PFG delivers Tue and Fri (ordered Mon and Thu). 1) Check delivery against order sheet — count every case. 2) Check temps: frozen items should be 0°F or below, refrigerated 41°F or below. 3) Reject anything with broken seals, damaged packaging, or wrong temp. 4) Sign delivery receipt ONLY after verifying. 5) Put away immediately — cold items first. 6) FIFO: new stock goes BEHIND old stock.", ["pfg", "delivery", "receiving", "fifo"]);

await k("store_room", "process", "What is FIFO and why does it matter?", "FIFO = First In, First Out. When stocking shelves: new product goes BEHIND existing product. This ensures older product gets used first, reducing waste and preventing expired items from hiding in the back. Label everything with received date. Check dates during every delivery. This is a health code requirement.", ["fifo", "food_safety", "storage"]);

await k("store_room", "location", "Where does cheese go in the walk-in?", "Walk-in cooler cheese storage: Top shelf, left side. Mozzarella blocks (NH050) take the most space — stack cases 2 high max. Shredded bags (NH746, NJ366, GD702) on the shelf next to blocks. Sliced cheese (Swiss FA568, Provolone NJ368) in smaller section. Cream cheese (N1462) separate. All cheese: 36-40°F. Use within 7 days of opening.", ["cheese", "walk_in", "storage", "location"]);

await k("store_room", "location", "Where does meat go in the walk-in?", "Walk-in cooler meat storage: Bottom shelf (prevents drip contamination). Burger patties (NH744) stacked by date. Bacon (FA310) next to patties. Chicken strips in freezer, not walk-in. Steaks (ribeye HM418, sirloin, porterhouse) on separate tray with date labels. Brisket and pulled pork in cambros with lids. All meat: 32-40°F.", ["meat", "walk_in", "storage", "location"]);

await k("store_room", "location", "Where are dry goods stored?", "Dry storage room (behind kitchen): Flour (GP928, 50lb bags) on bottom shelf — heavy. Pizza sauce (24482) cases near flour. Canned goods (mushrooms, olives, beans, pineapple) on middle shelves. Paper goods (boxes, gloves, napkins, liners) on top shelves. Fryer oil (DV470) near back door for easy disposal. Chips (DT164, TB298) on top shelf. Keep everything 6 inches off floor per health code.", ["dry_storage", "location", "organization"]);

await k("store_room", "process", "How do I do inventory count?", "Weekly inventory (Sunday night or Monday morning before ordering): 1) Walk-in cooler: count all cheese cases, meat, produce, dairy. 2) Freezer: count fries, apps, frozen items. 3) Dry storage: count flour bags, sauce cases, paper goods, oil jugs. 4) Bar: count liquor bottles (full, half, quarter), beer cases, wine bottles. Write counts on the inventory sheet. Compare to par levels. Order the difference.", ["inventory", "counting", "ordering"]);

// ============================================================
// POS KNOWLEDGE (PDQ POS)
// ============================================================
console.log("💻 POS Knowledge (PDQ POS)...");

await k("general", "process", "How do I ring up a pizza order on the POS?", "PDQ POS Pizza: 1) Tap 'Pizza' category. 2) Select size (Mini/Small/Medium/Large). 3) Select specialty pizza name OR 'Build Your Own'. 4) For BYO: select toppings from the modifier screen — each extra topping has a price. 5) For GF crust: select 'Gluten Free' modifier (+$3). 6) Half-and-half: ring as the more expensive specialty, add note for kitchen. 7) Send to kitchen printer.", ["pos", "pizza", "ordering", "pdq"]);

await k("general", "process", "How do I ring up a tab on the POS?", "PDQ POS Tabs: 1) Start new tab: tap 'New Tab', swipe/scan customer's card (or enter name for cash tabs). 2) Add items as they order. 3) To add to existing tab: find tab by name/card, tap it, add items. 4) To close tab: pull up tab, tap 'Close', select payment method. 5) Print receipt. NEVER leave tabs open overnight — close all tabs at end of shift. If customer leaves without paying, tell manager immediately.", ["pos", "tabs", "payment", "pdq"]);

await k("general", "process", "How do I process a void on the POS?", "PDQ POS Void: 1) Find the order/tab. 2) Select the item to void. 3) Tap 'Void Item'. 4) SELECT A REASON (customer changed mind, wrong item, kitchen error, etc.). 5) Manager approval may be required for voids over $20. 6) The void is logged and tracked — excessive voids trigger alerts. NEVER void and re-ring to move items between tabs — that looks like fraud.", ["pos", "void", "process", "pdq"]);

await k("general", "process", "How do I process a comp on the POS?", "PDQ POS Comp: 1) Find the order. 2) Select item(s) to comp. 3) Tap 'Comp'. 4) Select reason (manager comp, quality issue, regular customer, employee meal). 5) Manager must approve all comps. 6) Comps are tracked daily — total comps appear on the daily report. Excessive comps from one manager trigger owner alerts. Moe Thomas: watch his comp totals.", ["pos", "comp", "process", "pdq"]);

await k("general", "process", "How do I run the end-of-day POS report?", "PDQ POS End-of-Day: 1) Go to Reports > Daily Summary. 2) Print the daily sales report (shows total sales, tax, tips, comps, voids, discounts). 3) Print the labor report (hours by employee). 4) Count the cash drawer — should match POS cash total. 5) Record any discrepancies. 6) Close the day in the system. 7) Put report and cash in the safe. Manager or key employee only.", ["pos", "end_of_day", "reports", "closing", "pdq"]);

await k("general", "process", "How do I handle a customer complaint about food?", "1) Listen — don't interrupt or argue. 2) Apologize sincerely. 3) Offer to remake the item immediately. 4) If they don't want a remake, comp the item (get manager approval). 5) If they're really upset, offer a dessert or appetizer on the house. 6) Log the complaint in the feedback system. 7) Tell the kitchen what went wrong so it doesn't happen again. NEVER argue with a customer about food quality.", ["complaint", "customer_service", "process"]);

await k("general", "process", "How do I handle a to-go/takeout order?", "To-go orders: 1) Ring on POS as 'To-Go' (not dine-in — different tax in some cases). 2) Print kitchen ticket with 'TO-GO' clearly marked. 3) Package in appropriate containers — pizza in boxes, hot items in styrofoam, cold items separate. 4) Include napkins, utensils, condiment packets. 5) Staple receipt to bag. 6) Double-check order against receipt before handing off. 7) For call-ahead: get name and phone, estimate time (usually 15-25 min).", ["to_go", "takeout", "packaging", "process"]);

await k("general", "process", "How do I split a check on the POS?", "PDQ POS Split Check: 1) Open the tab/order. 2) Tap 'Split'. 3) Options: split evenly (2-way, 3-way, etc.), split by item (drag items to different checks), or split by amount. 4) Each split check can be paid separately (different cards, cash mix). 5) ASK at the beginning of the meal if they want separate checks — much easier than splitting at the end.", ["pos", "split_check", "payment", "pdq"]);

// ============================================================
// COMMUNICATION & ROUTING LOGIC
// ============================================================
console.log("📡 Communication & Routing Logic...");

await k("general", "process", "Who do I tell if we're running low on something?", "Routing: FOOD items low → tell Tom Dorothy (kitchen manager, handles PFG/Sysco orders). BEER/LIQUOR low → tell Ashley (bar manager, handles Hy-Vee/distributor orders). PAPER/SUPPLIES low → tell Tom (comes with PFG order). EQUIPMENT broken → log an issue in the app, tell shift manager. If it's urgent (we're OUT of something during service), tell the shift manager immediately — they'll 86 it and find a workaround.", ["communication", "routing", "ordering", "low_stock"]);

await k("general", "process", "What does 86'd mean and what do I do?", "86'd = we're out of an item. When something is 86'd: 1) Kitchen/bar announces it to all staff. 2) It goes on the 86'd board. 3) Servers must tell tables BEFORE they order. 4) POS should be updated to show item unavailable. 5) Log it in the app so it appears in tomorrow's briefing. 6) If it's a key ingredient (mozzarella, burger patties), the ordering manager needs to know ASAP for emergency order.", ["86", "out_of_stock", "communication"]);

await k("general", "process", "What's the chain of command?", "Chain of command: Owner (Myke Mueller) → General Manager → Shift Manager/Key Employee → Line Staff. Day-to-day decisions: shift manager handles. Ordering: Tom (food), Ashley (bar). Scheduling: manager. Hiring/firing: owner. Money/safe: manager or key employee only. If you can't reach your direct manager, go up the chain. Emergency (fire, injury, robbery): call 911 first, then owner.", ["chain_of_command", "management", "communication"]);

await k("general", "process", "How do shift handoffs work?", "Shift handoff (critical for continuity): Outgoing shift manager tells incoming: 1) What's 86'd. 2) Any equipment issues. 3) Large parties or reservations coming. 4) Any customer complaints or situations. 5) Cash drawer count. 6) Anything weird that happened. The app's briefing system captures this, but face-to-face handoff is still required. 2 minutes of talking prevents 2 hours of problems.", ["shift_handoff", "communication", "management"]);

await k("general", "process", "How do I report a safety issue?", "Safety issues: 1) If someone is HURT: first aid first, call 911 if serious, then report. 2) For hazards (wet floor, broken glass, exposed wire): fix immediately if safe, or block the area and tell manager. 3) Log ALL incidents in the app — even minor ones. This protects you and the restaurant legally. 4) Food safety issues (wrong temp, expired product): pull the item immediately, tell kitchen manager. Don't serve it and hope for the best.", ["safety", "reporting", "emergency", "process"]);

// ============================================================
// VENDOR PRODUCTS (PFG — Top Items)
// ============================================================
console.log("📦 Seeding vendor products (PFG)...");

await vp("PFG", "NH050", "Mozzarella Low Moisture Part Skim Block", "dairy", "case (8/6 Lb)", null, 8, "twice_weekly", "Roma brand. #1 used item. All pizzas, mozz sticks, lasagna, mac, subs, quesadillas.");
await vp("PFG", "NH746", "Mozzarella Feather Shredded LMPS", "dairy", "case (4/5 Lb)", null, 3, "twice_weekly", "Roma brand. Pizza topping (shredded), nachos.");
await vp("PFG", "NJ366", "Cheese Cheddar Mild Yellow Shredded", "dairy", "case (4/5 Lb)", null, 3, "twice_weekly", "Roma brand. Nachos, potato nachos, mac & cheese, burgers.");
await vp("PFG", "GD702", "Cheese Cheddar Jack Shredded", "dairy", "case (4/5 Lb)", null, 3, "twice_weekly", "Roma brand. Quesadillas, taco salad, taco pizza, wraps.");
await vp("PFG", "FA568", "Cheese Swiss Sliced", "dairy", "case (8/1.5Lb)", null, 1, "weekly", "Bongards. Burgers, sandwiches.");
await vp("PFG", "NJ368", "Cheese Provolone Sliced", "dairy", "case (8/1.5Lb)", null, 2, "twice_weekly", "Roma brand. Philly subs/wraps, Italian sandwiches.");
await vp("PFG", "GD754", "Cheese Parmesan Shredded", "dairy", "case (4/5 Lb)", null, 1, "weekly", "Roma brand. Garlic bread, pasta, garlic parm wings.");
await vp("PFG", "GP920", "Cheese Sauce Cheddar", "dairy", "case (6/#10Can)", null, 1, "weekly", "Roma brand. Nachos, cheese balls, cheese fries.");
await vp("PFG", "N1462", "Cheese Cream Loaf", "dairy", "case (6/3 Lb)", null, 1, "weekly", "Roma brand. Crab rangoon pizza, cream cheese apps.");
await vp("PFG", "NH744", "Beef Patty 3-1 Round 80/20", "meat", "case (36/5.33oz)", null, 3, "twice_weekly", "1946 Craft Blend. All burgers (10+ menu items), kids burgers.");
await vp("PFG", "HM418", "Beef Ribeye 8oz Lip-On Angus", "meat", "case (20/8 Oz)", null, 2, "weekly", "10oz Ribeye Steak ($27.95). High-value item.");
await vp("PFG", "FA310", "Bacon Topping Fully Cooked 3/8\"", "meat", "case (2/5 Lb)", null, 3, "twice_weekly", "BLT salad, bacon cheeseburger pizza, chicken bacon ranch, breakfast.");
await vp("PFG", "F7438", "Chicken Gizzard Breaded 3.5oz", "meat", "case (2/5 Lb)", null, 1, "weekly", "Homestyle. Gizzards appetizer ($8.99).");
await vp("PFG", "57778", "Surimi Crab Meat Imitation", "meat", "case (4/2.5 Lb)", null, 1, "weekly", "Hidden Bay. Crab rangoon pizza ($23.95-$25.85). Expensive — portion carefully.");
await vp("PFG", "GP928", "Flour High Gluten", "dry_goods", "bag (1/50 Lb)", null, 5, "twice_weekly", "All pizza dough. Critical item — never run out.");
await vp("PFG", "N3138", "Bun Hamburger Brioche Sliced 4.25\"", "bread", "case (6/8 Cnt)", null, 4, "twice_weekly", "Hand Crafted. All burgers, steak sandwich.");
await vp("PFG", "N3140", "Roll Hoagie 8\" Sliced", "bread", "case (6/6 Cnt)", null, 3, "twice_weekly", "All toasted subs (7 varieties).");
await vp("PFG", "GP924", "Bread Garlic Toast Thick Sliced", "bread", "case (12/8Cnt)", null, 3, "twice_weekly", "Garlic cheese bread ($8.45), pasta sides.");
await vp("PFG", "GP922", "Breadstick Garlic 6\"", "bread", "case (144/Cnt)", null, 2, "weekly", "Breadsticks ($6.99).");
await vp("PFG", "CR782", "Pretzel Soft Bread Bites", "bread", "case (4/2 Lb)", null, 2, "weekly", "Pretzel bites ($8.99).");
await vp("PFG", "HB296", "Lettuce Iceberg Shredded 1/4\"", "produce", "case (4/5 Lb)", null, 3, "twice_weekly", "Peak Fresh. All salads, burgers, sandwiches, wraps, tacos.");
await vp("PFG", "JJ728", "Salad Blend Heritage", "produce", "case (4/3 Lb)", null, 2, "twice_weekly", "Peak Fresh. Chef salad, chicken salad, BLT salad.");
await vp("PFG", "77206", "Tomato Round Red Fresh", "produce", "case (1/25 Lb)", null, 3, "twice_weekly", "Packer. Burgers, sandwiches, salads, BLT.");
await vp("PFG", "HB404", "Onion Yellow Jumbo Bag", "produce", "case (1/50 Lb)", null, 2, "weekly", "Peak Fresh. Onion rings, burgers, pizza, philly, fry line.");
await vp("PFG", "24482", "Sauce Pizza Heavy w/Basil Pear Tomatoes", "dry_goods", "case (6/#10Can)", null, 3, "twice_weekly", "San Benito. ALL pizza sauce. Critical item.");
await vp("PFG", "DV470", "Oil Soy Clear Fry Trans Fat Free", "dry_goods", "jug (1/35 Lb)", null, 3, "twice_weekly", "ALL fryer oil. Heavy use item.");
await vp("PFG", "TH432", "Box Pizza 16\" Kraft", "paper", "case (1/50 Cnt)", null, 3, "weekly", "Community Tap branded. All large pizza orders.");
await vp("PFG", "TH430", "Box Pizza 14\" Kraft", "paper", "case (1/50 Cnt)", null, 2, "weekly", "Community Tap branded. All medium pizza orders.");
await vp("PFG", "TH428", "Box Pizza 10\" Kraft", "paper", "case (1/50 Cnt)", null, 1, "weekly", "Community Tap branded. All small/mini pizza orders.");
await vp("PFG", "H1144", "Glove Nitrile XL Powder Free Blue", "paper", "case (10/100Ea)", null, 1, "weekly", "All food prep stations.");
await vp("PFG", "DT164", "Chip Tortilla Corn Yellow 1/4 Cut", "dry_goods", "case (1/30 Lb)", null, 2, "weekly", "Nachos ($13.99), chips & queso ($7.99), taco salad.");
await vp("PFG", "31836", "Sweet Potato Fries Crinkle Cut", "frozen", "case (6/2.5 Lb)", null, 2, "weekly", "Sweet potato fries side ($4.99). Burns faster than regular fries.");
await vp("PFG", "RV370", "Battered Green Beans", "frozen", "case (4/2 Lb)", null, 2, "weekly", "Deep fried green beans ($9.45/$4.95).");
await vp("PFG", "G6232", "Mushroom Breaded Buttermilk", "frozen", "case (6/2.5 Lb)", null, 1, "weekly", "Anchor Foods. Fried mushrooms appetizer ($9.45).");
await vp("PFG", "J2724", "Pasta Elbow Macaroni Fully Cooked", "dry_goods", "case (6/3 Lb)", null, 2, "weekly", "Marzetti. C-Tap Signature Mac, Smokey Mac, mac side.");

// Sysco items
console.log("📦 Seeding vendor products (Sysco)...");
await vp("Sysco", "2388791", "Cheese Mozzarella Low Moisture Part Skim", "dairy", "case (8/6#AVG)", "2.02", 7, "as_needed", "ARREZZIO IMPERIAL. Backup mozzarella source. $2.018/LB.");
await vp("Sysco", "2548162", "Bacon Bits Real Cooked .75 Inch Gas Flushed", "meat", "case (2/5 LB)", "66.49", 2, "as_needed", "SYSCO CLASSIC. $66.49/case.");
await vp("Sysco", "1073402", "Bacon Layflat 18-22 Per # Smoked", "meat", "case (1/15LB)", "64.95", 1, "as_needed", "SYSCO RELIANCE. $64.95/case.");
await vp("Sysco", "5072137", "Mushroom Pieces & Stems", "produce", "case (6/#10)", "60.45", 2, "as_needed", "ARREZZIO CLASSIC. $60.45/case.");
await vp("Sysco", "2819458", "Cheese Cheddar Jack Feather Shredded", "dairy", "case (4/5LB)", "56.72", 1, "as_needed", "CASA SOLANA IMPERIAL. $56.72/case.");
await vp("Sysco", "7149096", "Buttermilk 1 Percent", "dairy", "case (6/.5 GAL)", "18.79", 2, "as_needed", "LOUIS KEMPS. $18.79/case. Breading for chicken, gizzards, mushrooms.");
await vp("Sysco", "7278698", "Pizza Crust Parbaked Neapolitan Gluten Free 12 Inch", "bread", "case (12/12 IN)", "41.70", 1, "as_needed", "ARREZZIO IMPERIAL. GF pizza option. $41.70/case.");

// ============================================================
// ORDER GUIDE TEMPLATES
// ============================================================
console.log("📋 Seeding order guide templates...");

// Tom's Food Order Guide
await db.execute(
  `INSERT INTO order_guide_templates (name, vendorName, products, createdAt) VALUES (?, ?, ?, NOW())`,
  ["Tom's PFG Food Order Guide", "PFG", JSON.stringify({
    schedule: "Mon (delivered Tue) and Thu (delivered Fri)",
    account: "CED 06528 / Cedar Rapids",
    rep: "Scott Selim",
    categories: ["cheese", "meat", "bread", "produce", "pizza_supplies", "frozen", "condiments", "paper", "dairy", "chips"],
    walkChecklist: ["Walk-in cooler", "Freezer", "Dry storage"],
    priorityItems: ["Mozzarella block (NH050)", "Burger patties (NH744)", "Pizza flour (GP928)", "Fryer oil (DV470)", "Pizza sauce (24482)"]
  })]
);

await db.execute(
  `INSERT INTO order_guide_templates (name, vendorName, products, createdAt) VALUES (?, ?, ?, NOW())`,
  ["Tom's Sysco Specialty Order Guide", "Sysco", JSON.stringify({
    schedule: "As needed — specialty items and backup",
    account: "567872",
    rep: "Iowa branch",
    categories: ["dairy", "meat", "bread"],
    notes: "Use Sysco for GF crusts, backup mozzarella, specialty items not available from PFG"
  })]
);

// Ashley's Bar Order Guide
await db.execute(
  `INSERT INTO order_guide_templates (name, vendorName, products, createdAt) VALUES (?, ?, ?, NOW())`,
  ["Ashley's Liquor Order Guide", "Hy-Vee Wine & Spirits", JSON.stringify({
    schedule: "Weekly or as needed",
    pricingSource: "Iowa ABD (control state — state sets prices)",
    abdUrl: "https://data.iowa.gov/Sales-Distribution/Iowa-Liquor-Products/gckp-fe7r",
    categories: ["vodka", "whiskey_bourbon", "rum", "tequila", "gin", "brandy", "liqueurs", "wine"],
    priorityBrands: ["Absolut (Citron, Mango, Peach)", "Ketel One", "Makers Mark", "Woodford Reserve", "Jameson", "Bacardi", "Captain Morgan", "Jose Cuervo", "Tanqueray", "Kahlua", "Baileys"],
    notes: "Iowa ABD prices are public. Compare Hy-Vee prices against ABD price book monthly. Southern Glazer's FTC case means wine distributors are under scrutiny — track wine costs."
  })]
);

await db.execute(
  `INSERT INTO order_guide_templates (name, vendorName, products, createdAt) VALUES (?, ?, ?, NOW())`,
  ["Ashley's Beer Order Guide", "Beer Distributor", JSON.stringify({
    schedule: "Weekly",
    categories: ["domestic", "import", "craft", "seltzer", "cider"],
    topSellers: ["Bud Light", "Coors Light", "Miller Lite", "Blue Moon", "Corona", "Stella Artois", "Heineken", "White Claw", "Carbliss"],
    notes: "Beer distribution is private in Iowa (not state-controlled). Track pricing and compare across distributors."
  })]
);

// ============================================================
// PHOTO MISSIONS (Initial Set)
// ============================================================
console.log("📸 Seeding photo missions...");

const missions = [
  { name: "Walk-In Cooler Map", description: "Photo every shelf in the walk-in cooler. Help the brain learn where everything is stored.", category: "walk_in", pointsPerPhoto: 5, bonusPoints: 50, targetPhotoCount: 20 },
  { name: "Freezer Inventory", description: "Photo every section of the freezer. Document what's in stock and where.", category: "walk_in", pointsPerPhoto: 5, bonusPoints: 30, targetPhotoCount: 10 },
  { name: "Dry Storage Audit", description: "Photo every shelf in dry storage. Help new employees find things.", category: "station_setup", pointsPerPhoto: 5, bonusPoints: 30, targetPhotoCount: 15 },
  { name: "Station Setup Guide", description: "Photo each station when it's perfectly set up. This becomes the training reference.", category: "station_setup", pointsPerPhoto: 10, bonusPoints: 50, targetPhotoCount: 8 },
  { name: "Invoice Capture Week", description: "Photo every invoice that comes in this week. The brain learns prices automatically.", category: "invoice", pointsPerPhoto: 10, bonusPoints: 25, targetPhotoCount: 10 },
  { name: "Plate Presentation", description: "Photo your best plated dishes. Show the standard for how food should look.", category: "plate", pointsPerPhoto: 5, bonusPoints: 25, targetPhotoCount: 15 },
  { name: "Equipment Guide", description: "Photo each piece of equipment with its controls. Help new staff learn the kitchen.", category: "equipment", pointsPerPhoto: 5, bonusPoints: 30, targetPhotoCount: 12 },
  { name: "Prep Station Documentation", description: "Photo your prep setup — mise en place, portioning, labeling. Show how it's done right.", category: "prep", pointsPerPhoto: 5, bonusPoints: 25, targetPhotoCount: 10 },
];

for (const m of missions) {
  await db.execute(
    `INSERT INTO photo_missions (name, description, category, pointsPerPhoto, bonusPoints, targetPhotoCount, active, createdAt) VALUES (?, ?, ?, ?, ?, ?, true, NOW())`,
    [m.name, m.description, m.category, m.pointsPerPhoto, m.bonusPoints, m.targetPhotoCount]
  );
}

// ============================================================
// ACHIEVEMENT DEFINITIONS
// ============================================================
console.log("🏆 Seeding achievement definitions...");

const achievements = [
  { slug: "rookie", name: "Rookie", description: "Complete 5 shifts", badge: "🟢", category: "onboarding", thresholdType: "cumulative", thresholdValue: 5, bonusPoints: 25, difficulty: "easy" },
  { slug: "iron_streak", name: "Iron Streak", description: "14-day consecutive on-time streak", badge: "🔥", category: "reliability", thresholdType: "consecutive", thresholdValue: 14, resetEvent: "late_clock_in", bonusPoints: 50, difficulty: "medium" },
  { slug: "clean_hands", name: "Clean Hands", description: "Zero voids in 30 days", badge: "💎", category: "quality", thresholdType: "window", thresholdValue: 30, windowDays: 30, resetEvent: "void_created", bonusPoints: 75, difficulty: "hard" },
  { slug: "machine", name: "Machine", description: "Complete 100 checklists", badge: "⚙️", category: "reliability", thresholdType: "cumulative", thresholdValue: 100, bonusPoints: 50, difficulty: "medium" },
  { slug: "voice", name: "Voice", description: "Submit 50 feedback entries", badge: "🎤", category: "engagement", thresholdType: "cumulative", thresholdValue: 50, bonusPoints: 50, difficulty: "medium" },
  { slug: "mentor", name: "Mentor", description: "Train 3 new employees", badge: "🎓", category: "leadership", thresholdType: "cumulative", thresholdValue: 3, bonusPoints: 75, difficulty: "hard" },
  { slug: "ambassador", name: "Ambassador", description: "10 social media posts", badge: "📱", category: "engagement", thresholdType: "cumulative", thresholdValue: 10, bonusPoints: 50, difficulty: "medium" },
  { slug: "night_owl", name: "Night Owl", description: "Work 50 closing shifts", badge: "🦉", category: "longevity", thresholdType: "cumulative", thresholdValue: 50, bonusPoints: 50, difficulty: "medium" },
  { slug: "early_bird", name: "Early Bird", description: "Work 50 opening shifts", badge: "🐦", category: "longevity", thresholdType: "cumulative", thresholdValue: 50, bonusPoints: 50, difficulty: "medium" },
  { slug: "key_holder", name: "Key Holder", description: "Promoted to key employee", badge: "🔑", category: "leadership", thresholdType: "milestone", thresholdValue: 1, bonusPoints: 100, difficulty: "hard" },
  { slug: "centurion", name: "Centurion", description: "Work 100 shifts", badge: "💯", category: "longevity", thresholdType: "cumulative", thresholdValue: 100, bonusPoints: 75, difficulty: "medium" },
  { slug: "veteran", name: "Veteran", description: "1 year of active employment", badge: "⭐", category: "longevity", thresholdType: "cumulative", thresholdValue: 365, bonusPoints: 150, difficulty: "legendary" },
  { slug: "shutterbug", name: "Shutterbug", description: "Submit 50 photos to missions", badge: "📸", category: "engagement", thresholdType: "cumulative", thresholdValue: 50, bonusPoints: 50, difficulty: "medium" },
  { slug: "brain_builder", name: "Brain Builder", description: "Contribute 10 knowledge corrections", badge: "🧠", category: "engagement", thresholdType: "cumulative", thresholdValue: 10, bonusPoints: 75, difficulty: "hard" },
];

for (const a of achievements) {
  await db.execute(
    `INSERT INTO achievement_definitions (slug, name, description, badge, category, thresholdType, thresholdValue, windowDays, resetEvent, bonusPoints, difficulty, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [a.slug, a.name, a.description, a.badge, a.category, a.thresholdType, a.thresholdValue, a.windowDays || null, a.resetEvent || null, a.bonusPoints, a.difficulty]
  );
}

// ============================================================
// REWARDS
// ============================================================
console.log("🎁 Seeding rewards...");

const rewards = [
  { tier: "bronze", name: "Free Appetizer", description: "Any appetizer on the house — cheese balls, onion rings, pretzel bites, you pick", pointsCost: 75, type: "meal" },
  { tier: "bronze", name: "Shift Meal", description: "Free meal on your next shift — any menu item up to $15", pointsCost: 100, type: "meal" },
  { tier: "bronze", name: "Free Dessert", description: "Any dessert on the house", pointsCost: 50, type: "meal" },
  { tier: "silver", name: "N86 T-Shirt", description: "Never 86'd branded t-shirt — wear it proud", pointsCost: 250, type: "merch" },
  { tier: "silver", name: "Priority Shift Pick", description: "First pick on next week's schedule — choose your best shifts", pointsCost: 300, type: "schedule" },
  { tier: "silver", name: "Free Pizza (any size)", description: "Any specialty pizza, any size, on the house", pointsCost: 200, type: "meal" },
  { tier: "gold", name: "N86 Hat", description: "Never 86'd branded hat", pointsCost: 400, type: "merch" },
  { tier: "gold", name: "N86 Hat + T-Shirt Combo", description: "Full merch combo — hat and shirt", pointsCost: 500, type: "merch" },
  { tier: "gold", name: "Steak Dinner", description: "Ribeye or Porterhouse dinner with 2 sides, on the house", pointsCost: 600, type: "meal" },
  { tier: "platinum", name: "$25 Gift Card", description: "$25 gift card of your choice (Amazon, Walmart, etc.)", pointsCost: 1000, type: "gift_card" },
  { tier: "platinum", name: "2 Priority Shift Picks", description: "First pick on the next 2 weeks of scheduling", pointsCost: 800, type: "schedule" },
  { tier: "diamond", name: "Half-Day Paid", description: "4 hours paid time off — use it however you want", pointsCost: 2500, type: "time_off" },
  { tier: "diamond", name: "$50 Gift Card", description: "$50 gift card of your choice", pointsCost: 2000, type: "gift_card" },
  { tier: "legend", name: "$100 Cash Bonus", description: "Cash bonus for legendary performance — you earned it", pointsCost: 5000, type: "cash" },
  { tier: "legend", name: "Full Day Paid Off", description: "8 hours paid time off", pointsCost: 4500, type: "time_off" },
];

for (const r of rewards) {
  await db.execute(
    `INSERT INTO rewards (tier, name, description, pointsCost, type, active, createdAt) VALUES (?, ?, ?, ?, ?, true, NOW())`,
    [r.tier, r.name, r.description, r.pointsCost, r.type]
  );
}

// ============================================================
// BRIEFING MEMORY (Initial Facts)
// ============================================================
console.log("🧠 Seeding briefing memory...");

const memories = [
  { factType: "vendor_change", fact: "PFG delivers Tuesday and Friday. Account CED 06528. Rep: Scott Selim. Tom Dorothy handles all food ordering.", relevanceScore: 90 },
  { factType: "vendor_change", fact: "Sysco account 567872. Used for specialty items: GF crusts, backup mozzarella, specialty meats. Tom Dorothy orders.", relevanceScore: 80 },
  { factType: "vendor_change", fact: "Ashley handles all beer and liquor ordering through Hy-Vee Wine & Spirits. Iowa is a control state — ABD sets spirit prices.", relevanceScore: 85 },
  { factType: "vendor_change", fact: "Pepsi is the beverage provider for all fountain drinks.", relevanceScore: 70 },
  { factType: "staff_pattern", fact: "Moe Thomas has the highest comp total ($128.59/month, 22% of total leakage) and lowest engagement score (299 vs team avg 743). Monitor his voids and comps closely.", relevanceScore: 95 },
  { factType: "event_pattern", fact: "4-7 PM generates 40% of daily revenue in 3 hours. This is the golden window — all hands on deck.", relevanceScore: 90 },
  { factType: "event_pattern", fact: "2-3 PM is a dead zone bleeding labor. Consider staggered breaks or reduced staffing.", relevanceScore: 80 },
  { factType: "event_pattern", fact: "10 PM-12 AM runs 160%+ labor cost. Close kitchen early on slow nights (Mon-Wed).", relevanceScore: 75 },
  { factType: "event_pattern", fact: "Friday and Saturday are highest volume. Double-check ribeye/porterhouse stock for weekend steak specials.", relevanceScore: 85 },
  { factType: "seasonal", fact: "Football Saturdays (Iowa/Iowa State) increase volume 30-50%. Prep extra pizza dough, fries, wings.", relevanceScore: 70 },
];

for (const m of memories) {
  await db.execute(
    `INSERT INTO briefing_memory (factType, fact, relevanceScore, createdAt, updatedAt) VALUES (?, ?, ?, NOW(), NOW())`,
    [m.factType, m.fact, m.relevanceScore]
  );
}

// ============================================================
// BATHROOM & DISH PIT KNOWLEDGE
// ============================================================
console.log("🚿 Bathroom & Dish Pit knowledge...");

await k("bathroom", "process", "What's the bathroom cleaning schedule?", "Bathrooms checked every 2 hours during service. Full clean: 1) Sweep and mop floor. 2) Clean toilets inside and out. 3) Clean sinks and mirrors. 4) Refill soap, paper towels, toilet paper. 5) Empty trash. 6) Check for graffiti or damage. 7) Initial the cleaning log with time. Health inspector checks this log.", ["bathroom", "cleaning", "schedule"]);

await k("bathroom", "process", "What supplies do bathrooms need?", "Bathroom supplies: Hand soap (foam dispenser), paper towels (C-fold), toilet paper (commercial rolls), trash bags, all-purpose cleaner, toilet bowl cleaner, glass cleaner (for mirrors), mop and bucket. Supplies stored in janitor closet near back hallway. Restock before every shift change.", ["bathroom", "supplies", "restocking"]);

await k("dish_pit", "process", "What's the dish washing process?", "3-sink method (health code required): 1) Scrape and rinse in pre-rinse sink. 2) Wash in hot soapy water (110°F minimum). 3) Rinse in clean hot water. 4) Sanitize in chemical sanitizer solution (follow concentration on test strips). 5) Air dry on clean rack — NEVER towel dry (spreads bacteria). Machine dishwasher: scrape, rack, run cycle, check sanitizer temp (180°F). Test strips in drawer by dish machine.", ["dish_washing", "sanitizing", "health_code"]);

await k("dish_pit", "process", "How do I handle the dish machine?", "Dish machine: 1) Check chemical levels before shift (soap and sanitizer). 2) Run a test cycle empty first — check temp gauge reads 180°F on final rinse. 3) Scrape plates thoroughly before loading (food clogs the drain). 4) Don't overload racks. 5) Unload onto clean, sanitized surface. 6) End of night: drain, clean interior, clean drain trap, wipe exterior, leave door open to dry.", ["dish_machine", "equipment", "maintenance"]);

// ============================================================
// GENERAL KNOWLEDGE
// ============================================================
console.log("📚 General knowledge...");

await k("general", "process", "What are our hours of operation?", "Community Tap & Pizza hours: Mon-Thu 11am-10pm, Fri-Sat 11am-12am (midnight), Sun 11am-9pm. Kitchen closes 30 min before bar. Bar stays open until close. Happy hour: Mon-Fri 3-6pm. Lunch specials: Mon-Fri 11am-2pm.", ["hours", "schedule", "operations"]);

await k("general", "process", "What's our address and contact info?", "Community Tap & Pizza: 2026 5th Ave S, Fort Dodge, IA 50501. Phone: check with manager for current number. Owner: Myke Mueller. We're on Facebook and Instagram.", ["address", "contact", "location"]);

await k("general", "safety", "Where are the fire extinguishers?", "Fire extinguishers: 1) Kitchen — Class K (grease fires) mounted on wall near fry station. 2) Bar area — Class ABC near back exit. 3) Dining room — Class ABC near front entrance. 4) Back hallway — Class ABC near office. Ansul suppression system above fryers and grill activates automatically. Know your exits: front door, back door (through kitchen), side emergency exit.", ["fire_extinguisher", "safety", "emergency", "location"]);

await k("general", "safety", "What do I do if someone gets hurt?", "Injury response: 1) Assess — is it serious (bleeding heavily, unconscious, broken bone)? Call 911 if yes. 2) First aid kit in office and behind bar. 3) For cuts: clean, apply pressure, bandage. Change gloves. 4) For burns: cool water 10 min, don't pop blisters. 5) For falls: don't move them if they hit their head. 6) Fill out incident report (in office, top drawer). 7) Notify manager and owner. 8) Workers comp: employee must see approved doctor within 24 hours.", ["injury", "first_aid", "safety", "workers_comp"]);

await k("general", "menu_info", "What are the daily specials?", "Daily specials vary — check the specials board and POS daily specials screen. Common patterns: Monday = burger night, Tuesday = taco Tuesday, Wednesday = wing night, Thursday = pizza deal, Friday = fish fry, Saturday = steak night, Sunday = family meal deal. Lunch combo available Mon-Fri: $35.99 family meal. Always verify with kitchen before telling customers.", ["specials", "daily", "menu"]);

console.log("\n✅ Knowledge Brain seeded successfully!");
console.log("Total knowledge entries: ~70+");
console.log("Total vendor products: ~40+");
console.log("Total order guide templates: 4");
console.log("Total photo missions: 8");
console.log("Total achievement definitions: 14");
console.log("Total rewards: 15");
console.log("Total briefing memories: 10");

await db.end();
process.exit(0);
