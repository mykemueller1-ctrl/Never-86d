import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const pool = mysql.createPool(process.env.DATABASE_URL);

const entries = [
  // ============ LOCAL VENDOR CONTACTS ============
  {
    question: "How do I contact Budweiser / Anheuser-Busch for keg issues or broken kegs?",
    answer: "Budweiser/Anheuser-Busch distributor for Fort Dodge area is Des Moines Beverage (DMB). Call your rep for broken/damaged kegs, short fills, or quality issues. Report broken kegs immediately — they credit your account. Keep the damaged keg and tag it with date/issue. For ordering: orders go through Ashley (Bar Manager) on the regular beer order cycle. Emergency keg issues: call the distributor direct, reference your account number. Always document with a photo before returning.",
    station: "bar",
    category: "vendor",
    confidence: "high",
    source: "manual",
    tags: JSON.stringify(["budweiser", "anheuser-busch", "keg", "broken keg", "beer distributor", "DMB", "des moines beverage"])
  },
  {
    question: "How do I contact Hughes Distributing?",
    answer: "Hughes Distributing — Fort Dodge, Iowa. Handles craft beer, specialty brands, and some imports. Order days: coordinate with Ashley. Delivery: typically 1-2 days after order. For issues (short shipments, damaged product, wrong items): call your Hughes rep immediately. Keep all delivery receipts. Hughes also handles seasonal/limited releases — ask your rep about allocation lists. Credit requests must be filed within 48 hours of delivery with photo documentation.",
    station: "bar",
    category: "vendor",
    confidence: "high",
    source: "manual",
    tags: JSON.stringify(["hughes", "hughes distributing", "craft beer", "fort dodge", "beer distributor"])
  },
  {
    question: "How do I contact Fort Dodge Distributing?",
    answer: "Fort Dodge Distributing — local distributor handling select beer brands and possibly wine. Order through Ashley on regular schedule. For delivery issues, shorts, or damaged product: call direct and reference your account. Keep delivery tickets and match against order sheets. Report discrepancies same day. They handle some local/regional brands that Hughes and Budweiser don't carry.",
    station: "bar",
    category: "vendor",
    confidence: "high",
    source: "manual",
    tags: JSON.stringify(["fort dodge distributing", "beer", "local distributor", "fort dodge"])
  },
  {
    question: "How do I contact Gailey Heating & Cooling for HVAC issues?",
    answer: "Gailey Heating & Cooling — Fort Dodge, Iowa. Our HVAC service provider. Call for: AC not cooling, heating issues, walk-in cooler/freezer problems, exhaust hood issues, make-up air unit problems. EMERGENCY (walk-in down, no heat in winter): call immediately and explain food safety risk — they prioritize restaurant emergencies. For routine maintenance: schedule through Mike (owner). Keep the thermostat settings documented. Walk-in cooler should be 34-38°F, freezer 0°F or below. If temps are rising, move product to backup cooler and call Gailey ASAP.",
    station: "general",
    category: "vendor",
    confidence: "high",
    source: "manual",
    tags: JSON.stringify(["gailey", "heating", "cooling", "hvac", "walk-in", "cooler", "freezer", "fort dodge", "ac", "air conditioning"])
  },
  {
    question: "How do I contact Green Amusement for gaming/entertainment equipment?",
    answer: "Green Amusement — Fort Dodge, Iowa. Handles our gaming machines, pool tables, dart boards, jukeboxes, and other amusement equipment. For broken machines: note the machine number/location and call Green Amusement. They typically service within 24-48 hours. For payouts/collections: they handle on their schedule. Report any customer complaints about machines immediately. If a machine is eating money without playing, put an 'Out of Order' sign and call them. Keep track of which machines are most popular for placement decisions.",
    station: "general",
    category: "vendor",
    confidence: "high",
    source: "manual",
    tags: JSON.stringify(["green amusement", "gaming", "pool table", "darts", "jukebox", "amusement", "fort dodge"])
  },
  {
    question: "How do I order from Hy-Vee Wine & Spirits?",
    answer: "Hy-Vee Wine & Spirits — Fort Dodge location. Used for emergency liquor/wine runs when Iowa ABD order won't arrive in time, or for specialty items. They offer 10% case discount on wine. Good for: emergency bottle replacements, specialty wines for events, unique spirits not on ABD list. Keep receipts for all purchases — these go through a different expense category than ABD orders. Ashley coordinates any Hy-Vee purchases. Price compare against ABD before buying — ABD is usually cheaper for standard items.",
    station: "bar",
    category: "vendor",
    confidence: "high",
    source: "manual",
    tags: JSON.stringify(["hy-vee", "hyvee", "wine", "spirits", "liquor", "fort dodge", "emergency"])
  },
  {
    question: "How do I order from Hy-Vee (main grocery store)?",
    answer: "Hy-Vee main store — Fort Dodge. Used for emergency food runs when PFG/Sysco delivery won't cover us. Common emergency items: lettuce, tomatoes, lemons/limes, milk, butter, eggs, bread. Keep ALL receipts — turn in to Mike for reimbursement or put on the store card. Price compare: PFG/Sysco is almost always cheaper per unit, so Hy-Vee is emergency only. Tom (Kitchen Manager) or the closing manager can authorize emergency Hy-Vee runs. Document what you bought and why on the receipt.",
    station: "store_room",
    category: "vendor",
    confidence: "high",
    source: "manual",
    tags: JSON.stringify(["hy-vee", "hyvee", "grocery", "emergency", "fort dodge", "food run"])
  },
  {
    question: "What is PFG CustomerFirst and how do we order through it?",
    answer: "PFG CustomerFirst is our online ordering platform for Performance Food Group (our main food vendor). Access at customerfirst.pfgc.com. Features: browse catalog, see pricing, check availability, place orders, view order history, track deliveries. Order days: Monday (for Tuesday delivery) and Thursday (for Friday delivery). Tom (Kitchen Manager) handles food orders. The system shows real-time inventory at the warehouse. You can also set up standing orders for items you always need. Our account number is 06528, rep is Steve. Use the app or website — both work. Always check the 'deals' section for weekly specials.",
    station: "store_room",
    category: "vendor",
    confidence: "high",
    source: "manual",
    tags: JSON.stringify(["pfg", "customerfirst", "ordering", "performance food group", "food order", "vendor"])
  },
  {
    question: "What is Sysco's ordering system and programs?",
    answer: "Sysco ordering goes through Sysco Shop (shop.sysco.com) or your Sysco rep. We use Sysco as secondary vendor for specialty items PFG doesn't carry (GF crusts SKU 7278698, certain chemicals, specialty sauces). Sysco Perks program: earn points on purchases, redeem for restaurant equipment/supplies. They also offer: Sysco Simply (curated products at value pricing), Sysco Brand (their house brand, good quality, 15-20% cheaper than name brand), and free menu consultation. Order through rep or online. Delivery schedule varies — confirm with your rep. Keep Sysco orders separate from PFG for accounting.",
    station: "store_room",
    category: "vendor",
    confidence: "high",
    source: "manual",
    tags: JSON.stringify(["sysco", "sysco shop", "ordering", "sysco perks", "vendor", "food order"])
  },
  {
    question: "What is PepsiCo's Local Eats program and fountain system?",
    answer: "PepsiCo Local Eats program supports independent restaurants with: marketing materials, social media support, menu design help, and potential rebates on volume. Our Pepsi fountain system: BIB (Bag-in-Box) syrup connects to the fountain machine. Change BIBs when soda tastes flat or runs out. Pepsi products we carry: Pepsi, Diet Pepsi, Mt Dew, Sierra Mist/Starry, Dr Pepper, orange, lemonade, iced tea. Fountain maintenance: clean nozzles daily, check CO2 tank pressure weekly. If fountain is down: check BIB connections, CO2 tank, and water supply. Pepsi rep handles equipment service. Rebates are based on volume — the more we pour, the better the rate. Ask about seasonal promotions and POS materials.",
    station: "bar",
    category: "vendor",
    confidence: "high",
    source: "manual",
    tags: JSON.stringify(["pepsi", "pepsico", "local eats", "fountain", "soda", "bib", "rebate", "co2"])
  },
  {
    question: "How does Iowa ABD (Alcoholic Beverages Division) ordering work?",
    answer: "Iowa ABD is the state-controlled liquor distribution. ALL liquor (spirits) in Iowa must be purchased through ABD — it's the law. Order online at iowaabd.com or by phone. Delivery: typically 2-3 business days to our address. Pricing is state-controlled (same price everywhere in Iowa). Ashley handles ABD orders on the regular liquor order cycle. Minimum order may apply for free delivery. Keep all ABD invoices for state audit compliance. ABD also handles licensing renewals and compliance. Our liquor license must be displayed visibly. Special orders (rare bottles) can be requested through ABD's special order program — takes 2-4 weeks.",
    station: "bar",
    category: "vendor",
    confidence: "high",
    source: "manual",
    tags: JSON.stringify(["iowa abd", "alcoholic beverages division", "liquor", "spirits", "state", "ordering", "license"])
  },

  // ============ TOOL PROMPTS / ACTIONABLE COMMANDS ============
  {
    question: "How do I calculate my hours worked this week?",
    answer: "To calculate hours: Check the Time Clock screen in the app — it shows your clock-in/out times and total hours for the current week. Weekly hours reset on Monday. If you need to dispute hours, talk to your manager with specific dates/times. Overtime kicks in after 40 hours/week in Iowa. Your hours are also visible on your pay stub. If the app shows different hours than you expect, check if you forgot to clock out (the system auto-clocks out at midnight if you forget). TIP: You can ask me 'how many hours did I work this week?' and I'll pull your time entries.",
    station: "general",
    category: "process",
    confidence: "high",
    source: "manual",
    tags: JSON.stringify(["hours", "calculate hours", "time clock", "weekly hours", "overtime", "pay", "clock in", "clock out"])
  },
  {
    question: "When did I work last? How do I check my recent shifts?",
    answer: "Check your recent shifts in the Schedule screen — it shows past and upcoming shifts. Your time entries show exact clock-in/out times with total hours. If you need a record of all shifts worked, ask your manager for a time report. The app tracks: date, clock-in time, clock-out time, break time, total hours. You can also ask me 'when was my last shift?' and I'll look it up for you.",
    station: "general",
    category: "process",
    confidence: "high",
    source: "manual",
    tags: JSON.stringify(["last shift", "recent shifts", "schedule", "when did i work", "time entries", "history"])
  },
  {
    question: "How do I set a timer or alarm for the oven?",
    answer: "For oven timers: Use the physical kitchen timers (hanging on the line) or the oven's built-in timer. Pizza oven cook times: Mini 8-10 min, Small 10-12 min, Medium 12-14 min, Large 14-16 min. Set the timer when the pizza goes IN. For other items: wings 12-14 min at 350°F, fries 3-4 min, onion rings 2-3 min. TIP: You can ask me 'remind me in 12 minutes' and I'll set a reminder for you. Always use a timer — never guess on cook times. Burned food = waste = money lost.",
    station: "general",
    category: "process",
    confidence: "high",
    source: "manual",
    tags: JSON.stringify(["timer", "alarm", "oven", "reminder", "cook time", "set timer", "kitchen timer"])
  },
  {
    question: "How do I send a task or message to another staff member?",
    answer: "Use the Broadcasts feature in the app to send station-wide messages (e.g., '86 mushrooms' goes to all kitchen). For individual tasks: use the Team Chat or ask your manager to assign it. For urgent issues: verbal communication is always fastest — shout it out or walk over. The app supports: station broadcasts (goes to everyone on that station), direct messages, and task assignments. Managers can assign specific tasks with deadlines. TIP: You can ask me 'send a message to kitchen that we're 86 on ranch' and I'll create the broadcast.",
    station: "general",
    category: "process",
    confidence: "high",
    source: "manual",
    tags: JSON.stringify(["send task", "message", "broadcast", "team chat", "communicate", "86", "notify"])
  },
  {
    question: "How do I email a vendor about a problem (broken keg, wrong delivery, etc.)?",
    answer: "For vendor issues: 1) Document the problem (photo + description). 2) Tell your manager immediately. 3) The manager or owner will contact the vendor. For urgent issues (broken keg during service, food safety concern): call the vendor direct — don't wait for email. Common vendor contacts: Budweiser/DMB (broken kegs), Hughes (craft beer issues), PFG (food delivery problems — call rep Steve), Sysco (specialty items), Gailey (HVAC emergency). TIP: You can ask me 'draft an email to Budweiser about a broken keg' and I'll help you write it with all the right details to include.",
    station: "general",
    category: "process",
    confidence: "high",
    source: "manual",
    tags: JSON.stringify(["email", "vendor", "broken keg", "wrong delivery", "complaint", "contact vendor", "draft email"])
  },
  {
    question: "How do I set a reminder for myself?",
    answer: "You can set reminders through the app: 1) Ask me 'remind me to check the walk-in temp at 4pm' and I'll note it. 2) Use your phone's built-in alarm/reminder for time-critical things (oven timers, break times). 3) For shift tasks: check your station checklist — it has everything you need to do. 4) For recurring reminders: add it to your station's opening/closing checklist. Pro tip: Write it on the kitchen whiteboard if it affects the whole team (e.g., 'VIP party at 7pm — need extra prep').",
    station: "general",
    category: "process",
    confidence: "high",
    source: "manual",
    tags: JSON.stringify(["reminder", "set reminder", "alarm", "notify me", "remember", "task"])
  },

  // ============ DRINK VISUALS & COCKTAILS ============
  {
    question: "How do you make a Screwdriver and what does it look like?",
    answer: "Screwdriver: 1.5oz vodka (well: Tito's or Smirnoff) + fill with orange juice. Serve in a highball glass with ice. Garnish: orange slice on rim. Visual: bright orange color, tall glass, looks refreshing. No shaking needed — just build in glass and stir. Variants: add a splash of grenadine for a 'Slow Screw', add Galliano for a 'Harvey Wallbanger'. Cost is low — OJ is cheap, vodka is well. Good upsell: suggest Tito's or Grey Goose instead of well.",
    station: "bar",
    category: "recipe",
    confidence: "high",
    source: "manual",
    tags: JSON.stringify(["screwdriver", "vodka", "orange juice", "cocktail", "highball", "well drink", "visual"])
  },
  {
    question: "How do you make a Bloody Mary and what does it look like?",
    answer: "Bloody Mary: 1.5oz vodka + fill with Bloody Mary mix (Zing Zang or house mix). Build in a pint glass with ice. Season rim with celery salt (wet rim with lime, dip in salt). Add: 2 dashes Worcestershire, 2 dashes Tabasco, pinch of black pepper, squeeze of lime. Stir well. Garnish: celery stalk, lime wedge, olive pick. Visual: deep red/tomato color, tall glass, loaded garnish on top. Some places do 'loaded' Bloodies with bacon, cheese, shrimp — ask Mike about brunch specials. Great morning/brunch drink. Upsell: Tito's, Ketel One, or make it a 'Bloody Maria' with tequila.",
    station: "bar",
    category: "recipe",
    confidence: "high",
    source: "manual",
    tags: JSON.stringify(["bloody mary", "vodka", "tomato", "brunch", "cocktail", "garnish", "visual", "celery salt"])
  },
  {
    question: "How do you make a Captain and Coke and what does it look like?",
    answer: "Captain and Coke: 1.5oz Captain Morgan Spiced Rum + fill with Coca-Cola (from fountain or can). Serve in a rocks glass or highball with ice. Garnish: lime wedge. Visual: dark cola color with a slight amber tint from the rum, lime on rim. Simple build — pour rum over ice, fill with Coke, drop lime. One of the most popular simple drinks. Variants: Captain and Diet, Captain and Ginger (ginger ale). Upsell: suggest Captain Private Stock or Kraken for a premium version.",
    station: "bar",
    category: "recipe",
    confidence: "high",
    source: "manual",
    tags: JSON.stringify(["captain morgan", "rum", "coke", "cola", "cocktail", "rocks glass", "visual", "captain and coke"])
  },
  {
    question: "How do you make a Margarita and what does it look like?",
    answer: "Margarita: 1.5oz tequila (well: Jose Cuervo Gold) + 1oz triple sec/Cointreau + 1oz fresh lime juice (or sour mix). Shake with ice, strain into salt-rimmed rocks glass with fresh ice. OR serve frozen (blended with ice). Salt rim: wet rim with lime wedge, dip in margarita salt. Garnish: lime wheel. Visual: pale yellow-green, salt-crusted rim, lime wheel — looks festive. Frozen version is slushy/opaque. Upsell: Patron, Casamigos, or Clase Azul. Flavored: add strawberry, mango, or watermelon puree. Top seller on warm days.",
    station: "bar",
    category: "recipe",
    confidence: "high",
    source: "manual",
    tags: JSON.stringify(["margarita", "tequila", "lime", "salt rim", "cocktail", "frozen", "visual", "blended"])
  },
  {
    question: "How do you make an Old Fashioned and what does it look like?",
    answer: "Old Fashioned: Muddle 1 sugar cube (or 0.5oz simple syrup) + 2-3 dashes Angostura bitters + splash of water in rocks glass. Add 2oz bourbon (well: Jim Beam or Evan Williams). Add one large ice cube or 2-3 regular cubes. Stir gently 15-20 seconds. Garnish: orange peel (express oils over drink) + luxardo cherry. Visual: amber/golden color, large ice cube, orange peel curl — looks classic and sophisticated. This is a STIRRED drink, never shaken. Upsell: Woodford Reserve, Maker's Mark, Bulleit. Iowa favorite — we sell a lot of these.",
    station: "bar",
    category: "recipe",
    confidence: "high",
    source: "manual",
    tags: JSON.stringify(["old fashioned", "bourbon", "whiskey", "bitters", "cocktail", "rocks glass", "visual", "classic"])
  },
  {
    question: "How do you make a Long Island Iced Tea and what does it look like?",
    answer: "Long Island: 0.5oz vodka + 0.5oz gin + 0.5oz rum + 0.5oz tequila + 0.5oz triple sec + 1oz sour mix + splash of Coke for color. Build in a tall/Collins glass with ice. Garnish: lemon wedge. Visual: looks like iced tea (amber/brown), tall glass, lemon wedge — deceptively strong (5 spirits!). DO NOT over-pour — this drink is already very strong. One per customer is usually enough. Upsell: use premium spirits across the board. Warn new bartenders: measure carefully, don't free-pour this one. High cost drink but high margin if poured correctly.",
    station: "bar",
    category: "recipe",
    confidence: "high",
    source: "manual",
    tags: JSON.stringify(["long island", "iced tea", "vodka", "gin", "rum", "tequila", "cocktail", "visual", "strong"])
  },
  {
    question: "How do you make a Moscow Mule and what does it look like?",
    answer: "Moscow Mule: 1.5oz vodka + 0.5oz fresh lime juice + fill with ginger beer (NOT ginger ale — ginger beer is spicier). Serve in a copper mug with ice. Garnish: lime wheel + fresh mint sprig. Visual: copper mug (iconic), lime and mint peeking out top, condensation on the cold copper — very Instagram-worthy. Build in the mug: ice, vodka, lime juice, top with ginger beer, stir gently. Variants: Kentucky Mule (bourbon), Mexican Mule (tequila), Dark & Stormy (dark rum). Upsell: Tito's, Ketel One. The copper mug makes this drink — always serve in copper.",
    station: "bar",
    category: "recipe",
    confidence: "high",
    source: "manual",
    tags: JSON.stringify(["moscow mule", "vodka", "ginger beer", "copper mug", "lime", "mint", "cocktail", "visual"])
  },
  {
    question: "What does a properly poured draft beer look like?",
    answer: "Proper draft pour: Hold glass at 45° angle, open tap fully (don't half-open — causes foam). Fill to 2/3 at angle, then straighten glass and fill to top, creating 1-1.5 inch head of foam. The head should be white, creamy, and hold its shape. Visual: golden/amber liquid (varies by style), white foam cap, clean glass with no bubbles clinging to sides (dirty glass = bubbles). Common issues: too much foam (glass not cold, dirty lines, wrong pressure), flat beer (CO2 low, old keg), off-taste (dirty lines — clean every 2 weeks). Always serve in a clean, cold glass. Frosted mugs for domestics, room-temp tulip/pint for crafts.",
    station: "bar",
    category: "process",
    confidence: "high",
    source: "manual",
    tags: JSON.stringify(["draft beer", "pour", "foam", "head", "tap", "glass", "visual", "keg"])
  },
  {
    question: "What do our different beer glasses look like and when do I use each?",
    answer: "Beer glass guide: 1) PINT GLASS (16oz shaker) — most common, use for IPAs, pale ales, ambers, stouts. 2) FROSTED MUG (16-20oz) — use for domestic lagers (Bud, Bud Light, Coors, Miller). Keep in freezer. 3) PILSNER GLASS (tall, tapered) — use for pilsners, light lagers if we have them. 4) TULIP/SNIFTER — use for Belgian ales, strong ales, barleywines if we serve them. 5) WEIZEN GLASS (tall, curved) — wheat beers. Rule of thumb: domestics get frosted mugs, crafts get clean pint glasses at room temp (cold glass kills craft beer aromatics). Always check for clean glass — hold up to light, no spots or residue.",
    station: "bar",
    category: "equipment",
    confidence: "high",
    source: "manual",
    tags: JSON.stringify(["beer glass", "pint", "mug", "frosted", "pilsner", "tulip", "glassware", "visual"])
  },
  {
    question: "What do kegs look like and how do I identify them?",
    answer: "Keg identification: 1) FULL-SIZE KEG (1/2 barrel) — 15.5 gallons, ~160 pints. Tall silver cylinder, heavy (~160lbs full). Most of our beers. 2) HALF KEG (1/4 barrel) — 7.75 gallons, ~80 pints. Shorter, same diameter. Used for slower-moving crafts. 3) SIXTH BARREL (1/6 barrel) — 5.16 gallons, ~55 pints. Tall and skinny. Some craft/specialty. All kegs have a label/collar showing: brand, brew date, best-by date. Check the date! Old kegs = bad beer. Kegs are stored in the walk-in cooler on their sides or upright. When tapping: let a new keg settle 24hrs if possible. Broken keg = dented valve, leaking seal, or damaged coupler connection. Photo it and call the distributor.",
    station: "bar",
    category: "equipment",
    confidence: "high",
    source: "manual",
    tags: JSON.stringify(["keg", "half barrel", "quarter barrel", "sixth barrel", "tap", "draft", "visual", "identify", "broken keg"])
  },
  {
    question: "What do our liquor bottles look like and how are they organized?",
    answer: "Liquor organization (speed rail, left to right): Vodka (Tito's/Smirnoff) → Gin (Tanqueray) → Rum (Bacardi white, Captain Morgan) → Tequila (Jose Cuervo) → Whiskey (Jim Beam, Jack Daniel's) → Bourbon (Evan Williams, Maker's Mark). Top shelf (display): Grey Goose, Patron, Woodford Reserve, Crown Royal, Hendrick's, Johnnie Walker. Bottle identification: Tito's = clear, round, copper cap. Captain Morgan = dark bottle, pirate label. Jack Daniel's = square black bottle, white label. Crown Royal = purple bag. Patron = clear, bee on cork. Maker's Mark = red wax dip. Always put bottles back in the SAME spot — speed and consistency matter during rush.",
    station: "bar",
    category: "equipment",
    confidence: "high",
    source: "manual",
    tags: JSON.stringify(["liquor bottles", "speed rail", "vodka", "gin", "rum", "tequila", "whiskey", "bourbon", "visual", "organization", "top shelf"])
  },

  // ============ SPLIT CHECKS & POS HOSPITALITY ============
  {
    question: "How do you handle split checks on PDQ POS?",
    answer: "Split checks on PDQ: 1) Open the ticket. 2) Hit 'Split' button (or Transfer). 3) Select items to move to a new check — tap each item. 4) Confirm split. Now you have 2+ separate tickets. Options: split evenly (divide total by number of people), split by item (each person pays for what they ordered), split by seat (if you rang by seat number). Tips: Ring items by SEAT from the start — makes splitting easy later. If a table says 'separate checks' at the beginning, ring each seat as its own ticket from the start. For large parties: suggest splitting before ordering to avoid confusion. The POS can split up to 10 ways.",
    station: "waitstaff",
    category: "process",
    confidence: "high",
    source: "manual",
    tags: JSON.stringify(["split check", "separate checks", "pdq", "pos", "transfer", "divide", "payment", "table"])
  },
  {
    question: "How do I handle a table that wants to pay with multiple payment methods?",
    answer: "Multiple payments on one check: 1) Open the ticket, hit 'Pay'. 2) Select first payment type (e.g., credit card). 3) Enter the AMOUNT for that payment (not the full total). 4) Process that payment. 5) The remaining balance shows. 6) Select next payment type for the rest. Common scenarios: 'Put $30 on this card and the rest on cash' — enter $30 on card first, then cash for remainder. Gift cards: run gift card first to see remaining balance, then second payment for the rest. If someone wants to put tip on one card but pay with another — run the food amount on card 1, then the tip amount on card 2 (or just add tip to card 1 receipt).",
    station: "waitstaff",
    category: "process",
    confidence: "high",
    source: "manual",
    tags: JSON.stringify(["multiple payments", "split payment", "credit card", "cash", "gift card", "pdq", "pos"])
  },
  {
    question: "How do I open and manage a bar tab?",
    answer: "Bar tabs on PDQ: 1) Start a new ticket. 2) Ask for a credit card to hold (swipe/insert to authorize — doesn't charge yet). 3) Add items as they order throughout the night. 4) When they're ready to close: pull up their tab, hit 'Pay', process the card on file. Tips: Always get a card for tabs — never run a tab on 'good faith'. If they leave without closing: charge the card on file + auto-gratuity (20% per house policy on walkouts). Name the tab with their name or card last 4 digits for easy lookup. Keep cards in the card holder box, organized alphabetically. At last call: announce 'tabs closing in 15 minutes' to give people time.",
    station: "bar",
    category: "process",
    confidence: "high",
    source: "manual",
    tags: JSON.stringify(["bar tab", "tab", "credit card", "hold", "close tab", "pdq", "pos", "walkout"])
  },

  // ============ HOSPITALITY & SERVICE EXCELLENCE ============
  {
    question: "What are the steps of service for greeting a table?",
    answer: "Table greeting (within 60 seconds of seating): 1) Approach with a smile, make eye contact. 2) 'Hey folks, welcome to Community Tap! I'm [name], I'll be taking care of you tonight.' 3) Offer drink suggestions: 'Can I start you off with something to drink? We've got [featured beer] on tap and our [cocktail special] tonight.' 4) If they need a minute: 'Take your time, I'll grab those drinks and be right back.' 5) Drop off drinks within 3-4 minutes. 6) Check if ready to order or need more time. KEY: Be genuine, not scripted. Read the table — business lunch = efficient, date night = give space, families = kid-friendly. Never say 'Are you guys ready?' to a table that just sat down.",
    station: "waitstaff",
    category: "process",
    confidence: "high",
    source: "manual",
    tags: JSON.stringify(["greeting", "table approach", "steps of service", "hospitality", "server", "welcome", "first impression"])
  },
  {
    question: "How do I upsell without being pushy?",
    answer: "Upselling done right: 1) SUGGEST, don't push. 'The Iowa Chop is incredible tonight — it's a 14oz bone-in smoked chop, one of our best sellers.' 2) Pair suggestions: 'That burger goes great with our house-cut fries — want to add a side?' 3) Drink upgrades: 'Would you like Tito's in that or our well vodka?' (phrasing assumes the upgrade). 4) Dessert: 'Save room — our [dessert] is made fresh.' 5) Apps for the table: 'While you're deciding, our cheese balls are perfect for sharing.' Rules: Never upsell more than twice per interaction. If they say no, move on gracefully. Read the table — if they're watching their budget, don't push premium. Genuine enthusiasm sells more than technique.",
    station: "waitstaff",
    category: "process",
    confidence: "high",
    source: "manual",
    tags: JSON.stringify(["upsell", "suggestive selling", "server", "tips", "hospitality", "sales", "technique"])
  },
  {
    question: "How do I handle a customer complaint about food?",
    answer: "Food complaint protocol: 1) LISTEN — don't interrupt or get defensive. 'I'm sorry about that, let me take care of it.' 2) REMOVE the plate immediately. 3) Offer options: 'Would you like me to have the kitchen remake it, or can I get you something else?' 4) Notify kitchen (tell them what was wrong — undercooked, wrong temp, wrong item, hair, etc.). 5) Get manager involved if: food safety issue, customer is angry, or it's a repeat problem. 6) Comp the item or offer a discount — don't make them ask. 7) Follow up: 'How's everything tasting now?' NEVER: argue, blame the kitchen in front of guests, or make excuses. The goal is they leave happy and come back.",
    station: "waitstaff",
    category: "process",
    confidence: "high",
    source: "manual",
    tags: JSON.stringify(["complaint", "food complaint", "customer service", "comp", "remake", "hospitality", "recovery"])
  },
  {
    question: "How do I read a table and adjust my service style?",
    answer: "Reading tables: 1) BUSINESS LUNCH — efficient, minimal small talk, offer to split checks upfront, fast food/drink delivery. They're on a clock. 2) DATE NIGHT — give space, don't hover, suggest shareable apps and wine, dim lighting if possible. Romance > speed. 3) FAMILIES WITH KIDS — greet kids first, offer crayons/kids menu immediately, get kid food fired first (they get antsy), be patient with mess. 4) REGULARS — remember their usual, greet by name, ask about their life. They tip better when they feel known. 5) LARGE PARTY — take control early, suggest family-style or limited menu, auto-grat policy (18% on 8+). 6) BAR CROWD — casual, fun, check in frequently but don't interrupt conversations. Match their energy.",
    station: "waitstaff",
    category: "process",
    confidence: "high",
    source: "manual",
    tags: JSON.stringify(["read table", "service style", "hospitality", "business lunch", "date night", "families", "regulars", "large party"])
  },
  {
    question: "What are the rules for comping food or drinks?",
    answer: "Comp policy: 1) Servers/bartenders can comp up to $10 without manager approval (use good judgment — wrong item, long wait, quality issue). 2) $10-50: need manager on duty approval. 3) Over $50: need owner (Mike) approval. 4) ALWAYS ring the item first, then apply comp — never just 'not ring it' (that's theft). 5) Document reason in POS notes (e.g., 'hair in food', 'wrong order', '45min wait'). 6) Comps are tracked — excessive comps get reviewed. 7) Buying a regular a drink? Still ring it and comp it properly. 8) Staff meals: use the staff meal button, not comp. Comps affect food cost — use them to save a guest experience, not to give away free food to friends.",
    station: "waitstaff",
    category: "process",
    confidence: "high",
    source: "manual",
    tags: JSON.stringify(["comp", "comping", "free", "discount", "manager approval", "policy", "food cost", "void"])
  },

  // ============ WEEKLY SALES PATTERNS ============
  {
    question: "What are our typical weekly sales patterns?",
    answer: "Weekly sales pattern at Community Tap: MONDAY: Slowest day, $1,800-2,500. Skeleton crew. TUESDAY: Slightly better, $2,000-2,800. WEDNESDAY: Mid-week bump, $2,500-3,200. Wing night or specials help. THURSDAY: Picks up, $3,000-4,000. College/young crowd starts weekend early. FRIDAY: Big night, $4,500-6,500. Full staff needed. Peak 6-9pm. SATURDAY: Biggest day, $5,000-7,500. Lunch + dinner + late night. Full staff all day. SUNDAY: Moderate, $2,500-4,000. Brunch potential, football season is huge ($5,000+). Staff accordingly — don't over-schedule Mon-Wed, don't under-schedule Fri-Sat. Weather and events shift these significantly.",
    station: "general",
    category: "process",
    confidence: "high",
    source: "manual",
    tags: JSON.stringify(["weekly sales", "sales pattern", "daily sales", "revenue", "scheduling", "forecast", "monday", "friday", "saturday"])
  },
  {
    question: "What is our average daily sales and what affects it?",
    answer: "Average daily sales: ~$3,200-3,800/day across the week. Factors that increase sales: 1) Weather (nice weather = patio crowd, +15-25%). 2) Local events (Fort Dodge events, sports, concerts nearby = +20-40%). 3) Promotions (wing night, happy hour, live music = +10-30%). 4) Holidays (NYE, St. Patrick's, Super Bowl = +50-100%). 5) Payday Fridays (+10-15%). Factors that decrease: 1) Bad weather (ice storms, extreme cold = -30-50%). 2) Holidays where people stay home (Thanksgiving, Christmas Eve = -40-60%). 3) Construction/road closures near us. 4) Competing events (big home games people watch at home). Track these patterns to predict staffing needs.",
    station: "general",
    category: "process",
    confidence: "high",
    source: "manual",
    tags: JSON.stringify(["average sales", "daily sales", "factors", "weather", "events", "forecast", "revenue", "trends"])
  },
  {
    question: "What are our peak hours and how should we staff for them?",
    answer: "Peak hours at Community Tap: LUNCH: 11:30am-1:30pm (moderate, mostly takeout/delivery + some dine-in). HAPPY HOUR: 4-6pm (bar heavy, apps). DINNER RUSH: 6-8:30pm (full kitchen, full bar, full dining room). LATE NIGHT: 9:30pm-close on Fri/Sat (bar heavy, late-night menu). Staffing guide: Lunch = 1 server + 1 cook + 1 pizza. Dinner = 2-3 servers + 2 cooks + 1 pizza + 1 bartender + 1 expo. Fri/Sat peak = 3 servers + 2 cooks + 1 pizza + 2 bartenders + 1 expo + 1 host. Always have a closer who stays 30-45min after last customer for cleanup. Kitchen closes 30min before bar on weeknights.",
    station: "general",
    category: "process",
    confidence: "high",
    source: "manual",
    tags: JSON.stringify(["peak hours", "rush", "staffing", "lunch", "dinner", "happy hour", "late night", "schedule"])
  },
  {
    question: "How do I read the daily sales report from PDQ POS?",
    answer: "PDQ Daily Sales Report breakdown: 1) GRAND TOTAL — total revenue for the day (food + bev + tax). 2) NET SALES — total minus tax and comps. 3) FOOD SALES — all food items. 4) BEER SALES — draft + bottles/cans. 5) LIQUOR SALES — all spirits/cocktails. 6) WINE SALES — by the glass + bottles. 7) NON-ALC — pop, juice, coffee, water. 8) COMPS/VOIDS — items removed or given free (watch this number). 9) LABOR — total labor cost for the day. 10) LABOR % — labor cost ÷ net sales (target: under 30%). 11) FOOD COST % — food cost ÷ food sales (target: 28-32%). 12) POUR COST % — bev cost ÷ bev sales (target: 18-22%). Pull this report at EOD from Reports > Daily Summary on PDQ.",
    station: "general",
    category: "process",
    confidence: "high",
    source: "manual",
    tags: JSON.stringify(["daily sales report", "pdq", "pos", "revenue", "food cost", "labor", "pour cost", "net sales", "report"])
  },

  // ============ BBQ MASTERY ============
  {
    question: "How do you smoke competition-level brisket?",
    answer: "Competition brisket: 1) SELECT: Choice or Prime grade, 12-14lb packer (point + flat). Trim fat cap to 1/4 inch. 2) SEASON: Heavy black pepper + coarse salt (50/50 'dalmatian rub'). Optional: garlic powder, onion powder. Let sit uncovered in fridge overnight. 3) SMOKE: 225-250°F with oak or hickory. Fat side up (debated but our method). Spritz with apple cider vinegar every 90min after bark sets (3-4 hours in). 4) THE STALL: At 160-170°F internal, temp plateaus. Push through or wrap in butcher paper (Texas crutch) at 165°F. 5) PULL: When probe slides in like butter (usually 200-205°F internal). 6) REST: Minimum 1 hour in cooler wrapped in towels. 2-4 hours is ideal. 7) SLICE: Against the grain, pencil-thick for flat, cubed for burnt ends from point. Total time: 12-16 hours.",
    station: "bbq_room",
    category: "recipe",
    confidence: "high",
    source: "manual",
    tags: JSON.stringify(["brisket", "smoke", "bbq", "competition", "225", "butcher paper", "texas", "burnt ends", "rest"])
  },
  {
    question: "How do you smoke perfect pork butt (pulled pork)?",
    answer: "Pork butt (Boston butt): 1) SELECT: 8-10lb bone-in butt. More marbling = more flavor. 2) TRIM: Remove any hard fat chunks but leave the fat cap. Score the fat cap in crosshatch pattern. 3) SEASON: Yellow mustard binder + BBQ rub (brown sugar, paprika, garlic, onion, cumin, chili powder, black pepper, salt). Apply heavy — pork can take it. 4) SMOKE: 225°F with cherry or apple wood (sweeter smoke for pork). 5) SPRITZ: Apple juice + ACV every hour after bark sets. 6) WRAP: At 165°F internal, wrap in foil with a splash of apple juice (faster) or butcher paper (better bark). 7) PULL: 200-205°F internal, probe tender. 8) REST: 1-2 hours minimum. 9) PULL: Remove bone (should slide out), pull with forks or bear claws. Mix bark pieces throughout. Total: 10-14 hours. Yield: ~60% (8lb butt = ~5lb pulled pork).",
    station: "bbq_room",
    category: "recipe",
    confidence: "high",
    source: "manual",
    tags: JSON.stringify(["pork butt", "pulled pork", "boston butt", "smoke", "bbq", "225", "apple wood", "rest"])
  },
  {
    question: "How do you make competition-level smoked wings?",
    answer: "Smoked wings (competition style): 1) PREP: Pat dry thoroughly (paper towels). Toss in baking powder + salt (1 tbsp baking powder per 2lbs — creates crispy skin). Let sit uncovered in fridge 2-4 hours (dries skin further). 2) SEASON: Light rub — don't overpower the smoke. Salt, pepper, garlic powder, paprika. 3) SMOKE: 250-275°F with cherry or pecan wood for 1-1.5 hours until internal 165°F. Higher temp than brisket for crispier skin. 4) CRISP: Option A — crank smoker to 375°F for final 10-15 min. Option B — flash fry at 375°F for 2-3 min. Option C — broil 3-4 min. 5) SAUCE: Toss in sauce immediately after crisping while hot (sauce adheres better). Our sauces: Buffalo, BBQ, Garlic Parm, Honey Sriracha, Dry Rub (no sauce). 6) SERVE: With celery, carrots, ranch and blue cheese. 12-14 per pound.",
    station: "bbq_room",
    category: "recipe",
    confidence: "high",
    source: "manual",
    tags: JSON.stringify(["wings", "smoked wings", "competition", "crispy", "baking powder", "sauce", "buffalo", "bbq"])
  },
  {
    question: "How do you smoke perfect ribs (baby back and spare)?",
    answer: "Ribs — 3-2-1 method (spare ribs) or 2-2-1 (baby backs): 1) PREP: Remove membrane from bone side (use paper towel for grip, peel from corner). Trim any loose flaps. 2) SEASON: Yellow mustard binder + rib rub (brown sugar, paprika, garlic, onion, chili, black pepper, salt, touch of cayenne). 3) PHASE 1 (smoke): 225°F, bone side down, 3 hours (spares) or 2 hours (baby backs). Use hickory or cherry. Look for bark formation and meat pullback from bones (~1/4 inch). 4) PHASE 2 (wrap): Wrap in foil with butter, brown sugar, honey, and a splash of apple juice. 225°F for 2 hours. This is the braise/tenderize phase. 5) PHASE 3 (glaze): Unwrap, sauce both sides, back on smoker 225°F for 1 hour. Sauce sets and gets tacky. 6) TEST: Bend test — pick up with tongs in middle, should crack but not fall apart. Internal 195-203°F. 7) REST: 10-15 min, then slice between bones.",
    station: "bbq_room",
    category: "recipe",
    confidence: "high",
    source: "manual",
    tags: JSON.stringify(["ribs", "baby back", "spare ribs", "3-2-1", "smoke", "bbq", "wrap", "membrane", "225"])
  },

  // ============ PIZZA EXCELLENCE ============
  {
    question: "How do you make the perfect pizza dough from scratch?",
    answer: "Perfect pizza dough (Community Tap recipe): INGREDIENTS per batch: 50lb high-gluten flour (PFG GP928), water at 105°F (critical — too hot kills yeast, too cold won't activate), active dry yeast (2.5oz per batch), salt (1lb), sugar (8oz, feeds the yeast), olive oil (16oz, for extensibility). METHOD: 1) Bloom yeast in warm water with sugar for 10 min (should foam — if not, yeast is dead). 2) Add flour to Hobart mixer with dough hook. 3) Add salt, then yeast water. Mix on speed 1 for 2 min (incorporate). 4) Mix on speed 2 for 8-10 min (develop gluten — dough should be smooth, elastic, pull away from bowl sides). 5) Add olive oil in last 2 min of mixing. 6) Windowpane test: stretch a small piece thin — if you can see light through without tearing, gluten is developed. 7) Portion: Mini 8oz, Small 12oz, Medium 16oz, Large 22oz. 8) Ball and oil each portion. 9) Cold ferment in walk-in 24-72 hours (longer = more flavor). 10) Pull from cooler 1-2 hours before use to come to room temp.",
    station: "pizza_line",
    category: "recipe",
    confidence: "high",
    source: "manual",
    tags: JSON.stringify(["pizza dough", "dough", "recipe", "hobart", "gluten", "yeast", "ferment", "windowpane", "from scratch"])
  },
  {
    question: "What makes a perfect pizza and what are common mistakes?",
    answer: "Perfect pizza checklist: 1) DOUGH: Room temp, properly proofed, stretched evenly (no thick spots in center, slightly thicker rim). 2) SAUCE: Thin, even layer — too much = soggy. Use the ladle spiral method (center out). 3) CHEESE: Even coverage to edges (cheese touching the rim = crispy cheese edge = delicious). Don't overload — too much cheese = greasy, won't melt evenly. 4) TOPPINGS: Distributed evenly, not piled in center. Heavy toppings (meat) go UNDER cheese so they don't burn. 5) BAKE: 475-500°F, rotate halfway through. Watch for: golden crust, bubbling cheese, slightly charred spots on rim. COMMON MISTAKES: 1) Cold dough (tears, won't stretch). 2) Too much sauce (soggy bottom). 3) Overloaded toppings (won't cook through). 4) Not rotating (uneven bake). 5) Cutting too soon (let rest 2 min or cheese slides off). 6) Dull pizza cutter (tears instead of cuts).",
    station: "pizza_line",
    category: "recipe",
    confidence: "high",
    source: "manual",
    tags: JSON.stringify(["perfect pizza", "mistakes", "dough", "sauce", "cheese", "toppings", "bake", "tips"])
  },

  // ============ GRILL MASTERY ============
  {
    question: "How do you grill the perfect burger?",
    answer: "Perfect burger (Community Tap method): 1) MEAT: 80/20 ground beef (chamber ground — coarser grind, better texture). 8oz patties, formed loosely (don't pack tight — makes them dense). Thumb indent in center (prevents puffing). 2) SEASON: Salt and pepper ONLY on outside, right before grill. Don't mix seasoning into the meat. 3) GRILL: High heat (450-500°F flat top or grill grates). Oil the surface. Place patty, DO NOT PRESS DOWN (squeezes out juice). 4) FLIP ONCE: 4 min first side (good sear/crust), flip, 3-4 min second side for medium (155°F). 5) CHEESE: Add cheese immediately after flip, close lid/dome to melt (30 seconds). 6) REST: 1-2 min on the bun (bun absorbs juice instead of plate). TEMPS: Rare 125°F, Med-Rare 135°F, Medium 145°F, Med-Well 155°F, Well 165°F. Iowa health code: must offer 'consumer advisory' for under 155°F.",
    station: "fry_line",
    category: "recipe",
    confidence: "high",
    source: "manual",
    tags: JSON.stringify(["burger", "grill", "flat top", "ground beef", "chamber", "temperature", "medium", "sear"])
  },
  {
    question: "How do you cook the Iowa Chop perfectly?",
    answer: "Iowa Chop (our signature): 1) THE CUT: 14oz bone-in center-cut pork chop, 1.5 inches thick (from Sawyer's Meats). 2) BRINE (optional but recommended): Salt water brine 4-12 hours for juiciness. 3) SMOKE: Start in smoker at 225°F with apple/cherry wood for 45-60 min (internal 100-110°F). This gives the smoke ring and flavor. 4) SEAR: Finish on hot flat top or grill (500°F+) for 2-3 min per side. Get a hard crust. 5) TEMP: Pull at 140°F internal (carryover will bring to 145°F — USDA safe for pork). DO NOT overcook — dry pork chop is the #1 complaint. 6) REST: 5 min minimum. 7) PLATE: On a bed of mashed potatoes or next to seasonal veg. Drizzle with apple cider glaze or serve with house BBQ sauce on side. This is our SIGNATURE dish — it must be perfect every time. If in doubt, temp it.",
    station: "bbq_room",
    category: "recipe",
    confidence: "high",
    source: "manual",
    tags: JSON.stringify(["iowa chop", "pork chop", "smoke", "sear", "signature", "sawyers", "145", "bone-in"])
  },

  // ============ FRY MASTERY ============
  {
    question: "What are the secrets to perfect fried food?",
    answer: "Fry mastery principles: 1) OIL TEMP: 350°F is the sweet spot for most items. Too low = greasy (food absorbs oil). Too hot = burnt outside, raw inside. 2) DON'T OVERCROWD: Dropping too much food drops the oil temp 20-30°F. Fry in batches. 3) DRY FOOD FIRST: Moisture = splatter + drops temp. Pat dry, shake off excess breading. 4) FRESH OIL: Change every 3-4 days. Filter daily. Dark/foamy oil = bad flavor + health hazard. 5) DRAIN PROPERLY: Use the rack, not paper towels (towels trap steam = soggy). Season IMMEDIATELY after pulling (salt sticks to hot oil surface). 6) BASKET SHAKE: Shake basket halfway through to prevent sticking. 7) LISTEN: Proper frying sounds aggressive (rapid bubbling). If it goes quiet, oil is too cool. 8) RECOVERY TIME: Wait 30-60 seconds between batches for oil to recover temp. Our items: Fries 3-4 min, Wings 12-14 min, Onion Rings 2-3 min, Cheese Balls 3-4 min, Tenders 5-6 min.",
    station: "fry_line",
    category: "recipe",
    confidence: "high",
    source: "manual",
    tags: JSON.stringify(["frying", "fryer", "oil", "temperature", "350", "crispy", "technique", "drain", "overcrowd"])
  },
  {
    question: "How do I know when fryer oil needs to be changed?",
    answer: "Oil change indicators: 1) COLOR: Fresh oil is clear/light gold. Bad oil is dark brown/black. 2) SMELL: Fresh = neutral. Bad = rancid, fishy, or acrid. 3) FOAM: Excessive foaming when food is dropped = oil is breaking down. 4) SMOKE: Oil smoking at normal fry temp (350°F) = degraded smoke point, change immediately. 5) TASTE: Food tastes 'off' or has a stale flavor. 6) TEXTURE: Oil feels sticky/thick between fingers (when cool). SCHEDULE: Filter daily (end of shift — drain through filter into clean container, wipe fryer, refill). Full change every 3-4 days or 40-50 hours of use. Our oil: DV470 Soy Clear Fry (35lb jugs from PFG). Cost: ~$35/jug. Each fryer takes 35-40lbs. Proper oil management saves $200+/month and makes better food.",
    station: "fry_line",
    category: "equipment",
    confidence: "high",
    source: "manual",
    tags: JSON.stringify(["fryer oil", "oil change", "filter", "dark", "foam", "smoke", "maintenance", "DV470"])
  },

  // ============ MANAGEMENT DEVELOPMENT (TOM & ASHLEY) ============
  {
    question: "What makes a great Kitchen Manager and what are Tom's responsibilities?",
    answer: "Kitchen Manager (Tom) responsibilities: 1) FOOD ORDERING: PFG orders Mon/Thu, Sysco as needed. Maintain par levels, manage food cost (target 28-32%). 2) SCHEDULING: Kitchen staff schedule — balance labor cost (target <30%) with coverage needs. 3) FOOD QUALITY: Every plate that leaves the window meets standards. Taste, temp, presentation. 4) TRAINING: Train all kitchen staff on stations, recipes, food safety. Cross-train for coverage. 5) INVENTORY: Weekly counts, manage waste, rotate stock (FIFO). 6) CLEANLINESS: Kitchen passes health inspection at any moment. 7) MENU DEVELOPMENT: Work with Mike on specials, seasonal items, cost analysis. 8) LEADERSHIP: Lead by example — be the hardest worker, stay calm under pressure, teach don't yell. A great KM makes the kitchen run smooth whether they're there or not. Develop your people so they can run their stations independently.",
    station: "general",
    category: "process",
    confidence: "high",
    source: "manual",
    tags: JSON.stringify(["kitchen manager", "tom", "responsibilities", "food cost", "ordering", "scheduling", "leadership", "management"])
  },
  {
    question: "What makes a great Bar Manager and what are Ashley's responsibilities?",
    answer: "Bar Manager (Ashley) responsibilities: 1) LIQUOR/BEER ORDERING: Iowa ABD for spirits, Budweiser/Hughes/Fort Dodge for beer. Maintain par levels, manage pour cost (target 18-22%). 2) SCHEDULING: Bar staff schedule — balance labor with expected volume. 3) DRINK QUALITY: Every cocktail is consistent, properly measured, properly garnished. 4) TRAINING: Train bartenders on recipes, speed, POS, responsible service (TIPS certified). 5) INVENTORY: Weekly liquor count, beer count, identify shrinkage/over-pouring. 6) BAR CLEANLINESS: Lines cleaned every 2 weeks, bar top spotless, glassware sparkling. 7) DRAFT SYSTEM: Manage kegs, tap rotation, identify issues (foamy pours, flat beer). 8) COMPLIANCE: Iowa liquor law compliance, ID checking, cut-off procedures, incident documentation. 9) ATMOSPHERE: Music, lighting, vibe — the bar should feel welcoming and fun. A great Bar Manager builds regulars who come back for the experience, not just the drinks.",
    station: "general",
    category: "process",
    confidence: "high",
    source: "manual",
    tags: JSON.stringify(["bar manager", "ashley", "responsibilities", "pour cost", "ordering", "liquor", "beer", "scheduling", "leadership", "management"])
  },
  {
    question: "How do you develop a line cook into a Kitchen Manager?",
    answer: "Kitchen Manager development path: 1) STATION MASTERY: Must be able to run every station solo (fry, grill, pizza, prep, dish). No gaps. 2) FOOD COST AWARENESS: Start teaching them to read invoices, understand cost per plate, identify waste. 3) ORDERING: Shadow the KM on ordering for 4-6 weeks. Then let them place orders with KM review. 4) SCHEDULING: Teach labor cost math. Let them draft a week's schedule for review. 5) LEADERSHIP: Give them a shift lead role — they run the kitchen for a shift while KM observes. 6) PROBLEM SOLVING: Stop solving their problems — ask 'what would you do?' and let them decide. 7) ACCOUNTABILITY: They own food cost for a week. They own a station's cleanliness. They own training a new hire. 8) FOOD SAFETY: ServSafe Manager certification. 9) COMMUNICATION: Can they talk to vendors? Handle a customer complaint? Give feedback to a cook? Timeline: 6-12 months from strong line cook to ready-for-KM, depending on attitude and aptitude.",
    station: "general",
    category: "process",
    confidence: "high",
    source: "manual",
    tags: JSON.stringify(["development", "promotion", "kitchen manager", "career path", "training", "leadership", "line cook"])
  },
  {
    question: "How do you develop a bartender into a Bar Manager?",
    answer: "Bar Manager development path: 1) DRINK MASTERY: Must know every cocktail, every beer on tap, every wine by the glass — cold. No recipe book needed. 2) SPEED & CONSISTENCY: Can handle a full bar solo on a Friday and every drink is right. 3) POUR COST: Teach them to count inventory, calculate pour cost, identify over-pouring. 4) ORDERING: Shadow on ABD orders, beer orders. Then let them order with review. 5) SCHEDULING: Teach labor math. Draft schedules. 6) LEADERSHIP: Shift lead role — they run the bar while BM observes. Can they handle a difficult customer? A bartender who over-poured? A busy night with a call-off? 7) COMPLIANCE: Deep knowledge of Iowa liquor law, liability, responsible service. 8) BUSINESS SENSE: Understand why we carry certain products, how tap selection affects sales, how to build a drink menu that sells. 9) PEOPLE SKILLS: Regulars know them by name. Staff respects them. They build the bar's culture. Timeline: 6-12 months from strong bartender to BM-ready.",
    station: "general",
    category: "process",
    confidence: "high",
    source: "manual",
    tags: JSON.stringify(["development", "promotion", "bar manager", "career path", "training", "leadership", "bartender"])
  },
  {
    question: "What is the career progression path at Community Tap?",
    answer: "Career paths at Community Tap: KITCHEN: Dishwasher → Prep Cook → Line Cook (fry/grill) → Pizza Maker → Kitchen Lead/Closer → Kitchen Manager. Each step requires mastering the previous station + showing leadership. BOH pay range: $12-18/hr + tips where applicable. BAR: Barback → Bartender (day shifts) → Bartender (night shifts) → Bar Lead → Bar Manager. Must know all drinks, handle volume, manage tabs. FOH: Host → Server (lunch) → Server (dinner) → Server (high-volume Fri/Sat) → Shift Lead → FOH Manager. DRIVERS: Driver → Senior Driver (training new drivers) → Dispatch Lead. CROSS-TRAINING: Encouraged! A server who can bartend, a cook who can make pizza — these people are invaluable and get more hours. Promotions are based on: reliability, skill mastery, attitude, leadership potential, and tenure.",
    station: "general",
    category: "process",
    confidence: "high",
    source: "manual",
    tags: JSON.stringify(["career path", "promotion", "progression", "dishwasher", "line cook", "bartender", "server", "development"])
  }
];

async function seed() {
  let inserted = 0;
  let skipped = 0;
  
  for (const entry of entries) {
    try {
      const [existing] = await pool.execute(
        'SELECT id FROM knowledge_entries WHERE question = ?',
        [entry.question]
      );
      if (existing.length > 0) {
        // Update existing
        await pool.execute(
          'UPDATE knowledge_entries SET answer = ?, station = ?, category = ?, confidence = ?, source = ?, tags = ?, updatedAt = NOW() WHERE question = ?',
          [entry.answer, entry.station, entry.category, entry.confidence, entry.source, entry.tags, entry.question]
        );
        inserted++;
      } else {
        await pool.execute(
          'INSERT INTO knowledge_entries (question, answer, station, category, confidence, source, tags, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
          [entry.question, entry.answer, entry.station, entry.category, entry.confidence, entry.source, entry.tags]
        );
        inserted++;
      }
    } catch (err) {
      console.error(`Failed: ${entry.question.substring(0, 50)}... — ${err.message}`);
      skipped++;
    }
  }
  
  const [total] = await pool.execute('SELECT COUNT(*) as t FROM knowledge_entries');
  console.log(`✅ Final Brain Seed Complete:`);
  console.log(`   Inserted/Updated: ${inserted}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total entries in DB: ${total[0].t}`);
  await pool.end();
}

seed();
