import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool(process.env.DATABASE_URL);

// Stations: pizza_line, fry_line, bar, waitstaff, bbq_room, store_room, bathroom, dish_pit, general
// Categories: recipe, location, process, equipment, vendor, allergen, prep, cleaning, safety, menu_info
// Confidence: high, medium, low
// Source: manual, photo_extraction, correction, ai_inferred, imported

const entries = [
  // ═══════════════════════════════════════════════════════════════
  // FRYER MASTERY - Complete Station Knowledge
  // ═══════════════════════════════════════════════════════════════
  {
    station: "fry_line", category: "equipment", question: "What are the correct fryer temperatures for each item?",
    answer: "Standard temp range is 325-375°F with 350°F as the all-purpose default. French fries: blanch first at 325°F for 4-5 min (par cook), then finish at 375°F for 2-3 min (double-fry method gives crispy outside, fluffy inside). Chicken tenders/wings: 350°F for bone-in (12-15 min), 375°F for boneless strips (3-5 min). Fish: 350-375°F (3-5 min depending on thickness — fish floats when done). Onion rings: 375°F (2-3 min until golden). Mozzarella sticks: 350°F (2-3 min until cheese just starts to ooze). NEVER let oil drop below 325°F when loading food — if it does, you overloaded the basket.",
    confidence: "high", source: "manual", tags: ["fryer", "temperature", "fry cook", "oil temp", "chicken", "fries", "fish"]
  },
  {
    station: "fry_line", category: "process", question: "How do you manage fryer oil properly?",
    answer: "Filter oil minimum once daily, twice during heavy volume days (Friday/Saturday). Signs oil needs changing: dark brown/black color, excessive foam when food drops in, off/rancid smell, smoke point drops (smoking at normal temps), food tastes stale or fishy. Never mix old and new oil types. The cool zone at the bottom of the fryer catches debris and extends oil life — that's why you never scrape the bottom during service. Top off with fresh oil throughout the day to maintain level. Full oil change: drain completely, boil out with fryer cleaner, rinse, refill with fresh oil. Our oil is soybean blend from PFG. One full fryer takes approximately 50 lbs of oil.",
    confidence: "high", source: "manual", tags: ["oil management", "filtration", "fryer maintenance", "oil change", "food quality"]
  },
  {
    station: "fry_line", category: "process", question: "What is the double-fry method and why does it work?",
    answer: "The double-fry method (also called blanch-and-fry) is the secret to perfect fries and is used in every great restaurant. First fry (blanch) at 325°F for 4-5 minutes — this cooks the potato through without browning. Pull, shake, and rest on a sheet pan (can hold for hours). Second fry at 375°F for 2-3 minutes — this creates the crispy golden shell. The science: first fry gelatinizes the starch and drives out moisture from the surface. The rest period lets remaining moisture migrate to the surface. Second fry instantly vaporizes that surface moisture, creating a glass-like crust. Result: crispy outside, creamy inside, stays crispy longer. This is how McDonald's, Five Guys, and every competition fry cook does it.",
    confidence: "high", source: "manual", tags: ["double fry", "blanch", "french fries", "crispy", "technique", "food science"]
  },
  {
    station: "fry_line", category: "safety", question: "What are the critical safety rules for the fryer station?",
    answer: "1) NEVER add water or ice to hot oil — causes explosive splatter and severe burns. 2) Lower baskets slowly into oil, never drop. 3) Keep floor dry around fryers — oil + water = slip hazard. 4) Never fill fryer above the fill line (oil expands when heated). 5) If oil catches fire: TURN OFF GAS, cover with metal lid or use Class K fire extinguisher. NEVER use water. 6) Let oil cool to below 150°F before filtering or changing. 7) Wear long sleeves and closed-toe shoes at fry station. 8) Never reach over hot oil. 9) Keep fryer area clear of towels, paper, plastic. 10) Report any fryer malfunction immediately — thermostat failure can cause flash fire.",
    confidence: "high", source: "manual", tags: ["fryer safety", "fire", "burns", "oil fire", "Class K", "safety rules"]
  },
  {
    station: "fry_line", category: "process", question: "How do you achieve perfectly crispy fried food every time?",
    answer: "Keys to crispy: 1) DRY your food — moisture is the enemy of crisp. Pat proteins dry, let battered items drip before dropping. 2) Don't overcrowd the basket — too much food drops oil temp below 325°F and food steams instead of fries. Fill basket only 1/2 to 2/3 full. 3) Correct temperature — too low = greasy, too high = burnt outside raw inside. 4) Shake basket 30 seconds after dropping to prevent sticking. 5) Pull when golden, not brown — carryover cooking continues for 30 seconds after pulling. 6) Season IMMEDIATELY after pulling while surface is still wet with oil (salt sticks). 7) Serve within 2 minutes — fried food dies fast. 8) Never stack fried items — steam from bottom makes top soggy. Use elevated racks or spread on sheet pans.",
    confidence: "high", source: "manual", tags: ["crispy", "frying technique", "food quality", "basket management", "timing"]
  },
  {
    station: "fry_line", category: "equipment", question: "How do you properly filter the fryer?",
    answer: "Filtering process: 1) Turn off fryer burners but leave oil hot (around 300°F — flows better). 2) Place filter pan under drain with filter paper/screen in place. 3) Open drain valve slowly — oil is HOT. 4) Use fryer rod to scrape sides and bottom of frypot gently. 5) Let all oil drain through filter (2-3 min). 6) Close drain valve. 7) Use the pump to return filtered oil to frypot. 8) Dispose of filter paper with captured debris. 9) Turn burners back on. 10) Wipe exterior while waiting for oil to reheat. Filter minimum once per day, ideally between lunch and dinner rush. Some Frymaster models have built-in filtration — just press the filter button and follow prompts.",
    confidence: "high", source: "manual", tags: ["filter", "oil filtration", "fryer maintenance", "Frymaster", "cleaning"]
  },

  // ═══════════════════════════════════════════════════════════════
  // GRILL/CHARBROILER MASTERY
  // ═══════════════════════════════════════════════════════════════
  {
    station: "bbq_room", category: "equipment", question: "How does the commercial charbroiler work and how do you use it?",
    answer: "Commercial charbroilers have NO thermostat — they run at constant high heat (600-800°F at grate level). Preheat 15-20 minutes before service until grates are white-hot. Zone cooking: center is hottest, edges are cooler. Use center for searing, edges for finishing or holding. Clean grates with wire brush between EVERY protein change to prevent cross-contamination and off-flavors. Grate maintenance: oil grates with tongs+oil-soaked towel before service (prevents sticking). Never spray water on a hot charbroiler — thermal shock cracks ceramic briquettes. Our charbroiler handles steaks, burgers, chicken breasts, Iowa Chops, and veggie items. Keep a spray bottle of water nearby ONLY for small flare-ups on the drip tray.",
    confidence: "high", source: "manual", tags: ["charbroiler", "grill", "equipment", "temperature", "zone cooking", "grates"]
  },
  {
    station: "bbq_room", category: "process", question: "What are the correct steak temperatures and how do you nail them?",
    answer: "Internal temperatures: Rare 120-125°F (cool red center), Medium Rare 130-135°F (warm red center — most popular), Medium 135-145°F (warm pink center), Medium Well 145-155°F (slight pink), Well Done 155°F+ (no pink, grey throughout). CRITICAL: Always rest steaks 5 minutes after pulling — carryover cooking adds 5°F, so pull 5° UNDER target. Use instant-read thermometer inserted from the side into the thickest part. Touch test for experienced cooks: Rare = cheek, MR = chin, Med = nose tip, MW = forehead. Cross-hatch grill marks: place at 45° angle to grates, rotate 90° halfway through first side, flip once. Only flip ONCE. Never press down on steaks — squeezes out juice.",
    confidence: "high", source: "manual", tags: ["steak", "temperature", "doneness", "grill marks", "medium rare", "rest", "carryover"]
  },
  {
    station: "bbq_room", category: "process", question: "How do you cook the perfect burger on a charbroiler?",
    answer: "Perfect burger technique: 1) Start with fresh-ground 80/20 chuck (our chamber ground beef from Sawyer's). 2) Form patties 1/2 inch WIDER than the bun (shrinks during cooking). 3) Season generously with salt and pepper on BOTH sides right before grilling. 4) Place on hottest part of charbroiler. 5) DO NOT PRESS DOWN — ever. This squeezes out juice and causes flare-ups. 6) Flip only ONCE when blood pools on top surface (about 3-4 min). 7) Add cheese immediately after flip (melts during second side). 8) Cook second side 2-3 min for medium (pink center). 9) Internal temp: 145°F for medium (our standard), 160°F for well done. 10) Rest on bun 1 minute before plating. Toast buns on the flat top or grill edge.",
    confidence: "high", source: "manual", tags: ["burger", "charbroiler", "ground beef", "cheese", "technique", "80/20"]
  },
  {
    station: "bbq_room", category: "process", question: "How do you handle flare-ups on the grill?",
    answer: "Flare-ups happen when fat drips onto hot briquettes/burners. Management: 1) Move food to cool zone (edges) immediately — don't let flames char the protein. 2) For small flare-ups: just move food and let it burn out (5-10 seconds). 3) For persistent flare-ups: close the lid if available to cut oxygen. 4) NEVER spray water directly on charbroiler briquettes — causes steam burns and cracks ceramics. 5) Keep a small spray bottle for the drip tray area only. 6) Prevention: trim excess fat before grilling, don't over-oil grates, don't overload the grill. 7) If grease fire gets out of control: turn off gas, use Class K extinguisher, call manager. The key is staying calm and moving food — a 2-second flare won't ruin anything, but panic will.",
    confidence: "high", source: "manual", tags: ["flare-up", "grill fire", "safety", "charbroiler", "technique"]
  },
  {
    station: "bbq_room", category: "recipe", question: "How do you cook the Iowa Chop perfectly?",
    answer: "The Iowa Chop is our signature item — a thick-cut (1.5-2 inch) bone-in pork chop, typically 14-16 oz. Our method: 1) Brine overnight in salt/sugar/herb solution (keeps it juicy). 2) Pull from walk-in 30 min before cooking (room temp = even cooking). 3) Season with our house rub. 4) Smoke in the smoker at 225°F for 45-60 min until internal hits 130°F (picks up smoke flavor and color). 5) Finish on charbroiler over high heat for 2-3 min per side (creates crust and grill marks). 6) Target internal temp: 145°F (USDA safe for pork, still juicy and slightly pink). 7) Rest 5 minutes before plating. 8) Serve with compound butter melting on top. This two-stage method (smoke then sear) gives you the best of both worlds — smoke ring, juicy interior, and charred exterior.",
    confidence: "high", source: "manual", tags: ["Iowa Chop", "pork chop", "signature", "smoke", "charbroiler", "two-stage"]
  },

  // ═══════════════════════════════════════════════════════════════
  // BBQ/SMOKER MASTERY
  // ═══════════════════════════════════════════════════════════════
  {
    station: "bbq_room", category: "process", question: "How do you smoke competition-level brisket?",
    answer: "Competition brisket method: TRIM — Remove hard fat, silver skin, and trim fat cap to 1/4 inch even thickness. Square off edges for even cooking. SEASON — Dalmatian rub (50/50 coarse black pepper + kosher salt) is the Texas standard. Apply heavy coat, let sit 30 min. SMOKE — 225-250°F with post oak or hickory. Fat side up or down depends on heat source location (fat toward heat). Spritz with apple cider vinegar every hour after first 3 hours. THE STALL — Around 150-170°F internal, evaporative cooling stalls the temp for hours. This is normal. WRAP — At 165-170°F when bark is set and mahogany colored. Butcher paper (maintains bark texture) or foil (faster, more moist). FINISH — Cook wrapped until probe tender at 200-205°F. Probe should slide in like butter with zero resistance. REST — Minimum 1 hour, ideally 2-4 hours in a cooler wrapped in towels. SLICE — Against the grain, pencil-width for flat, thicker cubes for point (burnt ends).",
    confidence: "high", source: "manual", tags: ["brisket", "smoke", "competition", "BBQ", "wrap", "stall", "rest", "trim"]
  },
  {
    station: "bbq_room", category: "process", question: "How do you smoke perfect ribs using the 3-2-1 method?",
    answer: "3-2-1 Method (spare ribs — use 2-2-1 for baby backs which are thinner): PREP — Remove membrane from bone side (grab with paper towel, pull firmly). Apply yellow mustard as binder, then rub (paprika, brown sugar, garlic powder, onion powder, black pepper, cayenne, salt). PHASE 1 (3 hours) — Smoke at 225°F unwrapped, bone side down. Meat absorbs smoke and develops bark. Don't open the smoker unnecessarily. PHASE 2 (2 hours) — Wrap tightly in heavy-duty foil with 2 tbsp butter, 2 tbsp brown sugar, 1 tbsp honey per rack. This braising step tenderizes the meat. PHASE 3 (1 hour) — Unwrap, apply sauce with brush, return to smoker unwrapped at 225-250°F. Sauce sets and caramelizes into a glaze. DONENESS TESTS: Meat pulls back 1/4 inch from bone ends. Bend test — rack cracks on surface but doesn't break when lifted from center with tongs. Toothpick slides into meat between bones with no resistance.",
    confidence: "high", source: "manual", tags: ["ribs", "3-2-1", "smoke", "spare ribs", "baby backs", "BBQ", "competition"]
  },
  {
    station: "bbq_room", category: "process", question: "How do you smoke perfect pulled pork (pork butt)?",
    answer: "Pulled Pork (Boston Butt): SELECT — 8-10 lb bone-in pork butt (bone-in stays moister, bone slides out when done). PREP — Score fat cap in crosshatch pattern (1/4 inch deep). Apply mustard binder + rub (paprika, brown sugar, garlic, cumin, chili powder, salt, pepper). Refrigerate overnight if possible (dry brine effect). SMOKE — 225-250°F for 12-16 hours. Use hickory, apple, or cherry wood. Don't open smoker for first 4 hours. Spritz with apple juice/ACV mix every hour after bark sets. THE STALL — Hits around 160-170°F. Push through or wrap in butcher paper/foil to power through faster. PULL TEMP — 200-205°F internal when probe slides in like butter from multiple angles. REST — 30-60 minutes minimum in foil-lined cooler. PULL — By hand (wearing heat-safe gloves) for best texture. Don't shred with forks — creates mush. Pull into chunks, mix bark pieces throughout. Bone should slide out clean. Season pulled meat with a splash of finishing sauce (vinegar + rub + drippings).",
    confidence: "high", source: "manual", tags: ["pulled pork", "pork butt", "Boston butt", "smoke", "BBQ", "low and slow"]
  },
  {
    station: "bbq_room", category: "process", question: "How do you make competition-style smoked wings?",
    answer: "Competition Smoked Wings (crispy skin method): PREP — Separate flats and drums. Pat COMPLETELY dry with paper towels (moisture = rubbery skin). Toss in mixture of baking powder + salt + rub (1 tbsp baking powder per 4 tbsp rub — baking powder raises pH, helps skin crisp). PHASE 1 — Smoke at 225°F for 30 minutes. This absorbs smoke flavor quickly (chicken takes smoke fast, doesn't need hours). PHASE 2 — Raise temp to 350-375°F for 30-45 minutes until skin is crispy and internal temp hits 175-180°F. Higher internal temp than breast meat because dark meat needs to render fat and collagen. SAUCE — Toss immediately after pulling in your sauce of choice (buffalo, BBQ, garlic parm, etc.). Serve within 2 minutes — wings die fast. ALTERNATIVE METHOD: Smoke at 225°F for 45 min, then flash-fry at 375°F for 2-3 minutes for ultimate crisp. This is the competition secret — smoke flavor + deep-fry crunch.",
    confidence: "high", source: "manual", tags: ["wings", "smoked wings", "crispy", "baking powder", "competition", "BBQ", "sauce"]
  },
  {
    station: "bbq_room", category: "equipment", question: "How do you manage the smoker properly?",
    answer: "Smoker management: FIRE — Start with a full chimney of charcoal as base, add wood chunks (not chips — they burn too fast). For our offset smoker, maintain thin blue smoke (not white billowing smoke which tastes bitter). TEMP CONTROL — Adjust intake vent (bottom) for temperature. More open = hotter. Exhaust vent (top) stays 3/4 to fully open always — never close it or you get creosote. Target 225-250°F at grate level. WOOD — Post oak for brisket, hickory for pork, apple/cherry for chicken. Soak wood? NO — wet wood creates steam and dirty smoke. WATER PAN — Helps stabilize temp and adds humidity. Refill as needed. THERMOMETERS — Don't trust the built-in door thermometer (reads too high). Use probe thermometer at grate level. CLEANING — Brush grates before each use. Empty ash box. Don't deep-clean the interior — seasoning (black buildup) protects metal and adds flavor.",
    confidence: "high", source: "manual", tags: ["smoker", "fire management", "wood", "temperature", "thin blue smoke", "offset"]
  },

  // ═══════════════════════════════════════════════════════════════
  // PIZZA MASTERY
  // ═══════════════════════════════════════════════════════════════
  {
    station: "pizza_line", category: "process", question: "How do you make perfect pizza dough?",
    answer: "CTAP Pizza Dough: INGREDIENTS — High-gluten bread flour (12-14% protein), water at 60-65% hydration, salt (2%), sugar (1-2%), olive oil (2-3%), instant yeast (0.5-1%). METHOD — Combine flour + salt in Hobart mixer with dough hook. Add water (lukewarm 75-80°F) with dissolved yeast and sugar. Mix on low 2 min until combined, then medium speed 8-10 min until smooth, elastic, and passes the windowpane test (stretch thin enough to see light through without tearing). Add oil in last 2 minutes. BULK FERMENT — Cover, room temp 1-2 hours until doubled. DIVIDE — Scale into portions (10 oz for 12-inch, 14 oz for 16-inch). BALL — Round into tight balls, seam side down. COLD FERMENT — Refrigerate 24-72 hours in oiled containers. This cold ferment develops complex flavor, better texture, and easier handling. Pull from cooler 30-60 min before stretching.",
    confidence: "high", source: "manual", tags: ["pizza dough", "recipe", "hydration", "cold ferment", "Hobart", "windowpane"]
  },
  {
    station: "pizza_line", category: "process", question: "How do you stretch and top a pizza correctly?",
    answer: "STRETCHING — Never use a rolling pin (crushes gas bubbles that create light, airy crust). Flour your bench. Press dough ball flat with fingertips, leaving 1/2 inch rim untouched (becomes the cornicione/crust edge). Pick up and drape over knuckles, let gravity stretch it while rotating. Or use the slap-stretch method on the bench. Target even thickness throughout, slightly thicker rim. TOPPING ORDER — 1) Sauce first: thin even layer using the back of a ladle in a spiral motion. Leave 1/2 inch border. Don't over-sauce (makes soggy). 2) Cheese: even distribution edge to edge (cheese touching the rim helps it brown and contain toppings). Low-moisture mozzarella for our style. 3) Toppings: distribute evenly, don't overload (heavy pizza = soggy center). Raw meats go under cheese, cooked toppings on top. TRANSFER — Slide onto peel dusted with cornmeal or semolina. Give it a shake to confirm it slides freely before approaching the oven.",
    confidence: "high", source: "manual", tags: ["pizza", "stretching", "topping", "sauce", "cheese", "technique", "cornicione"]
  },
  {
    station: "pizza_line", category: "process", question: "How do you bake pizza in the deck oven perfectly?",
    answer: "Deck Oven Pizza: PREHEAT — Deck oven must be at 500-550°F with stone/deck preheated minimum 1 hour (stone needs to absorb heat to cook the bottom properly). LOADING — Slide pizza off peel onto stone with a quick forward-and-back jerk motion. Don't hesitate or it sticks. BAKE TIME — 6-8 minutes at 500°F. Watch for: crust puffing and browning, cheese fully melted and starting to get brown spots, bottom is golden (lift edge with peel to check). ROTATE — At halfway point (3-4 min), rotate pizza 180° for even browning (most ovens have hot spots). SIGNS OF DONE — Crust is golden brown and slightly charred in spots, cheese is bubbly with leopard spots, bottom sounds hollow when tapped, rim is puffed and airy. PULL — Slide peel under pizza, transfer to cutting board. Let rest 60 seconds before cutting (cheese sets slightly, won't slide off). CUT — Use rocker blade for clean cuts. 8 slices for 16-inch, 6 for 12-inch.",
    confidence: "high", source: "manual", tags: ["pizza", "deck oven", "baking", "temperature", "rotation", "technique"]
  },
  {
    station: "pizza_line", category: "recipe", question: "What is the recipe for CTAP pizza sauce?",
    answer: "CTAP House Pizza Sauce: INGREDIENTS — 1 #10 can (6 lb 6 oz) crushed San Marzano-style tomatoes, 2 tbsp kosher salt, 1 tbsp sugar, 2 tbsp dried oregano, 1 tbsp dried basil, 1 tbsp garlic powder, 1 tsp black pepper, 1/4 cup olive oil. METHOD — Combine ALL ingredients in a large container. Mix with immersion blender for 30 seconds (leave slightly chunky, not pureed smooth). That's it — NO COOKING. Raw sauce gives brighter, fresher tomato flavor and cooks perfectly in the oven. YIELD — Enough for approximately 25-30 pizzas. STORAGE — Refrigerate in covered container, use within 5 days. Stir before each use as oil separates. NOTES — The secret is quality tomatoes and NOT cooking the sauce. The oven does the cooking. If sauce tastes too acidic, add a pinch more sugar. If flat, add more salt.",
    confidence: "high", source: "manual", tags: ["pizza sauce", "recipe", "San Marzano", "tomato", "no-cook sauce"]
  },

  // ═══════════════════════════════════════════════════════════════
  // COCKTAIL VISUALS & BAR RECIPES
  // ═══════════════════════════════════════════════════════════════
  {
    station: "bar", category: "recipe", question: "How do you make a Screwdriver?",
    answer: "SCREWDRIVER — Glass: Highball (tall). Ice: Fill glass with ice. Build: 1.5 oz vodka (well: Svedka/Pinnacle, call: Tito's, premium: Grey Goose), fill with fresh orange juice, stir gently. Garnish: Orange wheel on rim. Visual: Bright orange color, tall glass, ice visible through the glass, orange wheel adds pop of color. NOTES: Always use fresh OJ if available (tastes noticeably better than from-concentrate). If guest asks for a 'Fuzzy Navel' it's the same thing but with peach schnapps added (0.5 oz). Vodka + OJ is one of the most ordered simple cocktails — fast to make, hard to mess up. Upsell: 'Would you like Tito's in that?' adds $2-3 to the ticket.",
    confidence: "high", source: "manual", tags: ["screwdriver", "vodka", "orange juice", "cocktail", "highball", "recipe", "visual"]
  },
  {
    station: "bar", category: "recipe", question: "How do you make a Bloody Mary?",
    answer: "BLOODY MARY — Glass: Pint glass or goblet. Rim: Celery salt + Old Bay rim (wet rim with lemon, dip in seasoning mix). Ice: Fill glass. Build: 1.5 oz vodka, 4-5 oz tomato juice (or Bloody Mary mix), 0.5 oz fresh lemon juice, 3-4 dashes Worcestershire, 2-3 dashes Tabasco (adjust to guest preference), pinch celery salt, pinch black pepper, pinch horseradish (optional for heat). Stir well or roll between two glasses (don't shake — creates foam). Garnish: Celery stalk, green olive, lemon wedge. For loaded/deluxe: add bacon strip, pickle spear, cheese cube, shrimp on a skewer. Visual: Deep red/tomato color, tall glass, dramatic loaded garnish skewer sticking up. NOTES: This is a brunch staple and Sunday favorite. Offer 'spicy' (extra Tabasco + horseradish) or 'mild' options. Some guests want it with beer chaser (Red Beer = Bloody + Bud Light on the side).",
    confidence: "high", source: "manual", tags: ["bloody mary", "vodka", "tomato", "cocktail", "brunch", "garnish", "recipe", "visual"]
  },
  {
    station: "bar", category: "recipe", question: "How do you make a Captain and Coke?",
    answer: "CAPTAIN & COKE (Captain Morgan + Coca-Cola) — Glass: Highball or rocks glass. Ice: Fill glass with ice. Build: 1.5 oz Captain Morgan Original Spiced Rum (dark amber bottle with pirate on label), fill with Coca-Cola, stir gently. Garnish: Lime wedge squeezed and dropped in. Visual: Dark cola color with slight amber tint from rum, lime wedge floating. VARIATIONS: 'Captain and Diet' (Diet Coke), 'Captain and Ginger' (ginger ale — sweeter, popular with women). NOTES: Captain Morgan is one of our highest-volume call liquors. The bottle is distinctive — dark brown/amber with the pirate captain standing with one foot up. Spiced rum has vanilla/cinnamon notes that pair perfectly with cola. Upsell: 'Would you like a double?' or suggest Captain Morgan Private Stock (premium version, smoother).",
    confidence: "high", source: "manual", tags: ["captain morgan", "rum", "coke", "cocktail", "recipe", "visual", "call liquor"]
  },
  {
    station: "bar", category: "recipe", question: "How do you make an Old Fashioned?",
    answer: "OLD FASHIONED — Glass: Rocks/Old Fashioned glass (short, wide). Build: Place 1 sugar cube (or 0.5 oz simple syrup) in glass. Add 2-3 dashes Angostura bitters directly onto sugar. Add splash of water. Muddle until sugar dissolves. Add large ice cube (one big cube, not small cubes — melts slower, less dilution). Pour 2 oz bourbon (well: Jim Beam, call: Maker's Mark or Bulleit, premium: Woodford Reserve). Stir 15-20 seconds to chill and integrate. Express orange peel over the drink (twist over the surface to release oils, you'll see the mist), drop peel in. Add luxardo cherry. Visual: Rich amber/golden color, single large ice cube, orange peel twist draped over the cube, dark cherry at bottom. NOTES: This is a CRAFT cocktail — take your time making it. It's ordered by people who appreciate quality. Never shake an Old Fashioned. The large ice cube is essential (ask bartender to prep them before shift).",
    confidence: "high", source: "manual", tags: ["old fashioned", "bourbon", "whiskey", "cocktail", "craft", "bitters", "recipe", "visual"]
  },
  {
    station: "bar", category: "recipe", question: "How do you make a Margarita?",
    answer: "MARGARITA — Glass: Rocks glass (on the rocks) or coupe (up). Rim: Run lime wedge around rim, dip in kosher salt (salt only half the rim — gives guest the choice). Build (rocks): Fill glass with ice. 2 oz tequila (well: Jose Cuervo, call: Hornitos/Espolòn, premium: Patron/Casamigos), 1 oz fresh lime juice (ALWAYS fresh, never Rose's), 0.75 oz triple sec (or Cointreau for premium). Shake hard with ice 10-15 seconds. Strain over fresh ice in prepared glass. Garnish: Lime wheel on rim. Visual: Pale green/yellow color, salt-crusted rim (half), lime wheel, condensation on glass. VARIATIONS: Frozen (blended with ice), Cadillac (float Grand Marnier on top), Spicy (muddle jalapeño), Skinny (no triple sec, add agave). NOTES: Margaritas are our #1 cocktail seller. Fresh lime juice makes ALL the difference — guests notice. Batch the mix (tequila + lime + triple sec) during prep for speed during rush.",
    confidence: "high", source: "manual", tags: ["margarita", "tequila", "lime", "cocktail", "salt rim", "recipe", "visual", "frozen"]
  },
  {
    station: "bar", category: "recipe", question: "How do you make a Long Island Iced Tea?",
    answer: "LONG ISLAND ICED TEA — Glass: Highball/Collins (tallest glass). Ice: Fill glass. Build: 0.5 oz vodka, 0.5 oz gin, 0.5 oz white rum, 0.5 oz tequila, 0.5 oz triple sec (that's 2.5 oz total liquor — this is a STRONG drink). Add 1 oz sour mix (or fresh lemon juice + simple syrup). Top with splash of cola (just for color — should look like iced tea). Stir gently. Garnish: Lemon wedge. Visual: Tea-colored (amber/brown), tall glass, looks innocent like iced tea but packs 5 spirits. NOTES: This drink is POTENT — 2.5 oz of liquor. Watch consumption. Some bars limit to 2 per guest. If someone orders multiple, check in with them. Popular with college-age crowd. Costs us more to make (5 pours) so margin is lower — price accordingly. Never free-pour this one, always jigger to control cost.",
    confidence: "high", source: "manual", tags: ["long island", "iced tea", "cocktail", "strong", "five spirits", "recipe", "visual"]
  },
  {
    station: "bar", category: "recipe", question: "How do you make a Moscow Mule?",
    answer: "MOSCOW MULE — Glass: Copper mug (MUST be copper — it's the signature). Ice: Fill mug with ice (crushed if available, cubed if not). Build: 2 oz vodka (well or Tito's — Tito's Mule is a popular call), 0.5 oz fresh lime juice, fill with ginger beer (NOT ginger ale — ginger beer is spicier and more carbonated). Stir gently. Garnish: Lime wheel and fresh mint sprig (slap the mint between your palms first to release oils/aroma). Visual: Copper mug with condensation forming on outside, lime wheel visible, mint sprig sticking up, crushed ice peeking over top. NOTES: The copper mug is what makes this drink special — it gets ice cold and looks Instagram-worthy. Make sure mugs are clean and polished. Ginger beer brands matter — Fever-Tree or Q are premium, Gosling's is solid. VARIATIONS: Kentucky Mule (bourbon), Mexican Mule (tequila), Dark & Stormy (dark rum + ginger beer in regular glass).",
    confidence: "high", source: "manual", tags: ["moscow mule", "vodka", "ginger beer", "copper mug", "cocktail", "recipe", "visual", "mint"]
  },
  {
    station: "bar", category: "recipe", question: "How do you make a Whiskey Sour?",
    answer: "WHISKEY SOUR — Glass: Rocks glass (or coupe if served up). Build: 2 oz bourbon (well: Jim Beam, call: Maker's Mark, premium: Woodford), 0.75 oz fresh lemon juice, 0.5 oz simple syrup, optional egg white (for silky foam — ask guest 'would you like it with egg white for that creamy top?'). If using egg white: DRY SHAKE first (no ice, 15 seconds hard — this emulsifies the egg white into foam), then add ice and shake again 10-15 seconds. Strain into glass over fresh ice (rocks) or into coupe (up). Garnish: Orange half-wheel and luxardo cherry (flag garnish — cherry speared through orange). Visual: Pale golden/amber with beautiful white foam cap (if egg white), orange flag garnish resting on foam. NOTES: The egg white version is the craft/upscale presentation. Without egg white it's still great but looks simpler. Always use fresh lemon — bottled sour mix makes it taste cheap.",
    confidence: "high", source: "manual", tags: ["whiskey sour", "bourbon", "cocktail", "egg white", "craft", "recipe", "visual"]
  },
  {
    station: "bar", category: "recipe", question: "How do you make a Gin and Tonic?",
    answer: "GIN & TONIC — Glass: Highball or Copa/balloon glass (Copa is trending, shows off the botanicals). Ice: Fill glass with ice (large cubes preferred). Build: 2 oz gin (well: New Amsterdam, call: Tanqueray/Bombay Sapphire, premium: Hendrick's), fill with tonic water (Fever-Tree or Q for premium, Schweppes for well). Stir gently — don't over-stir or you lose carbonation. Garnish: Lime wedge (standard) or cucumber ribbon (for Hendrick's — it's made with cucumber). Visual: Crystal clear and effervescent, bubbles rising, lime or cucumber visible through the glass. Copa glass makes it look elegant. NOTES: The ratio matters — 1:2 or 1:3 gin to tonic depending on guest preference. Premium tonics have less sugar and more complex flavor. Hendrick's should ALWAYS get cucumber, not lime — it's part of the brand experience. G&T is a 'grown-up' drink — popular with 30+ crowd.",
    confidence: "high", source: "manual", tags: ["gin and tonic", "gin", "tonic", "cocktail", "Hendrick's", "cucumber", "recipe", "visual"]
  },

  // ═══════════════════════════════════════════════════════════════
  // BEER & KEG KNOWLEDGE
  // ═══════════════════════════════════════════════════════════════
  {
    station: "bar", category: "equipment", question: "How does the draft beer system work and how do you troubleshoot it?",
    answer: "DRAFT SYSTEM COMPONENTS: Keg → Coupler → Beer line → Faucet. CO2 tank provides pressure to push beer through lines. PRESSURE: 12-14 PSI for most ales, 14-16 PSI for lagers (higher carbonation). TEMPERATURE: Lines must stay 36-38°F from keg to faucet — any warm spot causes foam. PROPER POUR: Hold glass at 45° angle, open faucet fully (never half-open — causes turbulence/foam), straighten glass at 2/3 full, close faucet cleanly. Target: 1 inch of head. FOAM TROUBLESHOOTING: Too much foam = lines too warm, pressure too high, dirty lines, kinked line, glass not beer-clean. Not enough foam = pressure too low, beer too cold. CHANGING KEGS: Turn off CO2, pull coupler handle up and twist off, remove empty keg, connect new keg (align coupler ears, twist on, push handle down until it clicks), turn CO2 back on, pour off first pint (mostly foam from line change). LINE CLEANING: Every 2 weeks minimum — run caustic cleaner through lines, then acid rinse, then water flush.",
    confidence: "high", source: "manual", tags: ["draft", "keg", "beer", "CO2", "foam", "troubleshoot", "pour", "lines", "coupler"]
  },
  {
    station: "bar", category: "equipment", question: "What are the different keg sizes and how many pints in each?",
    answer: "KEG SIZES: 1/2 Barrel (Full Keg) = 15.5 gallons = 124 pints (16 oz) = 165 twelve-oz servings. This is the standard full-size keg, most common for high-volume taps (Bud Light, Coors Light, Busch Light). 1/4 Barrel (Pony Keg) = 7.75 gallons = 62 pints = 82 twelve-oz servings. Good for medium-volume taps or limited-time offerings. 1/6 Barrel (Sixtel) = 5.16 gallons = 41 pints = 55 twelve-oz servings. Standard for craft beers and rotating taps — smaller volume means fresher beer for slower-moving craft options. SLIM 1/4 Barrel = Same volume as 1/4 barrel but taller and narrower — fits in tight cooler spaces. COST TRACKING: Divide keg cost by number of pints to get cost-per-pour. Example: $200 keg ÷ 124 pints = $1.61/pint cost. If we sell at $5/pint, that's 68% margin.",
    confidence: "high", source: "manual", tags: ["keg", "sizes", "half barrel", "sixtel", "pints", "cost per pour", "draft beer"]
  },
  {
    station: "bar", category: "menu_info", question: "What beers do we typically have on tap and in bottles?",
    answer: "DRAFT TAPS (typical rotation): Bud Light (always on — highest volume domestic), Coors Light, Miller Lite, Busch Light (Iowa staple — huge seller here), Blue Moon (wheat beer — serve with orange slice), Michelob Ultra (low-cal option), plus 2-3 rotating craft/local taps (often Confluence Brewing from Des Moines, Toppling Goliath, or seasonal). BOTTLES/CANS: Domestic — Budweiser, Bud Light, Coors, Coors Light, Miller Lite, Busch Light, Michelob Ultra, Natural Light. Import — Corona (serve with lime), Heineken, Modelo Especial, Modelo Negra, Guinness Draught cans. Craft/Specialty — varies by season and availability. PRICING: Domestic draft $4-5, Premium/Craft draft $6-7, Domestic bottles $3.50-4, Import bottles $5-6. IOWA NOTE: Busch Light outsells everything else in Iowa bars — always keep extra cases stocked.",
    confidence: "high", source: "manual", tags: ["beer", "draft", "bottles", "tap list", "Busch Light", "Iowa", "menu", "pricing"]
  },
  {
    station: "bar", category: "menu_info", question: "How do you identify common liquor bottles on the shelf?",
    answer: "WELL/SPEED RAIL (bottom shelf, cheapest, used when guest says 'vodka soda' without specifying brand): Vodka = clear bottle, simple label (Svedka, Pinnacle). Gin = clear bottle (New Amsterdam). Rum = Bacardi white (clear), Captain Morgan dark (brown bottle, pirate). Tequila = Jose Cuervo Gold (gold label). Whiskey = Jim Beam (white label). Triple Sec = clear, orange label. CALL (mid-shelf, guest requests by name): Tito's = tall clear bottle, copper/orange cap — our #1 call vodka. Captain Morgan = dark bottle with pirate standing on barrel. Jameson = green bottle, gold label — Irish whiskey. Crown Royal = purple velvet bag, clear bottle. Fireball = red/orange label with dragon — cinnamon whiskey. Jack Daniel's = square black bottle, white label. PREMIUM/TOP SHELF: Grey Goose = frosted white tall bottle, goose silhouette. Patron = short round bottle, bee on cork. Maker's Mark = red wax dipped top. Hennessy = brown bottle, arm & axe logo. Johnnie Walker = square bottle, walking man (Red label = well, Black = call, Blue = ultra-premium).",
    confidence: "high", source: "manual", tags: ["liquor", "bottles", "identification", "well", "call", "premium", "shelf", "brands"]
  },

  // ═══════════════════════════════════════════════════════════════
  // SPLIT CHECK & TAB MANAGEMENT
  // ═══════════════════════════════════════════════════════════════
  {
    station: "bar", category: "process", question: "How do you handle split checks on PDQ POS?",
    answer: "SPLIT CHECK PROCEDURES ON PDQ: ASK EARLY — At greeting: 'Will this be together or separate tonight?' This saves massive headaches later. BEST PRACTICE — Open multiple checks per table from the start if they say separate. On PDQ, use seat numbers to assign items as you ring them in. SPLITTING AFTER THE FACT: On PDQ, go to the table's check → Split Check function → Choose method: 1) Split by Item: select individual items and move them to a new check. 2) Split Evenly: divide total equally across X number of checks. 3) Split by Seat: if you assigned seat numbers, one click separates by seat. RULES: Never split AFTER payment has started on any portion. Gift cards CAN be applied to individual split checks. Coupons/discounts apply to one check only (ask which guest gets the discount). LARGE PARTIES: Always confirm split situation before ordering. Auto-gratuity (18%) on 8+ may apply — check with manager. If splitting a large party, do it BEFORE running any cards.",
    confidence: "high", source: "manual", tags: ["split check", "PDQ", "POS", "tab", "payment", "separate checks", "seat numbers"]
  },
  {
    station: "bar", category: "process", question: "How do you manage bar tabs properly?",
    answer: "BAR TAB MANAGEMENT: OPENING A TAB — Swipe/hold credit card on PDQ (card stays in system, not physically held). Start a check under the guest's name. Some bars hold the physical card — we keep it in the card holder box alphabetically. RUNNING A TAB — Add items as guest orders. Always confirm: 'Put it on your tab?' before adding. If guest is buying rounds for others, add to their tab. CLOSING A TAB — Guest says 'close me out.' Pull up their check, confirm total, process payment. Print receipt for signature + tip. Return card if physically held. WALKOUTS — If someone leaves without closing: their card on file gets charged for the full amount + 20% auto-gratuity. This is why we always get a card. TRANSFER — If guest moves from bar to table, transfer their tab to the table's server (PDQ: Transfer Check → select destination). MULTIPLE TABS — One person can have multiple tabs (e.g., personal + business dinner). Label clearly in PDQ.",
    confidence: "high", source: "manual", tags: ["bar tab", "tab management", "PDQ", "credit card", "close out", "walkout", "transfer"]
  },

  // ═══════════════════════════════════════════════════════════════
  // HOSPITALITY TRAINING
  // ═══════════════════════════════════════════════════════════════
  {
    station: "waitstaff", category: "process", question: "What are the steps of service for greeting a table?",
    answer: "STEPS OF SERVICE — TABLE APPROACH: 1) ACKNOWLEDGE within 30 seconds of seating — even if busy, make eye contact and say 'I'll be right with you!' 2) GREET within 60 seconds with full approach. Make eye contact with EVERYONE at the table. 3) READ THE TABLE first — business dinner (formal, efficient), date night (romantic, don't rush), family (patient, kid-friendly), regulars (familiar, remember their usual). 4) GREETING SCRIPT: 'Good evening, welcome to Community Tap! How's everyone doing tonight?' (warm, genuine, not robotic). 5) Introduce yourself BY NAME at the END of the greeting (they'll remember it better after you've engaged them). 6) WATER — 'Can I get some waters started for the table?' 7) SUGGEST A DRINK — Be specific: 'Can I start you with one of our house margaritas or a cold Busch Light?' (not 'Can I get you something to drink?' — too generic). 8) MENTION FEATURES — 'Just so you know, our Iowa Chop has been smoking since this morning and it's incredible tonight.' 9) Give them time with menus, return in 2-3 minutes for drink order.",
    confidence: "high", source: "manual", tags: ["greeting", "table approach", "steps of service", "hospitality", "server training"]
  },
  {
    station: "waitstaff", category: "process", question: "How do you upsell effectively without being pushy?",
    answer: "UPSELLING TECHNIQUES (natural, not salesy): DRINK UPGRADES — When they order 'vodka soda,' say 'Would you like Tito's in that? It's super smooth' (adds $2-3). APPETIZER PLANT — 'While you're looking at the menu, our loaded nachos are perfect for sharing — want me to get those started?' FEATURE ITEMS — 'Our Iowa Chop is the star tonight — it's been smoking since this morning' (creates urgency/FOMO). SPECIFIC ADD-ONS — 'Would you like to add our garlic parmesan fries to that burger? They're ridiculous' (not 'Would you like a side?'). DESSERT PLANT — Mention dessert when dropping entrees: 'Save room for our skillet cookie — it's perfect for sharing.' ANOTHER ROUND — When glasses are 1/3 full: 'Can I get another round going for you?' (don't wait until empty). BOTTLE vs GLASS — For wine drinkers ordering a second glass: 'Would you like me to just bring the bottle? It's actually a better value.' KEY PRINCIPLE: Be enthusiastic and specific. 'Our _____ is amazing' works 10x better than 'Would you like to add anything?' People buy excitement, not options.",
    confidence: "high", source: "manual", tags: ["upselling", "sales", "server", "technique", "revenue", "check average", "hospitality"]
  },
  {
    station: "waitstaff", category: "process", question: "How do you read the room and adjust your service style?",
    answer: "READING THE ROOM — Adapt your energy and pace to match the table: BUSINESS DINNER — Formal, efficient, invisible. Don't interrupt conversations. Refill drinks without asking. Keep courses moving at their pace. Present check without being asked when plates are cleared. NEVER be overly chatty. DATE NIGHT — Attentive but invisible. Romantic pacing (don't rush courses). Suggest shareable plates and wine. Dim lighting awareness. Don't hover. Check back once and disappear. FAMILIES WITH KIDS — Fast drinks for kids immediately (keeps them happy). Patient with orders. Offer crayons/kids menu proactively. Bring kid food first if possible. Be understanding of mess. REGULARS — Remember their usual ('The regular tonight, Mike?'). Acknowledge them by name. Make them feel VIP. Know their preferences without asking. LARGE GROUPS/CELEBRATIONS — High energy to match theirs. Assign a 'leader' for ordering. Confirm split check early. Pace courses. Suggest shareable apps and pitchers. Birthday? Coordinate dessert surprise. SOLO DINERS — Don't make them feel awkward. Offer bar seating. Check in but don't over-attend. They often want to eat and go.",
    confidence: "high", source: "manual", tags: ["reading the room", "service style", "hospitality", "adapt", "business", "date", "family"]
  },
  {
    station: "waitstaff", category: "process", question: "How do you handle a guest complaint properly?",
    answer: "COMPLAINT HANDLING — THE LEARN METHOD: L = LISTEN — Let them finish completely. Don't interrupt, don't get defensive. Nod, maintain eye contact. They need to feel heard. E = EMPATHIZE — 'I completely understand your frustration' or 'That's not the experience we want you to have.' Mirror their emotion without being dramatic. A = APOLOGIZE — Sincere, specific: 'I'm sorry your steak came out overcooked' (not generic 'sorry about that'). Take ownership even if it wasn't your fault. R = REACT/RESOLVE — Fix it NOW. Options: remake the item (fastest), remove from bill, offer a comp (dessert, next visit discount), manager visit for serious issues. Ask: 'What can I do to make this right?' Then exceed their expectation. N = NOTIFY — Always tell the manager, even if you resolved it. They need to know for patterns and may want to visit the table. CRITICAL RULES: Never argue. Never blame the kitchen in front of the guest. Never say 'that's our policy.' The goal is to turn a complaint into a loyal customer. A recovered guest spends 20% more on future visits than one who never had a problem.",
    confidence: "high", source: "manual", tags: ["complaint", "LEARN method", "guest recovery", "hospitality", "comp", "resolve"]
  },
  {
    station: "waitstaff", category: "process", question: "What are the best practices for check-backs and timing?",
    answer: "CHECK-BACK TIMING: 2-BITE RULE — Return to the table after guests have taken 2-3 bites of their food (about 2 minutes after delivery). This is the critical window — if something is wrong, you catch it before they've eaten half and are now frustrated. SCRIPT: 'How's everything tasting?' or 'Is that steak cooked the way you like it?' (specific is better than generic). DRINK TIMING — Check glasses when 1/3 full, not empty. 'Can I get a refresh on that?' Waiting until empty means they sat with nothing to drink. PRE-BUS — Remove finished plates/glasses throughout the meal. Don't let the table get cluttered. Ask: 'Are you still working on that?' before removing. DESSERT/CHECK — After clearing entree plates, offer dessert and coffee. If they decline, don't make them wait for the check. Drop it casually: 'No rush at all, just whenever you're ready.' NEVER disappear for more than 5 minutes during an active meal. If you're in the weeds, at minimum make eye contact and acknowledge them.",
    confidence: "high", source: "manual", tags: ["check-back", "timing", "2-bite rule", "pre-bus", "service", "hospitality", "pacing"]
  },

  // ═══════════════════════════════════════════════════════════════
  // VENDOR PROGRAMS — PFG
  // ═══════════════════════════════════════════════════════════════
  {
    station: "store_room", category: "vendor", question: "What is PFG CustomerFirst and how do we use it to order?",
    answer: "PFG CUSTOMERFIRST is Performance Foodservice's next-generation online ordering platform. HOW WE USE IT: Log in at customerfirstsolutions.com or the CustomerFirst app (iOS/Android). FEATURES: Smart Search — Google-style search with product images, filters, and our custom-named items. Flexible Ordering — Order from desktop, tablet, or phone. Start an order on one device, finish on another. Custom Lists — Our order guides are saved as lists organized by station (pizza, fry, bar, walk-in). Set par levels so you know exactly what to order. Inventory & Pars — Track usage, set par levels, streamline reordering. Recipe & Menu Tools — Built-in recipe builder connects to our order history. Real-Time Tracking — Track every delivery live, know what's arriving and when. ORDERING PROCESS: Tom (Kitchen Manager) places food orders Tuesday and Friday for Wednesday and Saturday delivery. Check par levels → add items below par to cart → review → submit by 6 PM for next-day delivery. Our PFG rep is available for special orders or issues.",
    confidence: "high", source: "manual", tags: ["PFG", "CustomerFirst", "ordering", "platform", "Performance Foodservice", "app", "par levels"]
  },
  {
    station: "store_room", category: "vendor", question: "What is PFG Performance Elite Rewards and how does it benefit us?",
    answer: "PERFORMANCE ELITE REWARDS is PFG's exclusive rewards program for independent foodservice operators like CTAP. HOW IT WORKS: We earn rewards for every case of eligible products purchased through Performance Foodservice. The more we buy, the more we earn back. It's FREE to participate — no cost, no commitment. BENEFITS: Cash-back rebates on qualifying purchases, exclusive member communications with deals and new product alerts, access to special promotions and limited-time offers, connection to PFG's network of independent operators. ELIGIBLE PRODUCTS: Most PFG-distributed brands qualify. Check the Elite Rewards portal or ask our PFG rep which items earn the highest rewards. TRACKING: Rewards accumulate automatically based on our purchase history — no need to submit receipts or claim manually. Payouts are typically quarterly. ALSO AVAILABLE: PFG One Source program — free access to discounted services from partner providers (equipment, tech, insurance, etc.) at no cost to us as PFG customers.",
    confidence: "high", source: "manual", tags: ["PFG", "Performance Elite Rewards", "rebates", "rewards", "One Source", "independent restaurant"]
  },

  // ═══════════════════════════════════════════════════════════════
  // VENDOR PROGRAMS — SYSCO
  // ═══════════════════════════════════════════════════════════════
  {
    station: "store_room", category: "vendor", question: "What is Sysco Shop and how does their ordering system work?",
    answer: "SYSCO SHOP is Sysco's digital ordering platform available as a web portal and mobile app (iOS/Android). FEATURES: Complete product catalog search, custom order lists (saved by station/category), delivery tracking with estimated windows, order history review, invoice management and payment. HOW TO ORDER: Log in to portal.sysco.com or the Sysco Shop app → Browse catalog or use saved lists → Add items to cart → Review order → Submit. Orders placed by cutoff time ship next delivery day. LISTS: Create custom lists organized by how you stock (walk-in, freezer, dry storage, bar). Set pars and the system highlights what's below par. DELIVERY: Track your truck in real-time, see exactly what's on board, get alerts for substitutions or out-of-stocks. INVOICES: View, download, and pay invoices directly through the portal. SYSCO PORTAL: One-stop for ordering, tracking, paying, and managing your account. Everything in one login.",
    confidence: "high", source: "manual", tags: ["Sysco", "Sysco Shop", "ordering", "portal", "app", "delivery tracking", "invoices"]
  },
  {
    station: "store_room", category: "vendor", question: "What are Sysco's Restaurant Solutions tiers and Perks program?",
    answer: "SYSCO RESTAURANT SOLUTIONS TIERS (based on monthly spend): BASIC (under $7,500/month) — Self-service access to Sysco Studio (digital marketing platform for creating menus, recipes, marketing materials). PRO ($7,500+/month) — 6 professional projects per year from Sysco's service team. PERKS! (Premier Rewards Club Members) — Unlimited projects + exclusive member-only discounts + $6,000 worth of industry-leading solutions + added order flexibility + Surprise & Delight gifts. SERVICE OFFERINGS INCLUDED: Menu Design (professional menu design matching your brand), Menu Modifications (updates, price changes, layout), Menu Profitability Analysis (recipe costing and sales analysis — US only), Website Assessment (comprehensive audit with SEO recommendations), Google Business Profile Consultation (claim, verify, optimize), Social Media Consultation (channel assessment + strategy guide). SYSCO STUDIO: All-in-1 digital marketing platform — create your own recipes, menus, and marketing materials. 24/7 access with training videos, FAQs, and live chat. Available to ALL tiers. SYSCO PRINT SHOP: Order printed marketing materials directly.",
    confidence: "high", source: "manual", tags: ["Sysco", "Restaurant Solutions", "Perks", "tiers", "menu design", "Studio", "marketing"]
  },

  // ═══════════════════════════════════════════════════════════════
  // VENDOR PROGRAMS — PEPSI
  // ═══════════════════════════════════════════════════════════════
  {
    station: "store_room", category: "vendor", question: "What is PepsiCo's Local Eats program and how does it benefit us?",
    answer: "PEPSICO LOCAL EATS DESERVE PEPSI — Up to $50,000 worth of FREE perks for independent restaurants. WHAT'S INCLUDED: 1) MENU OPTIMIZE — PepsiCo improves your digital menus with updated product images and descriptions to drive higher check sizes. 2) SEO & GOOGLE MEDIA — Free Google media and SEO resources to help attract more direct orders (rank higher in search). 3) PROFESSIONAL PHOTOGRAPHY — PepsiCo pays for a local photographer to shoot your menu items, OR use their image asset library for POS signage. 4) PR TRAINING — One-on-one consultations and on-demand training from PepsiCo's PR team (digital marketing, earned media, crisis management). 5) DELIVERY APP INCLUSION — Auto-included in deals on delivery apps at no charge to you. 6) CUSTOMER COMMUNICATION — Training sessions on website and social media effectiveness. HOW TO ACCESS: Register at pepsicopartners.com → Restaurant Success section. Already a PepsiCo partner? Login to access tools immediately. This is REAL money — use it.",
    confidence: "high", source: "manual", tags: ["Pepsi", "PepsiCo", "Local Eats", "rebates", "photography", "SEO", "marketing", "free"]
  },
  {
    station: "store_room", category: "vendor", question: "How does Pepsi fountain equipment and ordering work?",
    answer: "PEPSI FOUNTAIN SYSTEM: EQUIPMENT — Pepsi provides fountain dispensers, CO2 systems, and ice/beverage combos at no cost as part of our beverage partnership. They own and maintain the equipment. SERVICE — Call Pepsi Equipment Service for any issues (troubleshooting, repair tickets, maintenance). Available online at pepsiequipmentservice.com. ORDERING — Through PepsiCo Partners portal (pepsicopartners.com) or through our local Pepsi distributor rep. Order BIB (Bag-in-Box) syrup — prices as low as $115.95 for 5-gallon BIB. REBATES — $0.65 per gallon rebate through our unique Pepsi National Account number. Competitive rebates: earn more money back the more we pour. MAINTENANCE WE DO: Weekly — remove nozzles and diffusers, soak in sanitizing solution 60-90 seconds, flush syrup lines. Monthly — replace water filter cartridge, sanitize ice machine. Quarterly — full system sanitization. WHAT PEPSI DOES: Equipment repair, major maintenance, BIB delivery, marketing materials, menu boards.",
    confidence: "high", source: "manual", tags: ["Pepsi", "fountain", "equipment", "BIB", "syrup", "rebate", "maintenance", "ordering"]
  },
  {
    station: "bar", category: "cleaning", question: "How do you clean and maintain the Pepsi fountain dispenser?",
    answer: "PEPSI FOUNTAIN WEEKLY CLEANING: 1) Remove all nozzles and diffusers from the dispenser head. 2) Soak in approved sanitizing solution for 60-90 seconds. 3) Scrub with nozzle brush to remove any buildup. 4) Rinse thoroughly with clean water. 5) Reinstall nozzles and diffusers. 6) Wipe down exterior of dispenser with sanitizer. 7) Clean drip tray — remove, wash, sanitize, replace. 8) Flush syrup lines if any flavor tastes off. MONTHLY: Replace water filter cartridge (affects carbonation quality and taste). Sanitize ice machine (run ice machine cleaner per manufacturer instructions). Check CO2 tank level — order replacement when gauge shows 1/4 full. DAILY: Wipe exterior after each rush. Empty and clean drip tray. Check that all flavors are dispensing properly (out of syrup = clear water comes out — change BIB immediately). ICE: Never use the ice bin as a cooler for bottles/cans. Never scoop ice with a glass (glass can chip and contaminate). Always use the ice scoop.",
    confidence: "high", source: "manual", tags: ["fountain", "cleaning", "Pepsi", "nozzles", "sanitize", "maintenance", "ice machine"]
  },

  // ═══════════════════════════════════════════════════════════════
  // ADDITIONAL CULINARY EXPERTISE
  // ═══════════════════════════════════════════════════════════════
  {
    station: "general", category: "safety", question: "What are the critical food temperature danger zones and safe cooking temps?",
    answer: "DANGER ZONE: 41°F - 135°F — bacteria multiply rapidly. Food cannot stay in this zone for more than 4 hours total (cumulative). SAFE COOKING TEMPS (minimum internal): Poultry (chicken, turkey): 165°F. Ground meats (burgers, sausage): 155°F (we cook to 145°F for medium per guest request — must inform). Pork: 145°F (3-minute rest). Steaks/chops: 145°F (can serve lower per guest request). Fish: 145°F. Eggs: 145°F (for immediate service). Reheated leftovers: 165°F within 2 hours. HOT HOLDING: Must maintain 135°F or above (steam table, heat lamps). COLD HOLDING: Must maintain 41°F or below (walk-in, reach-in, cold table). COOLING: Hot food must cool from 135°F to 70°F within 2 hours, then 70°F to 41°F within 4 more hours (total 6 hours). Use ice baths, shallow pans, blast chiller. THAWING: In refrigerator (safest), under cold running water, in microwave (cook immediately after), or as part of cooking process. NEVER thaw at room temperature.",
    confidence: "high", source: "manual", tags: ["food safety", "temperature", "danger zone", "cooking temps", "holding", "cooling", "HACCP"]
  },
  {
    station: "general", category: "process", question: "What is mise en place and why is it critical?",
    answer: "MISE EN PLACE (French: 'everything in its place') — The foundation of professional kitchen work. It means having ALL your ingredients prepped, measured, and organized BEFORE you start cooking or before service begins. WHY IT MATTERS: 1) Speed during rush — you can't stop to dice onions when tickets are flying. 2) Consistency — same prep = same result every time. 3) Reduces errors — everything visible and ready means nothing gets forgotten. 4) Cleanliness — organized station = clean station. 5) Confidence — when you're set up right, you're calm under pressure. WHAT IT INCLUDES: All ingredients prepped (diced, sliced, portioned), sauces in squeeze bottles or bains, proteins portioned and tempered, garnishes ready, plates/bowls stacked, tools in position (tongs, spatulas, thermometer), towels folded and placed, trash can positioned, ticket rail clear. THE RULE: If your mise isn't done, you're not ready for service. Period. Every great chef in the world lives by this. It's not optional — it's professional.",
    confidence: "high", source: "manual", tags: ["mise en place", "prep", "organization", "kitchen", "professional", "setup", "station"]
  },
  {
    station: "general", category: "process", question: "What are the knife skills every cook needs?",
    answer: "ESSENTIAL KNIFE SKILLS: GRIP — Pinch grip: thumb and index finger pinch the blade just above the heel, remaining fingers wrap the handle. This gives maximum control. CUTS: Dice (1/4 inch cubes — onions, peppers, tomatoes), Mince (very fine — garlic, herbs), Julienne (matchstick strips — carrots, peppers for garnish), Chiffonade (thin ribbons — basil, leafy herbs, roll leaves and slice), Brunoise (tiny 1/8 inch dice — for sauces, fine garnish), Bias cut (diagonal — green onions, celery for visual appeal). TECHNIQUE: Curl fingers on guide hand (claw grip — fingertips tucked, knuckles guide the blade). Rock the knife using the tip as a pivot. Let the blade do the work — don't press down hard. Keep blade sharp — dull knife is MORE dangerous (requires more force, slips). SHARPENING: Hone with steel before every shift (realigns edge). Professional sharpening monthly (actually removes metal to create new edge). SAFETY: Always cut away from your body. Carry knife at your side, blade down. Say 'behind' when walking with a knife. Never put knives in the sink (someone will reach in and get cut).",
    confidence: "high", source: "manual", tags: ["knife skills", "cuts", "dice", "julienne", "safety", "technique", "sharpening"]
  },
  {
    station: "general", category: "process", question: "What is the proper way to taste and season food?",
    answer: "TASTING & SEASONING — The difference between good food and great food: TASTE EVERYTHING — Before it leaves the kitchen, taste it. Use a clean spoon every time (never double-dip). If you're not tasting, you're guessing. SALT — The most important seasoning. Salt enhances ALL flavors, it doesn't just make food salty. Under-salted food tastes flat and boring. Season in LAYERS throughout cooking, not just at the end. Taste → adjust → taste again. ACID — The secret weapon. A squeeze of lemon, splash of vinegar, or dash of hot sauce brightens flat food instantly. If something tastes 'good but missing something,' it probably needs acid. FAT — Butter, olive oil, cream. Rounds out harsh flavors, adds richness and mouthfeel. Finish with fat (butter on steak, olive oil drizzle on pasta). HEAT — Black pepper, cayenne, chili flakes. Adds dimension and keeps palate interested. UMAMI — Soy sauce, Worcestershire, parmesan, mushrooms. Adds depth and savory satisfaction. THE RULE: Great cooks taste constantly and adjust. Mediocre cooks follow recipes blindly. Your palate is your most important tool.",
    confidence: "high", source: "manual", tags: ["seasoning", "tasting", "salt", "acid", "flavor", "technique", "culinary"]
  },
  {
    station: "pizza_line", category: "equipment", question: "What is a dough roller/sheeter and how do you use it?",
    answer: "DOUGH ROLLER (also called a dough sheeter) — A machine that rolls dough to uniform thickness using two adjustable rollers. HOW WE USE IT AT CTAP: We primarily stretch pizza dough by hand (preserves gas bubbles for better texture), but the dough roller is used for: 1) Flatbread/thin crust pizzas — when you need perfectly even, thin dough. 2) Large volume prep — when making many crusts for catering or busy nights. 3) Calzone/stromboli dough — needs to be even thickness for proper sealing. OPERATION: Set roller gap to desired thickness (start wide, reduce gradually — never go from thick to thin in one pass). Flour the dough and rollers. Feed dough through, rotate 90°, feed through again. Repeat, reducing gap each pass until desired thickness. MAINTENANCE: Clean rollers after each use (scrape off dough, wipe with damp cloth). Never use water directly on the motor/gears. Oil adjustment knobs monthly. SAFETY: Keep fingers away from rollers during operation. Turn off before cleaning. Never force thick dough through a narrow gap (strains the motor).",
    confidence: "high", source: "manual", tags: ["dough roller", "sheeter", "pizza", "equipment", "flatbread", "operation", "maintenance"]
  },
  {
    station: "general", category: "process", question: "What are the fundamentals of sautéing?",
    answer: "SAUTÉ FUNDAMENTALS (French: 'to jump'): HEAT — Pan must be HOT before adding oil. Test: flick water droplet, it should dance and evaporate instantly. Add oil, let it shimmer (ripples on surface). THEN add food. DRY FOOD — Pat proteins and vegetables dry. Moisture = steam = no browning. You want sear, not boil. DON'T OVERCROWD — Food needs space to brown. Overcrowding drops pan temp and food steams. Cook in batches if needed. Better to do two perfect batches than one mediocre crowded pan. DON'T MOVE IT — Let food sit and develop color before flipping. If it sticks, it's not ready to flip. When properly seared, it releases naturally. ONE FLIP — For proteins, flip once. Multiple flips = no crust development. DEGLAZE — After searing, add liquid (wine, stock, butter) to lift the fond (brown bits stuck to pan). This is liquid gold — pure concentrated flavor. FINISH — Swirl in cold butter off heat for glossy sauce (mount with butter). Season and serve immediately. TOSS TECHNIQUE — For vegetables: quick wrist flick away from you, food jumps and redistributes. Practice with dry beans in a cold pan.",
    confidence: "high", source: "manual", tags: ["sauté", "technique", "browning", "deglaze", "fond", "pan", "cooking method"]
  }
];

async function seedMasterBrain() {
  const conn = await pool.getConnection();
  try {
    let inserted = 0;
    let skipped = 0;
    
    for (const entry of entries) {
      try {
        const [result] = await conn.execute(
          `INSERT INTO knowledge_entries (station, category, question, answer, confidence, source, tags)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE answer = VALUES(answer), tags = VALUES(tags), confidence = VALUES(confidence)`,
          [
            entry.station,
            entry.category,
            entry.question,
            entry.answer,
            entry.confidence,
            entry.source,
            JSON.stringify(entry.tags)
          ]
        );
        if (result.affectedRows > 0) inserted++;
        else skipped++;
      } catch (err) {
        console.error(`Failed: ${entry.question.substring(0, 50)}... — ${err.message}`);
        skipped++;
      }
    }
    
    // Get total count
    const [rows] = await conn.execute('SELECT COUNT(*) as total FROM knowledge_entries');
    console.log(`\n✅ Master Brain Seed Complete:`);
    console.log(`   Inserted/Updated: ${inserted}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total entries in DB: ${rows[0].total}`);
    
  } finally {
    conn.release();
    await pool.end();
  }
}

seedMasterBrain().catch(console.error);
