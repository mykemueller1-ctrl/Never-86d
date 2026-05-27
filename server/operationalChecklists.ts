import type { checklists } from "../drizzle/schema";

type ChecklistSeed = Pick<typeof checklists.$inferInsert, "name" | "department" | "type" | "items">;

export const operationalChecklists: ChecklistSeed[] = [
  {
    name: "Opening Checklist — All Stations",
    department: "all",
    type: "opening",
    items: [
      { task: "Unlock front/back entrances, disarm alarm, and turn on dining room, bar, kitchen, pizza-side, hallway, and patio/deck lights.", required: true, order: 1 },
      { task: "Complete a first walk-through of dining room, restrooms, bar, kitchen line, pizza side, dish pit, walk-in, and patio/deck; report safety, equipment, or overnight issues.", required: true, order: 2 },
      { task: "Check walk-in, prep cooler, pizza rail, beer cooler, and line cooler temperatures; log and escalate any unit outside safe range.", required: true, order: 3 },
      { task: "Start ovens, fryers, hood vents, dish machine, POS terminals, kitchen printers, phones, music/TVs, and online ordering tablets.", required: true, order: 4 },
      { task: "Review 86'd items, specials, large parties, catering/orders, staff call-outs, and priority prep for the day.", required: true, order: 5 },
      { task: "Count starting drawers, verify change bank, and confirm payout/receipt envelopes are ready.", required: true, order: 6 },
      { task: "Stock dining room, bar, expo, pizza side, and restrooms with napkins, menus, sauces, paper goods, sanitizer buckets, towels, and gloves.", required: true, order: 7 },
      { task: "Hold a five-minute shift huddle covering assignments, specials, service standards, safety reminders, and upsell focus.", required: false, order: 8 }
    ]
  },
  {
    name: "Pizza Side Opening & Prep",
    department: "pizza_side",
    type: "opening",
    items: [
      { task: "Turn pizza ovens on and verify target bake temperature before service.", required: true, order: 1 },
      { task: "Set up dough station: pull/temper dough as directed, dust flour, verify screens, cutters, peels, and pans are clean and stocked.", required: true, order: 2 },
      { task: "Stock pizza rail with cheese, pepperoni, sausage, beef, vegetables, sauces, and backup pans; label/date all backup product.", required: true, order: 3 },
      { task: "Fill sauce bottles: ranch, BBQ, WOW, 1000 Island, buffalo, and sweet chili; wipe nozzles and label if needed.", required: true, order: 4 },
      { task: "Clean and sanitize pizza table, cold-table lids/doors, cut station, phone counter, screens, and computer/POS surfaces.", required: true, order: 5 },
      { task: "Verify phones are charged, online orders print correctly, and pizza boxes are stocked by size.", required: true, order: 6 },
      { task: "Confirm pizza-side 86'd items and low-par items with manager before the rush.", required: false, order: 7 }
    ]
  },
  {
    name: "Pizza Side Closing Checklist",
    department: "pizza_side",
    type: "closing",
    items: [
      { task: "Put dough away, cover all dough correctly, and return cheese/sauce backups to refrigeration.", required: true, order: 1 },
      { task: "Clean dough roller, pizza table, prep table, cut station, cold-table interior, lids, doors, and gaskets.", required: true, order: 2 },
      { task: "Turn pizza ovens off after the final bake and confirm hoods are shut down per closing procedure.", required: true, order: 3 },
      { task: "Stainless-polish dough wall, prep table, shelves, Pepsi coolers, and exposed equipment surfaces.", required: true, order: 4 },
      { task: "Restock pizza rail and backup cooler: cheese, beef, sausage, pepperoni, vegetables, and sauce bottles for opening crew.", required: true, order: 5 },
      { task: "Take all utensils, pans, screens, bottles, and smallwares to dish; return clean items to proper homes.", required: true, order: 6 },
      { task: "Pull pizza line out enough to sweep/mop behind and underneath; sweep and mop pizza side and store room.", required: true, order: 7 },
      { task: "Bleach/scrub trash can sides, empty trash, replace liners, and remove cardboard.", required: true, order: 8 },
      { task: "Put phones back on chargers and wipe computer screens, counters, and ticket rail.", required: true, order: 9 },
      { task: "Manager/key verifies pizza side is fully stocked and clean and that ovens are off before final initials.", required: true, order: 10 }
    ]
  },
  {
    name: "Kitchen Line Opening & Prep",
    department: "kitchen_line",
    type: "opening",
    items: [
      { task: "Turn on hood, fryers, grill/charbroiler, steam table, warmers, and prep equipment; verify all equipment reaches safe operating range.", required: true, order: 1 },
      { task: "Set sanitizer buckets and clean towels at fry, grill, prep, expo, and dish areas.", required: true, order: 2 },
      { task: "Check line cooler, steak fridge, BBQ fridge, fry freezer, dry storage, and walk-in temperatures; log any issue.", required: true, order: 3 },
      { task: "Stock fry station, grill station, salad/prep, expo, gloves, portion cups, paper boats, and backup pans to par.", required: true, order: 4 },
      { task: "Complete priority prep: wings, sauces, sliced vegetables, burger/fry backups, proteins, and station-specific par list.", required: true, order: 5 },
      { task: "Assign the daily deep-clean rotation task before the lunch/dinner rush.", required: false, order: 6 },
      { task: "Confirm kitchen 86'd and low-stock items with manager and FOH before service.", required: true, order: 7 }
    ]
  },
  {
    name: "Kitchen Line Closing Checklist",
    department: "kitchen_line",
    type: "closing",
    items: [
      { task: "Wrap, label/date, and properly store all proteins, sauces, vegetables, and prepared items.", required: true, order: 1 },
      { task: "Break down fry, grill, steam table, prep, and expo stations; run removable parts through dish.", required: true, order: 2 },
      { task: "Filter/cover fryers per manager direction; clean fryer fronts, sides, baskets, and surrounding floor.", required: true, order: 3 },
      { task: "Clean charbroiler/grill surfaces, drip trays, seasoning shelf, smoker area, and dump bucket as applicable.", required: true, order: 4 },
      { task: "Wipe and sanitize line coolers, cutting boards, handles, rails, shelves, reach-ins, and prep tables.", required: true, order: 5 },
      { task: "Complete assigned weekly deep-clean rotation item and record initials.", required: false, order: 6 },
      { task: "Sweep and mop kitchen line, under equipment edges, dry storage path, and floor drains.", required: true, order: 7 },
      { task: "Restock gloves, towels, wrap, portion cups, paper goods, sauces, and opening par backups.", required: true, order: 8 },
      { task: "Manager/key verifies refrigeration, equipment shutdown, hoods, doors, and final food-safety close.", required: true, order: 9 }
    ]
  },
  {
    name: "Bar Opening & Setup",
    department: "bar",
    type: "opening",
    items: [
      { task: "Count bar drawer, verify change bank, start POS, test receipt printer, and review tabs/house accounts from prior shift.", required: true, order: 1 },
      { task: "Ice wells and stock glassware, napkins, straws, coasters, fruit, garnishes, mixers, NA beverages, and backup liquor.", required: true, order: 2 },
      { task: "Check draft system: taps clean, kegs connected, CO2 normal, drip trays clean, and featured beer/specials updated.", required: true, order: 3 },
      { task: "Stock beer coolers, seltzers, wine, liquor shelves, canned cocktails, and backup cases to par.", required: true, order: 4 },
      { task: "Set sanitizer and wipe bar top, rails, service well, touch screens, menus, and customer-facing surfaces.", required: true, order: 5 },
      { task: "Confirm 86'd beer/liquor, low kegs, and featured pours with manager before service.", required: true, order: 6 }
    ]
  },
  {
    name: "Bar Closing Checklist",
    department: "bar",
    type: "closing",
    items: [
      { task: "Close/settle all tabs, count drawer, secure cash, attach payout/void receipts, and note discrepancies.", required: true, order: 1 },
      { task: "Clean bar top, service well, speed rails, bottle wells, soda guns, nozzles, beer taps, drip trays, mats, and sinks.", required: true, order: 2 },
      { task: "Restock beer coolers, liquor shelves, mixers, garnishes, napkins, straws, and glassware for opening.", required: true, order: 3 },
      { task: "Pull mats, sweep/mop behind bar, clean floor drains, and empty bar trash/recycling/cardboard.", required: true, order: 4 },
      { task: "Wash/polish glassware, run final dish cycle, dump ice as required, and secure fruit/garnishes.", required: true, order: 5 },
      { task: "Update 86'd list for kicked kegs, low liquor, missing NA products, and broken bar equipment.", required: true, order: 6 },
      { task: "Manager/key verifies doors, coolers, drawers, tabs, lights, and closing notes.", required: true, order: 7 }
    ]
  },
  {
    name: "Dining Room Closing Checklist",
    department: "dining_room",
    type: "closing",
    items: [
      { task: "Bus and reset all tables, booths, high-tops, patio/deck tables, and server stations.", required: true, order: 1 },
      { task: "Wipe menus, condiment caddies, chairs, booster seats, host stand, POS terminals, and customer touchpoints.", required: true, order: 2 },
      { task: "Sweep/vacuum/mop dining room, entry, hallway, restrooms, and patio/deck traffic areas.", required: true, order: 3 },
      { task: "Restock napkins, silverware, sauces, paper goods, to-go supplies, restroom paper/soap, and sanitizer.", required: true, order: 4 },
      { task: "Take out FOH trash, check parking lot/deck cigarette butts, shake rugs, and secure outdoor items.", required: true, order: 5 },
      { task: "Report guest issues, maintenance needs, large-party notes, and tomorrow setup needs in shift handoff.", required: false, order: 6 }
    ]
  },
  {
    name: "Dish Pit & Driver Closing Checklist",
    department: "dishwasher",
    type: "closing",
    items: [
      { task: "Clean shelves in dish area and put away all clean dishes, pans, screens, utensils, and smallwares.", required: true, order: 1 },
      { task: "Clean dish machine area, filter, trap, sprayer, counters, and chemical/sanitizer setup.", required: true, order: 2 },
      { task: "Clean hallway window/table, shake rug outside, and return driver bags to proper storage.", required: true, order: 3 },
      { task: "Sweep parking lot by deck and front doors for cigarette butts/trash.", required: true, order: 4 },
      { task: "Sweep and mop hallway, dish area to doorway, and wet/greasy traffic areas.", required: true, order: 5 },
      { task: "Take out garbage/cardboard, replace liners, and leave dish area ready for opening crew.", required: true, order: 6 }
    ]
  },
  {
    name: "Manager Closing Verification",
    department: "management",
    type: "closing",
    items: [
      { task: "Verify bar, kitchen line, pizza side, dining room, dish pit, restrooms, patio/deck, and storage areas are closed to standard.", required: true, order: 1 },
      { task: "Review drawers, payouts, invoices/receipts, voids/comps, driver cash, and deposit documentation.", required: true, order: 2 },
      { task: "Update 86'd items, low inventory, vendor needs, repair issues, and tomorrow's prep priorities.", required: true, order: 3 },
      { task: "Confirm refrigeration temperatures, equipment shutdown, hoods, ovens/fryers, gas, doors, alarm, and lights.", required: true, order: 4 },
      { task: "Post shift handoff: sales notes, staffing issues, guest incidents, maintenance, and follow-up owner tasks.", required: true, order: 5 }
    ]
  }
];

export function normalizeChecklistItems(items: unknown) {
  if (Array.isArray(items)) return items;
  if (typeof items === "string") {
    try {
      const parsed = JSON.parse(items);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}
