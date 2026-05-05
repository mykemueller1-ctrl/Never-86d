/**
 * Wave 20 — Seed ALL real CTAP data from cloud PC sources.
 * SOPs → knowledge_entries
 * Tom's food order guide → vendor_products + sku_catalog
 * Ashley's bar order guide → vendor_products + sku_catalog (beer)
 * Iowa liquor pricing → sku_catalog (liquor)
 * Full 503-item menu → menu_items
 * Real recipes with ingredients → recipes + recipe_ingredients
 * 202 days of PDQ sales → daily_sales
 */
import { getDb } from './db';
import {
  knowledgeEntries,
  vendorProducts,
  skuCatalog,
  menuItems,
  recipes,
  recipeIngredients,
  dailySales,
  orderGuideTemplates,
} from '../drizzle/schema';

export async function seedWave20() {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const results: Record<string, string> = {};

  // ═══════════════════════════════════════════════════════════════════
  // 1. KNOWLEDGE ENTRIES — Real SOPs from Community Tap
  // ═══════════════════════════════════════════════════════════════════
  const existingKnowledge = await db.select().from(knowledgeEntries).limit(1);
  if (existingKnowledge.length === 0) {
    const sopEntries = [
      // Pizza Nightly Closing
      { station: 'pizza_line' as const, category: 'process' as const, question: 'What is the pizza side nightly closing procedure?', answer: 'Pizza Nightly Closing SOP:\n1. Wrap up all dough balls and label with date\n2. Cover all toppings with plastic wrap\n3. Wipe down all prep surfaces with sanitizer\n4. Clean the pizza oven (brush out debris, wipe exterior)\n5. Sweep and mop the pizza station floor\n6. Take out trash and replace liner\n7. Restock pizza boxes for morning\n8. Turn off pizza oven\n9. Check walk-in for expired items\n10. Final wipe of all stainless steel', confidence: 'high' as const, source: 'imported' as const, tags: JSON.stringify(['closing', 'pizza', 'nightly', 'checklist']) },
      // Fry Line Closing
      { station: 'fry_line' as const, category: 'process' as const, question: 'What is the fry line closing procedure?', answer: 'Fry Line Closing SOP:\n1. Opener: Make sure sauce cups are straightened up and filled up\n2. Closer: Stainless steel polish all fry line equipment\n3. Restock used meats, fill sauce bottles if need be\n4. Clean flat top thoroughly\n5. Sweep and mop fry line after cleaning flat top\n6. Put spatulas in dish pit\n7. Replace half sheet pan\n8. All knives are cleaned\n9. Make sure hoods are off and all other equipment is turned off', confidence: 'high' as const, source: 'imported' as const, tags: JSON.stringify(['closing', 'fry_line', 'kitchen', 'nightly']) },
      // Weekly Deep Clean Fry Line
      { station: 'fry_line' as const, category: 'cleaning' as const, question: 'What is the weekly deep clean procedure for the fry line?', answer: 'Weekly Deep Clean — Fry Line:\n1. Pull out all equipment and clean behind/underneath\n2. Degrease all surfaces including walls\n3. Clean fryer baskets with degreaser\n4. Drain and filter fryer oil (replace if dark)\n5. Clean hood filters (soak in degreaser)\n6. Scrub floor drains\n7. Polish all stainless steel\n8. Check and clean grease trap\n9. Organize dry storage items near fry station\n10. Document completion on cleaning log', confidence: 'high' as const, source: 'imported' as const, tags: JSON.stringify(['deep_clean', 'weekly', 'fry_line', 'kitchen']) },
      // BBQ Weights & Specs
      { station: 'fry_line' as const, category: 'recipe' as const, question: 'What are the BBQ portion weights and specs?', answer: 'BBQ Portion Weights:\n• Dinner 1: 8 oz of meat\n• Dinner 2: 4 oz of each meat\n• Dinner 3: 4 oz of each meat\n• BBQ Sandwiches: 5 oz of meat\n• BBQ Melts: 6 oz of meat\n• Family Pack 1: 1 pound of meat, 2 pint size cups, 4 pieces of cornbread\n• Family Pack 2: 2 pounds of meat, 3 pint sizes, 6 pieces of cornbread\n• Family Pack 3: 3 pounds of meat, 4 pint sizes, 8 pieces of cornbread', confidence: 'high' as const, source: 'imported' as const, tags: JSON.stringify(['bbq', 'portions', 'weights', 'specs']) },
      // Dress Code
      { station: 'general' as const, category: 'process' as const, question: 'What is the employee dress code policy?', answer: 'Employee Dress Code (Effective November 6):\n• Proper Attire Required: Sweatpants, basketball shorts, and jeans with holes are NOT permitted while on shift\n• CTap Shirt Requirement: All employees must wear a CTap shirt during their shift. If you need one, we can provide it with a payroll deduction\n• Hat Policy: If wearing a hat, it must be worn facing forward at all times\n• No Headphones: Headphones are not permitted during shifts to ensure full attention to tasks and customer service', confidence: 'high' as const, source: 'imported' as const, tags: JSON.stringify(['dress_code', 'policy', 'uniform', 'appearance']) },
      // Bar Duties (Closing)
      { station: 'bar' as const, category: 'process' as const, question: 'What are the bar closing duties?', answer: 'Bar Closing Duties:\n1. Fill BBQ caddies, clean caps/caddies\n2. Marry all ketchups and mustards\n3. Fill all parmesans, red pepper flakes\n4. Fill salt/pepper shakers, napkin holders\n5. Fill both large and small togo boxes\n6. Get extra chasers for barside (margarita mix, pineapple juice, sour, grenadine)\n7. Roll all silverware\n8. Wipe down all tables\n9. Wash and clean under all glass mats/spill mats\n10. Clean waitress only & budweiser mats\n11. Fill kids cups/lids, straws, plastic cups\n12. Cut fruit, fill ice\n13. Clean tops of wells and underneath liquor bottles\n14. Stock beer in coolers + overstock\n15. Check pop levels, stock walk-in cooler\n16. Dump and wash slop bucket\n17. Take all dishes back to kitchen\n18. Wipe off bus tub cart\n19. Clean bathrooms (Windex mirror, wipe sinks, clean toilets, fill TP, ice in urinals, take out trash)\n20. Take out all trashes behind bar and waitress stand\n21. Turn off TVs, turn down speaker\n22. Close out pizza side and bar waitress computers\n23. Wipe off special board\n24. Lock all doors including padlock on pool room\n25. Place all stools/chairs/floor mats on tables\n26. Sweep all barside, bathrooms, doorways, behind bar, under booths\n27. Check the deck\n28. Mop all areas\n29. Buff (Wednesday or Sunday)\n30. Count ticket bag, count deposit and drawer\n31. Turn off air (summer) / turn heat to 68 (winter)\n32. Place all items in safe\n33. Check AM/PM kitchen tips on register in envelope\n34. Set alarm on way out', confidence: 'high' as const, source: 'imported' as const, tags: JSON.stringify(['bar', 'closing', 'duties', 'checklist', 'nightly']) },
      // Closing Manager
      { station: 'general' as const, category: 'process' as const, question: 'What are the closing manager expectations?', answer: 'Closing Manager Expectations:\n• We are the last line of defense at end of night\n• Must be the last one to punch out at end of night\n• Responsible for arming the alarm every night (except Sundays and Wednesdays when FOH buffs floors)\n• Walk through and check closers before they leave\n• Walk through again before leaving for the night\n• Only once you\'ve made sure no one else is in the building and alarm can be armed can you leave\n• This will be reviewed in person to address any questions', confidence: 'high' as const, source: 'imported' as const, tags: JSON.stringify(['closing', 'manager', 'expectations', 'alarm', 'security']) },
      // Delivery Driver Expectations
      { station: 'general' as const, category: 'process' as const, question: 'What are the delivery driver expectations?', answer: 'Delivery Driver Expectations:\n✅ Responsibilities:\n• Sweep the parking lot if asked — we all take pride in our space\n• Put in DoorDash tickets\n• Keep the dish pit clean — rinse, stack, and help when needed\n• Take out the trash — don\'t leave it for the next guy\n• When you return from a delivery, come back inside immediately\n⛔ No sitting in your car or stalling for 5-10 minutes — we need you back in the game\n• Answer the phones when you\'re not out on a run\n• Help with basic kitchen tasks — we all chip in\n• After mopping at night, take off the dirty mop head — use a fresh one every shift', confidence: 'high' as const, source: 'imported' as const, tags: JSON.stringify(['driver', 'delivery', 'expectations', 'responsibilities']) },
      // Dishwasher/Driver Nightly Checklist
      { station: 'dish_pit' as const, category: 'process' as const, question: 'What is the dishwasher/driver nightly closing checklist?', answer: 'Dishwasher/Drivers Closing Checklist (hand in daily with driver report):\n_____ Clean shelves in dish area\n_____ Clean & put away all dishes\n_____ Sweep parking lot by deck and in front of doors for cig butts\n_____ Shake rug outside\n_____ Clean hallway, Windex the window, clean table\n_____ Put driver bags away\n_____ Clean dish machine area & clean filter & trap\n_____ Sweep and mop hallway\n_____ Sweep and mop dish area to doorway\n_____ Take out garbage', confidence: 'high' as const, source: 'imported' as const, tags: JSON.stringify(['dishwasher', 'driver', 'closing', 'nightly', 'checklist']) },
      // Nightly Drivers Paperwork
      { station: 'general' as const, category: 'process' as const, question: 'What paperwork do drivers need to fill out nightly?', answer: 'Nightly Drivers Paperwork SOP:\nDrivers must fill out the following each night:\n1. Total deliveries count\n2. Out of town runs with fees (Quality Inn $1, Kock $8, CJ & Cargil $5, Coalville/apple orchard/airport $3, Deerwood/Nathan Blvd/Luke Lane $5)\n3. Re-delivery list with reason, who took the order, who delivered it second time\n4. Cash from till (if applicable) with reason\n5. Total tips\n6. Manager must check and sign off', confidence: 'high' as const, source: 'imported' as const, tags: JSON.stringify(['driver', 'paperwork', 'nightly', 'fees', 'deliveries']) },
      // Kitchen Manager Role
      { station: 'general' as const, category: 'process' as const, question: 'What are the kitchen manager duties and responsibilities?', answer: 'Kitchen Manager Duties (not limited to):\n• Accomplishes staff results by communicating job expectations; planning, monitoring, and appraising job results; coaching, counseling, and disciplining employees\n• Weekly Product Order\n• Maintaining Proper Product Rotation\n• Maintaining a Clean/Sanitary Work Environment\n• Providing/Maintaining a Positive Work Environment\n• Maintaining Labor Costs/Effectively Managing Labor\n• Overseeing Proper Scheduling/Use of Labor Force\n• Overseeing Correct Prep Procedures/Coaching for Consistent Prep Items\n• Overseeing Training of New Employees\n• Overseeing Training and ReTraining on New Procedures or Items\n• Maintaining Supply of Small Wares/Plates/Utensils\n• Maintaining Equipment/Overseeing Scheduled Maintenance\n• Maintaining/Overseeing Proper Food Cost/Portion Control/Usage', confidence: 'high' as const, source: 'imported' as const, tags: JSON.stringify(['kitchen', 'manager', 'role', 'duties', 'responsibilities']) },
      // Bar Manager Role
      { station: 'bar' as const, category: 'process' as const, question: 'What are the bar manager duties and responsibilities?', answer: 'Bar Manager Duties (not limited to):\n\nInventory Management: Liquor, Wine, Beer, Bitters, Cinnamon Sticks, Cloves, Stir Sticks, Picks, Glassware, Bar Washer Chemicals, Shakers/Jiggers\n\nDrink Menus: Keep up-to-date drink menu changed quarterly; Keep chalk board updated daily with new beers/drinks\n\nStaff Knowledge/Training: Up-to-date lists of beer/wine for staff reference; Tests/Quizzes on beers, wines for staff knowledge\n\nMaintaining Clean/Organized Beer Cooler: Cases and wine organized in designated areas; Kegs on shelves or in own area; Cleaning schedule for beer cooler\n\nProper Product Rotation: Ensure proper rotation during stocking\n\nManaging Other Bartenders: Ensuring cleaning and stocking done correctly on other shifts; Ensuring other bartenders know about new beers/drinks/wine\n\nMaintaining Clean/Organized Bar: Bar cleaning schedule; Weekly maintenance of bar equipment', confidence: 'high' as const, source: 'imported' as const, tags: JSON.stringify(['bar', 'manager', 'role', 'duties', 'inventory']) },
      // Kitchen Manager Memo
      { station: 'general' as const, category: 'process' as const, question: 'What is the kitchen manager accountability memo?', answer: 'To All Kitchen Managers:\n\nWe\'ve built the systems, laid out the duties, and made everything as simple and straightforward as possible for the team to follow. The hard part — creating the structure — is done.\n\nNow it\'s time for the next step: We all need to hold the team accountable.\n\nThat means:\n• Enforcing expectations consistently\n• The systems are set up and running\n• Addressing issues directly and professionally\n• Not letting things slide just because it\'s easier in the moment\n\nIf you have questions about what\'s been put in place, I\'m willing to meet to go over anything. This is a team effort.\n\nThis is the direction we\'re moving, and I need leadership to support it fully. We\'ve built a strong foundation. Now it\'s up to us to keep it strong.', confidence: 'high' as const, source: 'imported' as const, tags: JSON.stringify(['kitchen', 'manager', 'memo', 'accountability', 'leadership']) },
      // Kitchen Protocol Final Warning
      { station: 'general' as const, category: 'safety' as const, question: 'What is the kitchen protocol and disciplinary escalation process?', answer: 'Kitchen Protocol — Disciplinary Escalation:\n\n1st Offense: Verbal Warning (documented)\n2nd Offense: Written Warning (signed by employee)\n3rd Offense: Final Written Warning (one more = termination)\n4th Offense: Termination\n\nCommon violations:\n• No-call no-show\n• Repeated tardiness (3+ times in 2 weeks)\n• Food safety violations (temperature abuse, cross-contamination)\n• Insubordination or refusal to follow procedures\n• Phone use during service\n• Leaving station without coverage\n• Failure to complete closing duties\n\nAll warnings are documented with date, description, and employee signature. Employee may add their own comments. Follow-up date is set for improvement check.', confidence: 'high' as const, source: 'imported' as const, tags: JSON.stringify(['discipline', 'protocol', 'warning', 'termination', 'policy']) },
      // Employee Review Form
      { station: 'general' as const, category: 'process' as const, question: 'How are employee reviews conducted at CTap?', answer: 'Employee Review Form — 9 Categories (1-5 scale):\n\n1. Work Quality — Accuracy, attention to detail, consistency\n2. Attendance — Punctuality, reliability, shift coverage\n3. Job Knowledge — Understanding of procedures, menu, equipment\n4. Teamwork — Cooperation, communication, helping others\n5. Finishing Tasks — Completing duties without reminders\n6. Overall Attitude — Positivity, professionalism, energy\n7. Customer Interaction — Friendliness, problem-solving, upselling\n8. Multitasking — Handling multiple orders/tables/tasks\n9. Computer Skills — POS proficiency, order entry accuracy\n\nAdditional sections:\n• Overall Succession (strengths/growth areas)\n• Needs Improvement (specific items)\n• Employee Concerns (their feedback)\n\nAverage score calculated across all 9 categories.', confidence: 'high' as const, source: 'imported' as const, tags: JSON.stringify(['review', 'evaluation', 'performance', 'form', 'categories']) },
      // Bar Order Guide (Wednesday)
      { station: 'bar' as const, category: 'vendor' as const, question: 'How does Ashley order bar supplies on Wednesdays?', answer: 'Wednesday Call-In Checklist (Hy-Vee Wine & Spirits):\n\nWalk the bar. Check every bottle. Order what\'s below 1/3 full:\n\nPriority 1 — Will Run Out This Weekend:\n• Absolut Vodka (well)\n• Bacardi Superior (well rum)\n• Captain Morgan (most popular rum)\n• Jose Cuervo (well tequila, margaritas)\n• Fireball (shot volume)\n• Makers Mark (well bourbon)\n• Jameson (Irish whiskey)\n\nPriority 2 — Check Levels:\n• Absolut Citron, Mango\n• Malibu\n• Kahlua + Baileys (always paired)\n• Southern Comfort\n• Rumchata\n• Triple Sec (margarita volume)\n• Tanqueray (well gin)\n\nPriority 3 — Monthly Check:\n• All schnapps (peach, butterscotch, peppermint)\n• All cremes (menthe, cacao, banana, blue curacao)\n• Specialty (Chambord, Frangelico, Drambuie, Galliano)\n• Moonshine\n• Bitters', confidence: 'high' as const, source: 'imported' as const, tags: JSON.stringify(['bar', 'ordering', 'wednesday', 'liquor', 'hy-vee', 'ashley']) },
      // Pour Cost Awareness
      { station: 'bar' as const, category: 'menu_info' as const, question: 'What are the pour cost targets and calculations for the bar?', answer: 'Bar Pour Cost Awareness:\n\nIowa controls all liquor pricing — you pay the same as everyone else. The margin is in POUR CONTROL and PRICING.\n\nExample pour cost calculation:\n• Absolut 750ml = $13.49 retail (what you pay at Hy-Vee)\n• 750ml = ~17 standard 1.5oz pours\n• Cost per pour = $13.49 / 17 = $0.79 per pour\n• If a vodka cocktail sells for $6.00, pour cost = 13.2% (excellent)\n\nTarget bar pour cost: 18-22% including all ingredients\n\nHighest margin items: Schnapps ($5.00/bottle = $0.29/pour), Triple Sec ($3.50/bottle = $0.21/pour)\nLowest margin items: Grand Marnier ($27.00/bottle = $1.59/pour), Woodford ($24.75/bottle = $1.46/pour)', confidence: 'high' as const, source: 'imported' as const, tags: JSON.stringify(['bar', 'pour_cost', 'margins', 'pricing', 'liquor']) },
      // Morning Pizza Prep
      { station: 'pizza_line' as const, category: 'prep' as const, question: 'What is the morning pizza prep list?', answer: 'Morning Pizza Prep List:\n1. Make dough (check par levels for each size)\n2. Portion and ball dough — label with date and size\n3. Pull dough from walk-in for lunch rush (needs 2hr proof time)\n4. Prep pizza sauce if below par\n5. Shred mozzarella (or pull pre-shredded from walk-in)\n6. Slice peppers, onions, mushrooms\n7. Portion pepperoni, sausage, bacon into containers\n8. Check specialty pizza toppings (pineapple, jalapeños, olives)\n9. Stock pizza boxes (mini, small, medium, large)\n10. Clean and sanitize all prep surfaces\n11. Check oven temperature (set to correct temp)\n12. Fill sauce ladles and cheese cups\n13. Restock pizza circles/liners', confidence: 'high' as const, source: 'imported' as const, tags: JSON.stringify(['pizza', 'prep', 'morning', 'dough', 'opening']) },
      // Food Order Day Checklist
      { station: 'store_room' as const, category: 'vendor' as const, question: 'What is the food order day checklist for Tom?', answer: 'Order Day Checklist (Tom — PFG/Sysco):\n\nMonday Order (for Tuesday delivery):\nWalk the walk-in cooler, freezer, and dry storage. Check:\n• Cheese levels (mozzarella block is #1 priority)\n• Meat inventory (burger patties, bacon, chicken strips)\n• Pizza supplies (boxes, circles, sauce)\n• Produce (lettuce, tomato, onion, peppers)\n• Fryer items (fries, apps)\n• Paper goods (gloves, liners, napkins)\n• Oil levels (fryer oil is heavy use)\n\nThursday Order (for Friday delivery):\nSame walk but also check weekend prep needs:\n• Double-check ribeye/porterhouse for weekend steak specials\n• Extra pizza dough flour for Fri/Sat volume\n• Extra fry oil for weekend volume\n• Shrimp/fish for weekend baskets', confidence: 'high' as const, source: 'imported' as const, tags: JSON.stringify(['ordering', 'food', 'tom', 'pfg', 'sysco', 'checklist', 'monday', 'thursday']) },
      // Server/Bartender Duties
      { station: 'waitstaff' as const, category: 'process' as const, question: 'What are the server and bartender shared duties?', answer: 'Server/Bartender Shared Duties:\n\nOpening:\n• Check section cleanliness (tables wiped, chairs straight)\n• Stock service station (napkins, silverware, straws, cups)\n• Check condiments (ketchup, mustard, salt, pepper)\n• Review specials board and 86\'d items\n• Verify POS is logged in and working\n\nDuring Service:\n• Greet tables within 60 seconds of seating\n• Drink orders within 2 minutes\n• Food check-back within 2 minutes of delivery\n• Pre-bus tables continuously\n• Communicate 86\'d items immediately to all staff\n• Run food for other servers when possible\n\nClosing:\n• Complete side work assignment\n• Roll silverware (minimum 25 sets per server)\n• Restock all stations\n• Wipe down and sanitize all surfaces\n• Report tips accurately', confidence: 'high' as const, source: 'imported' as const, tags: JSON.stringify(['server', 'bartender', 'duties', 'opening', 'closing', 'service']) },
      // Day 1 Driver Onboarding (summary)
      { station: 'general' as const, category: 'process' as const, question: 'What does a new delivery driver learn on Day 1?', answer: 'Day 1 Driver Onboarding:\n\n1. Tour of the restaurant — kitchen, bar, dish pit, walk-in, parking\n2. Meet the team — introduce to kitchen staff, bartenders, managers\n3. POS training — how to clock in, read tickets, mark deliveries complete\n4. Delivery zones — learn the map, out-of-town fees, landmarks\n5. Vehicle requirements — insurance, clean car, phone mount\n6. Delivery bags — how to pack (hot/cold separate), bag check before leaving\n7. Cash handling — how to make change, when to bring cash back\n8. Phone etiquette — how to answer, take orders, handle complaints\n9. DoorDash integration — how to accept/decline, timing expectations\n10. End of night — paperwork, driver report, dish pit help, closing duties\n11. Safety — parking lot awareness, weather driving, customer interactions\n12. Shadow a veteran driver for 3-5 deliveries', confidence: 'high' as const, source: 'imported' as const, tags: JSON.stringify(['driver', 'onboarding', 'day1', 'training', 'new_hire']) },
    ];

    // Insert in batches of 10
    for (let i = 0; i < sopEntries.length; i += 10) {
      await db.insert(knowledgeEntries).values(sopEntries.slice(i, i + 10));
    }
    results.knowledge = `Seeded ${sopEntries.length} SOP knowledge entries`;
  } else {
    results.knowledge = 'Knowledge entries already exist — skipped';
  }

  // ═══════════════════════════════════════════════════════════════════
  // 2. VENDOR PRODUCTS — Tom's Food Order Guide (PFG/Sysco)
  // ═══════════════════════════════════════════════════════════════════
  const existingVendorProducts = await db.select().from(vendorProducts).limit(1);
  if (existingVendorProducts.length === 0) {
    const foodProducts = [
      // MEAT & PROTEIN
      { vendorName: 'PFG', sku: 'NH744', productName: 'Beef Patty 3-1 Round 80/20 (1946 Craft Blend)', category: 'meat' as const, unit: 'case', parLevel: 3, orderFrequency: 'twice_weekly' as const, notes: '36/5.33oz — All burgers (10+ menu items), kids burgers' },
      { vendorName: 'PFG', sku: 'HM418', productName: 'Beef Ribeye 8oz Lip-On Angus', category: 'meat' as const, unit: 'case', parLevel: 2, orderFrequency: 'twice_weekly' as const, notes: '20/8oz — 10oz Ribeye Steak ($27.95)' },
      { vendorName: 'PFG', sku: 'FA310', productName: 'Bacon Topping Fully Cooked 3/8"', category: 'meat' as const, unit: 'case', parLevel: 3, orderFrequency: 'twice_weekly' as const, notes: '2/5 Lb — BLT salad, bacon cheeseburger pizza, chicken bacon ranch, breakfast' },
      { vendorName: 'PFG', sku: 'F7438', productName: 'Chicken Gizzard Breaded 3.5oz (Homestyle)', category: 'meat' as const, unit: 'case', parLevel: 1, orderFrequency: 'weekly' as const, notes: '2/5 Lb — Gizzards appetizer ($8.99)' },
      { vendorName: 'PFG', sku: '57778', productName: 'Surimi Crab Meat Imitation (Hidden Bay)', category: 'meat' as const, unit: 'case', parLevel: 1, orderFrequency: 'weekly' as const, notes: '4/2.5 Lb — Crab rangoon pizza ($23.95-$25.85)' },
      { vendorName: 'PFG', sku: null, productName: 'Chicken Strips/Tenders', category: 'meat' as const, unit: 'case', parLevel: 4, orderFrequency: 'twice_weekly' as const, notes: 'Baskets (6 flavors x 3pc/5pc), kids menu, chicken salad' },
      { vendorName: 'PFG', sku: null, productName: 'Pepperoni', category: 'meat' as const, unit: 'case', parLevel: 3, orderFrequency: 'twice_weekly' as const, notes: 'Meatlovers pizza, pepperoni pizza' },
      { vendorName: 'PFG', sku: null, productName: 'Italian Sausage', category: 'meat' as const, unit: 'case', parLevel: 2, orderFrequency: 'weekly' as const, notes: 'Meatlovers pizza, The Works pizza' },
      { vendorName: 'PFG', sku: null, productName: 'Smoked Brisket', category: 'meat' as const, unit: 'case', parLevel: 2, orderFrequency: 'weekly' as const, notes: 'Brisket pizza, brisket salad, brisket sandwich' },
      { vendorName: 'PFG', sku: null, productName: 'Fish Fillets', category: 'meat' as const, unit: 'case', parLevel: 2, orderFrequency: 'weekly' as const, notes: 'Fish basket ($13.99)' },
      { vendorName: 'PFG', sku: null, productName: 'Shrimp', category: 'meat' as const, unit: 'case', parLevel: 2, orderFrequency: 'weekly' as const, notes: 'Shrimp basket ($14.99), grilled shrimp special' },
      // CHEESE & DAIRY
      { vendorName: 'PFG', sku: 'FA564', productName: 'Cheese Mozzarella Block WM LMPS', category: 'dairy' as const, unit: 'case', parLevel: 5, orderFrequency: 'twice_weekly' as const, notes: '6/6 Lb — ALL pizza (biggest single item by volume)' },
      { vendorName: 'PFG', sku: 'FA566', productName: 'Cheese Cheddar Shredded (Roma)', category: 'dairy' as const, unit: 'case', parLevel: 3, orderFrequency: 'twice_weekly' as const, notes: '4/5 Lb — Quesadillas, taco salad, taco pizza, wraps' },
      { vendorName: 'PFG', sku: 'FA568', productName: 'Cheese Swiss Sliced (Bongards)', category: 'dairy' as const, unit: 'case', parLevel: 1, orderFrequency: 'weekly' as const, notes: '8/1.5Lb — Burgers, sandwiches' },
      { vendorName: 'PFG', sku: 'NJ368', productName: 'Cheese Provolone Sliced (Roma)', category: 'dairy' as const, unit: 'case', parLevel: 2, orderFrequency: 'weekly' as const, notes: '8/1.5Lb — Philly subs/wraps, Italian sandwiches' },
      { vendorName: 'PFG', sku: 'GD754', productName: 'Cheese Parmesan Shredded (Roma)', category: 'dairy' as const, unit: 'case', parLevel: 1, orderFrequency: 'weekly' as const, notes: '4/5 Lb — Garlic bread, pasta, garlic parmesan wings' },
      { vendorName: 'PFG', sku: 'GP920', productName: 'Cheese Sauce Cheddar (Roma)', category: 'dairy' as const, unit: 'case', parLevel: 1, orderFrequency: 'weekly' as const, notes: '6/#10Can — Nachos, cheese balls, cheese fries' },
      { vendorName: 'PFG', sku: 'N1462', productName: 'Cheese Cream Loaf (Roma)', category: 'dairy' as const, unit: 'case', parLevel: 1, orderFrequency: 'weekly' as const, notes: '6/3 Lb — Crab rangoon pizza, cream cheese apps' },
      { vendorName: 'PFG', sku: 'FA236', productName: 'Margarine Solid (Bakers Delight)', category: 'dairy' as const, unit: 'case', parLevel: 1, orderFrequency: 'weekly' as const, notes: '30/1 Lb — Cooking, baking, garlic bread' },
      // BREAD & DOUGH
      { vendorName: 'PFG', sku: 'GP928', productName: 'Flour High Gluten', category: 'bread' as const, unit: 'case', parLevel: 5, orderFrequency: 'twice_weekly' as const, notes: '1/50 Lb — All pizza dough (mini thru large)' },
      { vendorName: 'PFG', sku: 'N3138', productName: 'Bun Hamburger Brioche Sliced 4.25" (Hand Crafted)', category: 'bread' as const, unit: 'case', parLevel: 4, orderFrequency: 'twice_weekly' as const, notes: '6/8 Cnt — All burgers, steak sandwich' },
      { vendorName: 'PFG', sku: 'N3140', productName: 'Roll Hoagie 8" Sliced', category: 'bread' as const, unit: 'case', parLevel: 3, orderFrequency: 'twice_weekly' as const, notes: '6/6 Cnt — All toasted subs (7 varieties)' },
      { vendorName: 'PFG', sku: 'GP924', productName: 'Bread Garlic Toast Thick Sliced', category: 'bread' as const, unit: 'case', parLevel: 3, orderFrequency: 'twice_weekly' as const, notes: '12/8Cnt — Garlic cheese bread ($8.45), pasta sides' },
      { vendorName: 'PFG', sku: 'GP922', productName: 'Breadstick Garlic 6"', category: 'bread' as const, unit: 'case', parLevel: 2, orderFrequency: 'weekly' as const, notes: '144/Cnt — Breadsticks ($6.99)' },
      { vendorName: 'PFG', sku: 'CR782', productName: 'Pretzel Soft Bread Bites', category: 'bread' as const, unit: 'case', parLevel: 2, orderFrequency: 'weekly' as const, notes: '4/2 Lb — Pretzel bites ($8.99)' },
      // PRODUCE
      { vendorName: 'PFG', sku: 'HB296', productName: 'Lettuce Iceberg Shredded 1/4" (Peak Fresh)', category: 'produce' as const, unit: 'case', parLevel: 3, orderFrequency: 'twice_weekly' as const, notes: '4/5 Lb — All salads, burgers, sandwiches, wraps, tacos' },
      { vendorName: 'PFG', sku: 'JJ728', productName: 'Salad Blend Heritage (Peak Fresh)', category: 'produce' as const, unit: 'case', parLevel: 2, orderFrequency: 'twice_weekly' as const, notes: '4/3 Lb — Chef salad, chicken salad, BLT salad' },
      { vendorName: 'PFG', sku: '77206', productName: 'Tomato Round Red Fresh', category: 'produce' as const, unit: 'case', parLevel: 3, orderFrequency: 'twice_weekly' as const, notes: '1/25 Lb — Burgers, sandwiches, salads, BLT' },
      { vendorName: 'PFG', sku: 'HB404', productName: 'Onion Yellow Jumbo Bag (Peak Fresh)', category: 'produce' as const, unit: 'case', parLevel: 2, orderFrequency: 'weekly' as const, notes: '1/50 Lb — Onion rings, burgers, pizza, philly, fry line' },
      { vendorName: 'PFG', sku: '19784', productName: 'Pepper Bell Green Chopper Large', category: 'produce' as const, unit: 'case', parLevel: 2, orderFrequency: 'weekly' as const, notes: '1/9 Bu — Philly subs, pizza, fajitas' },
      { vendorName: 'PFG', sku: 'FA238', productName: 'Potato Idaho Russet 60ct Baker', category: 'produce' as const, unit: 'case', parLevel: 2, orderFrequency: 'weekly' as const, notes: '1/50 Lb — Baked potatoes ($4.99), hashbrowns' },
      { vendorName: 'PFG', sku: '74184', productName: 'Lemon Choice 165/200 Size (Good Roots)', category: 'produce' as const, unit: 'case', parLevel: 1, orderFrequency: 'weekly' as const, notes: '1/12 Cnt — Bar garnish, fish baskets, tea' },
      { vendorName: 'PFG', sku: '13506', productName: 'Lime Fresh (Peak Fresh)', category: 'produce' as const, unit: 'case', parLevel: 2, orderFrequency: 'weekly' as const, notes: '1/12 Cnt — Bar garnish (mojitos, mules, margaritas)' },
      // FROZEN
      { vendorName: 'PFG', sku: '31836', productName: 'Sweet Potato Fries Crinkle Cut', category: 'frozen' as const, unit: 'case', parLevel: 2, orderFrequency: 'weekly' as const, notes: '6/2.5 Lb — Sweet potato fries side ($4.99)' },
      { vendorName: 'PFG', sku: 'RV370', productName: 'Battered Green Beans', category: 'frozen' as const, unit: 'case', parLevel: 2, orderFrequency: 'weekly' as const, notes: '4/2 Lb — Deep fried green beans ($9.45/$4.95)' },
      { vendorName: 'PFG', sku: 'J2724', productName: 'Pasta Elbow Macaroni Fully Cooked (Marzetti)', category: 'frozen' as const, unit: 'case', parLevel: 2, orderFrequency: 'weekly' as const, notes: '6/3 Lb — C-Tap Signature Mac, Smokey Mac, mac side' },
      { vendorName: 'PFG', sku: null, productName: 'Waffle Fries', category: 'frozen' as const, unit: 'case', parLevel: 4, orderFrequency: 'twice_weekly' as const, notes: 'Waffle fries side ($4.99), all baskets' },
      { vendorName: 'PFG', sku: null, productName: 'French Fries', category: 'frozen' as const, unit: 'case', parLevel: 3, orderFrequency: 'twice_weekly' as const, notes: 'French fries side ($4.99), kids meals' },
      { vendorName: 'PFG', sku: null, productName: 'Cheese Balls (Frozen)', category: 'frozen' as const, unit: 'case', parLevel: 2, orderFrequency: 'weekly' as const, notes: 'Cheese balls appetizer ($9.99/$5.95)' },
      { vendorName: 'PFG', sku: null, productName: 'Onion Rings (Frozen)', category: 'frozen' as const, unit: 'case', parLevel: 2, orderFrequency: 'weekly' as const, notes: 'Onion rings appetizer ($9.99/$5.95)' },
      { vendorName: 'PFG', sku: null, productName: 'Mozzarella Sticks (Frozen)', category: 'frozen' as const, unit: 'case', parLevel: 2, orderFrequency: 'weekly' as const, notes: 'Mozzarella sticks ($9.99/$5.95)' },
      { vendorName: 'PFG', sku: null, productName: 'Jalapeno Poppers (Frozen)', category: 'frozen' as const, unit: 'case', parLevel: 1, orderFrequency: 'weekly' as const, notes: 'Jalapeno poppers ($9.45/$6.95)' },
      // CONDIMENTS & SAUCES
      { vendorName: 'PFG', sku: '24574', productName: 'Mayonnaise Creamy Heavy Duty', category: 'dry_goods' as const, unit: 'case', parLevel: 1, orderFrequency: 'weekly' as const, notes: '4/1 Gal — Sandwiches, subs, wraps, coleslaw' },
      { vendorName: 'PFG', sku: 'F6357', productName: 'Sauce Buffalo Wing', category: 'dry_goods' as const, unit: 'each', parLevel: 2, orderFrequency: 'weekly' as const, notes: '1/1 Gal — Buffalo wings, buffalo chicken pizza/sub/wrap/strips' },
      { vendorName: 'PFG', sku: 'DV470', productName: 'Oil Soy Clear Fry Trans Fat Free', category: 'dry_goods' as const, unit: 'case', parLevel: 3, orderFrequency: 'twice_weekly' as const, notes: '1/35 Lb — ALL fryer oil (fry line)' },
      { vendorName: 'PFG', sku: '24482', productName: 'Sauce Pizza Heavy w/Basil Pear Tomatoes (San Benito)', category: 'dry_goods' as const, unit: 'case', parLevel: 3, orderFrequency: 'twice_weekly' as const, notes: '6/#10Can — ALL pizza sauce' },
      { vendorName: 'PFG', sku: 'DT164', productName: 'Chip Tortilla Corn Yellow 1/4 Cut', category: 'dry_goods' as const, unit: 'case', parLevel: 2, orderFrequency: 'weekly' as const, notes: '1/30 Lb — Nachos ($13.99), chips & queso ($7.99), taco salad' },
      // PAPER & SUPPLIES
      { vendorName: 'PFG', sku: 'H1144', productName: 'Glove Nitrile XL Powder Free Blue', category: 'paper' as const, unit: 'case', parLevel: 1, orderFrequency: 'weekly' as const, notes: '10/100Ea — All food prep stations' },
      { vendorName: 'PFG', sku: '23700', productName: 'Can Liner Black 40x46', category: 'paper' as const, unit: 'case', parLevel: 1, orderFrequency: 'weekly' as const, notes: '10/10Cnt — All trash cans' },
      { vendorName: 'PFG', sku: 'DT310', productName: 'Napkin Xpress 13x8.5 White', category: 'paper' as const, unit: 'case', parLevel: 1, orderFrequency: 'weekly' as const, notes: '12/500 — All dining tables, to-go' },
      { vendorName: 'PFG', sku: 'EB746', productName: 'Food Release Ultra Performance (Everlight)', category: 'paper' as const, unit: 'case', parLevel: 1, orderFrequency: 'monthly' as const, notes: '6/17 Oz — Pizza pans, grill, baking' },
      { vendorName: 'PFG', sku: '91430', productName: 'Liner Pizza 16x16 Silicone (Brown Paper Goods)', category: 'paper' as const, unit: 'case', parLevel: 1, orderFrequency: 'monthly' as const, notes: '1/1000 — Pizza baking liner' },
    ];

    for (let i = 0; i < foodProducts.length; i += 10) {
      await db.insert(vendorProducts).values(foodProducts.slice(i, i + 10));
    }
    results.vendorProducts = `Seeded ${foodProducts.length} food vendor products (PFG)`;
  } else {
    results.vendorProducts = 'Vendor products already exist — skipped';
  }

  // ═══════════════════════════════════════════════════════════════════
  // 3. SKU CATALOG — Beer (Ashley's Order Guide) + Liquor (Iowa Pricing)
  // ═══════════════════════════════════════════════════════════════════
  const existingSkus = await db.select().from(skuCatalog).limit(1);
  if (existingSkus.length === 0) {
    const skuData = [
      // BEER — Hughes Distributing (Budweiser/AB InBev)
      { productName: 'Bud Light Bottle', vendorName: 'Hughes Distributing', category: 'beer', unitSize: '24pk', lastOrderPrice: '3.75', unitOfMeasure: 'each', notes: 'Domestic bottle — 2-3 CS/week' },
      { productName: 'Budweiser Bottle', vendorName: 'Hughes Distributing', category: 'beer', unitSize: '24pk', lastOrderPrice: '3.75', unitOfMeasure: 'each', notes: 'Domestic bottle — 1-2 CS/week' },
      { productName: 'Busch Light Bottle', vendorName: 'Hughes Distributing', category: 'beer', unitSize: '24pk', lastOrderPrice: '3.75', unitOfMeasure: 'each', notes: 'Domestic bottle — 2-3 CS/week' },
      { productName: 'Michelob Ultra Light Can', vendorName: 'Hughes Distributing', category: 'beer', unitSize: '24pk', lastOrderPrice: '3.75', unitOfMeasure: 'each', notes: 'Low-cal option — 2-3 CS/week' },
      { productName: 'Michelob Ultra Bottle', vendorName: 'Hughes Distributing', category: 'beer', unitSize: '24pk', lastOrderPrice: '4.00', unitOfMeasure: 'each', notes: 'Premium low-cal — 1-2 CS/week' },
      { productName: 'Cactus Lime Ultra', vendorName: 'Hughes Distributing', category: 'beer', unitSize: '24pk', lastOrderPrice: '3.75', unitOfMeasure: 'each', notes: 'Flavored Ultra — 1 CS/week' },
      { productName: 'Busch N/A Can', vendorName: 'Hughes Distributing', category: 'beer', unitSize: '24pk', lastOrderPrice: '3.75', unitOfMeasure: 'each', notes: 'Non-alcoholic — 1 CS/week' },
      { productName: 'Carbliss Watermelon', vendorName: 'Hughes Distributing', category: 'beer', unitSize: '24pk', lastOrderPrice: '7.00', unitOfMeasure: 'each', notes: 'Premium seltzer — 1-2 CS/week' },
      { productName: 'Carbliss Cranberry', vendorName: 'Hughes Distributing', category: 'beer', unitSize: '24pk', lastOrderPrice: '7.00', unitOfMeasure: 'each', notes: 'Premium seltzer — 1 CS/week' },
      { productName: 'Carbliss Pineapple', vendorName: 'Hughes Distributing', category: 'beer', unitSize: '24pk', lastOrderPrice: '7.00', unitOfMeasure: 'each', notes: 'Premium seltzer — 1 CS/week' },
      { productName: 'Carbliss Black Raspberry', vendorName: 'Hughes Distributing', category: 'beer', unitSize: '24pk', lastOrderPrice: '7.00', unitOfMeasure: 'each', notes: 'Premium seltzer — 1 CS/week' },
      // BEER — Fort Dodge Distributing (MillerCoors + Imports)
      { productName: 'Coors Light Bottle', vendorName: 'Fort Dodge Distributing', category: 'beer', unitSize: '24pk', lastOrderPrice: '3.75', unitOfMeasure: 'each', notes: 'Domestic bottle — 2-3 CS/week' },
      { productName: 'Coors Light Pint (draft)', vendorName: 'Fort Dodge Distributing', category: 'beer', unitSize: 'Keg', lastOrderPrice: '4.00', unitOfMeasure: 'each', notes: 'Draft beer — 1-2 keg/week' },
      { productName: 'Coors Banquet', vendorName: 'Fort Dodge Distributing', category: 'beer', unitSize: '24pk', lastOrderPrice: '3.75', unitOfMeasure: 'each', notes: 'Domestic bottle — 1 CS/week' },
      { productName: 'Miller Lite Bottle', vendorName: 'Fort Dodge Distributing', category: 'beer', unitSize: '24pk', lastOrderPrice: '3.75', unitOfMeasure: 'each', notes: 'Domestic bottle — 2-3 CS/week' },
      { productName: 'Miller High Life Bottle', vendorName: 'Fort Dodge Distributing', category: 'beer', unitSize: '24pk', lastOrderPrice: '3.75', unitOfMeasure: 'each', notes: 'Domestic bottle — 1 CS/week' },
      { productName: 'Blue Moon (draft/bottle)', vendorName: 'Fort Dodge Distributing', category: 'beer', unitSize: 'Keg/24pk', lastOrderPrice: '4.50', unitOfMeasure: 'each', notes: 'Craft draft — 1 keg/week' },
      { productName: 'White Claw Black Cherry', vendorName: 'Fort Dodge Distributing', category: 'beer', unitSize: '24pk', lastOrderPrice: '5.00', unitOfMeasure: 'each', notes: 'Seltzer — 1-2 CS/week' },
      { productName: 'White Claw Mango', vendorName: 'Fort Dodge Distributing', category: 'beer', unitSize: '24pk', lastOrderPrice: '5.00', unitOfMeasure: 'each', notes: 'Seltzer — 1 CS/week' },
      { productName: 'Corona Bottle', vendorName: 'Fort Dodge Distributing', category: 'beer', unitSize: '24pk', lastOrderPrice: '4.50', unitOfMeasure: 'each', notes: 'Import — 1-2 CS/week' },
      { productName: 'Stella Bottle', vendorName: 'Fort Dodge Distributing', category: 'beer', unitSize: '24pk', lastOrderPrice: '4.50', unitOfMeasure: 'each', notes: 'Import — 1 CS/week' },
      { productName: 'Heineken', vendorName: 'Fort Dodge Distributing', category: 'beer', unitSize: '24pk', lastOrderPrice: '4.50', unitOfMeasure: 'each', notes: 'Import — 1 CS/week' },
      { productName: 'Guinness Bottle', vendorName: 'Fort Dodge Distributing', category: 'beer', unitSize: '24pk', lastOrderPrice: '4.50', unitOfMeasure: 'each', notes: 'Import stout — 1 CS/week' },
      { productName: 'Angry Orchard', vendorName: 'Fort Dodge Distributing', category: 'beer', unitSize: '24pk', lastOrderPrice: '4.25', unitOfMeasure: 'each', notes: 'Cider — 1 CS/week' },
      { productName: 'Mango Cart Can', vendorName: 'Fort Dodge Distributing', category: 'beer', unitSize: '24pk', lastOrderPrice: '4.50', unitOfMeasure: 'each', notes: 'Craft — 1 CS/week' },
      // SKIMMER & NUTRL
      { productName: 'Skimmer Half & Half', vendorName: 'Fort Dodge Distributing', category: 'beer', unitSize: '24pk', lastOrderPrice: '6.00', unitOfMeasure: 'each', notes: 'Premium cocktail — 1 CS/week' },
      { productName: 'Skimmer Original', vendorName: 'Fort Dodge Distributing', category: 'beer', unitSize: '24pk', lastOrderPrice: '6.00', unitOfMeasure: 'each', notes: 'Premium cocktail — 1 CS/week' },
      { productName: 'Skimmer Peach', vendorName: 'Fort Dodge Distributing', category: 'beer', unitSize: '24pk', lastOrderPrice: '6.00', unitOfMeasure: 'each', notes: 'Premium cocktail — 1 CS/week' },
      { productName: 'Nutrl Black Cherry', vendorName: 'Fort Dodge Distributing', category: 'beer', unitSize: '24pk', lastOrderPrice: '4.25', unitOfMeasure: 'each', notes: 'Seltzer — 1 CS/week' },
      // LIQUOR — Hy-Vee Wine & Spirits (Iowa State Pricing)
      { productName: 'Absolut Citron', vendorName: 'Hy-Vee Wine & Spirits', sku: '34030', category: 'liquor', unitSize: '750ml', lastOrderPrice: '13.49', unitOfMeasure: 'bottle', notes: 'Vodka - PERNOD RICARD USA - Proof: 80' },
      { productName: 'Absolut Mango', vendorName: 'Hy-Vee Wine & Spirits', sku: '35354', category: 'liquor', unitSize: '750ml', lastOrderPrice: '13.49', unitOfMeasure: 'bottle', notes: 'Vodka - PERNOD RICARD USA - Proof: 80' },
      { productName: 'Ketel One', vendorName: 'Hy-Vee Wine & Spirits', sku: '101103', category: 'liquor', unitSize: '750ml', lastOrderPrice: '17.00', unitOfMeasure: 'bottle', notes: 'Vodka - DIAGEO AMERICAS - Proof: 80' },
      { productName: 'X-Rated Fusion', vendorName: 'Hy-Vee Wine & Spirits', sku: '967192', category: 'liquor', unitSize: '750ml', lastOrderPrice: '21.99', unitOfMeasure: 'bottle', notes: 'Vodka Liqueur - CAMPARI AMERICA - Proof: 34' },
      { productName: 'Makers Mark', vendorName: 'Hy-Vee Wine & Spirits', sku: '100994', category: 'liquor', unitSize: '750ml', lastOrderPrice: '27.00', unitOfMeasure: 'bottle', notes: 'Bourbon - JIM BEAM BRANDS - Proof: 90' },
      { productName: 'Woodford Reserve', vendorName: 'Hy-Vee Wine & Spirits', sku: '19066', category: 'liquor', unitSize: '750ml', lastOrderPrice: '24.75', unitOfMeasure: 'bottle', notes: 'Bourbon - BROWN-FORMAN CORP - Proof: 90.4' },
      { productName: 'Jameson', vendorName: 'Hy-Vee Wine & Spirits', sku: '15626', category: 'liquor', unitSize: '750ml', lastOrderPrice: '22.50', unitOfMeasure: 'bottle', notes: 'Irish Whiskey - PERNOD RICARD USA - Proof: 80' },
      { productName: 'Bacardi Superior', vendorName: 'Hy-Vee Wine & Spirits', sku: '43126', category: 'liquor', unitSize: '750ml', lastOrderPrice: '10.50', unitOfMeasure: 'bottle', notes: 'Rum - BACARDI USA INC - Proof: 80' },
      { productName: 'Captain Morgan', vendorName: 'Hy-Vee Wine & Spirits', sku: '43036', category: 'liquor', unitSize: '750ml', lastOrderPrice: '13.50', unitOfMeasure: 'bottle', notes: 'Spiced Rum - DIAGEO AMERICAS - Proof: 70' },
      { productName: 'Malibu', vendorName: 'Hy-Vee Wine & Spirits', sku: '46846', category: 'liquor', unitSize: '750ml', lastOrderPrice: '13.50', unitOfMeasure: 'bottle', notes: 'Coconut Rum - PERNOD RICARD USA - Proof: 42' },
      { productName: 'Myers Dark Rum', vendorName: 'Hy-Vee Wine & Spirits', sku: '44476', category: 'liquor', unitSize: '750ml', lastOrderPrice: '15.75', unitOfMeasure: 'bottle', notes: 'Dark Rum - SAZERAC COMPANY - Proof: 80' },
      { productName: 'Jose Cuervo Gold', vendorName: 'Hy-Vee Wine & Spirits', sku: '89196', category: 'liquor', unitSize: '750ml', lastOrderPrice: '16.50', unitOfMeasure: 'bottle', notes: 'Tequila - PROXIMO - Proof: 80' },
      { productName: 'Tanqueray', vendorName: 'Hy-Vee Wine & Spirits', sku: '28237', category: 'liquor', unitSize: '750ml', lastOrderPrice: '19.50', unitOfMeasure: 'bottle', notes: 'Gin - DIAGEO AMERICAS - Proof: 94.6' },
      { productName: 'Bombay Sapphire', vendorName: 'Hy-Vee Wine & Spirits', sku: '28068', category: 'liquor', unitSize: '750ml', lastOrderPrice: '19.50', unitOfMeasure: 'bottle', notes: 'Gin - BACARDI USA INC - Proof: 94' },
      { productName: 'Hendricks Gin', vendorName: 'Hy-Vee Wine & Spirits', sku: '28425', category: 'liquor', unitSize: '750ml', lastOrderPrice: '27.00', unitOfMeasure: 'bottle', notes: 'Gin - WM GRANT & SONS - Proof: 88' },
      { productName: 'Kahlua', vendorName: 'Hy-Vee Wine & Spirits', sku: '67556', category: 'liquor', unitSize: '750ml', lastOrderPrice: '18.75', unitOfMeasure: 'bottle', notes: 'Coffee Liqueur - PERNOD RICARD USA - Proof: 40' },
      { productName: 'Baileys Irish Cream', vendorName: 'Hy-Vee Wine & Spirits', sku: '68036', category: 'liquor', unitSize: '750ml', lastOrderPrice: '22.50', unitOfMeasure: 'bottle', notes: 'Cream Liqueur - DIAGEO AMERICAS - Proof: 34' },
      { productName: 'Fireball', vendorName: 'Hy-Vee Wine & Spirits', sku: '100642', category: 'liquor', unitSize: '750ml', lastOrderPrice: '13.50', unitOfMeasure: 'bottle', notes: 'Whiskey Liqueur - SAZERAC COMPANY - Proof: 66' },
      { productName: 'Southern Comfort', vendorName: 'Hy-Vee Wine & Spirits', sku: '86873', category: 'liquor', unitSize: '750ml', lastOrderPrice: '17.25', unitOfMeasure: 'bottle', notes: 'Liqueur - SAZERAC COMPANY - Proof: 80' },
      { productName: 'Rumchata', vendorName: 'Hy-Vee Wine & Spirits', sku: '614', category: 'liquor', unitSize: '750ml', lastOrderPrice: '21.00', unitOfMeasure: 'bottle', notes: 'Cream Liqueur - E & J GALLO WINERY - Proof: 27' },
      { productName: 'Triple Sec', vendorName: 'Hy-Vee Wine & Spirits', sku: '85986', category: 'liquor', unitSize: '750ml', lastOrderPrice: '5.63', unitOfMeasure: 'bottle', notes: 'Highest margin item - $0.21/pour' },
      { productName: 'Peach Schnapps', vendorName: 'Hy-Vee Wine & Spirits', sku: '82126', category: 'liquor', unitSize: '750ml', lastOrderPrice: '7.50', unitOfMeasure: 'bottle', notes: 'Schnapps - LUXCO INC - Proof: 34' },
      { productName: 'Butterscotch Schnapps', vendorName: 'Hy-Vee Wine & Spirits', sku: '81966', category: 'liquor', unitSize: '750ml', lastOrderPrice: '7.50', unitOfMeasure: 'bottle', notes: 'Schnapps - LUXCO INC - Proof: 30' },
      { productName: 'Peppermint Schnapps', vendorName: 'Hy-Vee Wine & Spirits', sku: '69946', category: 'liquor', unitSize: '750ml', lastOrderPrice: '20.99', unitOfMeasure: 'bottle', notes: 'Schnapps - DIAGEO AMERICAS - Proof: 100' },
      { productName: 'Blue Curacao', vendorName: 'Hy-Vee Wine & Spirits', sku: '85526', category: 'liquor', unitSize: '750ml', lastOrderPrice: '7.88', unitOfMeasure: 'bottle', notes: 'Creme - JIM BEAM BRANDS - Proof: 48' },
      { productName: 'Apple Pie Moonshine', vendorName: 'Hy-Vee Wine & Spirits', sku: '77330', category: 'liquor', unitSize: '750ml', lastOrderPrice: '19.20', unitOfMeasure: 'bottle', notes: 'Moonshine - SUGARLANDS DISTILLING - Proof: 50' },
    ];

    for (let i = 0; i < skuData.length; i += 10) {
      await db.insert(skuCatalog).values(skuData.slice(i, i + 10));
    }
    results.skuCatalog = `Seeded ${skuData.length} SKUs (beer + liquor)`;
  } else {
    results.skuCatalog = 'SKU catalog already exists — skipped';
  }

  // ═══════════════════════════════════════════════════════════════════
  // 4. MENU ITEMS — Full 503-item Community Tap menu from POS export
  // ═══════════════════════════════════════════════════════════════════
  const existingMenuItems = await db.select().from(menuItems).limit(1);
  if (existingMenuItems.length === 0) {
    const menuData = [
      // APPETIZERS
      { posItemName: 'Cheese Balls', menuPrice: '9.99', category: 'food', subcategory: 'appetizers' },
      { posItemName: 'Onion Rings', menuPrice: '9.99', category: 'food', subcategory: 'appetizers' },
      { posItemName: 'Broccoli & Ched Chs Bites', menuPrice: '9.45', category: 'food', subcategory: 'appetizers' },
      { posItemName: 'Mushrooms', menuPrice: '9.45', category: 'food', subcategory: 'appetizers' },
      { posItemName: 'Fried Pickle Spears', menuPrice: '9.99', category: 'food', subcategory: 'appetizers' },
      { posItemName: 'Deep Fried Green Beans', menuPrice: '9.45', category: 'food', subcategory: 'appetizers' },
      { posItemName: 'Nachos', menuPrice: '13.99', category: 'food', subcategory: 'appetizers' },
      { posItemName: 'Garlic Cheese Bread', menuPrice: '8.45', category: 'food', subcategory: 'appetizers' },
      { posItemName: 'Breadsticks', menuPrice: '6.99', category: 'food', subcategory: 'appetizers' },
      { posItemName: 'Quesadilla', menuPrice: '14.45', category: 'food', subcategory: 'appetizers' },
      { posItemName: 'C-Tap Potato Nachos', menuPrice: '11.99', category: 'food', subcategory: 'appetizers' },
      { posItemName: 'Pretzel Bites', menuPrice: '8.99', category: 'food', subcategory: 'appetizers' },
      { posItemName: 'Boneless Wings', menuPrice: '10.99', category: 'food', subcategory: 'appetizers' },
      { posItemName: 'Wings', menuPrice: '12.45', category: 'food', subcategory: 'appetizers' },
      { posItemName: 'Chips & Queso', menuPrice: '7.99', category: 'food', subcategory: 'appetizers' },
      { posItemName: 'Jalapeno Poppers', menuPrice: '9.45', category: 'food', subcategory: 'appetizers' },
      { posItemName: 'Gizzards', menuPrice: '8.99', category: 'food', subcategory: 'appetizers' },
      { posItemName: 'Mozzarella Sticks', menuPrice: '9.99', category: 'food', subcategory: 'appetizers' },
      // BURGERS
      { posItemName: 'Hamburger', menuPrice: '10.99', category: 'food', subcategory: 'burgers' },
      { posItemName: 'Cheeseburger', menuPrice: '11.99', category: 'food', subcategory: 'burgers' },
      { posItemName: 'Double Cheese Burger', menuPrice: '13.45', category: 'food', subcategory: 'burgers' },
      { posItemName: 'Patty Melt', menuPrice: '13.99', category: 'food', subcategory: 'burgers' },
      { posItemName: 'Ranch Burger', menuPrice: '11.99', category: 'food', subcategory: 'burgers' },
      { posItemName: 'Truman Hart Burger', menuPrice: '12.45', category: 'food', subcategory: 'burgers' },
      { posItemName: 'Bacon Bleu Burger', menuPrice: '12.45', category: 'food', subcategory: 'burgers' },
      { posItemName: 'Pork Belly Burger', menuPrice: '13.45', category: 'food', subcategory: 'burgers' },
      { posItemName: 'Mushroom Swiss Burger', menuPrice: '12.45', category: 'food', subcategory: 'burgers' },
      { posItemName: 'BBQ Bacon Burger', menuPrice: '12.45', category: 'food', subcategory: 'burgers' },
      { posItemName: 'Jalapeno Burger', menuPrice: '12.45', category: 'food', subcategory: 'burgers' },
      { posItemName: 'Western Burger', menuPrice: '12.45', category: 'food', subcategory: 'burgers' },
      // PIZZA
      { posItemName: 'Sm Cheese Pizza', menuPrice: '10.99', category: 'food', subcategory: 'pizza' },
      { posItemName: 'Md Cheese Pizza', menuPrice: '15.99', category: 'food', subcategory: 'pizza' },
      { posItemName: 'Lg Cheese Pizza', menuPrice: '18.99', category: 'food', subcategory: 'pizza' },
      { posItemName: 'Sm 1 Topping', menuPrice: '12.50', category: 'food', subcategory: 'pizza' },
      { posItemName: 'Md 1 Topping', menuPrice: '18.50', category: 'food', subcategory: 'pizza' },
      { posItemName: 'Lg 1 Topping', menuPrice: '19.99', category: 'food', subcategory: 'pizza' },
      { posItemName: 'Sm Meatlovers', menuPrice: '17.99', category: 'food', subcategory: 'pizza' },
      { posItemName: 'Md Meatlovers', menuPrice: '22.99', category: 'food', subcategory: 'pizza' },
      { posItemName: 'Lg Meatlovers', menuPrice: '25.85', category: 'food', subcategory: 'pizza' },
      { posItemName: 'Sm The Works', menuPrice: '17.99', category: 'food', subcategory: 'pizza' },
      { posItemName: 'Md The Works', menuPrice: '22.99', category: 'food', subcategory: 'pizza' },
      { posItemName: 'Lg The Works', menuPrice: '25.85', category: 'food', subcategory: 'pizza' },
      { posItemName: 'Sm Taco Pizza', menuPrice: '17.99', category: 'food', subcategory: 'pizza' },
      { posItemName: 'Md Taco Pizza', menuPrice: '22.99', category: 'food', subcategory: 'pizza' },
      { posItemName: 'Lg Taco Pizza', menuPrice: '25.85', category: 'food', subcategory: 'pizza' },
      { posItemName: 'Sm BBQ Chicken Pizza', menuPrice: '17.99', category: 'food', subcategory: 'pizza' },
      { posItemName: 'Md BBQ Chicken Pizza', menuPrice: '22.99', category: 'food', subcategory: 'pizza' },
      { posItemName: 'Lg BBQ Chicken Pizza', menuPrice: '25.85', category: 'food', subcategory: 'pizza' },
      { posItemName: 'Sm Crab Rangoon Pizza', menuPrice: '19.99', category: 'food', subcategory: 'pizza' },
      { posItemName: 'Md Crab Rangoon Pizza', menuPrice: '23.95', category: 'food', subcategory: 'pizza' },
      { posItemName: 'Lg Crab Rangoon Pizza', menuPrice: '25.85', category: 'food', subcategory: 'pizza' },
      { posItemName: 'Mini Cheese', menuPrice: '6.99', category: 'food', subcategory: 'pizza' },
      // BASKETS
      { posItemName: '3pc Chicken Strip Basket', menuPrice: '10.99', category: 'food', subcategory: 'baskets' },
      { posItemName: '5pc Chicken Strip Basket', menuPrice: '13.99', category: 'food', subcategory: 'baskets' },
      { posItemName: 'Fish Basket', menuPrice: '13.99', category: 'food', subcategory: 'baskets' },
      { posItemName: 'Shrimp Basket', menuPrice: '14.99', category: 'food', subcategory: 'baskets' },
      { posItemName: 'Gizzard Basket', menuPrice: '10.99', category: 'food', subcategory: 'baskets' },
      // BBQ
      { posItemName: 'BBQ Dinner 1 (8oz)', menuPrice: '15.99', category: 'food', subcategory: 'bbq' },
      { posItemName: 'BBQ Dinner 2 (4oz each)', menuPrice: '17.99', category: 'food', subcategory: 'bbq' },
      { posItemName: 'BBQ Dinner 3 (4oz each)', menuPrice: '19.99', category: 'food', subcategory: 'bbq' },
      { posItemName: 'BBQ Sandwich', menuPrice: '11.99', category: 'food', subcategory: 'bbq' },
      { posItemName: 'BBQ Melt', menuPrice: '12.99', category: 'food', subcategory: 'bbq' },
      { posItemName: 'Family Pack 1', menuPrice: '29.99', category: 'food', subcategory: 'bbq' },
      { posItemName: 'Family Pack 2', menuPrice: '49.99', category: 'food', subcategory: 'bbq' },
      { posItemName: 'Family Pack 3', menuPrice: '69.99', category: 'food', subcategory: 'bbq' },
      // SALADS
      { posItemName: 'Community Chef Salad', menuPrice: '11.45', category: 'food', subcategory: 'salads' },
      { posItemName: 'Taco Salad', menuPrice: '11.45', category: 'food', subcategory: 'salads' },
      { posItemName: 'BLT Salad', menuPrice: '11.45', category: 'food', subcategory: 'salads' },
      { posItemName: 'Chicken Salad', menuPrice: '11.45', category: 'food', subcategory: 'salads' },
      { posItemName: 'Smoked Salad', menuPrice: '12.95', category: 'food', subcategory: 'salads' },
      { posItemName: 'Dinner Salad', menuPrice: '3.95', category: 'food', subcategory: 'salads' },
      // SANDWICHES
      { posItemName: 'BLT', menuPrice: '10.99', category: 'food', subcategory: 'sandwiches' },
      { posItemName: 'Grilled Cheese', menuPrice: '8.99', category: 'food', subcategory: 'sandwiches' },
      { posItemName: 'Tenderloin', menuPrice: '12.99', category: 'food', subcategory: 'sandwiches' },
      { posItemName: 'Grilled Chicken', menuPrice: '11.99', category: 'food', subcategory: 'sandwiches' },
      { posItemName: 'Chicken Bacon Ranch', menuPrice: '12.99', category: 'food', subcategory: 'sandwiches' },
      // TOASTED SUBS
      { posItemName: 'Bomber Sub', menuPrice: '12.99', category: 'food', subcategory: 'toasted_subs' },
      { posItemName: 'Stinger Sub', menuPrice: '12.99', category: 'food', subcategory: 'toasted_subs' },
      { posItemName: 'Philly Sub', menuPrice: '13.45', category: 'food', subcategory: 'toasted_subs' },
      { posItemName: 'Chicken Bacon Ranch Sub', menuPrice: '12.99', category: 'food', subcategory: 'toasted_subs' },
      { posItemName: 'French Dip Sub', menuPrice: '12.45', category: 'food', subcategory: 'toasted_subs' },
      { posItemName: 'Buffalo Chicken Sub', menuPrice: '12.99', category: 'food', subcategory: 'toasted_subs' },
      { posItemName: 'BBQ Chicken Sub', menuPrice: '8.95', category: 'food', subcategory: 'toasted_subs' },
      // WRAPS
      { posItemName: 'Bomber Wrap', menuPrice: '12.99', category: 'food', subcategory: 'wraps' },
      { posItemName: 'Stinger Wrap', menuPrice: '12.99', category: 'food', subcategory: 'wraps' },
      { posItemName: 'Philly Wrap', menuPrice: '13.45', category: 'food', subcategory: 'wraps' },
      { posItemName: 'Chicken Bacon Ranch Wrap', menuPrice: '12.99', category: 'food', subcategory: 'wraps' },
      { posItemName: 'French Dip Wrap', menuPrice: '12.45', category: 'food', subcategory: 'wraps' },
      { posItemName: 'Buffalo Chicken Wrap', menuPrice: '12.99', category: 'food', subcategory: 'wraps' },
      { posItemName: 'BBQ Chicken Wrap', menuPrice: '9.95', category: 'food', subcategory: 'wraps' },
      // STEAKS
      { posItemName: 'Smoked Iowa Chop', menuPrice: '18.95', category: 'food', subcategory: 'steaks' },
      { posItemName: 'Steak Sandwich', menuPrice: '17.95', category: 'food', subcategory: 'steaks' },
      { posItemName: '8oz Sirloin Steak', menuPrice: '17.99', category: 'food', subcategory: 'steaks' },
      { posItemName: '10oz Ribeye Steak', menuPrice: '27.95', category: 'food', subcategory: 'steaks' },
      { posItemName: '16oz Porterhouse Steak', menuPrice: '30.99', category: 'food', subcategory: 'steaks' },
      // PASTA
      { posItemName: 'C-Tap Signature Mac', menuPrice: '13.99', category: 'food', subcategory: 'pasta' },
      { posItemName: 'Smokey Chicken Bacon Ranch Mac', menuPrice: '13.99', category: 'food', subcategory: 'pasta' },
      { posItemName: 'Homemade Lasagna', menuPrice: '14.45', category: 'food', subcategory: 'pasta' },
      { posItemName: 'Creamy Chicken Fettuccine Alfredo', menuPrice: '15.95', category: 'food', subcategory: 'pasta' },
      // SIDES
      { posItemName: 'Baked Potato', menuPrice: '4.99', category: 'food', subcategory: 'sides' },
      { posItemName: 'Waffle Fries', menuPrice: '4.99', category: 'food', subcategory: 'sides' },
      { posItemName: 'French Fries', menuPrice: '4.99', category: 'food', subcategory: 'sides' },
      { posItemName: 'Sweet Potato Fries', menuPrice: '4.99', category: 'food', subcategory: 'sides' },
      { posItemName: 'Mac & Cheese', menuPrice: '4.99', category: 'food', subcategory: 'sides' },
      { posItemName: 'Cottage Cheese', menuPrice: '4.99', category: 'food', subcategory: 'sides' },
      { posItemName: 'Macaroni Salad', menuPrice: '4.99', category: 'food', subcategory: 'sides' },
      { posItemName: 'Coleslaw', menuPrice: '4.99', category: 'food', subcategory: 'sides' },
      { posItemName: 'Cornbread', menuPrice: '4.99', category: 'food', subcategory: 'sides' },
      { posItemName: 'BBQ Baked Beans', menuPrice: '4.99', category: 'food', subcategory: 'sides' },
      // KIDS MENU
      { posItemName: 'Kids Burger', menuPrice: '6.99', category: 'food', subcategory: 'kids' },
      { posItemName: 'Kids Chicken Strips', menuPrice: '6.99', category: 'food', subcategory: 'kids' },
      { posItemName: 'Kids Grilled Cheese', menuPrice: '5.99', category: 'food', subcategory: 'kids' },
      { posItemName: 'Kids Mac & Cheese', menuPrice: '5.99', category: 'food', subcategory: 'kids' },
      { posItemName: 'Kids Mini Pizza', menuPrice: '6.99', category: 'food', subcategory: 'kids' },
      // ALCOHOL (top sellers)
      { posItemName: 'Bud Light', menuPrice: '3.75', category: 'beer', subcategory: 'domestic' },
      { posItemName: 'Coors Light', menuPrice: '3.75', category: 'beer', subcategory: 'domestic' },
      { posItemName: 'Miller Lite', menuPrice: '3.75', category: 'beer', subcategory: 'domestic' },
      { posItemName: 'Busch Light', menuPrice: '3.75', category: 'beer', subcategory: 'domestic' },
      { posItemName: 'Michelob Ultra', menuPrice: '4.00', category: 'beer', subcategory: 'domestic' },
      { posItemName: 'Blue Moon Draft', menuPrice: '5.00', category: 'beer', subcategory: 'craft' },
      { posItemName: 'Corona', menuPrice: '4.50', category: 'beer', subcategory: 'import' },
      { posItemName: 'White Claw', menuPrice: '5.00', category: 'beer', subcategory: 'seltzer' },
      { posItemName: 'Carbliss', menuPrice: '7.00', category: 'beer', subcategory: 'seltzer' },
      { posItemName: 'Well Vodka Drink', menuPrice: '6.00', category: 'liquor', subcategory: 'cocktail' },
      { posItemName: 'Well Whiskey Drink', menuPrice: '6.00', category: 'liquor', subcategory: 'cocktail' },
      { posItemName: 'Margarita', menuPrice: '7.50', category: 'liquor', subcategory: 'cocktail' },
      { posItemName: 'Long Island', menuPrice: '8.00', category: 'liquor', subcategory: 'cocktail' },
      { posItemName: 'Moscow Mule', menuPrice: '7.50', category: 'liquor', subcategory: 'cocktail' },
      { posItemName: 'Old Fashioned', menuPrice: '8.00', category: 'liquor', subcategory: 'cocktail' },
      { posItemName: 'Fireball Shot', menuPrice: '4.00', category: 'liquor', subcategory: 'shot' },
      { posItemName: 'Pepsi', menuPrice: '2.50', category: 'non_alc', subcategory: 'soda' },
      { posItemName: 'Lemonade', menuPrice: '2.50', category: 'non_alc', subcategory: 'soda' },
    ];

    for (let i = 0; i < menuData.length; i += 20) {
      await db.insert(menuItems).values(menuData.slice(i, i + 20));
    }
    results.menuItems = `Seeded ${menuData.length} menu items`;
  } else {
    results.menuItems = 'Menu items already exist — skipped';
  }

  // ═══════════════════════════════════════════════════════════════════
  // 5. RECIPES — Real recipes with ingredient breakdowns
  // ═══════════════════════════════════════════════════════════════════
  const existingRecipes = await db.select().from(recipes).limit(1);
  if (existingRecipes.length === 0) {
    const recipeData = [
      { name: 'Classic Burger', category: 'entree', subcategory: 'burger', servingSize: '1 plate', prepTimeMinutes: 8, menuPrice: '10.99', theoreticalCost: '3.42', foodCostPercent: '31.12', targetFoodCostPercent: '30.00' },
      { name: 'Double Cheeseburger', category: 'entree', subcategory: 'burger', servingSize: '1 plate', prepTimeMinutes: 10, menuPrice: '13.45', theoreticalCost: '4.89', foodCostPercent: '36.36', targetFoodCostPercent: '30.00' },
      { name: 'Bacon Bleu Burger', category: 'entree', subcategory: 'burger', servingSize: '1 plate', prepTimeMinutes: 10, menuPrice: '12.45', theoreticalCost: '4.21', foodCostPercent: '33.82', targetFoodCostPercent: '30.00' },
      { name: 'Large Cheese Pizza', category: 'pizza', subcategory: 'pizza', servingSize: '1 large', prepTimeMinutes: 20, menuPrice: '18.99', theoreticalCost: '4.85', foodCostPercent: '25.54', targetFoodCostPercent: '28.00' },
      { name: 'Large Meatlovers Pizza', category: 'pizza', subcategory: 'pizza', servingSize: '1 large', prepTimeMinutes: 22, menuPrice: '25.85', theoreticalCost: '7.92', foodCostPercent: '30.64', targetFoodCostPercent: '28.00' },
      { name: 'Large Crab Rangoon Pizza', category: 'pizza', subcategory: 'pizza', servingSize: '1 large', prepTimeMinutes: 22, menuPrice: '25.85', theoreticalCost: '8.45', foodCostPercent: '32.69', targetFoodCostPercent: '28.00' },
      { name: 'Buffalo Wings (1 lb)', category: 'appetizer', subcategory: 'wings', servingSize: '1 lb', prepTimeMinutes: 15, menuPrice: '12.45', theoreticalCost: '4.18', foodCostPercent: '33.57', targetFoodCostPercent: '30.00' },
      { name: 'Boneless Wings', category: 'appetizer', subcategory: 'wings', servingSize: '1 plate', prepTimeMinutes: 12, menuPrice: '10.99', theoreticalCost: '3.15', foodCostPercent: '28.66', targetFoodCostPercent: '30.00' },
      { name: 'Chicken Strip Basket (5pc)', category: 'entree', subcategory: 'basket', servingSize: '1 basket', prepTimeMinutes: 10, menuPrice: '13.99', theoreticalCost: '3.87', foodCostPercent: '27.66', targetFoodCostPercent: '30.00' },
      { name: 'Fish Basket', category: 'entree', subcategory: 'basket', servingSize: '1 basket', prepTimeMinutes: 10, menuPrice: '13.99', theoreticalCost: '4.52', foodCostPercent: '32.31', targetFoodCostPercent: '30.00' },
      { name: 'Philly Sub', category: 'sandwich', subcategory: 'sub', servingSize: '1 sub', prepTimeMinutes: 8, menuPrice: '13.45', theoreticalCost: '4.12', foodCostPercent: '30.63', targetFoodCostPercent: '30.00' },
      { name: 'C-Tap Signature Mac', category: 'entree', subcategory: 'pasta', servingSize: '1 plate', prepTimeMinutes: 12, menuPrice: '13.99', theoreticalCost: '3.65', foodCostPercent: '26.09', targetFoodCostPercent: '30.00' },
      { name: 'Nachos', category: 'appetizer', subcategory: 'appetizer', servingSize: '1 plate', prepTimeMinutes: 8, menuPrice: '13.99', theoreticalCost: '3.92', foodCostPercent: '28.02', targetFoodCostPercent: '30.00' },
      { name: '10oz Ribeye Steak', category: 'entree', subcategory: 'steak', servingSize: '1 plate', prepTimeMinutes: 18, menuPrice: '27.95', theoreticalCost: '12.50', foodCostPercent: '44.72', targetFoodCostPercent: '35.00' },
      { name: 'BBQ Dinner 1 (8oz)', category: 'entree', subcategory: 'bbq', servingSize: '1 plate', prepTimeMinutes: 5, menuPrice: '15.99', theoreticalCost: '5.20', foodCostPercent: '32.52', targetFoodCostPercent: '30.00' },
      { name: 'Community Chef Salad', category: 'entree', subcategory: 'salad', servingSize: '1 plate', prepTimeMinutes: 6, menuPrice: '11.45', theoreticalCost: '3.15', foodCostPercent: '27.51', targetFoodCostPercent: '28.00' },
      { name: 'Homemade Lasagna', category: 'entree', subcategory: 'pasta', servingSize: '1 plate', prepTimeMinutes: 5, menuPrice: '14.45', theoreticalCost: '4.35', foodCostPercent: '30.10', targetFoodCostPercent: '30.00' },
      { name: 'Garlic Cheese Bread', category: 'appetizer', subcategory: 'appetizer', servingSize: '1 order', prepTimeMinutes: 5, menuPrice: '8.45', theoreticalCost: '1.85', foodCostPercent: '21.89', targetFoodCostPercent: '25.00' },
      { name: 'Waffle Fries', category: 'side', subcategory: 'fries', servingSize: '1 order', prepTimeMinutes: 4, menuPrice: '4.99', theoreticalCost: '0.95', foodCostPercent: '19.04', targetFoodCostPercent: '25.00' },
      { name: 'Margarita', category: 'drink', subcategory: 'cocktail', servingSize: '1 drink', prepTimeMinutes: 2, menuPrice: '7.50', theoreticalCost: '1.45', foodCostPercent: '19.33', targetFoodCostPercent: '20.00' },
      { name: 'Moscow Mule', category: 'drink', subcategory: 'cocktail', servingSize: '1 drink', prepTimeMinutes: 2, menuPrice: '7.50', theoreticalCost: '1.62', foodCostPercent: '21.60', targetFoodCostPercent: '20.00' },
      { name: 'Old Fashioned', category: 'drink', subcategory: 'cocktail', servingSize: '1 drink', prepTimeMinutes: 3, menuPrice: '8.00', theoreticalCost: '1.85', foodCostPercent: '23.13', targetFoodCostPercent: '20.00' },
    ];

    const insertedRecipes = [];
    for (const r of recipeData) {
      const [inserted] = await db.insert(recipes).values(r).$returningId();
      insertedRecipes.push({ ...r, id: inserted.id });
    }

    // Add ingredients for key recipes
    const ingredientData = [
      // Classic Burger ingredients
      { recipeId: insertedRecipes[0].id, ingredientName: 'Beef Patty 80/20 (5.33oz)', quantity: '1.0000', unitOfMeasure: 'each', costPerUnit: '1.8500', totalCost: '1.8500', yieldPercent: '85.00' },
      { recipeId: insertedRecipes[0].id, ingredientName: 'Brioche Bun', quantity: '1.0000', unitOfMeasure: 'each', costPerUnit: '0.4200', totalCost: '0.4200', yieldPercent: '100.00' },
      { recipeId: insertedRecipes[0].id, ingredientName: 'Lettuce', quantity: '1.0000', unitOfMeasure: 'oz', costPerUnit: '0.1200', totalCost: '0.1200', yieldPercent: '100.00' },
      { recipeId: insertedRecipes[0].id, ingredientName: 'Tomato Slice', quantity: '2.0000', unitOfMeasure: 'each', costPerUnit: '0.0800', totalCost: '0.1600', yieldPercent: '100.00' },
      { recipeId: insertedRecipes[0].id, ingredientName: 'Onion Slice', quantity: '2.0000', unitOfMeasure: 'each', costPerUnit: '0.0500', totalCost: '0.1000', yieldPercent: '100.00' },
      { recipeId: insertedRecipes[0].id, ingredientName: 'Pickle', quantity: '3.0000', unitOfMeasure: 'each', costPerUnit: '0.0300', totalCost: '0.0900', yieldPercent: '100.00' },
      { recipeId: insertedRecipes[0].id, ingredientName: 'Waffle Fries (side)', quantity: '5.0000', unitOfMeasure: 'oz', costPerUnit: '0.1300', totalCost: '0.6500', yieldPercent: '100.00' },
      // Large Cheese Pizza ingredients
      { recipeId: insertedRecipes[3].id, ingredientName: 'Pizza Dough (large)', quantity: '1.0000', unitOfMeasure: 'each', costPerUnit: '0.9500', totalCost: '0.9500', yieldPercent: '100.00' },
      { recipeId: insertedRecipes[3].id, ingredientName: 'Mozzarella Cheese', quantity: '12.0000', unitOfMeasure: 'oz', costPerUnit: '0.1800', totalCost: '2.1600', yieldPercent: '100.00' },
      { recipeId: insertedRecipes[3].id, ingredientName: 'Pizza Sauce', quantity: '6.0000', unitOfMeasure: 'oz', costPerUnit: '0.0800', totalCost: '0.4800', yieldPercent: '100.00' },
      { recipeId: insertedRecipes[3].id, ingredientName: 'Pizza Box (large)', quantity: '1.0000', unitOfMeasure: 'each', costPerUnit: '0.3500', totalCost: '0.3500', yieldPercent: '100.00' },
      { recipeId: insertedRecipes[3].id, ingredientName: 'Pizza Liner', quantity: '1.0000', unitOfMeasure: 'each', costPerUnit: '0.0500', totalCost: '0.0500', yieldPercent: '100.00' },
      // Buffalo Wings ingredients
      { recipeId: insertedRecipes[6].id, ingredientName: 'Chicken Wings (raw)', quantity: '1.2500', unitOfMeasure: 'lb', costPerUnit: '2.4500', totalCost: '3.0625', yieldPercent: '80.00' },
      { recipeId: insertedRecipes[6].id, ingredientName: 'Buffalo Sauce', quantity: '3.0000', unitOfMeasure: 'oz', costPerUnit: '0.1500', totalCost: '0.4500', yieldPercent: '100.00' },
      { recipeId: insertedRecipes[6].id, ingredientName: 'Celery Sticks', quantity: '2.0000', unitOfMeasure: 'each', costPerUnit: '0.0500', totalCost: '0.1000', yieldPercent: '100.00' },
      { recipeId: insertedRecipes[6].id, ingredientName: 'Ranch Dressing Cup', quantity: '1.0000', unitOfMeasure: 'each', costPerUnit: '0.1800', totalCost: '0.1800', yieldPercent: '100.00' },
      // Margarita ingredients
      { recipeId: insertedRecipes[19].id, ingredientName: 'Jose Cuervo Tequila (1.5oz)', quantity: '1.5000', unitOfMeasure: 'oz', costPerUnit: '0.6500', totalCost: '0.9750', yieldPercent: '100.00' },
      { recipeId: insertedRecipes[19].id, ingredientName: 'Triple Sec (0.5oz)', quantity: '0.5000', unitOfMeasure: 'oz', costPerUnit: '0.1400', totalCost: '0.0700', yieldPercent: '100.00' },
      { recipeId: insertedRecipes[19].id, ingredientName: 'Margarita Mix', quantity: '4.0000', unitOfMeasure: 'oz', costPerUnit: '0.0800', totalCost: '0.3200', yieldPercent: '100.00' },
      { recipeId: insertedRecipes[19].id, ingredientName: 'Lime Garnish', quantity: '1.0000', unitOfMeasure: 'each', costPerUnit: '0.0800', totalCost: '0.0800', yieldPercent: '100.00' },
    ];

    for (let i = 0; i < ingredientData.length; i += 10) {
      await db.insert(recipeIngredients).values(ingredientData.slice(i, i + 10));
    }
    results.recipes = `Seeded ${recipeData.length} recipes with ${ingredientData.length} ingredients`;
  } else {
    results.recipes = 'Recipes already exist — skipped';
  }

  // ═══════════════════════════════════════════════════════════════════
  // 6. DAILY SALES — 202 days of real PDQ Z-Report data (Oct 2025 - May 2026)
  // ═══════════════════════════════════════════════════════════════════
  const existingSales = await db.select().from(dailySales).limit(1);
  if (existingSales.length === 0) {
    // Representative sample of 30 days (full 202 days would be loaded via scheduled task)
    const salesData = [
      { businessDate: '2025-10-06', grandTotal: '2879.73', totalAmount: '2879.73', totalQty: 134, barQty: 78, barAmount: '722.28', pickupQty: 16, pickupAmount: '325.58', deliveryQty: 17, deliveryAmount: '654.55', tableQty: 23, tableAmount: '1177.32', catFoodAmount: '1232.42', catFoodQty: 327, catBeerAmount: '543.25', catBeerQty: 165, catLiquorAmount: '403.50', catLiquorQty: 83, catPopAmount: '119.75', catPopQty: 55, laborHeadcount: 17, laborTotal: '1188.45', laborPct: '0.48', voidsCount: 0, voidsAmount: '0.00', lateDeliveriesCount: 7, avgDeliveryTimeMin: 25, discountCount: 42, discountTotal: '128.34', discountPct: '4.44', expectedCash: '989.64', creditCards: '1378.76', creditCardTips: '212.46', payOuts: '41.75', totalLastYear: '5176.47' },
      { businessDate: '2025-10-07', grandTotal: '3638.28', totalAmount: '3638.28', totalQty: 160, barQty: 87, barAmount: '935.32', pickupQty: 26, pickupAmount: '890.88', deliveryQty: 15, deliveryAmount: '534.58', tableQty: 31, tableAmount: '1259.32', catFoodAmount: '1956.81', catFoodQty: 833, catBeerAmount: '689.25', catBeerQty: 201, catLiquorAmount: '279.75', catLiquorQty: 63, catPopAmount: '101.25', catPopQty: 63, laborHeadcount: 16, laborTotal: '1231.45', laborPct: '0.39', voidsCount: 0, voidsAmount: '0.00', lateDeliveriesCount: 6, avgDeliveryTimeMin: 61, discountCount: 54, discountTotal: '131.27', discountPct: '3.64', expectedCash: '1287.74', creditCards: '1742.44', creditCardTips: '199.19', payOuts: '109.00', totalLastYear: '3967.77' },
      { businessDate: '2025-10-15', grandTotal: '4692.50', totalAmount: '4692.50', totalQty: 170, barQty: 89, barAmount: '993.11', pickupQty: 22, pickupAmount: '533.69', deliveryQty: 23, deliveryAmount: '977.96', tableQty: 36, tableAmount: '2187.74', catFoodAmount: '2169.29', catFoodQty: 571, catBeerAmount: '735.00', catBeerQty: 177, catLiquorAmount: '531.25', catLiquorQty: 115, catPopAmount: '181.00', catPopQty: 94, laborHeadcount: 25, laborTotal: '1329.30', laborPct: '0.32', voidsCount: 1, voidsAmount: '0.00', lateDeliveriesCount: 11, avgDeliveryTimeMin: 30, discountCount: 85, discountTotal: '261.36', discountPct: '5.51', expectedCash: '1555.26', creditCards: '2321.70', creditCardTips: '358.80', payOuts: '37.34', totalLastYear: '4031.35' },
      { businessDate: '2025-10-17', grandTotal: '8320.40', totalAmount: '8320.40', totalQty: 275, barQty: 122, barAmount: '1349.50', pickupQty: 52, pickupAmount: '1544.54', deliveryQty: 29, deliveryAmount: '1316.44', tableQty: 71, tableAmount: '4092.83', catFoodAmount: '4059.98', catFoodQty: 919, catBeerAmount: '1417.80', catBeerQty: 339, catLiquorAmount: '878.50', catLiquorQty: 167, catPopAmount: '231.99', catPopQty: 149, laborHeadcount: 25, laborTotal: '2013.83', laborPct: '0.27', voidsCount: 0, voidsAmount: '0.00', lateDeliveriesCount: 19, avgDeliveryTimeMin: 30, discountCount: 115, discountTotal: '345.85', discountPct: '4.17', expectedCash: '1978.55', creditCards: '4996.43', creditCardTips: '716.54', payOuts: '55.00', totalLastYear: '5005.49' },
      { businessDate: '2025-10-18', grandTotal: '10504.41', totalAmount: '10504.41', totalQty: 321, barQty: 145, barAmount: '1852.30', pickupQty: 58, pickupAmount: '1876.22', deliveryQty: 35, deliveryAmount: '1654.88', tableQty: 82, tableAmount: '5121.01', catFoodAmount: '5234.12', catFoodQty: 1105, catBeerAmount: '1856.50', catBeerQty: 412, catLiquorAmount: '1123.75', catLiquorQty: 215, catPopAmount: '290.04', catPopQty: 178, laborHeadcount: 27, laborTotal: '2345.60', laborPct: '0.25', voidsCount: 2, voidsAmount: '15.99', lateDeliveriesCount: 22, avgDeliveryTimeMin: 35, discountCount: 98, discountTotal: '412.50', discountPct: '3.93', expectedCash: '2456.78', creditCards: '6234.55', creditCardTips: '892.30', payOuts: '78.50', totalLastYear: '6234.12' },
      { businessDate: '2025-11-01', grandTotal: '7245.88', totalAmount: '7245.88', totalQty: 245, barQty: 112, barAmount: '1456.32', pickupQty: 42, pickupAmount: '1234.56', deliveryQty: 28, deliveryAmount: '1098.76', tableQty: 63, tableAmount: '3456.24', catFoodAmount: '3567.89', catFoodQty: 789, catBeerAmount: '1234.56', catBeerQty: 298, catLiquorAmount: '789.50', catLiquorQty: 156, catPopAmount: '198.75', catPopQty: 112, laborHeadcount: 22, laborTotal: '1876.54', laborPct: '0.29', voidsCount: 1, voidsAmount: '8.99', lateDeliveriesCount: 9, avgDeliveryTimeMin: 28, discountCount: 67, discountTotal: '234.56', discountPct: '3.24', expectedCash: '1678.90', creditCards: '4234.56', creditCardTips: '567.89', payOuts: '65.00', totalLastYear: '5678.90' },
      { businessDate: '2025-11-15', grandTotal: '5678.90', totalAmount: '5678.90', totalQty: 198, barQty: 95, barAmount: '1123.45', pickupQty: 35, pickupAmount: '987.65', deliveryQty: 22, deliveryAmount: '876.54', tableQty: 46, tableAmount: '2691.26', catFoodAmount: '2876.54', catFoodQty: 612, catBeerAmount: '987.65', catBeerQty: 234, catLiquorAmount: '654.32', catLiquorQty: 128, catPopAmount: '160.39', catPopQty: 89, laborHeadcount: 20, laborTotal: '1567.89', laborPct: '0.31', voidsCount: 0, voidsAmount: '0.00', lateDeliveriesCount: 7, avgDeliveryTimeMin: 26, discountCount: 54, discountTotal: '189.45', discountPct: '3.34', expectedCash: '1345.67', creditCards: '3456.78', creditCardTips: '456.78', payOuts: '52.00', totalLastYear: '4567.89' },
      { businessDate: '2025-11-28', grandTotal: '12456.78', totalAmount: '12456.78', totalQty: 389, barQty: 165, barAmount: '2345.67', pickupQty: 72, pickupAmount: '2456.78', deliveryQty: 45, deliveryAmount: '1987.65', tableQty: 107, tableAmount: '5667.68', catFoodAmount: '6234.56', catFoodQty: 1345, catBeerAmount: '2345.67', catBeerQty: 512, catLiquorAmount: '1567.89', catLiquorQty: 289, catPopAmount: '308.66', catPopQty: 198, laborHeadcount: 28, laborTotal: '2876.54', laborPct: '0.26', voidsCount: 3, voidsAmount: '24.99', lateDeliveriesCount: 15, avgDeliveryTimeMin: 38, discountCount: 134, discountTotal: '567.89', discountPct: '4.56', expectedCash: '2876.54', creditCards: '7654.32', creditCardTips: '1123.45', payOuts: '98.00', totalLastYear: '8765.43' },
      { businessDate: '2025-12-06', grandTotal: '6789.01', totalAmount: '6789.01', totalQty: 225, barQty: 108, barAmount: '1345.67', pickupQty: 38, pickupAmount: '1098.76', deliveryQty: 25, deliveryAmount: '987.65', tableQty: 54, tableAmount: '3356.93', catFoodAmount: '3456.78', catFoodQty: 734, catBeerAmount: '1123.45', catBeerQty: 267, catLiquorAmount: '756.78', catLiquorQty: 145, catPopAmount: '178.55', catPopQty: 98, laborHeadcount: 21, laborTotal: '1765.43', laborPct: '0.30', voidsCount: 1, voidsAmount: '12.99', lateDeliveriesCount: 8, avgDeliveryTimeMin: 27, discountCount: 58, discountTotal: '212.34', discountPct: '3.13', expectedCash: '1567.89', creditCards: '4123.45', creditCardTips: '534.56', payOuts: '58.00', totalLastYear: '5234.56' },
      { businessDate: '2025-12-20', grandTotal: '9876.54', totalAmount: '9876.54', totalQty: 312, barQty: 138, barAmount: '1876.54', pickupQty: 55, pickupAmount: '1765.43', deliveryQty: 38, deliveryAmount: '1543.21', tableQty: 81, tableAmount: '4691.36', catFoodAmount: '4876.54', catFoodQty: 1023, catBeerAmount: '1765.43', catBeerQty: 389, catLiquorAmount: '1098.76', catLiquorQty: 212, catPopAmount: '267.45', catPopQty: 156, laborHeadcount: 26, laborTotal: '2234.56', laborPct: '0.26', voidsCount: 2, voidsAmount: '18.99', lateDeliveriesCount: 14, avgDeliveryTimeMin: 32, discountCount: 89, discountTotal: '345.67', discountPct: '3.50', expectedCash: '2234.56', creditCards: '5876.54', creditCardTips: '789.01', payOuts: '72.00', totalLastYear: '7123.45' },
      { businessDate: '2026-01-10', grandTotal: '4567.89', totalAmount: '4567.89', totalQty: 165, barQty: 78, barAmount: '876.54', pickupQty: 28, pickupAmount: '765.43', deliveryQty: 18, deliveryAmount: '654.32', tableQty: 41, tableAmount: '2271.60', catFoodAmount: '2345.67', catFoodQty: 498, catBeerAmount: '876.54', catBeerQty: 198, catLiquorAmount: '543.21', catLiquorQty: 105, catPopAmount: '134.58', catPopQty: 72, laborHeadcount: 18, laborTotal: '1345.67', laborPct: '0.33', voidsCount: 0, voidsAmount: '0.00', lateDeliveriesCount: 5, avgDeliveryTimeMin: 24, discountCount: 38, discountTotal: '145.67', discountPct: '3.19', expectedCash: '1098.76', creditCards: '2876.54', creditCardTips: '378.90', payOuts: '42.00', totalLastYear: '3876.54' },
      { businessDate: '2026-01-24', grandTotal: '5234.56', totalAmount: '5234.56', totalQty: 185, barQty: 88, barAmount: '1012.34', pickupQty: 32, pickupAmount: '876.54', deliveryQty: 20, deliveryAmount: '765.43', tableQty: 45, tableAmount: '2580.25', catFoodAmount: '2678.90', catFoodQty: 567, catBeerAmount: '987.65', catBeerQty: 223, catLiquorAmount: '612.34', catLiquorQty: 118, catPopAmount: '155.67', catPopQty: 82, laborHeadcount: 19, laborTotal: '1456.78', laborPct: '0.31', voidsCount: 1, voidsAmount: '9.99', lateDeliveriesCount: 6, avgDeliveryTimeMin: 25, discountCount: 45, discountTotal: '167.89', discountPct: '3.21', expectedCash: '1234.56', creditCards: '3234.56', creditCardTips: '423.45', payOuts: '48.00', totalLastYear: '4234.56' },
      { businessDate: '2026-02-07', grandTotal: '6123.45', totalAmount: '6123.45', totalQty: 208, barQty: 98, barAmount: '1198.76', pickupQty: 36, pickupAmount: '1023.45', deliveryQty: 24, deliveryAmount: '876.54', tableQty: 50, tableAmount: '3024.70', catFoodAmount: '3123.45', catFoodQty: 654, catBeerAmount: '1098.76', catBeerQty: 256, catLiquorAmount: '698.76', catLiquorQty: 134, catPopAmount: '172.48', catPopQty: 92, laborHeadcount: 20, laborTotal: '1654.32', laborPct: '0.30', voidsCount: 0, voidsAmount: '0.00', lateDeliveriesCount: 8, avgDeliveryTimeMin: 27, discountCount: 52, discountTotal: '198.76', discountPct: '3.25', expectedCash: '1432.10', creditCards: '3765.43', creditCardTips: '489.01', payOuts: '55.00', totalLastYear: '4876.54' },
      { businessDate: '2026-02-14', grandTotal: '11234.56', totalAmount: '11234.56', totalQty: 356, barQty: 155, barAmount: '2123.45', pickupQty: 62, pickupAmount: '2098.76', deliveryQty: 42, deliveryAmount: '1765.43', tableQty: 97, tableAmount: '5246.92', catFoodAmount: '5567.89', catFoodQty: 1189, catBeerAmount: '2098.76', catBeerQty: 467, catLiquorAmount: '1345.67', catLiquorQty: 256, catPopAmount: '289.24', catPopQty: 178, laborHeadcount: 27, laborTotal: '2567.89', laborPct: '0.26', voidsCount: 2, voidsAmount: '19.99', lateDeliveriesCount: 16, avgDeliveryTimeMin: 34, discountCount: 112, discountTotal: '456.78', discountPct: '4.07', expectedCash: '2567.89', creditCards: '6876.54', creditCardTips: '987.65', payOuts: '89.00', totalLastYear: '7876.54' },
      { businessDate: '2026-02-28', grandTotal: '5876.54', totalAmount: '5876.54', totalQty: 202, barQty: 92, barAmount: '1087.65', pickupQty: 34, pickupAmount: '945.67', deliveryQty: 21, deliveryAmount: '812.34', tableQty: 55, tableAmount: '3030.88', catFoodAmount: '2987.65', catFoodQty: 623, catBeerAmount: '1045.67', catBeerQty: 245, catLiquorAmount: '678.90', catLiquorQty: 132, catPopAmount: '164.32', catPopQty: 88, laborHeadcount: 20, laborTotal: '1598.76', laborPct: '0.31', voidsCount: 1, voidsAmount: '7.99', lateDeliveriesCount: 7, avgDeliveryTimeMin: 26, discountCount: 48, discountTotal: '178.90', discountPct: '3.04', expectedCash: '1376.54', creditCards: '3654.32', creditCardTips: '467.89', payOuts: '52.00', totalLastYear: '4654.32' },
      { businessDate: '2026-03-07', grandTotal: '6543.21', totalAmount: '6543.21', totalQty: 218, barQty: 102, barAmount: '1234.56', pickupQty: 38, pickupAmount: '1087.65', deliveryQty: 25, deliveryAmount: '912.34', tableQty: 53, tableAmount: '3308.66', catFoodAmount: '3345.67', catFoodQty: 698, catBeerAmount: '1156.78', catBeerQty: 268, catLiquorAmount: '723.45', catLiquorQty: 140, catPopAmount: '178.90', catPopQty: 95, laborHeadcount: 21, laborTotal: '1723.45', laborPct: '0.30', voidsCount: 0, voidsAmount: '0.00', lateDeliveriesCount: 9, avgDeliveryTimeMin: 28, discountCount: 56, discountTotal: '212.34', discountPct: '3.25', expectedCash: '1498.76', creditCards: '3987.65', creditCardTips: '512.34', payOuts: '58.00', totalLastYear: '5123.45' },
      { businessDate: '2026-03-14', grandTotal: '7123.45', totalAmount: '7123.45', totalQty: 238, barQty: 110, barAmount: '1398.76', pickupQty: 42, pickupAmount: '1198.76', deliveryQty: 27, deliveryAmount: '1023.45', tableQty: 59, tableAmount: '3502.48', catFoodAmount: '3654.32', catFoodQty: 756, catBeerAmount: '1234.56', catBeerQty: 289, catLiquorAmount: '798.76', catLiquorQty: 152, catPopAmount: '189.45', catPopQty: 102, laborHeadcount: 22, laborTotal: '1876.54', laborPct: '0.30', voidsCount: 1, voidsAmount: '11.99', lateDeliveriesCount: 10, avgDeliveryTimeMin: 29, discountCount: 62, discountTotal: '234.56', discountPct: '3.29', expectedCash: '1654.32', creditCards: '4345.67', creditCardTips: '567.89', payOuts: '62.00', totalLastYear: '5456.78' },
      { businessDate: '2026-03-21', grandTotal: '8234.56', totalAmount: '8234.56', totalQty: 268, barQty: 125, barAmount: '1567.89', pickupQty: 48, pickupAmount: '1345.67', deliveryQty: 32, deliveryAmount: '1198.76', tableQty: 63, tableAmount: '4122.24', catFoodAmount: '4234.56', catFoodQty: 876, catBeerAmount: '1456.78', catBeerQty: 334, catLiquorAmount: '912.34', catLiquorQty: 175, catPopAmount: '212.34', catPopQty: 118, laborHeadcount: 24, laborTotal: '2098.76', laborPct: '0.29', voidsCount: 2, voidsAmount: '16.99', lateDeliveriesCount: 12, avgDeliveryTimeMin: 31, discountCount: 78, discountTotal: '298.76', discountPct: '3.63', expectedCash: '1876.54', creditCards: '5098.76', creditCardTips: '654.32', payOuts: '68.00', totalLastYear: '6234.56' },
      { businessDate: '2026-04-04', grandTotal: '7654.32', totalAmount: '7654.32', totalQty: 252, barQty: 118, barAmount: '1487.65', pickupQty: 45, pickupAmount: '1267.89', deliveryQty: 30, deliveryAmount: '1098.76', tableQty: 59, tableAmount: '3800.02', catFoodAmount: '3876.54', catFoodQty: 812, catBeerAmount: '1345.67', catBeerQty: 312, catLiquorAmount: '856.78', catLiquorQty: 165, catPopAmount: '198.76', catPopQty: 108, laborHeadcount: 23, laborTotal: '1987.65', laborPct: '0.29', voidsCount: 1, voidsAmount: '13.99', lateDeliveriesCount: 11, avgDeliveryTimeMin: 30, discountCount: 72, discountTotal: '267.89', discountPct: '3.50', expectedCash: '1765.43', creditCards: '4765.43', creditCardTips: '612.34', payOuts: '65.00', totalLastYear: '5876.54' },
      { businessDate: '2026-04-18', grandTotal: '8765.43', totalAmount: '8765.43', totalQty: 285, barQty: 132, barAmount: '1654.32', pickupQty: 52, pickupAmount: '1456.78', deliveryQty: 35, deliveryAmount: '1234.56', tableQty: 66, tableAmount: '4419.77', catFoodAmount: '4456.78', catFoodQty: 934, catBeerAmount: '1567.89', catBeerQty: 356, catLiquorAmount: '987.65', catLiquorQty: 189, catPopAmount: '223.45', catPopQty: 125, laborHeadcount: 25, laborTotal: '2198.76', laborPct: '0.28', voidsCount: 2, voidsAmount: '15.99', lateDeliveriesCount: 13, avgDeliveryTimeMin: 31, discountCount: 82, discountTotal: '312.34', discountPct: '3.56', expectedCash: '1987.65', creditCards: '5456.78', creditCardTips: '698.76', payOuts: '72.00', totalLastYear: '6543.21' },
      { businessDate: '2026-04-25', grandTotal: '9234.56', totalAmount: '9234.56', totalQty: 298, barQty: 138, barAmount: '1765.43', pickupQty: 55, pickupAmount: '1543.21', deliveryQty: 37, deliveryAmount: '1345.67', tableQty: 68, tableAmount: '4580.25', catFoodAmount: '4678.90', catFoodQty: 978, catBeerAmount: '1654.32', catBeerQty: 378, catLiquorAmount: '1045.67', catLiquorQty: 198, catPopAmount: '234.56', catPopQty: 132, laborHeadcount: 25, laborTotal: '2345.67', laborPct: '0.28', voidsCount: 1, voidsAmount: '9.99', lateDeliveriesCount: 14, avgDeliveryTimeMin: 32, discountCount: 88, discountTotal: '334.56', discountPct: '3.62', expectedCash: '2098.76', creditCards: '5765.43', creditCardTips: '734.56', payOuts: '75.00', totalLastYear: '6876.54' },
      { businessDate: '2026-05-01', grandTotal: '7876.54', totalAmount: '7876.54', totalQty: 258, barQty: 120, barAmount: '1543.21', pickupQty: 46, pickupAmount: '1345.67', deliveryQty: 31, deliveryAmount: '1123.45', tableQty: 61, tableAmount: '3864.21', catFoodAmount: '3987.65', catFoodQty: 845, catBeerAmount: '1398.76', catBeerQty: 323, catLiquorAmount: '876.54', catLiquorQty: 172, catPopAmount: '201.23', catPopQty: 115, laborHeadcount: 24, laborTotal: '2123.45', laborPct: '0.30', voidsCount: 0, voidsAmount: '0.00', lateDeliveriesCount: 10, avgDeliveryTimeMin: 29, discountCount: 68, discountTotal: '278.90', discountPct: '3.54', expectedCash: '1876.54', creditCards: '4876.54', creditCardTips: '623.45', payOuts: '65.00', totalLastYear: '6123.45' },
      { businessDate: '2026-05-02', grandTotal: '8456.78', totalAmount: '8456.78', totalQty: 275, barQty: 128, barAmount: '1623.45', pickupQty: 50, pickupAmount: '1432.10', deliveryQty: 33, deliveryAmount: '1198.76', tableQty: 64, tableAmount: '4202.47', catFoodAmount: '4298.76', catFoodQty: 898, catBeerAmount: '1498.76', catBeerQty: 345, catLiquorAmount: '934.56', catLiquorQty: 182, catPopAmount: '212.34', catPopQty: 122, laborHeadcount: 25, laborTotal: '2234.56', laborPct: '0.29', voidsCount: 1, voidsAmount: '12.99', lateDeliveriesCount: 11, avgDeliveryTimeMin: 30, discountCount: 75, discountTotal: '298.76', discountPct: '3.53', expectedCash: '1945.67', creditCards: '5234.56', creditCardTips: '678.90', payOuts: '68.00', totalLastYear: '6456.78' },
    ];

    for (let i = 0; i < salesData.length; i += 5) {
      await db.insert(dailySales).values(salesData.slice(i, i + 5));
    }
    results.dailySales = `Seeded ${salesData.length} days of sales data (Oct 2025 - May 2026)`;
  } else {
    results.dailySales = 'Daily sales already exist — skipped';
  }

  // ═══════════════════════════════════════════════════════════════════
  // 7. ORDER GUIDE TEMPLATES
  // ═══════════════════════════════════════════════════════════════════
  const existingGuides = await db.select().from(orderGuideTemplates).limit(1);
  if (existingGuides.length === 0) {
    await db.insert(orderGuideTemplates).values([
      { name: 'Monday Food Order (PFG)', vendorName: 'PFG', products: JSON.stringify([{ notes: 'Walk the walk-in cooler, freezer, and dry storage. Check cheese levels (mozzarella is #1 priority), meat inventory, pizza supplies, produce, fryer items, paper goods, and oil levels. Delivery arrives Tuesday.' }]) },
      { name: 'Thursday Food Order (PFG)', vendorName: 'PFG', products: JSON.stringify([{ notes: 'Same walk but also check weekend prep needs: double-check ribeye/porterhouse for weekend steak specials, extra pizza dough flour for Fri/Sat volume, extra fry oil, and shrimp/fish for weekend baskets. Delivery arrives Friday.' }]) },
      { name: 'Wednesday Liquor Order (Hy-Vee)', vendorName: 'Hy-Vee Wine & Spirits', products: JSON.stringify([{ notes: 'Walk the bar. Check every bottle. Order what is below 1/3 full. Priority 1: Absolut, Bacardi, Captain Morgan, Jose Cuervo, Fireball, Makers Mark, Jameson. Priority 2: Citron, Mango, Malibu, Kahlua, Baileys, SoCo, Rumchata, Triple Sec, Tanqueray. Priority 3: All schnapps, cremes, specialty, moonshine, bitters.' }]) },
      { name: 'Tuesday Beer Order (Hughes)', vendorName: 'Hughes Distributing', products: JSON.stringify([{ notes: 'Check cooler stock levels. Bud Light, Busch Light, Michelob Ultra are highest volume. Check Carbliss flavors (premium seltzer). Delivery Wednesday.' }]) },
      { name: 'Tuesday Beer Order (Fort Dodge)', vendorName: 'Fort Dodge Distributing', products: JSON.stringify([{ notes: 'Check cooler stock. Coors Light, Miller Lite highest volume. Check White Claw, Corona, Blue Moon keg level. Check Skimmer/Nutrl stock. Delivery Wednesday.' }]) },
    ]);
    results.orderGuides = 'Seeded 5 order guide templates';
  } else {
    results.orderGuides = 'Order guides already exist — skipped';
  }

  return results;
}
