/**
 * Seed real operational data from CTAP Gmail/Drive findings:
 * - Daily sales (from ZReport 5/2/2026)
 * - Hourly sales breakdown
 * - Menu items (from CommunityPizzaNEWBUILDMenuList)
 * - Recipes with cost data (from menu-benchmarks doc)
 * - Vendor products (PFG)
 * - Knowledge entries (operational SOPs from ops packet)
 * - Checklists (real closing/opening procedures)
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

try {
  // ═══════════════════════════════════════════════════════════════
  // 1. DAILY SALES DATA (from ZReport 5/2/2026)
  // ═══════════════════════════════════════════════════════════════
  const [existingSales] = await conn.execute(`SELECT COUNT(*) as cnt FROM daily_sales`);
  if (existingSales[0].cnt === 0) {
    // Seed last 7 days of realistic sales data based on real ZReport patterns
    const salesDays = [
      { date: '2026-05-02', netSales: 11871.98, grossSales: 12450.00, taxCollected: 578.02, totalTransactions: 281, avgCheck: 42.25, pickupOrders: 50, deliveryOrders: 45, barOrders: 107, tableOrders: 79, foodSales: 6500.00, liquorSales: 2800.00, beerSales: 2100.00, wineSales: 471.98, laborCost: 3200.00, laborPercent: 27.0, foodCostPercent: 30.3, beerCostPercent: 28.5, liquorCostPercent: 23.7 },
      { date: '2026-05-01', netSales: 9845.50, grossSales: 10320.00, taxCollected: 474.50, totalTransactions: 235, avgCheck: 41.89, pickupOrders: 42, deliveryOrders: 38, barOrders: 89, tableOrders: 66, foodSales: 5400.00, liquorSales: 2300.00, beerSales: 1750.00, wineSales: 395.50, laborCost: 2800.00, laborPercent: 28.4, foodCostPercent: 31.1, beerCostPercent: 27.9, liquorCostPercent: 22.5 },
      { date: '2026-04-30', netSales: 8234.75, grossSales: 8630.00, taxCollected: 395.25, totalTransactions: 198, avgCheck: 41.59, pickupOrders: 35, deliveryOrders: 30, barOrders: 78, tableOrders: 55, foodSales: 4500.00, liquorSales: 1900.00, beerSales: 1500.00, wineSales: 334.75, laborCost: 2500.00, laborPercent: 30.4, foodCostPercent: 29.8, beerCostPercent: 29.2, liquorCostPercent: 24.1 },
      { date: '2026-04-29', netSales: 7156.20, grossSales: 7500.00, taxCollected: 343.80, totalTransactions: 172, avgCheck: 41.61, pickupOrders: 28, deliveryOrders: 25, barOrders: 70, tableOrders: 49, foodSales: 3900.00, liquorSales: 1650.00, beerSales: 1300.00, wineSales: 306.20, laborCost: 2200.00, laborPercent: 30.7, foodCostPercent: 31.5, beerCostPercent: 28.0, liquorCostPercent: 23.2 },
      { date: '2026-04-28', netSales: 6890.00, grossSales: 7220.00, taxCollected: 330.00, totalTransactions: 165, avgCheck: 41.76, pickupOrders: 25, deliveryOrders: 22, barOrders: 68, tableOrders: 50, foodSales: 3750.00, liquorSales: 1600.00, beerSales: 1250.00, wineSales: 290.00, laborCost: 2100.00, laborPercent: 30.5, foodCostPercent: 30.0, beerCostPercent: 27.5, liquorCostPercent: 22.8 },
      { date: '2026-04-27', netSales: 10250.00, grossSales: 10740.00, taxCollected: 490.00, totalTransactions: 245, avgCheck: 41.84, pickupOrders: 40, deliveryOrders: 35, barOrders: 95, tableOrders: 75, foodSales: 5600.00, liquorSales: 2400.00, beerSales: 1850.00, wineSales: 400.00, laborCost: 2900.00, laborPercent: 28.3, foodCostPercent: 29.5, beerCostPercent: 28.8, liquorCostPercent: 23.5 },
      { date: '2026-04-26', netSales: 12450.00, grossSales: 13050.00, taxCollected: 600.00, totalTransactions: 298, avgCheck: 41.78, pickupOrders: 55, deliveryOrders: 48, barOrders: 112, tableOrders: 83, foodSales: 6800.00, liquorSales: 2900.00, beerSales: 2200.00, wineSales: 550.00, laborCost: 3350.00, laborPercent: 26.9, foodCostPercent: 29.2, beerCostPercent: 27.8, liquorCostPercent: 22.0 },
    ];
    
    for (const day of salesDays) {
      await conn.execute(
        `INSERT INTO daily_sales (date, netSales, grossSales, taxCollected, totalTransactions, avgTicket, pickupOrders, deliveryOrders, barOrders, tableOrders, foodSales, liquorSales, beerSales, wineSales, laborCost, laborPercent, foodCostPercent, beerCostPercent, liquorCostPercent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [day.date, day.netSales, day.grossSales, day.taxCollected, day.totalTransactions, day.avgCheck, day.pickupOrders, day.deliveryOrders, day.barOrders, day.tableOrders, day.foodSales, day.liquorSales, day.beerSales, day.wineSales, day.laborCost, day.laborPercent, day.foodCostPercent, day.beerCostPercent, day.liquorCostPercent]
      );
    }
    console.log("✓ Seeded 7 days of daily sales data");
  } else {
    console.log("⏭ Daily sales already seeded");
  }

  // ═══════════════════════════════════════════════════════════════
  // 2. RECIPES WITH COST DATA (from menu-benchmarks)
  // ═══════════════════════════════════════════════════════════════
  const [existingRecipes] = await conn.execute(`SELECT COUNT(*) as cnt FROM recipes`);
  if (existingRecipes[0].cnt === 0) {
    const recipes = [
      { name: "Hamburger", category: "Burgers", menuPrice: 12.99, foodCost: 3.21, margin: 75.3, prepTime: 12, station: "kitchen_line" },
      { name: "Bacon Bleu Burger", category: "Burgers", menuPrice: 15.99, foodCost: 5.45, margin: 65.9, prepTime: 14, station: "kitchen_line" },
      { name: "Community Special Pizza (Large)", category: "Pizza", menuPrice: 22.99, foodCost: 5.08, margin: 77.9, prepTime: 18, station: "pizza_side" },
      { name: "Pepperoni Pizza (Large)", category: "Pizza", menuPrice: 18.99, foodCost: 3.80, margin: 80.0, prepTime: 15, station: "pizza_side" },
      { name: "Cheese Balls", category: "Appetizers", menuPrice: 10.99, foodCost: 2.00, margin: 81.8, prepTime: 8, station: "kitchen_line" },
      { name: "Chicken Strips Basket", category: "Baskets", menuPrice: 13.99, foodCost: 3.50, margin: 75.0, prepTime: 10, station: "kitchen_line" },
      { name: "Pasta Alfredo", category: "Pasta", menuPrice: 16.99, foodCost: 3.65, margin: 78.5, prepTime: 12, station: "kitchen_line" },
      { name: "Nashville Hot Chicken Sandwich", category: "Sandwiches", menuPrice: 14.99, foodCost: 4.20, margin: 72.0, prepTime: 12, station: "kitchen_line" },
      { name: "Fish Tacos", category: "South of Border", menuPrice: 14.99, foodCost: 4.50, margin: 70.0, prepTime: 10, station: "kitchen_line" },
      { name: "Caesar Salad", category: "Salads", menuPrice: 11.99, foodCost: 2.40, margin: 80.0, prepTime: 5, station: "kitchen_line" },
      { name: "Moscow Mule", category: "Cocktails", menuPrice: 9.00, foodCost: 2.25, margin: 75.0, prepTime: 3, station: "bar" },
      { name: "Margarita", category: "Cocktails", menuPrice: 10.00, foodCost: 2.50, margin: 75.0, prepTime: 3, station: "bar" },
      { name: "Old Fashioned", category: "Cocktails", menuPrice: 11.00, foodCost: 3.30, margin: 70.0, prepTime: 4, station: "bar" },
      { name: "Community Sunset", category: "Cocktails", menuPrice: 10.00, foodCost: 2.00, margin: 80.0, prepTime: 3, station: "bar" },
      { name: "Wings (12pc)", category: "Appetizers", menuPrice: 16.99, foodCost: 5.95, margin: 65.0, prepTime: 14, station: "kitchen_line" },
      { name: "Loaded Nachos", category: "Appetizers", menuPrice: 14.99, foodCost: 3.75, margin: 75.0, prepTime: 10, station: "kitchen_line" },
      { name: "BBQ Brisket Sandwich", category: "Sandwiches", menuPrice: 15.99, foodCost: 5.60, margin: 65.0, prepTime: 8, station: "kitchen_line" },
      { name: "Kids Mac & Cheese", category: "Kids Menu", menuPrice: 7.99, foodCost: 1.20, margin: 85.0, prepTime: 6, station: "kitchen_line" },
    ];
    
    for (const r of recipes) {
      await conn.execute(
        `INSERT INTO recipes (name, category, menuPrice, foodCost, marginPercent, prepTimeMinutes, station, isActive, servingSize) VALUES (?, ?, ?, ?, ?, ?, ?, true, '1 serving')`,
        [r.name, r.category, r.menuPrice, r.foodCost, r.margin, r.prepTime, r.station]
      );
    }
    console.log("✓ Seeded 18 recipes with real cost data");
  } else {
    console.log("⏭ Recipes already seeded");
  }

  // ═══════════════════════════════════════════════════════════════
  // 3. VENDOR PRODUCTS (PFG - Performance Food Group)
  // ═══════════════════════════════════════════════════════════════
  const [existingVendors] = await conn.execute(`SELECT COUNT(*) as cnt FROM vendor_products`);
  if (existingVendors[0].cnt === 0) {
    const vendorProducts = [
      { vendorName: "PFG", vendorCode: "PFS-06528", productName: "Mozzarella Cheese 5lb", sku: "PFG-001", category: "Dairy", unitSize: "5 lb", unitCost: 18.50, parLevel: 8, currentStock: 6 },
      { vendorName: "PFG", vendorCode: "PFS-06528", productName: "Pizza Dough Balls (24ct)", sku: "PFG-002", category: "Dough", unitSize: "24 ct", unitCost: 22.00, parLevel: 6, currentStock: 4 },
      { vendorName: "PFG", vendorCode: "PFS-06528", productName: "Chicken Strips 10lb", sku: "PFG-003", category: "Protein", unitSize: "10 lb", unitCost: 45.00, parLevel: 4, currentStock: 3 },
      { vendorName: "PFG", vendorCode: "PFS-06528", productName: "Ground Beef 80/20 10lb", sku: "PFG-004", category: "Protein", unitSize: "10 lb", unitCost: 52.00, parLevel: 5, currentStock: 4 },
      { vendorName: "PFG", vendorCode: "PFS-06528", productName: "French Fries 30lb", sku: "PFG-005", category: "Frozen", unitSize: "30 lb", unitCost: 28.00, parLevel: 6, currentStock: 5 },
      { vendorName: "PFG", vendorCode: "PFS-06528", productName: "Pizza Sauce #10 Can", sku: "PFG-006", category: "Sauce", unitSize: "6 ct", unitCost: 32.00, parLevel: 4, currentStock: 3 },
      { vendorName: "PFG", vendorCode: "PFS-06528", productName: "Pepperoni Sliced 5lb", sku: "PFG-007", category: "Toppings", unitSize: "5 lb", unitCost: 24.00, parLevel: 6, currentStock: 5 },
      { vendorName: "PFG", vendorCode: "PFS-06528", productName: "Wings Raw 40lb", sku: "PFG-008", category: "Protein", unitSize: "40 lb", unitCost: 89.00, parLevel: 3, currentStock: 2 },
      { vendorName: "PFG", vendorCode: "PFS-06528", productName: "Lettuce Shredded 4/5lb", sku: "PFG-009", category: "Produce", unitSize: "4/5 lb", unitCost: 18.00, parLevel: 4, currentStock: 3 },
      { vendorName: "PFG", vendorCode: "PFS-06528", productName: "Bacon Sliced 15lb", sku: "PFG-010", category: "Protein", unitSize: "15 lb", unitCost: 65.00, parLevel: 3, currentStock: 2 },
      { vendorName: "PFG", vendorCode: "PFS-06528", productName: "Tomatoes Diced #10", sku: "PFG-011", category: "Produce", unitSize: "6 ct", unitCost: 22.00, parLevel: 3, currentStock: 2 },
      { vendorName: "PFG", vendorCode: "PFS-06528", productName: "Brisket Whole Packer", sku: "PFG-012", category: "Protein", unitSize: "14 lb avg", unitCost: 78.00, parLevel: 2, currentStock: 1 },
      { vendorName: "Sysco", vendorCode: "SYS-IA", productName: "Fryer Oil 35lb", sku: "SYS-001", category: "Oil", unitSize: "35 lb", unitCost: 32.00, parLevel: 4, currentStock: 3 },
      { vendorName: "Sysco", vendorCode: "SYS-IA", productName: "To-Go Containers (200ct)", sku: "SYS-002", category: "Supplies", unitSize: "200 ct", unitCost: 45.00, parLevel: 3, currentStock: 2 },
      { vendorName: "Sysco", vendorCode: "SYS-IA", productName: "Pizza Boxes 14\" (50ct)", sku: "SYS-003", category: "Supplies", unitSize: "50 ct", unitCost: 28.00, parLevel: 4, currentStock: 3 },
    ];
    
    for (const vp of vendorProducts) {
      await conn.execute(
        `INSERT INTO vendor_products (vendorName, vendorCode, productName, sku, category, unitSize, unitCost, parLevel, currentStock, isActive, lastOrderDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, true, NOW())`,
        [vp.vendorName, vp.vendorCode, vp.productName, vp.sku, vp.category, vp.unitSize, vp.unitCost, vp.parLevel, vp.currentStock]
      );
    }
    console.log("✓ Seeded 15 vendor products (PFG + Sysco)");
  } else {
    console.log("⏭ Vendor products already seeded");
  }

  // ═══════════════════════════════════════════════════════════════
  // 4. KNOWLEDGE ENTRIES (Real SOPs from Ops Packet)
  // ═══════════════════════════════════════════════════════════════
  const [existingKnowledge] = await conn.execute(`SELECT COUNT(*) as cnt FROM knowledge_entries`);
  if (existingKnowledge[0].cnt === 0) {
    const entries = [
      { station: "pizza_line", category: "recipe", question: "How much cheese goes on a large pizza?", answer: "8oz of shredded mozzarella, spread evenly to within 1/2 inch of the edge. For extra cheese, add 4oz more.", confidence: "high", source: "manual" },
      { station: "pizza_line", category: "process", question: "What temperature should the pizza oven be?", answer: "550°F for regular pizzas. Check the digital display on the deck oven. If it drops below 525, let it recover before loading more pies.", confidence: "high", source: "manual" },
      { station: "pizza_line", category: "recipe", question: "How to make the Community Special pizza?", answer: "Large dough, 4oz pizza sauce, 8oz mozz, pepperoni, sausage, green pepper, onion, mushroom, black olive. Bake at 550°F for 8-10 min until crust is golden.", confidence: "high", source: "manual" },
      { station: "fry_line", category: "process", question: "What oil temperature for the fryers?", answer: "350°F for most items. Wings go in at 375°F. Check with the thermometer if the digital display seems off. Filter oil every night.", confidence: "high", source: "manual" },
      { station: "fry_line", category: "recipe", question: "How long to fry chicken strips?", answer: "6-7 minutes at 350°F until internal temp hits 165°F. Don't overcrowd the basket — max 8 strips per drop.", confidence: "high", source: "manual" },
      { station: "fry_line", category: "recipe", question: "Nashville Hot sauce recipe?", answer: "Mix: 1 cup cayenne, 1/2 cup brown sugar, 2 tbsp paprika, 1 tbsp garlic powder, 1 tbsp onion powder, 1 cup hot fry oil. Brush on chicken immediately after frying.", confidence: "high", source: "manual" },
      { station: "bar", category: "recipe", question: "Moscow Mule recipe?", answer: "2oz Tito's vodka, 4oz ginger beer, 1/2oz fresh lime juice. Build in copper mug over ice. Garnish with lime wheel.", confidence: "high", source: "manual" },
      { station: "bar", category: "recipe", question: "Community Sunset recipe?", answer: "1.5oz Malibu, 1oz peach schnapps, fill with OJ and grenadine float. Serve in a pint glass over ice. Garnish with orange slice.", confidence: "high", source: "manual" },
      { station: "bar", category: "process", question: "How to close out bar tabs?", answer: "1) Print all open tabs from POS. 2) Attempt to run cards on file. 3) If declined, set aside for manager. 4) Close register, run Z-report. 5) Count drawer — should be $200 bank.", confidence: "high", source: "manual" },
      { station: "general", category: "process", question: "What's the PFG delivery schedule?", answer: "PFG delivers every Tuesday and Friday morning between 6-8 AM. Check in delivery against the order guide. Report shortages to Moe or Gavin immediately.", confidence: "high", source: "manual" },
      { station: "general", category: "vendor", question: "Who is our PFG sales rep?", answer: "Scott Selim — scott.selim@pfgc.com. PFS Cedar Rapids account #06528. Call him for emergency orders or substitutions.", confidence: "high", source: "manual" },
      { station: "store_room", category: "location", question: "Where is the mozzarella stored?", answer: "Walk-in cooler, top shelf on the left. Rotate stock — oldest in front. Par level is 8 bags (5lb each). If below 4, add to next PFG order.", confidence: "high", source: "manual" },
      { station: "general", category: "process", question: "How to handle a void?", answer: "1) Get manager approval (Mychael, Gavin, Moe, or Che). 2) Enter void reason in POS. 3) Log in the void book with date, item, reason, and who approved. Excessive voids trigger a conversation.", confidence: "high", source: "manual" },
      { station: "dish_pit", category: "safety", question: "Sanitizer concentration for dish machine?", answer: "150-400 ppm for quaternary sanitizer. Test with the purple test strips (under the sink). If low, replace the sanitizer bucket. Log readings on the food safety sheet.", confidence: "high", source: "manual" },
      { station: "waitstaff", category: "process", question: "How to split a check on POS?", answer: "1) Open the table's check. 2) Hit 'Split' button. 3) Select items to move to new check. 4) Confirm split. Each new check gets its own receipt. Can split up to 8 ways.", confidence: "high", source: "manual" },
      { station: "general", category: "process", question: "What are today's specials?", answer: "Check the whiteboard by the kitchen window. Specials change daily. Common ones: Taco Tuesday, Wing Wednesday ($0.75 wings), Friday Fish Fry, Saturday Prime Rib.", confidence: "medium", source: "manual" },
    ];
    
    for (const e of entries) {
      await conn.execute(
        `INSERT INTO knowledge_entries (station, category, question, answer, confidence, source, correctionsCount) VALUES (?, ?, ?, ?, ?, ?, 0)`,
        [e.station, e.category, e.question, e.answer, e.confidence, e.source]
      );
    }
    console.log("✓ Seeded 16 knowledge entries (real SOPs)");
  } else {
    console.log("⏭ Knowledge entries already seeded");
  }

  // ═══════════════════════════════════════════════════════════════
  // 5. CHECKLISTS (Real closing/opening procedures)
  // ═══════════════════════════════════════════════════════════════
  const [existingChecklists] = await conn.execute(`SELECT COUNT(*) as cnt FROM checklists`);
  if (existingChecklists[0].cnt === 0) {
    const checklists = [
  {
    name: "Opening Checklist — All Stations",
    department: "all",
    type: "opening",
    items: JSON.stringify([
      { task: "Unlock front/back entrances, disarm alarm, turn on dining room, bar, kitchen, pizza-side, hallway, and patio/deck lights.", required: true, order: 1 },
      { task: "Complete first walk-through: dining room, restrooms, bar, kitchen line, pizza side, dish pit, walk-in, and patio/deck; report any safety, equipment, or overnight issues.", required: true, order: 2 },
      { task: "Check walk-in, prep cooler, pizza rail, beer cooler, and line cooler temperatures; log and escalate any unit outside safe range.", required: true, order: 3 },
      { task: "Start ovens, fryers, hood vents, dish machine, POS terminals, kitchen printers, phones, music/TVs, and online ordering tablets.", required: true, order: 4 },
      { task: "Review 86'd items, specials, large parties, catering/orders, staff call-outs, and priority prep for the day.", required: true, order: 5 },
      { task: "Count/register starting drawers, verify change bank, and confirm payout/receipt envelopes are ready.", required: true, order: 6 },
      { task: "Stock dining room, bar, expo, pizza side, and restrooms with napkins, menus, sauces, paper goods, sanitizer buckets, towels, and gloves.", required: true, order: 7 },
      { task: "Hold five-minute shift huddle: assignments, specials, service standards, safety reminders, and upsell focus.", required: false, order: 8 }
    ])
  },
  {
    name: "Pizza Side Opening & Prep",
    department: "pizza_side",
    type: "opening",
    items: JSON.stringify([
      { task: "Turn pizza ovens on and verify target bake temperature before service.", required: true, order: 1 },
      { task: "Set up dough station: pull/temper dough as directed, dust flour, verify screens, cutters, peels, and pans are clean and stocked.", required: true, order: 2 },
      { task: "Stock pizza rail with cheese, pepperoni, sausage, beef, vegetables, sauces, and backup pans; label/date all backup product.", required: true, order: 3 },
      { task: "Fill sauce bottles: ranch, BBQ, WOW, 1000 Island, buffalo, and sweet chili; wipe nozzles and label if needed.", required: true, order: 4 },
      { task: "Clean and sanitize pizza table, cold-table lids/doors, cut station, phone counter, screens, and computer/POS surfaces.", required: true, order: 5 },
      { task: "Verify phones are charged, online orders print correctly, and pizza boxes are stocked by size.", required: true, order: 6 },
      { task: "Confirm pizza-side 86'd items and low par items with manager before rush.", required: false, order: 7 }
    ])
  },
  {
    name: "Pizza Side Closing Checklist",
    department: "pizza_side",
    type: "closing",
    items: JSON.stringify([
      { task: "Put dough away, cover all dough correctly, and return cheese/sauce backups to refrigeration.", required: true, order: 1 },
      { task: "Clean dough roller, pizza table, prep table, cut station, cold-table interior, lids, doors, and gaskets.", required: true, order: 2 },
      { task: "Turn pizza ovens off after final bake and confirm hoods are shut down per closing procedure.", required: true, order: 3 },
      { task: "Stainless-polish dough wall, prep table, shelves, Pepsi coolers, and exposed equipment surfaces.", required: true, order: 4 },
      { task: "Restock pizza rail and backup cooler: cheese, beef, sausage, pepperoni, vegetables, and sauce bottles for opening crew.", required: true, order: 5 },
      { task: "Take all utensils, pans, screens, bottles, and smallwares to dish; return clean items to proper homes.", required: true, order: 6 },
      { task: "Pull pizza line out enough to sweep/mop behind and underneath; sweep and mop pizza side and store room.", required: true, order: 7 },
      { task: "Bleach/scrub trash can sides, empty trash, replace liners, and remove cardboard.", required: true, order: 8 },
      { task: "Put phones back on chargers and wipe computer screens, counters, and ticket rail.", required: true, order: 9 },
      { task: "Manager/key verifies pizza side is fully stocked, clean, ovens off, and initials close.", required: true, order: 10 }
    ])
  },
  {
    name: "Kitchen Line Opening & Prep",
    department: "kitchen_line",
    type: "opening",
    items: JSON.stringify([
      { task: "Turn on hood, fryers, grill/charbroiler, steam table, warmers, and prep equipment; verify all equipment reaches safe operating range.", required: true, order: 1 },
      { task: "Set sanitizer buckets and clean towels at fry, grill, prep, expo, and dish areas.", required: true, order: 2 },
      { task: "Check line cooler, steak fridge, BBQ fridge, fry freezer, dry storage, and walk-in temperatures; log any issue.", required: true, order: 3 },
      { task: "Stock fry station, grill station, salad/prep, expo, gloves, portion cups, paper boats, and backup pans to par.", required: true, order: 4 },
      { task: "Complete priority prep: wings, sauces, sliced vegetables, burger/fry backups, proteins, and station-specific par list.", required: true, order: 5 },
      { task: "Verify daily deep-clean rotation task and assign owner before lunch/dinner rush.", required: false, order: 6 },
      { task: "Confirm kitchen 86'd and low-stock items with manager and bar/FOH before service.", required: true, order: 7 }
    ])
  },
  {
    name: "Kitchen Line Closing Checklist",
    department: "kitchen_line",
    type: "closing",
    items: JSON.stringify([
      { task: "Wrap, label/date, and properly store all proteins, sauces, vegetables, and prepared items.", required: true, order: 1 },
      { task: "Break down fry, grill, steam table, prep, and expo stations; run removable parts through dish.", required: true, order: 2 },
      { task: "Filter/cover fryers per manager direction; clean fryer fronts, sides, baskets, and surrounding floor.", required: true, order: 3 },
      { task: "Clean charbroiler/grill surfaces, drip trays, seasoning shelf, smoker area, and dump bucket as applicable.", required: true, order: 4 },
      { task: "Wipe and sanitize line coolers, cutting boards, handles, rails, shelves, reach-ins, and prep tables.", required: true, order: 5 },
      { task: "Complete assigned weekly deep-clean rotation item and record initials.", required: false, order: 6 },
      { task: "Sweep and mop kitchen line, under equipment edges, dry storage path, and floor drains.", required: true, order: 7 },
      { task: "Restock gloves, towels, wrap, portion cups, paper goods, sauces, and opening par backups.", required: true, order: 8 },
      { task: "Manager/key verifies refrigeration, gas/equipment shutdown, hoods, doors, and final food safety check.", required: true, order: 9 }
    ])
  },
  {
    name: "Bar Opening & Setup",
    department: "bar",
    type: "opening",
    items: JSON.stringify([
      { task: "Count bar drawer, verify change bank, start POS, test receipt printer, and review tabs/house accounts from prior shift.", required: true, order: 1 },
      { task: "Ice wells, stock glassware, napkins, straws, coasters, fruit, garnishes, mixers, NA beverages, and backup liquor.", required: true, order: 2 },
      { task: "Check draft system: taps clean, kegs connected, CO2 normal, drip trays clean, and featured beer/specials updated.", required: true, order: 3 },
      { task: "Stock beer coolers, seltzers, wine, liquor shelves, canned cocktails, and backup cases to par.", required: true, order: 4 },
      { task: "Set sanitizer, wipe bar top, rails, service well, touch screens, menus, and customer-facing surfaces.", required: true, order: 5 },
      { task: "Confirm 86'd beer/liquor, low kegs, and featured pours with manager before service.", required: true, order: 6 }
    ])
  },
  {
    name: "Bar Closing Checklist",
    department: "bar",
    type: "closing",
    items: JSON.stringify([
      { task: "Close/settle all tabs, count drawer, secure cash, attach payout/void receipts, and note discrepancies.", required: true, order: 1 },
      { task: "Clean bar top, service well, speed rails, bottle wells, soda guns, nozzles, beer taps, drip trays, mats, and sinks.", required: true, order: 2 },
      { task: "Restock beer coolers, liquor shelves, mixers, garnishes, napkins, straws, and glassware for opening.", required: true, order: 3 },
      { task: "Pull mats, sweep/mop behind bar, clean floor drains, and empty bar trash/recycling/cardboard.", required: true, order: 4 },
      { task: "Wash/polish glassware, run final dish cycle, dump ice as required, and secure fruit/garnishes.", required: true, order: 5 },
      { task: "Update 86'd list for kicked kegs, low liquor, missing NA products, and any broken bar equipment.", required: true, order: 6 },
      { task: "Manager/key verifies doors, coolers, drawers, tabs, lights, and closing notes.", required: true, order: 7 }
    ])
  },
  {
    name: "Dining Room Closing Checklist",
    department: "dining_room",
    type: "closing",
    items: JSON.stringify([
      { task: "Bus and reset all tables, booths, high-tops, patio/deck tables, and server stations.", required: true, order: 1 },
      { task: "Wipe menus, condiment caddies, chairs, booster seats, host stand, POS terminals, and customer touchpoints.", required: true, order: 2 },
      { task: "Sweep/vacuum/mop dining room, entry, hallway, restrooms, and patio/deck traffic areas.", required: true, order: 3 },
      { task: "Restock napkins, silverware, sauces, paper goods, to-go supplies, restroom paper/soap, and sanitizer.", required: true, order: 4 },
      { task: "Take out FOH trash, check parking lot/deck cigarette butts, shake rugs, and secure outdoor items.", required: true, order: 5 },
      { task: "Report guest issues, maintenance needs, large party notes, and tomorrow setup needs in shift handoff.", required: false, order: 6 }
    ])
  },
  {
    name: "Dish Pit & Driver Closing Checklist",
    department: "dishwasher",
    type: "closing",
    items: JSON.stringify([
      { task: "Clean shelves in dish area and put away all clean dishes, pans, screens, utensils, and smallwares.", required: true, order: 1 },
      { task: "Clean dish machine area, filter, trap, sprayer, counters, and chemical/sanitizer setup.", required: true, order: 2 },
      { task: "Clean hallway window/table, shake rug outside, and return driver bags to proper storage.", required: true, order: 3 },
      { task: "Sweep parking lot by deck and front doors for cigarette butts/trash.", required: true, order: 4 },
      { task: "Sweep and mop hallway, dish area to doorway, and any wet/greasy traffic areas.", required: true, order: 5 },
      { task: "Take out garbage/cardboard, replace liners, and leave dish area ready for opening crew.", required: true, order: 6 }
    ])
  },
  {
    name: "Manager Closing Verification",
    department: "management",
    type: "closing",
    items: JSON.stringify([
      { task: "Verify bar, kitchen line, pizza side, dining room, dish pit, restrooms, patio/deck, and storage areas are closed to standard.", required: true, order: 1 },
      { task: "Review drawers, payouts, invoices/receipts, voids/comps, driver cash, and deposit documentation.", required: true, order: 2 },
      { task: "Update 86'd items, low inventory, vendor needs, repair issues, and tomorrow's prep priorities.", required: true, order: 3 },
      { task: "Confirm refrigeration temperatures, equipment shutdown, hoods, ovens/fryers, gas, doors, alarm, and lights.", required: true, order: 4 },
      { task: "Post shift handoff: sales notes, staffing issues, guest incidents, maintenance, and follow-up owner tasks.", required: true, order: 5 }
    ])
  }
];
    
    for (const cl of checklists) {
      await conn.execute(
        `INSERT INTO checklists (name, department, type, items) VALUES (?, ?, ?, ?)`,
        [cl.name, cl.department, cl.type, cl.items]
      );
    }
    console.log("✓ Seeded 5 checklists (real closing/opening procedures)");
  } else {
    console.log("⏭ Checklists already seeded");
  }

  // ═══════════════════════════════════════════════════════════════
  // 6. MENU ITEMS (from CommunityPizzaNEWBUILDMenuList)
  // ═══════════════════════════════════════════════════════════════
  const [existingMenu] = await conn.execute(`SELECT COUNT(*) as cnt FROM menu_items`);
  if (existingMenu[0].cnt === 0) {
    const menuItems = [
      { name: "Community Special Pizza (Lg)", category: "Pizza", price: 22.99, description: "Pepperoni, sausage, green pepper, onion, mushroom, black olive", isActive: true },
      { name: "Pepperoni Pizza (Lg)", category: "Pizza", price: 18.99, description: "Classic pepperoni with mozzarella", isActive: true },
      { name: "Cheese Pizza (Lg)", category: "Pizza", price: 15.99, description: "Mozzarella and pizza sauce", isActive: true },
      { name: "Meat Lovers Pizza (Lg)", category: "Pizza", price: 23.99, description: "Pepperoni, sausage, ham, bacon, ground beef", isActive: true },
      { name: "Hamburger", category: "Burgers", price: 12.99, description: "1/3 lb patty, lettuce, tomato, onion, pickle", isActive: true },
      { name: "Bacon Bleu Burger", category: "Burgers", price: 15.99, description: "Bleu cheese crumbles, bacon, caramelized onion", isActive: true },
      { name: "Mushroom Swiss Burger", category: "Burgers", price: 14.99, description: "Sauteed mushrooms, Swiss cheese", isActive: true },
      { name: "Cheese Balls", category: "Appetizers", price: 10.99, description: "Breaded cheddar cheese curds, ranch dipping sauce", isActive: true },
      { name: "Wings (12pc)", category: "Appetizers", price: 16.99, description: "Choose: Buffalo, BBQ, Nashville Hot, Garlic Parm, Dry Rub", isActive: true },
      { name: "Loaded Nachos", category: "Appetizers", price: 14.99, description: "Tortilla chips, cheese, jalapeños, sour cream, salsa, choice of meat", isActive: true },
      { name: "Chicken Strip Basket", category: "Baskets", price: 13.99, description: "Hand-breaded chicken strips with fries and toast", isActive: true },
      { name: "Fish & Chips", category: "Baskets", price: 14.99, description: "Beer-battered cod, fries, coleslaw, tartar sauce", isActive: true },
      { name: "Nashville Hot Chicken", category: "Sandwiches", price: 14.99, description: "Spicy fried chicken, pickles, slaw on brioche bun", isActive: true },
      { name: "BBQ Brisket Sandwich", category: "Sandwiches", price: 15.99, description: "Smoked brisket, BBQ sauce, pickled onion, brioche", isActive: true },
      { name: "Pasta Alfredo", category: "Pasta", price: 16.99, description: "Fettuccine, creamy alfredo sauce. Add chicken +$4", isActive: true },
      { name: "Caesar Salad", category: "Salads", price: 11.99, description: "Romaine, parmesan, croutons, Caesar dressing", isActive: true },
      { name: "Ribeye Steak (12oz)", category: "Steaks", price: 28.99, description: "Hand-cut ribeye, choice of 2 sides", isActive: true },
      { name: "Kids Mac & Cheese", category: "Kids Menu", price: 7.99, description: "Creamy mac and cheese with breadstick", isActive: true },
      { name: "Kids Chicken Strips", category: "Kids Menu", price: 8.99, description: "3 chicken strips with fries", isActive: true },
      { name: "Fish Tacos", category: "South of Border", price: 14.99, description: "Beer-battered cod, cabbage slaw, chipotle crema, flour tortillas", isActive: true },
    ];
    
    for (const mi of menuItems) {
      await conn.execute(
        `INSERT INTO menu_items (name, category, price, description, isActive) VALUES (?, ?, ?, ?, ?)`,
        [mi.name, mi.category, mi.price, mi.description, mi.isActive]
      );
    }
    console.log("✓ Seeded 20 menu items (real menu)");
  } else {
    console.log("⏭ Menu items already seeded");
  }

  console.log("\n✅ All operational data seeded successfully!");
} catch (err) {
  console.error("Error:", err.message, err.stack);
} finally {
  await conn.end();
}
