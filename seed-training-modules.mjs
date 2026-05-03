/**
 * Seed Training Modules — 18 modules mapped from Community Tap & Pizza SOPs
 * 
 * Each module maps to a real operational document in Google Drive.
 * Run: node seed-training-modules.mjs
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("Missing DATABASE_URL"); process.exit(1); }

const pool = mysql.createPool(DATABASE_URL);

const MODULES = [
  {
    name: "Building Tour & Safety Orientation",
    description: "Walk the entire building: kitchen stations, walk-in cooler, dry storage, bar area, dining rooms (pizza side + bar side), bathrooms, parking lot, dumpster area. Learn fire exits, first aid kit location, cleaning chemical storage, and no-smoking zones. Covers dress code expectations.",
    category: "safety",
    requiredForTrack: "all",
    requiredForLevel: 1,
    estimatedMinutes: 60,
    assessmentType: "trainer_signoff",
    passingScore: null,
    sourceDocument: "Day 1 Driver Onboarding / Server Day 1 Training"
  },
  {
    name: "Menu Knowledge — Full Menu Study",
    description: "Learn the complete menu: pizza (sizes, specialty pies), appetizers (boneless wings, garlic cheese bread, Pick 3 Apps), sandwiches, salads, sides. Know allergens, gluten-free options, and common modifications. Includes drink menu: tap beers, bottled beer, well drinks, call drinks, specialty cocktails, wine list.",
    category: "service",
    requiredForTrack: "foh",
    requiredForLevel: 1,
    estimatedMinutes: 120,
    assessmentType: "written_test",
    passingScore: 80,
    sourceDocument: "Server/Bartender Day 1 Training"
  },
  {
    name: "POS/Computer Training — PDQ System",
    description: "Learn PDQ POS system: clock in/out, open a tab, ring up dine-in/pickup/delivery orders, apply modifiers, split tickets, process payments (cash, card, gift card), close tabs, run end-of-day reports. Practice entering 10 orders with increasing complexity.",
    category: "service",
    requiredForTrack: "all",
    requiredForLevel: 1,
    estimatedMinutes: 120,
    assessmentType: "practical_demo",
    passingScore: null,
    sourceDocument: "Driver Day 1 / Server Day 1 / POS Knowledge Base"
  },
  {
    name: "Phone Order Protocol",
    description: "Answer the phone: 'Thanks for calling Community Pizza, this is [name], how can I help you?' Get phone number FIRST, then delivery address. Take order accurately, read it back, confirm total. Handle special instructions, coupon codes, and out-of-town delivery fees.",
    category: "service",
    requiredForTrack: "driver",
    requiredForLevel: 2,
    estimatedMinutes: 60,
    assessmentType: "practical_demo",
    passingScore: null,
    sourceDocument: "Day 1 Driver Onboarding — Phone Protocol Section"
  },
  {
    name: "Delivery Logistics & Driver Operations",
    description: "Learn delivery bag usage, route planning, cash handling (start with $20 bank, make change, track tips). Complete driver report at end of shift: total deliveries, cash collected, credit card tips, out-of-town runs, special runs, redeliveries. Manager must hand driver cash from till.",
    category: "service",
    requiredForTrack: "driver",
    requiredForLevel: 1,
    estimatedMinutes: 240,
    assessmentType: "trainer_signoff",
    passingScore: null,
    sourceDocument: "Day 1 Driver Onboarding / Nightly Drivers Paperwork"
  },
  {
    name: "Table Service — Full Shift Training",
    description: "Shadow experienced server for full shift. Learn table approach: greet within 60 seconds, introduce yourself, offer drink suggestions. Take orders accurately, enter into POS with correct modifiers. Run food, check back within 2 minutes. Handle complaints. Process payments. Complete side work rotation.",
    category: "service",
    requiredForTrack: "foh",
    requiredForLevel: 2,
    estimatedMinutes: 480,
    assessmentType: "manager_observation",
    passingScore: null,
    sourceDocument: "Server Day 2 Training"
  },
  {
    name: "Closing Procedures — Pizza Side",
    description: "Complete all 23 items on the pizza nightly closing checklist: oven shutdown, stainless steel polish, condiment refill, ice bin restock, silverware roll, fountain pop nozzle soak, floor sweep and mop, trash and recycling, restock to-go containers, check walk-in temps, date and label all prep items.",
    category: "food_prep",
    requiredForTrack: "pizza",
    requiredForLevel: 3,
    estimatedMinutes: 90,
    assessmentType: "checklist_completion",
    passingScore: null,
    sourceDocument: "Pizza Nightly Closing SOP"
  },
  {
    name: "Closing Procedures — Fry Line",
    description: "Complete fry line closing: filter fryers, clean flat top (scrape, degrease, polish), clean charbroiler, empty and clean steam table, refill sauce bottles, portion and date meats for next day, clean cutting boards, sweep and mop entire line, take out trash, check walk-in organization.",
    category: "food_prep",
    requiredForTrack: "kitchen",
    requiredForLevel: 3,
    estimatedMinutes: 90,
    assessmentType: "checklist_completion",
    passingScore: null,
    sourceDocument: "Fry Line Closing SOP"
  },
  {
    name: "Closing Procedures — Bar",
    description: "Complete bar closing checklist (varies by day — Mon-Sun schedule): wash all glassware, wipe down bar top and back bar, restock beer cooler (FIFO), count liquor bottles for inventory, run credit card batch, count cash drawer, prepare deposit, set alarm, lock all doors.",
    category: "service",
    requiredForTrack: "foh",
    requiredForLevel: 4,
    estimatedMinutes: 60,
    assessmentType: "checklist_completion",
    passingScore: null,
    sourceDocument: "Checklist Monday-Sunday All Waitstaff"
  },
  {
    name: "Closing Procedures — Dishwasher/Driver",
    description: "Complete dishwasher/driver nightly checklist: run all remaining dishes, clean dish machine (drain, wipe, sanitize), organize clean dish storage, sweep dish area, take out all trash and recycling, sweep parking lot, check bathrooms (restock paper, clean), mop dish area.",
    category: "equipment",
    requiredForTrack: "driver",
    requiredForLevel: 1,
    estimatedMinutes: 60,
    assessmentType: "checklist_completion",
    passingScore: null,
    sourceDocument: "DW/Driver Nightly Checklist"
  },
  {
    name: "Portion Control — Weights & Specs",
    description: "Learn and demonstrate correct portion weights for all proteins: pulled pork (4oz/6oz), brisket (5oz/8oz), ribs (half rack = 6 bones min), chicken breast (6oz), burger patties (6oz), wing portions (8pc/12pc). Use the scale for every portion. Pass weight check: 3 consecutive samples within 0.5oz tolerance.",
    category: "food_prep",
    requiredForTrack: "kitchen",
    requiredForLevel: 2,
    estimatedMinutes: 60,
    assessmentType: "weight_check",
    passingScore: null,
    sourceDocument: "BBQ Weights & Specs + Morning Pizza Prep Weights Chart"
  },
  {
    name: "Fryer Operation & Safety",
    description: "Learn fryer operation: proper oil temperature (350F most items, 375F wings), oil filtering (daily), oil change schedule (every 3-4 days). Know cook times: wings (12-14 min), fries (3-4 min), onion rings (2-3 min), cheese curds (2 min). Safety: never drop wet items in oil, use proper baskets, handle burns protocol.",
    category: "equipment",
    requiredForTrack: "kitchen",
    requiredForLevel: 2,
    estimatedMinutes: 120,
    assessmentType: "checklist_completion",
    passingScore: null,
    sourceDocument: "Daily Fryer Checklist"
  },
  {
    name: "Deep Clean — AM Rotation",
    description: "Complete the weekly AM deep clean rotation for fry line: Monday (hood vents + grease traps), Tuesday (walk-in cooler reorganize), Wednesday (all equipment exteriors), Thursday (floor drains + baseboards), Friday (freezer defrost check), Saturday (full station breakdown), Sunday (equipment maintenance check).",
    category: "food_prep",
    requiredForTrack: "kitchen",
    requiredForLevel: 3,
    estimatedMinutes: 420,
    assessmentType: "checklist_completion",
    passingScore: null,
    sourceDocument: "Weekly Deep Clean Fry Line AM"
  },
  {
    name: "Deep Clean — PM Rotation",
    description: "Complete PM deep clean tasks: charbroiler stone cleaning, flat top reseasoning, fryer boil-out (monthly), steam table descaling, cutting board replacement rotation, knife sharpening, and sanitizer concentration testing.",
    category: "food_prep",
    requiredForTrack: "kitchen",
    requiredForLevel: 3,
    estimatedMinutes: 420,
    assessmentType: "checklist_completion",
    passingScore: null,
    sourceDocument: "Fry Line PM Cleaning"
  },
  {
    name: "BBQ Handling Protocol & Kitchen Rules",
    description: "Mandatory acknowledgment of kitchen protocol: no phones on the line, no eating while working, proper handwashing (every 30 min), glove usage for ready-to-eat foods, temperature danger zone (40F-140F), proper cooling procedures. BBQ specifics: internal temps (pork 195F, brisket 203F, chicken 165F), resting times, proper wrapping.",
    category: "safety",
    requiredForTrack: "kitchen",
    requiredForLevel: 1,
    estimatedMinutes: 30,
    assessmentType: "trainer_signoff",
    passingScore: null,
    sourceDocument: "Kitchen Protocol Final Warning / BBQ Weights & Specs"
  },
  {
    name: "Drink Making & Bar Skills",
    description: "Learn well drink recipes, popular cocktails (Captain & Coke, Vodka Cranberry, Margarita, Old Fashioned), draft beer pouring (proper head, correct glass), wine service. Know the tap list and rotation schedule. Learn cooler organization: beer by brand, rotate stock (FIFO), check dates. Speed test: make 5 drinks in under 3 minutes.",
    category: "service",
    requiredForTrack: "foh",
    requiredForLevel: 4,
    estimatedMinutes: 420,
    assessmentType: "manager_observation",
    passingScore: null,
    sourceDocument: "Bar Duties / Daily Bar Order"
  },
  {
    name: "Inventory Management",
    description: "Learn inventory counting: liquor (measure bottle levels), beer (count cases + loose), wine (count bottles), supplies (napkins, straws, cups, to-go containers). Understand ordering triggers: par levels, lead times (Hy-Vee same-day, Hughes 2-day, PFG weekly). Use the order guide template. Track waste and breakage.",
    category: "management",
    requiredForTrack: "foh",
    requiredForLevel: 5,
    estimatedMinutes: 0,
    assessmentType: "manager_observation",
    passingScore: null,
    sourceDocument: "Bar Manager Role / Kitchen Manager Role"
  },
  {
    name: "Syrup & Mixer Preparation",
    description: "Learn daily bar prep recipes: simple syrup (1:1 sugar:water, boil and cool), sweet & sour mix, bloody mary mix, margarita mix. Know storage requirements (refrigerate all, label with date, discard after 3 days). Garnish prep: cut limes (8 wedges per lime), lemon wheels, orange slices, olive/cherry stock.",
    category: "food_prep",
    requiredForTrack: "foh",
    requiredForLevel: 4,
    estimatedMinutes: 60,
    assessmentType: "practical_demo",
    passingScore: null,
    sourceDocument: "Daily Bar Order (recipes section)"
  }
];

async function seedModules() {
  const conn = await pool.getConnection();
  try {
    const [existing] = await conn.query("SELECT COUNT(*) as cnt FROM worker_training_modules");
    if (existing[0].cnt > 0) {
      console.log(`Warning: ${existing[0].cnt} training modules already exist. Clearing and re-seeding...`);
      await conn.query("DELETE FROM worker_training_modules");
    }

    let inserted = 0;
    for (const mod of MODULES) {
      await conn.query(
        `INSERT INTO worker_training_modules 
         (name, description, category, requiredForTrack, requiredForLevel, estimatedMinutes, assessmentType, passingScore, sourceDocument)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [mod.name, mod.description, mod.category, mod.requiredForTrack, mod.requiredForLevel,
         mod.estimatedMinutes, mod.assessmentType, mod.passingScore, mod.sourceDocument]
      );
      inserted++;
      console.log(`  [OK] ${mod.name} (${mod.category} / ${mod.requiredForTrack} L${mod.requiredForLevel})`);
    }

    console.log(`\nSeeded ${inserted} training modules from Community Tap SOPs`);

    const [byTrack] = await conn.query(
      "SELECT requiredForTrack, COUNT(*) as cnt FROM worker_training_modules GROUP BY requiredForTrack ORDER BY cnt DESC"
    );
    console.log("\nModules by track:");
    for (const row of byTrack) {
      console.log(`   ${row.requiredForTrack}: ${row.cnt} modules`);
    }
  } finally {
    conn.release();
    await pool.end();
  }
}

seedModules().catch(err => { console.error("Seed failed:", err.message); process.exit(1); });
