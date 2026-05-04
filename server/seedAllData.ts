import { getDb } from './db';
import { menuItems, recipes, achievementDefinitions, rewards, photoMissions } from '../drizzle/schema';

/**
 * Seeds all platform reference data: menu items, recipes, achievements, rewards, photo missions.
 * Each section checks for existing data and skips if already populated.
 * Safe to run multiple times (idempotent).
 */
export async function seedAllData() {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const results: Record<string, string> = {};

  // ═══════════════════════════════════════════════════════════════════
  // 1. MENU ITEMS — Full Community Tap & Pizza menu from Drive XLSX
  // ═══════════════════════════════════════════════════════════════════
  const existingMenuItems = await db.select().from(menuItems).limit(1);
  if (existingMenuItems.length === 0) {
    await db.insert(menuItems).values([
      // ── Appetizers ──
      { posItemName: 'CHEESE BALLS', menuPrice: '9.99', category: 'food', subcategory: 'appetizer', isActive: true },
      { posItemName: 'ONION RINGS', menuPrice: '9.99', category: 'food', subcategory: 'appetizer', isActive: true },
      { posItemName: 'BROCCOLI & CHEDDAR CHEESE BITES', menuPrice: '8.99', category: 'food', subcategory: 'appetizer', isActive: true },
      { posItemName: 'MUSHROOMS', menuPrice: '8.99', category: 'food', subcategory: 'appetizer', isActive: true },
      { posItemName: 'FRIED PICKLE SPEARS', menuPrice: '9.99', category: 'food', subcategory: 'appetizer', isActive: true },
      { posItemName: 'DEEP FRIED GREEN BEANS', menuPrice: '8.95', category: 'food', subcategory: 'appetizer', isActive: true },
      { posItemName: 'NACHOS—BEEF or CHICKEN', menuPrice: '13.99', category: 'food', subcategory: 'appetizer', isActive: true },
      { posItemName: 'GARLIC CHEESE BREAD', menuPrice: '8.45', category: 'food', subcategory: 'appetizer', isActive: true },
      { posItemName: 'BREADSTICKS', menuPrice: '5.99', category: 'food', subcategory: 'appetizer', isActive: true },
      { posItemName: 'QuesAdilla', menuPrice: '14.45', category: 'food', subcategory: 'appetizer', isActive: true },
      { posItemName: 'C-Tap Potato Nachos', menuPrice: '11.99', category: 'food', subcategory: 'appetizer', isActive: true },
      { posItemName: 'Pretzel Bites', menuPrice: '8.99', category: 'food', subcategory: 'appetizer', isActive: true },
      { posItemName: 'BONELESS WINGS', menuPrice: '10.99', category: 'food', subcategory: 'appetizer', isActive: true },
      { posItemName: 'WINGS', menuPrice: '12.45', category: 'food', subcategory: 'appetizer', isActive: true },
      { posItemName: 'CHIPS & QUESO', menuPrice: '7.99', category: 'food', subcategory: 'appetizer', isActive: true },
      { posItemName: 'JALAPEÑO POPPERS', menuPrice: '9.45', category: 'food', subcategory: 'appetizer', isActive: true },
      { posItemName: 'GIZZARDS', menuPrice: '8.99', category: 'food', subcategory: 'appetizer', isActive: true },
      { posItemName: 'MOZZARELLA STICKS', menuPrice: '9.99', category: 'food', subcategory: 'appetizer', isActive: true },

      // ── Entrees ──
      { posItemName: 'SMOKED IOWA CHOP', menuPrice: '17.95', category: 'food', subcategory: 'entree', isActive: true },
      { posItemName: 'STEAK SANDWICH', menuPrice: '15.95', category: 'food', subcategory: 'entree', isActive: true },

      // ── Burgers ──
      { posItemName: 'Hamburger', menuPrice: '10.99', category: 'food', subcategory: 'burger', isActive: true },
      { posItemName: 'Double Cheese Burger', menuPrice: '13.45', category: 'food', subcategory: 'burger', isActive: true },
      { posItemName: 'Patty Melt', menuPrice: '13.99', category: 'food', subcategory: 'burger', isActive: true },
      { posItemName: 'Ranch Burger', menuPrice: '11.99', category: 'food', subcategory: 'burger', isActive: true },
      { posItemName: 'Truman Hart Burger', menuPrice: '12.45', category: 'food', subcategory: 'burger', isActive: true },
      { posItemName: 'Bacon BlEU Burger', menuPrice: '12.45', category: 'food', subcategory: 'burger', isActive: true },
      { posItemName: 'Pork Belly Burger', menuPrice: '13.45', category: 'food', subcategory: 'burger', isActive: true },

      // ── Salads ──
      { posItemName: 'COMMUNITY CHEF SALAD', menuPrice: '11.45', category: 'food', subcategory: 'salad', isActive: true },
      { posItemName: 'TACO SALAD - CHICKEN OR BEEF', menuPrice: '11.45', category: 'food', subcategory: 'salad', isActive: true },
      { posItemName: 'B.L.T. SALAD', menuPrice: '11.45', category: 'food', subcategory: 'salad', isActive: true },
      { posItemName: 'CHICKEN SALAD', menuPrice: '11.45', category: 'food', subcategory: 'salad', isActive: true },
      { posItemName: 'SMOKED SALAD', menuPrice: '12.95', category: 'food', subcategory: 'salad', isActive: true },
      { posItemName: 'DINNER SALAD', menuPrice: '3.95', category: 'food', subcategory: 'salad', isActive: true },

      // ── Subs & Wraps ──
      { posItemName: 'BOMBER', menuPrice: '11.45', category: 'food', subcategory: 'sub', isActive: true },
      { posItemName: 'STINGER', menuPrice: '11.45', category: 'food', subcategory: 'sub', isActive: true },
      { posItemName: 'PHILLY', menuPrice: '13.45', category: 'food', subcategory: 'sub', isActive: true },
      { posItemName: 'CHICKEN BACON RANCH', menuPrice: '11.99', category: 'food', subcategory: 'wrap', isActive: true },
      { posItemName: 'FRENCH DIP', menuPrice: '12.45', category: 'food', subcategory: 'sub', isActive: true },
      { posItemName: 'BUFFALO CHICKEN', menuPrice: '12.45', category: 'food', subcategory: 'wrap', isActive: true },

      // ── Pasta ──
      { posItemName: 'C-TAP SIGNATURE MAC', menuPrice: '13.99', category: 'food', subcategory: 'entree', isActive: true },
      { posItemName: 'SMOKEY CHICKEN BACON RANCH MAC', menuPrice: '13.99', category: 'food', subcategory: 'entree', isActive: true },
      { posItemName: 'HOMEMADE LASAGNA', menuPrice: '14.45', category: 'food', subcategory: 'entree', isActive: true },
      { posItemName: 'CREAMY CHICKEN FETTUCCINI ALFREDO', menuPrice: '15.95', category: 'food', subcategory: 'entree', isActive: true },

      // ── Sandwiches ──
      { posItemName: 'Tenderloin', menuPrice: '12.99', category: 'food', subcategory: 'sandwich', isActive: true },
      { posItemName: 'Big BLT', menuPrice: '10.99', category: 'food', subcategory: 'sandwich', isActive: true },
      { posItemName: 'Chicken Breast Sandwich', menuPrice: '12.45', category: 'food', subcategory: 'sandwich', isActive: true },
      { posItemName: 'CTap Club', menuPrice: '12.45', category: 'food', subcategory: 'sandwich', isActive: true },
      { posItemName: 'Pizza Burger', menuPrice: '10.45', category: 'food', subcategory: 'burger', isActive: true },
      { posItemName: 'Reuben', menuPrice: '12.99', category: 'food', subcategory: 'sandwich', isActive: true },
      { posItemName: 'Fish', menuPrice: '11.45', category: 'food', subcategory: 'sandwich', isActive: true },

      // ── Baskets ──
      { posItemName: 'BATTERED FISH BASKET', menuPrice: '12.95', category: 'food', subcategory: 'entree', isActive: true },
      { posItemName: 'SHRIMP BASKET', menuPrice: '12.95', category: 'food', subcategory: 'entree', isActive: true },
      { posItemName: 'HANDBREADED CHICKEN TENDERS', menuPrice: '12.95', category: 'food', subcategory: 'entree', isActive: true },

      // ── Sides ──
      { posItemName: 'Baked Potato', menuPrice: '3.99', category: 'food', subcategory: 'side', isActive: true },
      { posItemName: 'Waffle Fries', menuPrice: '3.99', category: 'food', subcategory: 'side', isActive: true },
      { posItemName: 'French Fries', menuPrice: '3.99', category: 'food', subcategory: 'side', isActive: true },
      { posItemName: 'Sweet Potato Fries', menuPrice: '3.99', category: 'food', subcategory: 'side', isActive: true },
      { posItemName: 'Mac & Cheese', menuPrice: '3.99', category: 'food', subcategory: 'side', isActive: true },
      { posItemName: 'Cottage Cheese', menuPrice: '3.99', category: 'food', subcategory: 'side', isActive: true },
      { posItemName: 'Macaroni Salad', menuPrice: '3.99', category: 'food', subcategory: 'side', isActive: true },
      { posItemName: 'Coleslaw', menuPrice: '3.99', category: 'food', subcategory: 'side', isActive: true },
      { posItemName: 'Cornbread', menuPrice: '3.99', category: 'food', subcategory: 'side', isActive: true },
      { posItemName: 'BBQ Baked Beans', menuPrice: '3.99', category: 'food', subcategory: 'side', isActive: true },

      // ── Pizza ──
      { posItemName: 'Cheese Pizza', menuPrice: '10.99', category: 'food', subcategory: 'pizza', isActive: true },
      { posItemName: 'Single Topping Pizza', menuPrice: '11.75', category: 'food', subcategory: 'pizza', isActive: true },
      { posItemName: 'Two Topping Pizza', menuPrice: '12.50', category: 'food', subcategory: 'pizza', isActive: true },
      { posItemName: 'Three Topping Pizza', menuPrice: '13.75', category: 'food', subcategory: 'pizza', isActive: true },
      { posItemName: 'Community Special Pizza', menuPrice: '14.99', category: 'food', subcategory: 'pizza', isActive: true },
      { posItemName: 'Meat Lovers Pizza', menuPrice: '16.99', category: 'food', subcategory: 'pizza', isActive: true },
      { posItemName: 'Bacon Cheese Burger Pizza', menuPrice: '15.99', category: 'food', subcategory: 'pizza', isActive: true },
      { posItemName: 'The Works Pizza', menuPrice: '16.99', category: 'food', subcategory: 'pizza', isActive: true },
      { posItemName: 'Taco Pizza', menuPrice: '15.99', category: 'food', subcategory: 'pizza', isActive: true },
      { posItemName: 'Philly Cheese Pizza', menuPrice: '16.99', category: 'food', subcategory: 'pizza', isActive: true },
      { posItemName: 'C-Mac Pizza', menuPrice: '15.45', category: 'food', subcategory: 'pizza', isActive: true },
      { posItemName: 'Vegetarian Pizza', menuPrice: '14.99', category: 'food', subcategory: 'pizza', isActive: true },
      { posItemName: 'Buffalo Chicken Pizza', menuPrice: '17.45', category: 'food', subcategory: 'pizza', isActive: true },
      { posItemName: 'Chicken Bacon Ranch Pizza', menuPrice: '16.45', category: 'food', subcategory: 'pizza', isActive: true },
      { posItemName: 'Crab Rangoon Pizza', menuPrice: '16.45', category: 'food', subcategory: 'pizza', isActive: true },
      { posItemName: 'Brisket Pizza', menuPrice: '16.99', category: 'food', subcategory: 'pizza', isActive: true },
      { posItemName: 'Pickle Wrap Pizza', menuPrice: '16.99', category: 'food', subcategory: 'pizza', isActive: true },
      { posItemName: 'BBQ Jam Pizza', menuPrice: '18.99', category: 'food', subcategory: 'pizza', isActive: true },

      // ── Smoked Meats & BBQ ──
      { posItemName: 'BBQ SANDWICH', menuPrice: '12.99', category: 'food', subcategory: 'smoked_meat', isActive: true },
      { posItemName: 'BBQ MELT', menuPrice: '13.99', category: 'food', subcategory: 'smoked_meat', isActive: true },
      { posItemName: 'RACK OF RIBS', menuPrice: '26.45', category: 'food', subcategory: 'bbq_dinner', isActive: true },
      { posItemName: 'HALF RACK OF RIBS', menuPrice: '20.45', category: 'food', subcategory: 'bbq_dinner', isActive: true },
      { posItemName: 'HALF RACK & ONE MEAT', menuPrice: '26.45', category: 'food', subcategory: 'bbq_dinner', isActive: true },
      { posItemName: 'SMOKEWORX COMBO', menuPrice: '25.45', category: 'food', subcategory: 'bbq_dinner', isActive: true },
      { posItemName: 'BBQ DINNER 1', menuPrice: '14.99', category: 'food', subcategory: 'bbq_dinner', isActive: true },
      { posItemName: 'BBQ DINNER 2', menuPrice: '15.99', category: 'food', subcategory: 'bbq_dinner', isActive: true },
      { posItemName: 'BBQ DINNER 3', menuPrice: '17.99', category: 'food', subcategory: 'bbq_dinner', isActive: true },
      { posItemName: 'FAMILY PACK #1', menuPrice: '33.00', category: 'food', subcategory: 'family_pack', isActive: true },
      { posItemName: 'FAMILY PACK #3', menuPrice: '53.99', category: 'food', subcategory: 'family_pack', isActive: true },

      // ── Desserts ──
      { posItemName: 'Funnel fries', menuPrice: '6.99', category: 'food', subcategory: 'dessert', isActive: true },
      { posItemName: 'CHOCOLATE CAKE', menuPrice: '7.99', category: 'food', subcategory: 'dessert', isActive: true },

      // ── Kids Menu ──
      { posItemName: 'Kids HAMBURGER', menuPrice: '6.99', category: 'food', subcategory: 'kids', isActive: true },
      { posItemName: 'Kids CHEESEBURGER', menuPrice: '6.99', category: 'food', subcategory: 'kids', isActive: true },
      { posItemName: 'Kids GRILLED CHEESE', menuPrice: '6.99', category: 'food', subcategory: 'kids', isActive: true },
      { posItemName: 'Kids ORIGINAL CHICKEN STRIPS', menuPrice: '6.99', category: 'food', subcategory: 'kids', isActive: true },
      { posItemName: 'Kids MINI CHEESE PIZZA', menuPrice: '6.99', category: 'food', subcategory: 'kids', isActive: true },

      // ── Steaks (market price) ──
      { posItemName: 'PRIME RIB', menuPrice: '0.00', category: 'food', subcategory: 'steak', isActive: true },
      { posItemName: 'RIBEYE', menuPrice: '0.00', category: 'food', subcategory: 'steak', isActive: true },
      { posItemName: 'FILET', menuPrice: '0.00', category: 'food', subcategory: 'steak', isActive: true },
      { posItemName: 'SIRLOIN', menuPrice: '0.00', category: 'food', subcategory: 'steak', isActive: true },
      { posItemName: 'PORTERHOUSE', menuPrice: '0.00', category: 'food', subcategory: 'steak', isActive: true },

      // ── Domestic Beer ──
      { posItemName: 'Natural Light', menuPrice: '0.00', category: 'beer', subcategory: 'domestic_beer', isActive: true },
      { posItemName: 'Pabst Blue Ribbon', menuPrice: '0.00', category: 'beer', subcategory: 'domestic_beer', isActive: true },
      { posItemName: 'Budweiser', menuPrice: '0.00', category: 'beer', subcategory: 'domestic_beer', isActive: true },
      { posItemName: 'Bud Select', menuPrice: '0.00', category: 'beer', subcategory: 'domestic_beer', isActive: true },
      { posItemName: 'Bud Light', menuPrice: '0.00', category: 'beer', subcategory: 'domestic_beer', isActive: true },
      { posItemName: 'Bud Light Clamato', menuPrice: '0.00', category: 'beer', subcategory: 'domestic_beer', isActive: true },
      { posItemName: 'Coors Light', menuPrice: '0.00', category: 'beer', subcategory: 'domestic_beer', isActive: true },
      { posItemName: 'Michelob Ultra', menuPrice: '0.00', category: 'beer', subcategory: 'domestic_beer', isActive: true },
      { posItemName: 'Miller Light', menuPrice: '0.00', category: 'beer', subcategory: 'domestic_beer', isActive: true },
      { posItemName: 'Miller High Life', menuPrice: '0.00', category: 'beer', subcategory: 'domestic_beer', isActive: true },

      // ── Non-Domestic Beer ──
      { posItemName: 'Michelob Amberbock', menuPrice: '0.00', category: 'beer', subcategory: 'non_domestic_beer', isActive: true },
      { posItemName: 'Guinness', menuPrice: '0.00', category: 'beer', subcategory: 'non_domestic_beer', isActive: true },
      { posItemName: 'Corona', menuPrice: '0.00', category: 'beer', subcategory: 'non_domestic_beer', isActive: true },
      { posItemName: 'Angry Orchard', menuPrice: '0.00', category: 'beer', subcategory: 'non_domestic_beer', isActive: true },
      { posItemName: 'Mango Cart', menuPrice: '0.00', category: 'beer', subcategory: 'non_domestic_beer', isActive: true },
      { posItemName: 'Heineken', menuPrice: '0.00', category: 'beer', subcategory: 'non_domestic_beer', isActive: true },
      { posItemName: 'Stella Artois', menuPrice: '0.00', category: 'beer', subcategory: 'non_domestic_beer', isActive: true },
      { posItemName: 'Elysian Space Dust IPA', menuPrice: '0.00', category: 'beer', subcategory: 'non_domestic_beer', isActive: true },
      { posItemName: 'Coors Banquet', menuPrice: '0.00', category: 'beer', subcategory: 'non_domestic_beer', isActive: true },

      // ── On Tap ──
      { posItemName: 'Ultra (Tap)', menuPrice: '0.00', category: 'beer', subcategory: 'draft', isActive: true },
      { posItemName: 'Busch Light (Tap)', menuPrice: '0.00', category: 'beer', subcategory: 'draft', isActive: true },
      { posItemName: 'Blue Moon (Tap)', menuPrice: '0.00', category: 'beer', subcategory: 'draft', isActive: true },
      { posItemName: 'Des Moines IPA (Tap)', menuPrice: '0.00', category: 'beer', subcategory: 'draft', isActive: true },

      // ── Seltzers ──
      { posItemName: 'Carbliss Black Raspberry', menuPrice: '0.00', category: 'beer', subcategory: 'seltzer', isActive: true },
      { posItemName: 'Carbliss Pineapple', menuPrice: '0.00', category: 'beer', subcategory: 'seltzer', isActive: true },
      { posItemName: 'Carbliss Lemon/Lime', menuPrice: '0.00', category: 'beer', subcategory: 'seltzer', isActive: true },
      { posItemName: 'Carbliss Cranberry', menuPrice: '0.00', category: 'beer', subcategory: 'seltzer', isActive: true },
      { posItemName: 'White Claw Black Cherry', menuPrice: '0.00', category: 'beer', subcategory: 'seltzer', isActive: true },
      { posItemName: 'White Claw Mango', menuPrice: '0.00', category: 'beer', subcategory: 'seltzer', isActive: true },
      { posItemName: 'Nutrl', menuPrice: '0.00', category: 'beer', subcategory: 'seltzer', isActive: true },
      { posItemName: 'Smirnoff Original Ice', menuPrice: '0.00', category: 'beer', subcategory: 'seltzer', isActive: true },

      // ── Wines ──
      { posItemName: 'Merlot', menuPrice: '0.00', category: 'wine', subcategory: 'wine', isActive: true },
      { posItemName: 'Pinot Grigio', menuPrice: '0.00', category: 'wine', subcategory: 'wine', isActive: true },
      { posItemName: 'Chardonnay', menuPrice: '0.00', category: 'wine', subcategory: 'wine', isActive: true },
      { posItemName: 'White Zinfandel', menuPrice: '0.00', category: 'wine', subcategory: 'wine', isActive: true },
      { posItemName: 'Moscato', menuPrice: '0.00', category: 'wine', subcategory: 'wine', isActive: true },

      // ── Cocktails ──
      { posItemName: 'Moscow Mule', menuPrice: '0.00', category: 'liquor', subcategory: 'cocktail', isActive: true },
      { posItemName: 'Bloody Mary', menuPrice: '0.00', category: 'liquor', subcategory: 'cocktail', isActive: true },
      { posItemName: 'Margarita', menuPrice: '0.00', category: 'liquor', subcategory: 'cocktail', isActive: true },
      { posItemName: 'Long Island Iced Tea', menuPrice: '0.00', category: 'liquor', subcategory: 'cocktail', isActive: true },
      { posItemName: 'Fuzzy Navel', menuPrice: '0.00', category: 'liquor', subcategory: 'cocktail', isActive: true },
      { posItemName: 'Tequila Sunrise', menuPrice: '0.00', category: 'liquor', subcategory: 'cocktail', isActive: true },
      { posItemName: 'Sex on the Beach', menuPrice: '0.00', category: 'liquor', subcategory: 'cocktail', isActive: true },
      { posItemName: 'White Russian', menuPrice: '0.00', category: 'liquor', subcategory: 'cocktail', isActive: true },

      // ── Shots ──
      { posItemName: 'Riptide Rush', menuPrice: '0.00', category: 'liquor', subcategory: 'shot', isActive: true },
      { posItemName: 'White Gummy Bear', menuPrice: '0.00', category: 'liquor', subcategory: 'shot', isActive: true },
      { posItemName: 'Jolly Rancher', menuPrice: '0.00', category: 'liquor', subcategory: 'shot', isActive: true },
      { posItemName: 'Cherry Limeade', menuPrice: '0.00', category: 'liquor', subcategory: 'shot', isActive: true },
      { posItemName: 'Pink Starburst', menuPrice: '0.00', category: 'liquor', subcategory: 'shot', isActive: true },
      { posItemName: 'Mad-Dawg', menuPrice: '0.00', category: 'liquor', subcategory: 'shot', isActive: true },
      { posItemName: 'Green Tea', menuPrice: '0.00', category: 'liquor', subcategory: 'shot', isActive: true },
      { posItemName: 'Orange Peel', menuPrice: '0.00', category: 'liquor', subcategory: 'shot', isActive: true },
      { posItemName: 'Tennessee Apple', menuPrice: '0.00', category: 'liquor', subcategory: 'shot', isActive: true },
      { posItemName: 'Grape Tootsie Pop', menuPrice: '0.00', category: 'liquor', subcategory: 'shot', isActive: true },
      { posItemName: 'Pineapple Upside Down Cake', menuPrice: '0.00', category: 'liquor', subcategory: 'shot', isActive: true },
      { posItemName: 'Cherry Bomb', menuPrice: '0.00', category: 'liquor', subcategory: 'shot', isActive: true },
      { posItemName: 'Breakfast', menuPrice: '0.00', category: 'liquor', subcategory: 'shot', isActive: true },
      { posItemName: 'Johnny Vegas', menuPrice: '0.00', category: 'liquor', subcategory: 'shot', isActive: true },
      { posItemName: 'Vegas Bomb', menuPrice: '0.00', category: 'liquor', subcategory: 'shot', isActive: true },
      { posItemName: 'Jager Bomb', menuPrice: '0.00', category: 'liquor', subcategory: 'shot', isActive: true },
      { posItemName: 'Lemon Drop', menuPrice: '0.00', category: 'liquor', subcategory: 'shot', isActive: true },
      { posItemName: 'Gusher', menuPrice: '0.00', category: 'liquor', subcategory: 'shot', isActive: true },
      { posItemName: 'Fireball', menuPrice: '0.00', category: 'liquor', subcategory: 'shot', isActive: true },
      { posItemName: 'Rumplemintz', menuPrice: '0.00', category: 'liquor', subcategory: 'shot', isActive: true },
      { posItemName: 'Rumchata', menuPrice: '0.00', category: 'liquor', subcategory: 'shot', isActive: true },
      { posItemName: 'Patron', menuPrice: '0.00', category: 'liquor', subcategory: 'shot', isActive: true },

      // ── Non-Alcoholic ──
      { posItemName: 'Busch N/A', menuPrice: '0.00', category: 'non_alc', subcategory: 'non_alc', isActive: true },
      { posItemName: 'Ultra Zero', menuPrice: '0.00', category: 'non_alc', subcategory: 'non_alc', isActive: true },
    ]);
    results.menuItems = 'Seeded';
  } else {
    results.menuItems = 'Skipped (already populated)';
  }

  // ═══════════════════════════════════════════════════════════════════
  // 2. RECIPES — Key items with cost tracking
  // ═══════════════════════════════════════════════════════════════════
  const existingRecipes = await db.select().from(recipes).limit(1);
  if (existingRecipes.length === 0) {
    await db.insert(recipes).values([
      { name: 'CHEESE BALLS', category: 'appetizer', menuPrice: '9.99', targetFoodCostPercent: '30.00', isActive: true },
      { name: 'ONION RINGS', category: 'appetizer', menuPrice: '9.99', targetFoodCostPercent: '30.00', isActive: true },
      { name: 'BONELESS WINGS', category: 'appetizer', menuPrice: '10.99', targetFoodCostPercent: '30.00', isActive: true },
      { name: 'SMOKED IOWA CHOP', category: 'entree', menuPrice: '17.95', targetFoodCostPercent: '30.00', isActive: true },
      { name: 'Hamburger', category: 'entree', menuPrice: '10.99', targetFoodCostPercent: '30.00', isActive: true },
      { name: 'Cheese Pizza', category: 'pizza', menuPrice: '10.99', targetFoodCostPercent: '30.00', isActive: true },
      { name: 'Tenderloin', category: 'sandwich', menuPrice: '12.99', targetFoodCostPercent: '30.00', isActive: true },
      { name: 'French Fries', category: 'side', menuPrice: '3.99', targetFoodCostPercent: '30.00', isActive: true },
      { name: 'Funnel Fries', category: 'dessert', menuPrice: '6.99', targetFoodCostPercent: '30.00', isActive: true },
      { name: 'Moscow Mule', category: 'drink', menuPrice: '0.00', targetFoodCostPercent: '20.00', isActive: true },
    ]);
    results.recipes = 'Seeded';
  } else {
    results.recipes = 'Skipped (already populated)';
  }

  // ═══════════════════════════════════════════════════════════════════
  // 3. ACHIEVEMENT DEFINITIONS — 18 achievements across 6 categories
  //    Schema fields: slug, name, description, badge, category,
  //    thresholdType, thresholdValue, windowDays, bonusPoints, difficulty
  // ═══════════════════════════════════════════════════════════════════
  const existingAchievements = await db.select().from(achievementDefinitions).limit(1);
  if (existingAchievements.length === 0) {
    await db.insert(achievementDefinitions).values([
      // ── Onboarding ──
      { slug: 'first-clock-in', name: 'First Clock In', description: 'Clock in for your very first shift. Welcome to the team.', badge: '🎬', category: 'onboarding', thresholdType: 'cumulative', thresholdValue: 1, difficulty: 'easy', bonusPoints: 50 },
      { slug: 'first-checklist', name: 'First Checklist', description: 'Complete your first shift checklist from start to finish.', badge: '✅', category: 'onboarding', thresholdType: 'cumulative', thresholdValue: 1, difficulty: 'easy', bonusPoints: 50 },
      { slug: 'app-explorer', name: 'App Explorer', description: 'Visit 5 different screens in the app. Curiosity pays.', badge: '🧭', category: 'onboarding', thresholdType: 'cumulative', thresholdValue: 5, difficulty: 'easy', bonusPoints: 75 },

      // ── Reliability ──
      { slug: 'iron-streak', name: 'Iron Streak', description: 'Clock in on time for 7 consecutive shifts. Consistency is king.', badge: '🔥', category: 'reliability', thresholdType: 'consecutive', thresholdValue: 7, difficulty: 'medium', bonusPoints: 200 },
      { slug: 'month-of-steel', name: 'Month of Steel', description: 'Work 30 shifts within a 30-day window. Iron will.', badge: '🛡️', category: 'reliability', thresholdType: 'window', thresholdValue: 30, windowDays: 30, difficulty: 'hard', bonusPoints: 500 },
      { slug: 'never-late', name: 'Never Late', description: '14 consecutive on-time clock-ins. Punctuality perfected.', badge: '⏰', category: 'reliability', thresholdType: 'consecutive', thresholdValue: 14, difficulty: 'hard', bonusPoints: 300 },

      // ── Quality ──
      { slug: 'photo-pro', name: 'Photo Pro', description: 'Submit 50 approved photo mission photos. Eyes on quality.', badge: '📸', category: 'quality', thresholdType: 'cumulative', thresholdValue: 50, difficulty: 'medium', bonusPoints: 200 },
      { slug: 'zero-waste-week', name: 'Zero Waste Week', description: 'Log zero waste for 7 consecutive days. Nothing wasted.', badge: '♻️', category: 'quality', thresholdType: 'window', thresholdValue: 7, windowDays: 7, difficulty: 'hard', bonusPoints: 400 },
      { slug: 'checklist-champion', name: 'Checklist Champion', description: 'Complete 30 shift checklists. Every task, every time.', badge: '🏆', category: 'quality', thresholdType: 'cumulative', thresholdValue: 30, difficulty: 'medium', bonusPoints: 150 },

      // ── Engagement ──
      { slug: 'feedback-king', name: 'Feedback King', description: 'Submit 20 shift feedback entries. Your voice matters.', badge: '💬', category: 'engagement', thresholdType: 'cumulative', thresholdValue: 20, difficulty: 'medium', bonusPoints: 200 },
      { slug: 'brain-master', name: 'Brain Master', description: 'Ask Brain 50 questions. Knowledge is power.', badge: '🧠', category: 'engagement', thresholdType: 'cumulative', thresholdValue: 50, difficulty: 'medium', bonusPoints: 200 },
      { slug: 'team-player', name: 'Team Player', description: 'File 10 issue reports. Keeping the team informed.', badge: '🤝', category: 'engagement', thresholdType: 'cumulative', thresholdValue: 10, difficulty: 'easy', bonusPoints: 100 },

      // ── Leadership ──
      { slug: 'mentor', name: 'Mentor', description: 'Help train 5 new team members. Passing on the knowledge.', badge: '🎓', category: 'leadership', thresholdType: 'cumulative', thresholdValue: 5, difficulty: 'hard', bonusPoints: 500 },
      { slug: 'shift-captain', name: 'Shift Captain', description: 'Lead 10 shifts as the senior on duty. Command earned.', badge: '⭐', category: 'leadership', thresholdType: 'cumulative', thresholdValue: 10, difficulty: 'hard', bonusPoints: 400 },
      { slug: 'problem-solver', name: 'Problem Solver', description: 'Resolve 20 reported issues. Fixing what needs fixing.', badge: '🔧', category: 'leadership', thresholdType: 'cumulative', thresholdValue: 20, difficulty: 'medium', bonusPoints: 300 },

      // ── Longevity ──
      { slug: 'ninety-day-veteran', name: '90 Day Veteran', description: 'Complete 90 shifts. You are part of the foundation now.', badge: '🎖️', category: 'longevity', thresholdType: 'cumulative', thresholdValue: 90, difficulty: 'medium', bonusPoints: 300 },
      { slug: 'six-month-legend', name: 'Six Month Legend', description: 'Complete 180 shifts. Half a year of dedication.', badge: '👑', category: 'longevity', thresholdType: 'cumulative', thresholdValue: 180, difficulty: 'hard', bonusPoints: 750 },
      { slug: 'lifer', name: 'Lifer', description: 'Complete 365 shifts. A full year. Legendary status.', badge: '💎', category: 'longevity', thresholdType: 'cumulative', thresholdValue: 365, difficulty: 'legendary', bonusPoints: 2000 },
    ]);
    results.achievements = 'Seeded';
  } else {
    results.achievements = 'Skipped (already populated)';
  }

  // ═══════════════════════════════════════════════════════════════════
  // 4. REWARDS — 12 rewards across 6 tiers
  //    Schema fields: tier, name, description, pointsCost, type, active
  // ═══════════════════════════════════════════════════════════════════
  const existingRewards = await db.select().from(rewards).limit(1);
  if (existingRewards.length === 0) {
    await db.insert(rewards).values([
      // Bronze
      { tier: 'bronze', name: 'Free Shift Meal', description: 'One free meal during your shift. You earned it.', pointsCost: 100, type: 'meal', active: true },
      { tier: 'bronze', name: 'CTap T-Shirt', description: 'Official Community Tap & Pizza crew shirt.', pointsCost: 200, type: 'merch', active: true },
      // Silver
      { tier: 'silver', name: '$10 Gift Card', description: '$10 gift card to Community Tap & Pizza.', pointsCost: 300, type: 'gift_card', active: true },
      { tier: 'silver', name: 'Priority Scheduling', description: 'First pick on next week\'s schedule.', pointsCost: 500, type: 'schedule', active: true },
      // Gold
      { tier: 'gold', name: '$25 Gift Card', description: '$25 gift card to Community Tap & Pizza.', pointsCost: 750, type: 'gift_card', active: true },
      { tier: 'gold', name: 'Day Off Request Priority', description: 'Your next day-off request gets top priority.', pointsCost: 1000, type: 'schedule', active: true },
      // Platinum
      { tier: 'platinum', name: '$50 Gift Card', description: '$50 gift card. Treat yourself and a friend.', pointsCost: 1500, type: 'gift_card', active: true },
      { tier: 'platinum', name: 'Custom Schedule Week', description: 'Build your own schedule for one week.', pointsCost: 1500, type: 'schedule', active: true },
      // Diamond
      { tier: 'diamond', name: '$100 Gift Card', description: '$100 gift card. Major reward for major effort.', pointsCost: 2500, type: 'gift_card', active: true },
      { tier: 'diamond', name: 'Paid Day Off', description: 'One fully paid day off. Rest and recharge.', pointsCost: 2500, type: 'time_off', active: true },
      // Legend
      { tier: 'legend', name: '$200 Gift Card', description: '$200 gift card. Legend-tier generosity.', pointsCost: 5000, type: 'gift_card', active: true },
      { tier: 'legend', name: 'Legend Parking Spot', description: 'Reserved parking spot with your name on it.', pointsCost: 5000, type: 'merch', active: true },
    ]);
    results.rewards = 'Seeded';
  } else {
    results.rewards = 'Skipped (already populated)';
  }

  // ═══════════════════════════════════════════════════════════════════
  // 5. PHOTO MISSIONS — 8 missions
  //    Schema fields: name, description, category, pointsPerPhoto,
  //    bonusPoints, targetPhotoCount, active
  // ═══════════════════════════════════════════════════════════════════
  const existingPhotoMissions = await db.select().from(photoMissions).limit(1);
  if (existingPhotoMissions.length === 0) {
    await db.insert(photoMissions).values([
      { name: 'Walk-In Check', description: 'Photograph the walk-in cooler organization and temps.', category: 'walk_in', pointsPerPhoto: 5, targetPhotoCount: 10, bonusPoints: 25, active: true },
      { name: 'Station Setup', description: 'Document your station setup before service begins.', category: 'station_setup', pointsPerPhoto: 5, targetPhotoCount: 10, bonusPoints: 25, active: true },
      { name: 'Invoice Capture', description: 'Photograph delivery invoices for digital processing.', category: 'invoice', pointsPerPhoto: 10, targetPhotoCount: 5, bonusPoints: 50, active: true },
      { name: 'Equipment Log', description: 'Document equipment condition and maintenance needs.', category: 'equipment', pointsPerPhoto: 5, targetPhotoCount: 10, bonusPoints: 25, active: true },
      { name: 'Prep Quality', description: 'Photograph prep work quality and portioning.', category: 'prep', pointsPerPhoto: 5, targetPhotoCount: 10, bonusPoints: 25, active: true },
      { name: 'Plate Presentation', description: 'Capture plate presentation before it leaves the window.', category: 'plate', pointsPerPhoto: 10, targetPhotoCount: 10, bonusPoints: 50, active: true },
      { name: 'Delivery Proof', description: 'Photograph delivery drop-off for confirmation.', category: 'delivery', pointsPerPhoto: 5, targetPhotoCount: 10, bonusPoints: 25, active: true },
      { name: 'Daily Special', description: 'Photograph the daily special for social media.', category: 'general', pointsPerPhoto: 15, targetPhotoCount: 5, bonusPoints: 75, active: true },
    ]);
    results.photoMissions = 'Seeded';
  } else {
    results.photoMissions = 'Skipped (already populated)';
  }

  return results;
}
