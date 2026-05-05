// Deep Knowledge Brain Training — correct schema: category enum, confidence enum, source enum, tags JSON
import mysql from 'mysql2/promise';

const c = await mysql.createConnection(process.env.DATABASE_URL);

// Helper: category must be one of: recipe, location, process, equipment, vendor, allergen, prep, cleaning, safety, menu_info
// confidence: high, medium, low
// source: manual, photo_extraction, correction, ai_inferred, imported
// tags: JSON array of strings
async function seed(entries) {
  let count = 0;
  for (const e of entries) {
    try {
      const tags = JSON.stringify(e.tags.split(',').map(t => t.trim()));
      const [result] = await c.query(
        `INSERT INTO knowledge_entries (question, answer, category, station, confidence, tags, source)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [e.question, e.answer, e.category, e.station, e.confidence || 'high', tags, e.source || 'imported']
      );
      count++;
    } catch (err) {
      if (err.message.includes('Duplicate')) continue;
      console.error(`  SKIP: ${e.question.substring(0,50)}... — ${err.message.substring(0,80)}`);
    }
  }
  return count;
}

// ============================================================
// SECTION 1: EVERY MENU ITEM
// ============================================================
const menuKnowledge = [
  // PIZZA
  { question: "What pizza sizes does Community Tap offer?",
    answer: "Community Tap offers 4 pizza sizes: Mini (10\"), Small (12\"), Medium (14\"), and Large (16\"). All pizzas are hand-tossed using house-made dough rolled on the dough roller/sheeter. Dough is made fresh daily with high-gluten flour (PFG GP928). Pizzas are baked in the deck oven at 475-500°F for 8-12 minutes depending on size and toppings.",
    category: "menu_info", station: "pizza_line", tags: "pizza,sizes,mini,small,medium,large,dough,deck oven" },
  { question: "What is a Mini Cheese pizza?",
    answer: "Mini Cheese Pizza ($7.99 kids / $9.99 adult): A 10\" pizza with house-made sauce (San Benito Heavy w/Basil Pear Tomatoes #24482) and mozzarella cheese. Baked in deck oven at 475°F for 8-9 minutes. Popular for kids menu and single servings. Goes on a 10\" pizza circle (PB996) in a 10\" kraft box (TH428).",
    category: "menu_info", station: "pizza_line", tags: "mini cheese,pizza,kids,10 inch" },
  { question: "What are the specialty pizzas at Community Tap?",
    answer: "Specialty pizzas: Meatlovers (pepperoni, sausage, bacon, ham, burger), The Works (pepperoni, sausage, mushroom, onion, green pepper, black olive), Taco Pizza (seasoned beef, lettuce, tomato, cheddar, taco sauce, chips), Philly Cheese (shaved steak, peppers, onions, provolone), C-Mac (mac & cheese pizza), Vegetarian (mushroom, onion, pepper, olive, tomato), Buffalo Chicken (buffalo sauce base, chicken, ranch drizzle), Chicken Bacon Ranch (ranch base, chicken, bacon, tomato), Crab Rangoon (cream cheese, crab, sweet chili drizzle), Brisket Pizza (smoked brisket, BBQ sauce, onion), Pickle Wrap (cream cheese, pickles, ham), BBQ Jam (BBQ sauce, bacon, jalapeño, cream cheese). Prices range from $14.99-$25.85 depending on size.",
    category: "menu_info", station: "pizza_line", tags: "specialty pizza,meatlovers,works,taco,philly,buffalo chicken,crab rangoon,brisket,pickle wrap" },
  { question: "How do you make pizza dough at Community Tap?",
    answer: "Pizza dough is made with high-gluten flour (PFG GP928, 50lb bags, use 4-6 per week). Dough is mixed in the Hobart mixer, then portioned and proofed. Morning pizza prep requires ALL dough to be rolled before the prep person leaves. Dough is rolled on the dough roller/sheeter to the correct size for each pizza (10\", 12\", 14\", 16\"). Rolled dough goes on pizza circles. Unused dough must be covered and put away by 3pm. Store in the Pepsi cooler where dough goes. Check dough before clocking out — always.",
    category: "recipe", station: "pizza_line", tags: "dough,pizza dough,flour,hobart,mixer,dough roller,sheeter,prep" },
  { question: "What is the pizza sauce recipe?",
    answer: "Pizza sauce uses San Benito Heavy Pizza Sauce w/Basil Pear Tomatoes (SKU #24482, 6/#10 cans per case from PFG). Par is 4 buckets of sauce at ALL times — this is non-negotiable. The sauce is ready-to-use from the can — no cooking required. It's a thick, basil-forward crushed tomato sauce. Used on ALL pizzas except specialty bases (ranch, buffalo, BBQ). Weekly usage: 2-4 cases depending on volume.",
    category: "recipe", station: "pizza_line", tags: "pizza sauce,san benito,sauce,par level,buckets" },
  { question: "What pizza toppings are available?",
    answer: "Pizza toppings available: MEATS — Pepperoni, Italian Sausage, Bacon, Ham, Burger (chamber ground beef), Chicken, Smoked Brisket, Smoked Pork. VEGGIES — Mushrooms (canned pieces & stems #CK268), Onions (yellow jumbo, chopped — half pan weekdays), Green Peppers (bell, chopped — half pan weekdays), Black Olives (sliced #GP788), Green Olives (sliced #FC274), Pineapple (tidbits in juice #10858), Jalapeños (sliced #GP347), Tomatoes, Sauerkraut. CHEESE — Mozzarella (block, shredded in-house), Cheddar, Provolone, Cream Cheese. Extra toppings are $1.50-$2.50 depending on size.",
    category: "menu_info", station: "pizza_line", tags: "toppings,pizza toppings,pepperoni,sausage,mushroom,olive,pepper,onion" },

  // BURGERS
  { question: "What burgers does Community Tap serve?",
    answer: "Burger menu: Hamburger ($11.99), Cheeseburger ($12.49), Double Cheeseburger ($13.45), Bacon Cheese Burger ($13.49), Bacon Double Ch ($14.99), Patty Melt ($13.99 — on rye with grilled onions and Swiss), Ranch Burger ($13.99 — ranch, bacon, cheddar), Truman Hart Burger ($13.99 — signature burger), Bacon Bleu Burger ($13.95 — bleu cheese crumbles, bacon), Pork Belly Burger ($13.95 — smoked pork belly, BBQ), Mushroom & Swiss ($13.99), Texan Burger ($12.99 — jalapeño, pepper jack, BBQ), Smash Burger w/Side ($8.99 — lunch special). All burgers use chamber ground beef patties on brioche buns (PFG N3138 Hand Crafted 4.25\"). Served with choice of side.",
    category: "menu_info", station: "fry_line", tags: "burgers,hamburger,cheeseburger,patty melt,ranch burger,bacon bleu,pork belly,smash burger" },
  { question: "What is chamber ground beef?",
    answer: "Chamber ground beef is the specific grind/blend used for burger patties at Community Tap. It's a pre-formed patty (not hand-pattied) that comes vacuum-sealed in chambers/compartments — hence 'chamber.' The patties are consistent weight and thickness for uniform cooking. Cooked on the flat top grill or charbroiler. Always ask meat temperature: rare, medium-rare, medium, medium-well, well-done. Standard cook is medium unless specified. Stored in the steak fridge or walk-in cooler.",
    category: "recipe", station: "fry_line", tags: "chamber,ground beef,burger patties,patty,flat top,charbroiler,meat temp" },
  { question: "What is the Truman Hart Burger?",
    answer: "The Truman Hart Burger ($13.99) is Community Tap's signature burger. Named after the Truman Hart area. It's a specialty burger with premium toppings on a brioche bun. Served with choice of side (waffle fries, french fries, sweet potato fries, mac & cheese, cottage cheese, coleslaw, or cup of soup).",
    category: "menu_info", station: "fry_line", tags: "truman hart,signature burger,specialty" },

  // APPETIZERS
  { question: "What appetizers does Community Tap serve?",
    answer: "Appetizers: Cheese Balls ($9.99), Onion Rings ($9.99), Broccoli & Ched Cheese Bites ($9.45), Fried Mushrooms ($9.45), Fried Pickle Spears ($9.99), Deep Fried Green Beans ($9.45), Nachos ($13.99 — tortilla chips, cheese, beef, jalapeños, sour cream), Garlic Cheese Bread ($8.45), Breadsticks ($6.99), Quesadilla ($14.45), C-Tap Potato Nachos ($12.99 — waffle fries as base), Pretzel Bites ($8.99), Boneless Wings ($10.99), 6 Traditional Wings ($12.45), 12 Traditional Wings ($17.45), Chips & Queso ($7.99), Jalapeño Poppers ($9.45), Gizzards ($8.99), Mozzarella Sticks ($9.99). Pick 2 Apps ($16.99), Pick 3 Apps ($19.99). All fried items cooked in fryers with trans-fat-free soy oil (PFG DV470).",
    category: "menu_info", station: "fry_line", tags: "appetizers,apps,cheese balls,onion rings,wings,nachos,breadsticks,poppers,gizzards,mozzarella sticks" },
  { question: "What are the wing flavors?",
    answer: "Wing flavors at Community Tap: Traditional (bone-in) or Boneless. Sauce options: Buffalo (PFG F6357), BBQ, Sweet Chili (PFG #18732), Garlic Herb, Smoky BBQ, Bayou Cajun (PFG CE729), Caribbean Jerk. Wings are deep-fried until golden and crispy, then tossed in chosen sauce. Served with ranch or blue cheese dressing and celery. Smoked Bone-In Wings (6 for $7.99) are available from the smoker — these are smoked first then finished in the fryer for crispy skin.",
    category: "menu_info", station: "fry_line", tags: "wings,buffalo,bbq,sweet chili,garlic herb,cajun,jerk,bone in,boneless,smoked wings" },
  { question: "How do you make onion rings?",
    answer: "Onion rings at Community Tap: Use yellow jumbo onions (PFG HB404, 50lb bag). Slice into thick rings, separate. Dip in buttermilk batter, then into seasoned breading. Deep fry at 350°F for 3-4 minutes until golden brown. Drain on paper. Serve immediately — they get soggy fast. Appetizer portion is $9.99, side portion is $4.95. Also available as a side with any entrée for $4.99.",
    category: "recipe", station: "fry_line", tags: "onion rings,fried,buttermilk,breading,fryer,appetizer,side" },
  { question: "What are C-Tap Potato Nachos?",
    answer: "C-Tap Potato Nachos ($12.99): Waffle fries used as the base instead of tortilla chips. Topped with melted cheese, bacon bits, sour cream, green onions, and jalapeños. A CTap signature appetizer. Popular bar food item. Fries are cooked first, then loaded and finished under the salamander/heat lamp to melt cheese.",
    category: "menu_info", station: "fry_line", tags: "potato nachos,waffle fries,loaded,cheese,bacon,signature" },

  // STEAKS
  { question: "What steaks does Community Tap serve?",
    answer: "Steaks & More: Smoked Iowa Chop ($18.95 — bone-in pork chop, smoked then seared), Steak Sandwich ($17.95 — sliced steak on hoagie), 8oz Sirloin Steak ($17.99), 10oz Ribeye Steak ($27.95), 16oz Porterhouse Steak ($30.99), Prime King ($34.99 — premium cut). Add Shrimp Skewer to any steak for $7.99. All steaks cooked on the charbroiler. Ask temperature: rare (cool red center), medium-rare (warm red), medium (pink center), medium-well (slight pink), well-done (no pink). Steaks come with choice of 2 sides.",
    category: "menu_info", station: "fry_line", tags: "steaks,sirloin,ribeye,porterhouse,prime king,iowa chop,charbroiler,temperature" },
  { question: "What is the Smoked Iowa Chop?",
    answer: "Smoked Iowa Chop ($18.95): A thick-cut bone-in pork chop, first smoked low and slow in the smoker until internal temp reaches 145°F, then finished with a hard sear on the charbroiler for grill marks and caramelization. Served with 2 sides. This is a signature item — Iowa is pork country and this showcases local pride. The chop is from PFG/Sysco, ordered as needed. It's one of the highest-margin entrées when portioned correctly.",
    category: "recipe", station: "fry_line", tags: "iowa chop,smoked,pork chop,bone in,smoker,charbroiler,signature" },

  // SANDWICHES & SUBS
  { question: "What sandwiches does Community Tap serve?",
    answer: "Sandwiches: Tenderloin ($13.99 — breaded pork tenderloin, Iowa classic), Big BLT ($11.99 — extra bacon), Chicken Breast ($12.45 — grilled or fried), C-Tap Club ($13.45 — triple-decker with turkey, ham, bacon), Buffalo Chicken ($12.45), Pizza Burger ($11.99 — burger with pizza sauce and mozzarella), Reuben ($13.99 — corned beef, sauerkraut, Swiss, 1000 island on rye), Fish Sandwich ($12.99). All served with choice of side.",
    category: "menu_info", station: "fry_line", tags: "sandwiches,tenderloin,blt,club,reuben,fish,chicken breast" },
  { question: "What toasted subs are available?",
    answer: "Toasted Subs (all on 8\" hoagie rolls, PFG N3140): Bomber Sub ($12.99 — ham, salami, pepperoni, provolone, lettuce, tomato, onion, Italian dressing), Stinger Sub ($12.99 — chicken, buffalo sauce, provolone, lettuce, tomato), Philly Sub ($13.45 — shaved steak, peppers, onions, provolone), Chicken Bacon Ranch Sub ($12.99), French Dip Sub ($12.45 — roast beef, provolone, au jus for dipping), Buffalo Chicken Sub ($12.99), BBQ Chicken Sub ($8.95). All toasted in the deck oven until bread is crispy and cheese is melted.",
    category: "menu_info", station: "pizza_line", tags: "subs,toasted subs,bomber,stinger,philly,french dip,hoagie" },
  { question: "What wraps are available?",
    answer: "Wraps (all on 12\" flour tortillas): Bomber Wrap ($12.99), Stinger Wrap ($12.99), Philly Wrap ($13.45), Chicken Bacon Ranch Wrap ($12.99), French Dip Wrap ($12.45), Buffalo Chicken Wrap ($12.99), BBQ Chicken Wrap ($8.95). Same fillings as the sub versions but in a grilled tortilla. Served with choice of side.",
    category: "menu_info", station: "fry_line", tags: "wraps,bomber,stinger,philly,tortilla" },

  // BASKETS
  { question: "What are the basket options?",
    answer: "Baskets (all served with fries): Fish Basket ($13.99 — beer-battered cod fillets), Shrimp Basket ($14.99 — breaded butterfly shrimp), Chicken Strip Baskets in 6 flavors — Original, Smoky BBQ, Garlic Herb, Buffalo, Bayou Cajun, Caribbean Jerk. 3-piece ($13.95) or 5-piece ($15.95). Also: 3 Chicken Tenders ($8.95), 5 Chicken Tenders ($9.95), Grilled Shrimp Special ($17.99). Strips are pre-breaded (PFG), deep-fried, then tossed in chosen sauce.",
    category: "menu_info", station: "fry_line", tags: "baskets,fish,shrimp,chicken strips,tenders,fried" },

  // PASTA
  { question: "What pasta dishes does Community Tap serve?",
    answer: "Pasta: C-Tap Signature Mac ($13.99 — house mac & cheese with special cheese blend, baked), Smokey Chicken Bacon Ranch Mac ($13.99 — smoked chicken, bacon, ranch drizzle over mac), Homemade Lasagna ($14.45 — layers of pasta, meat sauce, ricotta, mozzarella, baked), Creamy Chicken Fettuccine Alfredo ($15.95 — grilled chicken over fettuccine in house alfredo). Pasta uses pre-cooked elbow macaroni (PFG J2724 Marzetti) for mac dishes. Lasagna uses lasagna noodles from PFG.",
    category: "menu_info", station: "fry_line", tags: "pasta,mac and cheese,lasagna,alfredo,fettuccine" },

  // SALADS
  { question: "What salads are on the menu?",
    answer: "Salads: Community Chef Salad ($12.45 — ham, turkey, egg, cheese, tomato, cucumber on mixed greens), Taco Salad ($12.45 — seasoned beef, cheese, tomato, sour cream in fried tortilla bowl), BLT Salad ($12.45 — bacon, lettuce, tomato, croutons, ranch), Chicken Salad ($12.45 — grilled chicken breast on greens), Smoked Salad ($13.95 — choice of smoked chicken, pork, or brisket on greens), Side Salad ($3.95). Lettuce is iceberg shredded (PFG HB296) and heritage blend (PFG JJ728). Dressings: Ranch, Blue Cheese, Italian, 1000 Island, Honey Mustard, French, Caesar.",
    category: "menu_info", station: "fry_line", tags: "salads,chef,taco,blt,chicken,smoked,side salad,dressing" },

  // BBQ
  { question: "What BBQ items does Community Tap serve?",
    answer: "BBQ/SmokeWorx menu: BBQ Dinner 1 ($11.95 — 8oz one meat + 2 sides + cornbread), BBQ Dinner 2 ($12.95 — 4oz each of 2 meats + 2 sides + cornbread), BBQ Dinner 3 ($14.95 — 4oz each of 3 meats + 2 sides + cornbread). BBQ Sandwiches ($13.99 — 5oz meat on brioche): Pork, Chicken, or Brisket. BBQ Melts ($14.99 — 6oz meat with cheese): Pork, Chicken, or Brisket. Half Rack Ribs ($17.95), Half Rack + 1 Meat ($20.95). Family Packs: Pack 1 ($37.99 — 1lb meat, 2 pints, 4 cornbread), Pack 2 ($51.99 — 2lb, 3 pints, 6 cornbread), Pack 3 ($58.99 — 3lb, 4 pints, 8 cornbread). SmokeWorx Combo ($25.45). Full Rack Rib ($27.45). Meats are smoked in-house.",
    category: "menu_info", station: "fry_line", tags: "bbq,smokeworx,ribs,brisket,pulled pork,smoked chicken,family pack,cornbread" },
  { question: "What are the BBQ meat weights and portions?",
    answer: "BBQ portion specs (from SOP): Dinner 1 = 8oz of meat. Dinner 2 = 4oz of each meat (2 meats). Dinner 3 = 4oz of each meat (3 meats). BBQ Sandwiches = 5oz of meat. BBQ Melts = 6oz of meat. Family Pack 1 = 1 pound meat + 2 pint cups + 4 cornbread. Family Pack 2 = 2 pounds meat + 3 pint cups + 6 cornbread. Family Pack 3 = 3 pounds meat + 4 pint cups + 8 cornbread. ALWAYS weigh on the scale — both scales must be cleaned nightly. Portion control is critical for food cost.",
    category: "process", station: "fry_line", tags: "bbq weights,portions,scales,food cost,dinner,sandwich,melt,family pack" },

  // SIDES
  { question: "What sides are available?",
    answer: "Sides ($4.99 each unless noted): Baked Potato, Waffle Fries, French Fries, Sweet Potato Fries (crinkle cut, PFG #31836), Mac & Cheese, Cottage Cheese, Macaroni Salad (PFG B3408 Mrs Gerry's), Coleslaw, Cornbread, BBQ Baked Beans (PFG TB850). Premium sides ($5.95): Mozzarella Sticks, Cheese Balls, Jalapeño Poppers, Fried Pickle Spears. Also: Onion Rings ($4.95), Mushrooms ($4.95), Fried Green Beans ($4.95), Cup of Soup ($4.99), Bowl of Soup ($5.99). Most entrées come with choice of 1-2 sides.",
    category: "menu_info", station: "fry_line", tags: "sides,fries,waffle fries,sweet potato,mac,baked potato,coleslaw,beans,soup" },

  // BREAKFAST
  { question: "Does Community Tap serve breakfast?",
    answer: "Yes! Breakfast menu: French Toast ($11.45), Build Your Own Omelette ($13.99), Biscuits & Gravy ($11.45 / half $8.99), Farmers Skillet ($12.99), Steak & Eggs ($16.99), Breakfast Burrito ($12.45), Egg Sandwich ($11.45), Loaded Hash Browns ($9.45), Pancakes Full ($11.45 / 1 pancake $3.99), Kids Chocolate Chip Pancakes ($7.99), Country Fried Steak ($14.99), 2 Eggs 1 Meat Hash Toast ($11.45), Half French Toast Hash ($8.99), 1 Egg Hashbrown Meat ($8.99). Sides: Toast/Bread ($0.75), Gravy ($1.99), 2 Eggs ($3.95), Sausage ($3.95), Bacon ($3.95), Hashbrowns ($4.99).",
    category: "menu_info", station: "fry_line", tags: "breakfast,french toast,omelette,biscuits gravy,pancakes,eggs,skillet,burrito" },

  // KIDS
  { question: "What's on the kids menu?",
    answer: "Kids Menu (all $7.99): Hamburger, Cheeseburger, Grilled Cheese, Original Chicken Strips, Mini Cheese Pizza. All kids meals come with a side of fries. Simple, kid-friendly options. The mini cheese pizza is a 10\" personal size.",
    category: "menu_info", station: "general", tags: "kids menu,children,hamburger,grilled cheese,chicken strips,mini pizza" },

  // SOUTH OF THE BORDER
  { question: "What Mexican food does Community Tap have?",
    answer: "South of the Border: Chicken Quesadilla ($11.99 — grilled chicken, cheese, peppers in a pressed tortilla), Steak Quesadilla ($11.95 — sliced steak, cheese, peppers), Soft Shell Taco ($6.45 — seasoned beef or chicken, lettuce, cheese, tomato, sour cream in flour tortilla). Also: Nachos ($13.99) and Taco Salad ($12.45) from appetizers/salads. Tortilla chips are PFG DT164 (yellow corn, 1/4 cut, 30lb bag).",
    category: "menu_info", station: "fry_line", tags: "mexican,quesadilla,taco,south of the border,tortilla" },

  // SPECIALS & DESSERTS
  { question: "What are the weekly specials at Community Tap?",
    answer: "Weekly specials: Monday Wine Down (discounted wine), Wednesday Fish Fry (beer-battered cod, coleslaw, fries — Iowa tradition), Wing Night specials (discounted wings), Sunday NFL Bucket (beer bucket deal during football season). Daily lunch specials rotate. Specials are entered on the PDQ system and displayed on the chalk board behind the bar. Bar manager updates the chalk board daily with new beers/drinks/specials.",
    category: "menu_info", station: "general", tags: "specials,wine down,fish fry,wing night,nfl,lunch special,chalk board" },
  { question: "What desserts does Community Tap have?",
    answer: "Desserts: Apple Pie ($5.99), Cherry Pie ($5.99), Pumpkin Pie ($5.99 — seasonal), Chocolate Cake ($8.99), Cheesecake ($2.99 — slice), Ultimate Cake Ice Cream ($8.99), Funnel Fries ($7.99 — fried dough strips with powdered sugar). Desserts are a great upsell opportunity — suggest after entrées are cleared.",
    category: "menu_info", station: "fry_line", tags: "desserts,pie,cake,cheesecake,funnel fries,ice cream" },

  // DRINKS & BAR
  { question: "What draft beers does Community Tap have?",
    answer: "Draft beers on tap: Bud Light (most popular, always on tap), Coors Light, Blue Moon, and rotating craft/seasonal taps. Draft pours: Pint ($4.00-$4.50 depending on brand). Kegs are stored in the walk-in beer cooler on shelves or in their own area. Keg lines must be cleaned regularly. Fort Dodge Distributing supplies MillerCoors/imports. Hughes Distributing supplies Anheuser-Busch products. Bar manager maintains the tap rotation and updates the chalk board.",
    category: "menu_info", station: "bar", tags: "draft beer,tap,bud light,coors light,blue moon,keg,pint" },
  { question: "What domestic beers are available in bottles?",
    answer: "Domestic bottles ($3.75 each): Bud Light, Budweiser, Busch Light, Busch N/A (non-alcoholic), Busch Lime, Coors Light, Coors Banquet, Miller Lite, Miller High Life, Ultra Light (can), Ultra Bottle ($4.00), Cactus Lime Ultra, Amberbock ($4.50). From Hughes Distributing (Anheuser-Busch): Bud Light, Budweiser, Busch Light/Lime/N/A, Ultra. From Fort Dodge Distributing (MillerCoors): Coors Light, Coors Banquet, Miller Lite, Miller High Life, Blue Moon, Amberbock.",
    category: "menu_info", station: "bar", tags: "domestic beer,bottles,bud light,busch,coors,miller,ultra" },
  { question: "What import and craft beers are available?",
    answer: "Import/Craft bottles ($4.50 each): Corona, Corona Sunbrew (non-alc), Stella Artois, Heineken, Guinness, Angry Orchard cider ($4.25), Smirnoff Ice ($4.00), Mango Cart. Seltzers: White Claw Black Cherry/Mango/Natural Lime ($5.00), Carbliss Watermelon/Cranberry/Pineapple/Black Raspberry ($7.00 — premium), Skimmer Half & Half/Original/Peach/Lemonade ($6.00), Nutrl Black Cherry ($4.25). All from Fort Dodge Distributing.",
    category: "menu_info", station: "bar", tags: "import beer,craft,corona,stella,guinness,white claw,carbliss,skimmer,seltzer" },
  { question: "What well liquors does Community Tap use?",
    answer: "Well liquors (house pours): Vodka — Absolut ($13.49/750ml, ~$0.79/pour). Rum — Bacardi Superior. Whiskey/Bourbon — Makers Mark. Tequila — Jose Cuervo. Gin — Tanqueray. All liquor is purchased from Hy-Vee Wine & Spirits (Iowa state-controlled pricing — everyone pays the same). Ashley calls in the order on Wednesdays. Standard pour is 1.5oz using jigger. Target bar pour cost: 18-22% including all ingredients.",
    category: "menu_info", station: "bar", tags: "well liquor,house pour,absolut,bacardi,makers mark,cuervo,tanqueray,pour cost" },
  { question: "What premium liquors are available?",
    answer: "Premium/call liquors: VODKA — Absolut Citron, Absolut Mango, Absolut Peach, Ketel One, Strawberry Vodka, Jeremiah Weed Sweet Tea, X-Rated. WHISKEY — Woodford Reserve ($24.75/btl, $1.46/pour — lowest margin), Jameson. RUM — Bacardi Limon, Captain Morgan (most popular rum), Myers Dark, Malibu. TEQUILA — Margaritaville. GIN — Bombay Sapphire, Hendricks. BRANDY — Courvoisier, Blackberry Brandy. LIQUEURS — Kahlua, Baileys, Cointreau/Triple Sec, Grand Marnier ($27/btl — lowest margin), Godiva Chocolate, Chambord, Disaronno, Frangelico, Drambuie, Galliano, Pama, Limoncello, Rumchata, Hot Damn, all Schnapps (peach, butterscotch, peppermint, mixed berry), all Cremes (menthe, cacao light/dark, almond, banana), Blue Curacao, Southern Comfort.",
    category: "menu_info", station: "bar", tags: "premium liquor,call,ketel one,woodford,jameson,captain morgan,malibu,hendricks,kahlua,baileys" },
  { question: "What cocktails can you make?",
    answer: "Popular cocktails at Community Tap: Appletini, Peartini, Chocolate Martini, Lemon Drop, Cosmopolitan, Moscow Mule (ginger beer in copper mug), Dark & Stormy (Myers + ginger beer), Old Fashioned (Makers + bitters + sugar + orange), Whiskey Sour, Margarita (Cuervo + margarita mix + lime), Tequila Sunrise (tequila + OJ + grenadine), Mojito (Bacardi + mint + lime + simple syrup + club soda), Irish Coffee (Jameson + coffee + whipped cream in glass coffee cup), Mudslide (Kahlua + Baileys + vodka + ice cream), Espresso Martini. Glassware: Mason jar, rocks glass, martini glass, highball, pint, copper mug, wine glasses, stemmed glass, coffee cup.",
    category: "menu_info", station: "bar", tags: "cocktails,martini,mule,old fashioned,margarita,mojito,irish coffee,mudslide" },
  { question: "What mixers and garnishes does the bar stock?",
    answer: "Bar mixers: OJ, cranberry juice, pineapple juice, grapefruit juice, tomato juice, lime juice (Rose's), grenadine, simple syrup (made in-house), sour mix, ginger beer, club soda (Pepsi gun), tonic water (Pepsi gun), margarita mix, lemonade, apple cider, cold brew coffee, hot cocoa mix, chocolate milk, Pepsi, half and half. Specialty syrups: thyme, honey, cucumber, rhubarb, pineapple ginger, strawberry puree, peach mix, berry lemonade (homemade). Garnishes: limes, lemons, oranges, cherries (maraschino), mint leaves, basil, blackberries, strawberries, cucumber, cinnamon sticks, thyme sprigs, hazelnuts, marshmallows (toasted). Cut fruit is a daily bar prep task.",
    category: "menu_info", station: "bar", tags: "mixers,garnishes,juice,syrup,fruit,bar prep" },
  { question: "How does Iowa liquor ordering work?",
    answer: "Iowa is a control state — ALL liquor is sold at state-set prices through licensed retailers. Community Tap orders from Hy-Vee Wine & Spirits. Ashley (bar manager) calls in the order on Wednesdays. Process: Walk the bar, check every bottle, order what's below 1/3 full. Priority 1 (will run out this weekend): Absolut, Bacardi, Captain Morgan, Jose Cuervo, Fireball, Makers Mark, Jameson. Priority 2 (check levels): Absolut flavors, Malibu, Kahlua+Baileys, Southern Comfort, Rumchata, Triple Sec, Tanqueray. Priority 3 (monthly): All schnapps, all cremes, specialty bottles, moonshine, bitters.",
    category: "process", station: "bar", tags: "iowa liquor,ordering,hy-vee,control state,wednesday,ashley,pour control" },
  { question: "What is the pour cost calculation?",
    answer: "Pour cost formula: Cost per pour = Bottle price / Number of pours. Standard pour = 1.5oz. A 750ml bottle = ~17 standard pours. Example: Absolut 750ml = $13.49, so $13.49 / 17 = $0.79/pour. If vodka cocktail sells for $6.00, pour cost = $0.79 / $6.00 = 13.2% (excellent). Target bar pour cost: 18-22% including ALL ingredients (mixers, garnishes, etc.). Highest margin items: Schnapps ($5.00/btl = $0.29/pour), Triple Sec ($3.50/btl = $0.21/pour). Lowest margin: Grand Marnier ($27/btl = $1.59/pour), Woodford ($24.75/btl = $1.46/pour).",
    category: "process", station: "bar", tags: "pour cost,margin,calculation,pricing,bottle,standard pour,jigger" },
];

// ============================================================
// SECTION 2: EQUIPMENT KNOWLEDGE
// ============================================================
const equipmentKnowledge = [
  { question: "What is the dough roller / dough sheeter?",
    answer: "The dough roller (also called dough sheeter) is the machine on pizza side used to flatten and stretch pizza dough to the correct diameter. After dough balls are proofed, they go through the sheeter which rolls them to uniform thickness for 10\", 12\", 14\", or 16\" pizzas. CLEANING: Must be cleaned every night as part of pizza closing checklist — wipe down all surfaces, remove any stuck dough. The dough roller is on the 'dough wall' which gets stainless steel polished nightly. Never run dough through if it's too cold (tears) or too warm (sticks). The position of 'dough roller' is also a career step for kitchen staff — going from dishwasher to phone taker to dough roller shows progression.",
    category: "equipment", station: "pizza_line", tags: "dough roller,sheeter,pizza,flatten,stretch,cleaning,dough wall,career" },
  { question: "What is the deck oven?",
    answer: "The deck oven is the primary pizza oven at Community Tap. It's a commercial deck-style oven with stone/steel decks that provide even, direct heat for pizza baking. Temperature: 475-500°F. Cook times: Mini 8-9 min, Small 9-10 min, Medium 10-11 min, Large 11-12 min. Also used for toasting subs and heating garlic bread. CLOSING: Turn pizza ovens OFF every night (pizza closing checklist). The deck provides the characteristic crispy bottom crust. Pizzas go in on a pizza peel and bake directly on the deck stone.",
    category: "equipment", station: "pizza_line", tags: "deck oven,pizza oven,temperature,475,500,baking,stone,peel" },
  { question: "What is the Hobart mixer?",
    answer: "The Hobart mixer is the large commercial stand mixer used for making pizza dough. It's a heavy-duty floor-standing mixer (likely 60-80 quart) that handles the high-gluten flour dough. Used to mix flour, water, yeast, salt, and oil into smooth pizza dough. The dough hook attachment kneads the dough to proper gluten development. Also used for mixing large batches of sauces, batters, or other prep items. Located in the prep area. Clean after each use — never leave dough residue on the hook or bowl.",
    category: "equipment", station: "pizza_line", tags: "hobart,mixer,stand mixer,dough,kneading,dough hook,prep" },
  { question: "What fryers does Community Tap use?",
    answer: "Community Tap has multiple commercial deep fryers on the fry line. They use trans-fat-free soy oil (PFG DV470, 35lb jugs — use 2-4 per week). Fryer temperature: 350°F for most items (fries, apps, chicken). Items fried: ALL appetizers (cheese balls, onion rings, mushrooms, pickles, green beans, poppers, mozzarella sticks, gizzards), ALL fries (waffle, french, sweet potato), ALL chicken strips/tenders, fish, shrimp. CLOSING: Clean out filter fryer, spray inside with oven cleaner (2nd off duty). Weekly oil changes. The fryers are the workhorses of the fry line — they never stop during service.",
    category: "equipment", station: "fry_line", tags: "fryers,deep fryer,oil,350,soy oil,filter,cleaning,fry line" },
  { question: "What is the flat top grill?",
    answer: "The flat top grill (also called griddle) is used for cooking burgers, eggs, pancakes, grilled sandwiches, quesadillas, and anything that needs a flat cooking surface. Burgers are cooked here (chamber ground beef patties). Also used for breakfast items (eggs, pancakes, hash browns, French toast). CLOSING: Clean flat top every night (closer duty) — scrape, degrease, and polish. Use butter alternative oil (PFG #71022) for cooking. Temperature zones allow cooking multiple items at different heats simultaneously.",
    category: "equipment", station: "fry_line", tags: "flat top,griddle,burgers,eggs,breakfast,cleaning,scrape" },
  { question: "What is the charbroiler?",
    answer: "The charbroiler (char grill) is used for steaks, Iowa Chop, and items that need grill marks and smoky char flavor. Used for: all steaks (sirloin, ribeye, porterhouse, prime king), Iowa Chop finish (after smoking), steak sandwiches, grilled chicken. Provides the classic grill marks and charred flavor that a flat top can't replicate. Higher heat than flat top. Bus tubs underneath catch grease — clean under charbroiler and seasoning shelf on Saturdays (weekly deep clean schedule).",
    category: "equipment", station: "fry_line", tags: "charbroiler,grill,steaks,grill marks,char,iowa chop" },
  { question: "What is the smoker?",
    answer: "The smoker is used for all BBQ/SmokeWorx items: ribs, brisket, pulled pork, smoked chicken, Iowa Chop, and smoked wings. Low and slow cooking (225-275°F for hours). Brisket takes 12-16 hours, ribs 4-6 hours, pork shoulder 8-12 hours, chicken 2-3 hours. Located outside or in a dedicated area. CLEANING: Friday weekly deep clean — clean up around smoker, dump bucket, sweep, clean the shelf and front. The smoker is what makes the BBQ program possible and differentiates CTap from other pizza joints.",
    category: "equipment", station: "fry_line", tags: "smoker,bbq,low and slow,brisket,ribs,pulled pork,smoked" },
  { question: "What is the cold table / prep table?",
    answer: "The cold table (also called prep table or sandwich/pizza prep table) is a refrigerated work surface with ingredient wells on top. Pizza side has a cold table with all pizza toppings in wells (cheese, pepperoni, sausage, veggies, etc.). Fry line has a cold table with burger/sandwich toppings. CLOSING: Pizza side — flip cold table, wipe out inside, wipe down lids/doors, stainless steel the prep table. Fry line — flip cold table, clean/take out everything in bottom. All items in wells must be covered at close. Keeps ingredients at safe temp (below 41°F) during service.",
    category: "equipment", station: "general", tags: "cold table,prep table,refrigerated,wells,toppings,temperature,food safety" },
  { question: "What is the steam table?",
    answer: "The steam table holds hot food items at serving temperature (above 140°F) during service. Used for soups, gravies, sauces, and hot sides that need to stay warm. Located on the fry line. Wednesday weekly deep clean: bleach wall behind steam table. Items on the steam table must be checked for temperature regularly (food safety). Soups rotate daily. The steam table is NOT for cooking — only for holding already-cooked items at safe serving temperature.",
    category: "equipment", station: "fry_line", tags: "steam table,hot holding,temperature,140,soup,gravy,food safety" },
  { question: "What is the walk-in cooler?",
    answer: "Community Tap has multiple walk-in coolers: 1) Main walk-in cooler (kitchen) — stores all perishable food: meats, produce, dairy, prep items, sauces. Organized by category. Product rotation is critical (FIFO — first in, first out). 2) Walk-in beer cooler — stores all beer cases, kegs, wine. Bar manager maintains organization (cases and wine organized in designated areas, kegs on shelves or in own area). Has a cleaning schedule. Staff stores condiments and parmesan here too. Both coolers must maintain 34-38°F. Monday weekly deep clean: deep freezer and dry storage.",
    category: "equipment", station: "general", tags: "walk-in,cooler,refrigeration,beer cooler,storage,FIFO,rotation,temperature" },
  { question: "What is the dish machine?",
    answer: "The dish machine (commercial dishwasher) is in the dish pit area. High-temperature sanitizing dishwasher that cleans all plates, glasses, utensils, pans, and equipment. Dishwasher/driver closing duties: clean dish machine area, clean filter and trap, put away all clean dishes on shelves. The dish pit is a shared responsibility — drivers help when not on deliveries. Run stove tops through dishwasher on Thursdays (weekly deep clean). All utensils from pizza side go back to dish area at close.",
    category: "equipment", station: "dish_pit", tags: "dish machine,dishwasher,sanitize,filter,trap,dish pit" },
  { question: "What is the Pepsi cooler?",
    answer: "The Pepsi cooler is a glass-front reach-in refrigerator (branded by Pepsi) used for multiple purposes: 1) On pizza side — stores dough (put dough away by 3pm, clean where dough goes), also holds beef and sausage for pizza line, and cheese. 2) On bar side — stores bottled beers, mixers, garnishes. CLOSING: Windex both Pepsi coolers (pizza closing), fill with cheese/beef/sausage for next day. The Pepsi cooler on fry line also needs cleaning and Windex on windows.",
    category: "equipment", station: "pizza_line", tags: "pepsi cooler,reach-in,refrigerator,dough storage,beer,windex" },
  { question: "What is the POS system / PDQ register?",
    answer: "Community Tap uses PDQ POS by Signature Systems. It's the point-of-sale system for all orders. Stations: bar side computer, pizza side computer, waitress-only computer. Staff clock in/out with their number. Key functions: ring in orders, split tabs, do second half on pizzas, special instructions, split items in half, upsell prompts. Closing: close out pizza side and bar waitress computers. Clean computer screens and counter (pizza closing). The PDQ system handles all order types: dine-in, pickup, delivery, phone orders, DoorDash tickets.",
    category: "equipment", station: "general", tags: "pdq,pos,register,signature systems,computer,clock in,tabs,orders" },
  { question: "What is the salamander / heat lamp?",
    answer: "The salamander (overhead broiler/heat lamp) is used to melt cheese on top of dishes, finish gratins, and keep plated food warm in the window/pass. Used for: melting cheese on potato nachos, finishing lasagna tops, keeping plates warm during plating. Located above the pass/window area. Quick high heat from above — different from the oven which heats from below/around.",
    category: "equipment", station: "fry_line", tags: "salamander,heat lamp,broiler,melt cheese,window,pass" },
  { question: "What are the hoods?",
    answer: "The hoods (exhaust hoods/ventilation hoods) are the large metal ventilation systems above the cooking equipment (fryers, flat top, charbroiler, pizza ovens). They pull smoke, grease, heat, and steam out of the kitchen. CLOSING: Shut hoods off every night (pizza closing checklist + fry line). Make sure hoods are off and all other equipment is turned off before leaving. The hoods have grease filters that need periodic cleaning/replacement.",
    category: "equipment", station: "general", tags: "hoods,exhaust,ventilation,grease,filters,closing" },
  { question: "What scales does the kitchen use?",
    answer: "The kitchen has at least 2 scales (both on fry line). Used for: portioning BBQ meats (critical — 8oz dinner, 5oz sandwich, 6oz melt), weighing prep items, checking received product weights. Both scales must be cleaned nightly (fry line 2nd off duty). Accurate portioning = controlled food cost. If you're not weighing BBQ portions, you're losing money. Scales are also used for prep weights: corned beef/turkey 2oz, asparagus 3oz, crab 2oz, all noodles 5oz, roasted veggies 5oz, twice bakes 8.5oz, cavs 10oz.",
    category: "equipment", station: "fry_line", tags: "scales,portioning,weights,food cost,bbq,prep" },
];

// ============================================================
// SECTION 3: PREP METHODS & OPERATIONAL PROCEDURES
// ============================================================
const prepKnowledge = [
  { question: "What is the morning pizza prep list?",
    answer: "Morning Pizza Prep List (must be done before leaving): 1) Chopped onion — only half pan during weekdays. 2) Chopped green peppers — only half pan weekdays. 3) Sauce — 4 buckets ALL TIME is par (non-negotiable). 4) Black olives — 1 pan. 5) Green olives — 1 pan. 6) Pineapple — 1 pan. 7) Sauerkraut — 1 pan. 8) Chopped pickles — 1 pan. 9) To-go pickles portioned — 6. 10) Crab base — 1. 11) Parmesan cheese cups — 25. 12) Red pepper cups — 25. 13) Taco sauce cups — 25. 14) Fill to-go boxes. 15) Fill sauce bottles. 16) ALL DOUGH MUST BE ROLLED before you leave. 17) Fill taco chips. 18) Put dough away by 3pm. 19) Check dough before clocking out. 20) Clean Pepsi cooler where dough goes. 21) Windex the glass.",
    category: "prep", station: "pizza_line", tags: "morning prep,pizza prep,prep list,dough,sauce,toppings,par levels" },
  { question: "What is the pizza closing checklist?",
    answer: "Pizza Closing Checklist (must be done nightly, hung on pickup food ticket holder — no exception, signed by Mychael): 1) Put dough away. 2) Clean dough roller. 3) Wipe out inside of cold table. 4) Wipe down lids, doors and cold table. 5) Stainless steel the dough wall. 6) Stainless steel the prep table. 7) Cover all dough. 8) Take all utensils back to dish area. 9) Wipe down pizza table. 10) Turn pizza ovens off. 11) Put cheese away. 12) Windex both Pepsi coolers. 13) Shut hoods off. 14) Sweep and mop pizza side and store room. 15) Fill Pepsi cooler with cheese. 16) Bleach and scrub sides of trash can. 17) Fill ALL sauce bottles (ranch, BBQ, wow, 1000, buffalo, SC). 18) Fill Pepsi cooler with beef and sausage. 19) Make sure pizza line is fully stocked up top. 20) Pull out pizza line and swipe behind it. 21) Wipe down shelves. 22) Put phones back on charger. 23) Clean computer screens and counter. Employees must initial each item.",
    category: "cleaning", station: "pizza_line", tags: "pizza closing,checklist,nightly,cleaning,stainless steel,dough,oven off" },
  { question: "What is the fry line closing procedure?",
    answer: "Fry Line Night Duties — 3 shifts: 1ST OFF: Flip cold table, clean/take out everything in bottom of cold tables, clean BBQ room (take trash out, mop), sweep the line, clean Pepsi cooler and Windex windows, take out all full trashes. 2ND OFF: Clean out filter fryer + spray fryers with oven cleaner, clean microwave, fill ALL sauce bottles (mayo, butter, water jug, all wing sauces), fill up all meats (Chops 8, Turkey 10, Ham 10, Corn Beef 8, Mexi Chix 8), sweep line, clean sides of both garbages, wrap all veggies/ribs on line, clean both scales, straighten/fill sauce cups. CLOSER: Stainless steel polish ALL fry line equipment, restock used meats + fill sauce bottles, clean flat top, sweep + mop fry line after cleaning flat top, spatulas to dish pit, replace half sheet pan, clean all knives, make sure hoods off and all equipment turned off.",
    category: "cleaning", station: "fry_line", tags: "fry line closing,nightly duties,1st off,2nd off,closer,cleaning,fryer,flat top" },
  { question: "What is the weekly deep clean schedule?",
    answer: "Weekly Deep Clean Fry Line (AM shifts): SUNDAY — Change foil on stove. MONDAY — Deep freezer and dry storage. TUESDAY — Deep clean steak fridge and BBQ fridge. WEDNESDAY — Bleach wall behind steam table. THURSDAY — Run stove tops through dishwasher. FRIDAY — Clean up around smoker, dump bucket, sweep, clean the shelf and front. SATURDAY — Clean out bus tubs under charbroiler and seasoning shelf. Each day has a specific deep-clean task assigned. Staff initials when complete.",
    category: "cleaning", station: "fry_line", tags: "weekly deep clean,schedule,sunday,monday,tuesday,wednesday,thursday,friday,saturday" },
  { question: "What are the bar closing duties?",
    answer: "Bar Closing Duties (complete list): Fill BBQ caddies, clean caps/caddies, marry all ketchups and mustards, fill all parmesans and red pepper flakes, fill salt/pepper shakers, fill napkin holders, fill large and small to-go boxes, get extra chasers for bar side (margarita mix, pineapple juice, sour, grenadine), roll all silverware, wipe down all tables, wash/clean under all glass mats/spill mats, clean waitress-only and Budweiser mats, fill kids cups/lids/straws/plastic cups, cut fruit, fill ice, clean tops of wells and underneath liquor bottles, stock beer in coolers + overstock, check/fill pop, stock walk-in cooler, dump/wash slop bucket, take all dishes back to kitchen, wipe off bus tub cart, clean bathrooms (Windex mirror, wipe sinks, clean toilets, fill TP, ice in urinals, take out trash + new liners), take out all trashes behind bar and waitress-only stand, take out cans if full, turn off all TVs and turn down speaker, close out pizza side and bar waitress computers, wipe off special board, lock all doors including padlock on pool room, place all stools/chairs/floor mats on tables, sweep all bar side/bathrooms/doorways/behind bar/under booths, check the deck, mop everything, buff (Wed or Sun), put down chairs/stools, count ticket bag, count deposit and drawer, turn off air (summer) or turn heat to 68 (winter), place all items in safe (deposit, drawer money, ticket bag, pools), check AM/PM kitchen tips on register in envelope, make sure ALL doors locked including storage room and deck door, SET THE ALARM on way out.",
    category: "cleaning", station: "bar", tags: "bar closing,duties,checklist,cleaning,stocking,alarm,safe,deposit" },
  { question: "What is the dishwasher/driver nightly checklist?",
    answer: "Dishwasher/Driver Closing (hand in with driver report, night manager checks): 1) Clean shelves in dish area. 2) Clean and put away all dishes. 3) Sweep parking lot by deck and in front of doors for cigarette butts. 4) Shake rug outside. 5) Clean hallway — Windex the window, clean table. 6) Put driver bags away. 7) Clean dish machine area, clean filter and trap. 8) Sweep and mop hallway. 9) Sweep and mop dish area to doorway. 10) Take out garbage. This sheet is signed and turned in daily.",
    category: "cleaning", station: "dish_pit", tags: "dishwasher,driver,nightly,closing,dish machine,filter,trap,parking lot" },
  { question: "What are the delivery driver expectations?",
    answer: "Delivery Driver Expectations: 1) Sweep parking lot if asked. 2) Put in DoorDash tickets. 3) Keep dish pit clean — rinse, stack, help when needed. 4) Take out trash — don't leave it for next guy. 5) When you return from delivery, come back inside IMMEDIATELY — no sitting in your car or stalling 5-10 minutes. 6) Answer phones when not on a run. 7) Help with basic kitchen tasks. 8) After mopping at night, take off dirty mop head — always use a fresh one. Drivers are part of the team, not just delivery people.",
    category: "process", station: "general", tags: "driver,delivery,expectations,doordash,dish pit,phones,parking lot" },
  { question: "What is the closing manager's responsibility?",
    answer: "Closing Manager Expectations: You are the LAST line of defense at end of night. You are the LAST to punch out. Responsible for arming the alarm every night EXCEPT Sundays and Wednesdays (when front of house buffs floors). Walk through and check the closers before they leave. Walk through AGAIN before you leave. Only once you've made sure NO ONE else is in the building and the alarm can be armed can you leave. The closing manager ensures every checklist is complete, every door is locked, and the building is secure.",
    category: "process", station: "general", tags: "closing manager,alarm,last out,security,walk through,checklist" },
  { question: "What is the dress code at Community Tap?",
    answer: "Employee Dress Code (effective November 6): 1) NO sweatpants, basketball shorts, or jeans with holes while on shift. 2) MUST wear a CTap shirt during shift — if you don't have one, the restaurant will provide and can do payroll deduction. 3) Hats must be worn facing FORWARD at all times. 4) NO headphones during shifts — full attention to tasks and customer service. This applies to ALL employees. The goal is a consistent, professional image representing Community Tap and Pizza.",
    category: "process", station: "general", tags: "dress code,uniform,ctap shirt,hat,headphones,professional" },
  { question: "What are the kitchen staff rules?",
    answer: "Kitchen Staff Rules: NO smoke breaks between 11am-2pm and 5pm-9pm. These are peak service hours — the kitchen needs all hands. Smoke breaks are only allowed outside of rush periods. This is strictly enforced.",
    category: "process", station: "general", tags: "kitchen rules,smoke breaks,no smoking,rush hours,11am,5pm" },
  { question: "What are the prep weights for portioning?",
    answer: "Prep Weights Chart: Corned Beef — 2oz (for Reuben, sandwiches). Turkey — 2oz. Asparagus — 3oz. Crab (imitation surimi) — 2oz (for crab rangoon pizza). All Noodles — 5oz (pasta dishes). Roasted Veggies — 5oz. Twice Baked Potatoes — 8.5oz. Cavs — 10oz. BBQ portions: Dinner 1 = 8oz, Dinner 2/3 = 4oz each meat, Sandwiches = 5oz, Melts = 6oz. ALWAYS use the scale. Both scales cleaned nightly.",
    category: "prep", station: "fry_line", tags: "prep weights,portions,ounces,scale,corned beef,turkey,noodles,bbq" },
  { question: "What is the fry line meat fill spec?",
    answer: "Fry Line Meat Fill (2nd off duty, nightly): Chops — fill to 8. Turkey — fill to 10. Ham — fill to 10. Corn Beef — fill to 8. Mexi Chicken — fill to 8. These are the par levels for the cold table/reach-in on the fry line. If any meat is below par at the start of your shift, fill immediately. These numbers ensure you don't run out during service. Pull from walk-in cooler to restock.",
    category: "prep", station: "fry_line", tags: "meat fill,par levels,chops,turkey,ham,corn beef,mexi chicken,cold table" },
  { question: "How does server training work at Community Tap?",
    answer: "Server/Bartender Training (3 days): DAY 1 — Attire (CTap shirt, no holes, hair back), go over entire menu and popular items, tour building (back storage, cleaning supplies, beer cooler, walk-in), basic computer/POS training (clock in number, split tabs, second half pizzas, special instructions, split items, upselling), show request-off book and schedule. DAY 2 — How to approach tables and take orders, right follow-up questions (meat temp, side choices), enter orders correctly on PDQ, practice orders, follow experienced server to tables, side work rotation, daily tasks (tables clean, napkins full, ice full, pop machine clean, salt/pepper, marry ketchups, fill BBQ sauces, clean menus), weekly specials (wings, fish fry, medium pizza), learn storage locations, learn to roll silverware, complete close-out procedure and tip-out. DAY 3 — Take tables solo (tips not yet included), comfortable with difficult orders (split tickets, split pizzas, special instructions), own check-out at end of night, know where closing checklist is, TAKE A TEST (must score 80% or higher to pass training). New trainee MUST stay for ENTIRE shift.",
    category: "process", station: "general", tags: "server training,bartender training,3 days,test,80 percent,pdq,menu,closing" },
  { question: "What is the bar manager's role?",
    answer: "Bar Manager duties: INVENTORY — Liquor, wine, beer, bitters, cinnamon sticks, cloves, stir sticks, picks, glassware, bar washer chemicals, shakers/jiggers. DRINK MENUS — Keep up-to-date drink menu changed quarterly, keep chalk board updated daily with new beers/drinks. STAFF KNOWLEDGE — Up-to-date beer/wine lists for staff reference, tests/quizzes on beers/wines for staff knowledge. BEER COOLER — Cases and wine organized in designated areas, kegs on shelves or own area, cleaning schedule. PRODUCT ROTATION — Ensure proper rotation during stocking. MANAGING OTHER BARTENDERS — Ensure cleaning/stocking done correctly on other shifts, ensure they know about new beers/drinks/wine. MAINTAINING BAR — Bar cleaning schedule, weekly maintenance of bar equipment.",
    category: "process", station: "bar", tags: "bar manager,inventory,drink menu,chalk board,staff training,beer cooler,rotation" },
  { question: "What is the kitchen manager's role?",
    answer: "Kitchen Manager duties: Communicates job expectations, plans/monitors/appraises job results, coaches/counsels/disciplines employees, initiates/coordinates/enforces systems and policies. Specific duties: Weekly product order (Tom's food order), maintaining proper product rotation (FIFO), maintaining clean/sanitary work environment, providing positive work environment, maintaining labor costs/managing labor effectively, overseeing proper scheduling, overseeing correct prep procedures and coaching for consistency, overseeing training of new employees, retraining current employees on new procedures/items, maintaining supply of small wares/plates/utensils, maintaining equipment and overseeing scheduled maintenance, maintaining proper food cost/portion control/usage.",
    category: "process", station: "general", tags: "kitchen manager,tom,ordering,labor,training,food cost,portion control,scheduling" },
  { question: "How does the food ordering process work?",
    answer: "Food ordering (Tom's responsibility as Kitchen Manager): Orders placed Monday (delivery Tuesday) and Thursday (delivery Friday). Process: Walk the walk-in cooler, freezer, and dry storage. Monday check: cheese levels (mozzarella #1 priority), meat inventory (burger patties, bacon, chicken strips), pizza supplies (boxes, circles, sauce), produce (lettuce, tomato, onion, peppers), fryer items (fries, apps), paper goods (gloves, liners, napkins), oil levels. Thursday also check: ribeye/porterhouse for weekend steak specials, extra pizza dough flour for Fri/Sat volume, extra fry oil for weekend, shrimp/fish for weekend baskets. Primary vendor: PFG (Performance Food Group). Secondary: Sysco. Specialty: Sawyer's Meats (local), Hughes/Fort Dodge Distributing (beer).",
    category: "process", station: "general", tags: "food ordering,tom,monday,thursday,pfg,sysco,walk-in,inventory,par levels" },
  { question: "What is product rotation / FIFO?",
    answer: "Product rotation follows FIFO — First In, First Out. When stocking coolers, shelves, or any storage: new product goes BEHIND old product. Use the oldest product first. This prevents spoilage and waste. Applies to: all food in walk-in cooler, all beer in beer cooler (bar manager ensures proper rotation during stocking), all dry storage items, all prep items on the line. Kitchen manager oversees maintaining proper product rotation. If you find expired product, pull it immediately and notify the manager.",
    category: "process", station: "general", tags: "FIFO,first in first out,rotation,product rotation,spoilage,expiration" },
  { question: "How do you handle food allergies?",
    answer: "Food allergy protocol: When a customer mentions ANY allergy, take it seriously. Common allergens at CTap: Gluten (pizza dough, breading, buns, tortillas — GF pizza crusts available from Sysco), Dairy (cheese, butter, cream sauces, ranch), Nuts (limited exposure but check sauces), Shellfish (shrimp, crab rangoon uses imitation surimi but mention it), Eggs (in batters, breakfast items, mayo). Always ask the kitchen if unsure. Never guess. If cross-contamination is a concern, alert the kitchen to use clean surfaces/utensils. Servers must know the menu well enough to guide allergy customers to safe options.",
    category: "allergen", station: "general", tags: "allergies,allergens,gluten free,dairy,nuts,shellfish,cross contamination,server" },
  { question: "What are the food temperature safety rules?",
    answer: "Food temperature safety: HOT food must be held above 140°F (steam table, heat lamps). COLD food must be held below 41°F (cold tables, coolers, walk-in). The DANGER ZONE is 41°F-140°F — food cannot sit in this range for more than 4 hours total. Cooking temps: Burgers to 160°F (unless customer requests lower), Chicken to 165°F internal, Pork (Iowa Chop) to 145°F + 3 min rest, Steaks by customer request (rare 125°F, medium 140°F, well 160°F). Use thermometer to verify. Cold table wells must maintain below 41°F during service.",
    category: "safety", station: "general", tags: "food safety,temperature,danger zone,140,41,cooking temps,thermometer" },
  { question: "What is the 3-compartment sink method?",
    answer: "3-Compartment Sink (3-sink method) for manual dishwashing: Sink 1 — WASH: Hot soapy water, scrub to remove all food particles. Sink 2 — RINSE: Clean hot water, remove all soap residue. Sink 3 — SANITIZE: Chemical sanitizer solution (follow concentration on label) OR hot water at 171°F+. Air dry on clean rack — NEVER towel dry (recontamination risk). Used for items too large for the dish machine, or when dish machine is full/broken. Change water when it gets dirty or cool. This is Iowa health code requirement.",
    category: "safety", station: "dish_pit", tags: "3 sink,three compartment,wash,rinse,sanitize,health code,dishwashing" },
  { question: "How do you handle voids and comps on the POS?",
    answer: "Voids and Comps on PDQ POS: A VOID removes an item before it's sent to kitchen (no food waste). A COMP removes/discounts an item AFTER it's been made (food was prepared but customer isn't charged full price — used for complaints, mistakes, employee meals). Manager approval required for comps over a certain amount. All voids and comps are tracked — 3+ voids per week triggers a manager review. Reasons must be logged. Common void reasons: customer changed mind, wrong item entered, duplicate entry. Common comp reasons: food complaint, long wait time, wrong order sent out. Never void to hide a mistake — that's a fireable offense.",
    category: "process", station: "general", tags: "void,comp,pos,pdq,manager approval,tracking,reasons" },
  { question: "How does cash handling work?",
    answer: "Cash handling procedures: Only KEY EMPLOYEES can hand cash to drivers or authorize pay outs. Count the deposit and drawer at close. Place deposit, drawer money, ticket bag, and pools in the safe. AM/PM kitchen tips go on top of register in an envelope. The ticket bag is counted at close. Store runs require: WHO ran it, WHAT they bought, WHERE, WHO authorized (must be key employee), and the amount. Pay out receipts should be photographed. Never leave the register drawer open. Count back change to customers. If your drawer is short, it's documented.",
    category: "process", station: "general", tags: "cash handling,deposit,drawer,safe,key employee,pay out,tips,register" },
  { question: "How does the tip-out system work?",
    answer: "Tip-out at Community Tap: Servers tip out the bartender at the end of their shift as part of the close-out process. The bartender handles all drink orders for the dining room, so they receive a percentage of server tips. AM/PM kitchen tips are placed on top of the register in an envelope. The exact tip-out percentage is discussed during server training (Day 2). Tip-out is part of the closing procedure — you cannot leave until close-out is complete with the bartender.",
    category: "process", station: "general", tags: "tip out,tips,bartender,server,close out,percentage" },
  { question: "How do you handle a food complaint?",
    answer: "Food complaint handling: 1) Listen to the customer — don't argue or make excuses. 2) Apologize sincerely. 3) Offer to remake the item or suggest an alternative. 4) If remaking, communicate clearly to kitchen what went wrong. 5) Consider comping the item or offering a discount (get manager approval for significant comps). 6) Follow up to make sure the replacement is correct. 7) Log the comp in the POS with reason. The goal is to keep the customer happy and coming back. A $12 comp is worth more than losing a regular who spends $50/week.",
    category: "process", station: "general", tags: "food complaint,customer service,comp,remake,apologize" },
  { question: "What is the DoorDash process?",
    answer: "DoorDash process: Drivers put in DoorDash tickets when they come in on the tablet/system. Orders appear on the PDQ system like any other order. Kitchen prepares the food, bags it for pickup. DoorDash drivers arrive and pick up by order number/name. If a CTap delivery driver is available and it's in our delivery zone, we may fulfill it ourselves. DoorDash orders should be treated with the same quality as dine-in — the customer's experience reflects on us even through third-party delivery.",
    category: "process", station: "general", tags: "doordash,delivery,third party,tablet,pickup,orders" },
  { question: "How do you upsell on the POS?",
    answer: "Upselling techniques (taught in server training): 1) Suggest upgrading to premium liquor ('Would you like Ketel One instead of well vodka? Only $2 more'). 2) Suggest appetizers ('Can I start you with some of our famous potato nachos?'). 3) Suggest adding protein ('Would you like to add a shrimp skewer to your steak for $7.99?'). 4) Suggest dessert or another round. 5) On pizza orders, suggest upgrading size or adding extra toppings. The POS has upsell prompts built in. Servers who upsell effectively earn higher tips and help the restaurant's average ticket.",
    category: "process", station: "general", tags: "upselling,premium,appetizer,add on,server,tips,average ticket" },
];

// ============================================================
// SECTION 4: VENDOR & ORDERING KNOWLEDGE
// ============================================================
const vendorKnowledge = [
  { question: "Who are the main food vendors for Community Tap?",
    answer: "Primary food vendors: 1) PFG (Performance Food Group) — main food distributor. Delivers Tuesday and Friday. Supplies: all frozen items (fries, apps, chicken), produce, dairy, meats, pizza supplies (boxes, circles, sauce, flour), paper goods, chemicals, condiments. Tom orders Monday (for Tue delivery) and Thursday (for Fri delivery). 2) Sysco — secondary food distributor for items PFG doesn't carry or for better pricing on certain items (GF crusts, some steaks). 3) Sawyer's Meats — local meat supplier for specialty cuts.",
    category: "vendor", station: "general", tags: "pfg,sysco,sawyers,food vendors,ordering,delivery,tuesday,friday" },
  { question: "Who are the beer and liquor vendors?",
    answer: "Beer/Liquor vendors: 1) Hughes Distributing — Anheuser-Busch products (Bud Light, Budweiser, Busch Light/Lime/N/A, Michelob Ultra, Carbliss seltzers). 2) Fort Dodge Distributing — MillerCoors + imports (Coors Light, Miller Lite, Blue Moon, Corona, Stella, Heineken, Guinness, White Claw, Angry Orchard, Smirnoff Ice, Mango Cart, Skimmer, Nutrl). 3) Hy-Vee Wine & Spirits — ALL liquor (Iowa is a control state, state-set pricing). Ashley orders liquor on Wednesdays. Beer reps visit weekly.",
    category: "vendor", station: "bar", tags: "hughes,fort dodge,hy-vee,beer,liquor,distributing,ashley" },
  { question: "What are the most critical items to never run out of?",
    answer: "NEVER run out of (in priority order): 1) Mozzarella cheese — #1 priority on every order, used on ALL pizzas. 2) Pizza sauce (San Benito #24482) — par is 4 buckets AT ALL TIMES. 3) Pizza dough flour (high gluten GP928) — no flour = no pizza = no business. 4) Fryer oil (DV470) — fryers run all day, oil degrades fast. 5) Burger patties (chamber ground beef) — burgers are a top seller. 6) Chicken strips — used in 6 basket flavors + salads + sandwiches. 7) Bud Light — most popular beer, always on draft and in bottles. 8) Absolut Vodka — well vodka, used in most cocktails. Running out of any of these during service is unacceptable.",
    category: "vendor", station: "general", tags: "critical items,never run out,cheese,sauce,flour,oil,bud light,absolut" },
];

// Run all seeds
console.log("Seeding menu knowledge...");
const menuCount = await seed(menuKnowledge);
console.log(`  Seeded ${menuCount} menu entries`);

console.log("Seeding equipment knowledge...");
const equipCount = await seed(equipmentKnowledge);
console.log(`  Seeded ${equipCount} equipment entries`);

console.log("Seeding prep/procedure knowledge...");
const prepCount = await seed(prepKnowledge);
console.log(`  Seeded ${prepCount} prep/procedure entries`);

console.log("Seeding vendor knowledge...");
const vendorCount = await seed(vendorKnowledge);
console.log(`  Seeded ${vendorCount} vendor entries`);

const total = menuCount + equipCount + prepCount + vendorCount;
console.log(`\n✅ TOTAL: ${total} deep knowledge entries seeded`);
console.log("The AI brain now knows EVERYTHING about Community Tap operations.");

await c.end();
process.exit(0);
