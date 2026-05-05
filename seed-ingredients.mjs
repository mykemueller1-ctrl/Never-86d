import 'dotenv/config';
import { drizzle } from 'drizzle-orm/mysql2';
import { sql } from 'drizzle-orm';

const db = drizzle(process.env.DATABASE_URL);

async function main() {
  console.log('Seeding recipe ingredients and SKU prices...');

  // 1. Seed recipe ingredients for all 10 recipes
  const ingredients = [
    // Recipe 1: CHEESE BALLS
    { recipeId: 1, ingredientName: 'Frozen Cheese Balls (bag)', quantity: 1.0000, unitOfMeasure: 'bag', costPerUnit: 18.5000, totalCost: 18.5000, notes: 'PFG - 2lb bag, ~40 pieces' },
    { recipeId: 1, ingredientName: 'Fry Oil (portion)', quantity: 0.2500, unitOfMeasure: 'gal', costPerUnit: 4.2000, totalCost: 1.0500, notes: 'Shared fryer oil cost per batch' },
    // Recipe 2: ONION RINGS
    { recipeId: 2, ingredientName: 'Frozen Onion Rings (bag)', quantity: 1.0000, unitOfMeasure: 'bag', costPerUnit: 22.7500, totalCost: 22.7500, notes: 'PFG - 2.5lb bag' },
    { recipeId: 2, ingredientName: 'Fry Oil (portion)', quantity: 0.2500, unitOfMeasure: 'gal', costPerUnit: 4.2000, totalCost: 1.0500, notes: 'Shared fryer oil cost per batch' },
    { recipeId: 2, ingredientName: 'Ranch Dressing (cup)', quantity: 2.0000, unitOfMeasure: 'oz', costPerUnit: 0.1200, totalCost: 0.2400, notes: 'Side ranch' },
    // Recipe 3: BONELESS WINGS
    { recipeId: 3, ingredientName: 'Boneless Wing Meat (frozen)', quantity: 8.0000, unitOfMeasure: 'oz', costPerUnit: 0.3100, totalCost: 2.4800, notes: 'PFG - 10lb case' },
    { recipeId: 3, ingredientName: 'Wing Sauce (Buffalo)', quantity: 2.0000, unitOfMeasure: 'oz', costPerUnit: 0.0800, totalCost: 0.1600, notes: 'Franks RedHot or house blend' },
    { recipeId: 3, ingredientName: 'Fry Oil (portion)', quantity: 0.3000, unitOfMeasure: 'gal', costPerUnit: 4.2000, totalCost: 1.2600, notes: 'Deep fry' },
    { recipeId: 3, ingredientName: 'Celery Sticks', quantity: 2.0000, unitOfMeasure: 'stalk', costPerUnit: 0.1500, totalCost: 0.3000, notes: 'Garnish' },
    { recipeId: 3, ingredientName: 'Blue Cheese Dressing', quantity: 2.0000, unitOfMeasure: 'oz', costPerUnit: 0.1400, totalCost: 0.2800, notes: 'Side dressing' },
    // Recipe 4: SMOKED IOWA CHOP
    { recipeId: 4, ingredientName: 'Iowa Pork Chop (bone-in)', quantity: 14.0000, unitOfMeasure: 'oz', costPerUnit: 0.4200, totalCost: 5.8800, notes: 'Sawyers Meats - thick cut' },
    { recipeId: 4, ingredientName: 'House Dry Rub', quantity: 1.0000, unitOfMeasure: 'tbsp', costPerUnit: 0.2500, totalCost: 0.2500, notes: 'Brown sugar, paprika, garlic, pepper' },
    { recipeId: 4, ingredientName: 'BBQ Glaze', quantity: 2.0000, unitOfMeasure: 'oz', costPerUnit: 0.1000, totalCost: 0.2000, notes: 'House BBQ sauce' },
    { recipeId: 4, ingredientName: 'Baked Potato', quantity: 1.0000, unitOfMeasure: 'each', costPerUnit: 0.6500, totalCost: 0.6500, notes: 'Side' },
    { recipeId: 4, ingredientName: 'Butter Pat', quantity: 1.0000, unitOfMeasure: 'each', costPerUnit: 0.1200, totalCost: 0.1200, notes: 'For potato' },
    { recipeId: 4, ingredientName: 'Sour Cream Cup', quantity: 1.0000, unitOfMeasure: 'each', costPerUnit: 0.1500, totalCost: 0.1500, notes: 'For potato' },
    // Recipe 5: Hamburger
    { recipeId: 5, ingredientName: 'Ground Beef Patty (1/3 lb)', quantity: 1.0000, unitOfMeasure: 'each', costPerUnit: 2.1500, totalCost: 2.1500, notes: 'PFG - fresh never frozen' },
    { recipeId: 5, ingredientName: 'Hamburger Bun', quantity: 1.0000, unitOfMeasure: 'each', costPerUnit: 0.3500, totalCost: 0.3500, notes: 'Brioche style' },
    { recipeId: 5, ingredientName: 'Lettuce/Tomato/Onion', quantity: 1.0000, unitOfMeasure: 'serving', costPerUnit: 0.3000, totalCost: 0.3000, notes: 'Standard garnish' },
    { recipeId: 5, ingredientName: 'Pickle Slices', quantity: 3.0000, unitOfMeasure: 'each', costPerUnit: 0.0300, totalCost: 0.0900, notes: 'Dill pickle chips' },
    { recipeId: 5, ingredientName: 'French Fries (portion)', quantity: 6.0000, unitOfMeasure: 'oz', costPerUnit: 0.0800, totalCost: 0.4800, notes: 'Side fries included' },
    // Recipe 6: Cheese Pizza (12")
    { recipeId: 6, ingredientName: 'Pizza Dough Ball', quantity: 1.0000, unitOfMeasure: 'each', costPerUnit: 0.8500, totalCost: 0.8500, notes: 'House-made, 12oz ball' },
    { recipeId: 6, ingredientName: 'Pizza Sauce', quantity: 4.0000, unitOfMeasure: 'oz', costPerUnit: 0.0600, totalCost: 0.2400, notes: 'House recipe' },
    { recipeId: 6, ingredientName: 'Mozzarella Cheese (shredded)', quantity: 8.0000, unitOfMeasure: 'oz', costPerUnit: 0.2800, totalCost: 2.2400, notes: 'PFG - #1 priority item' },
    { recipeId: 6, ingredientName: 'Cornmeal (dusting)', quantity: 0.5000, unitOfMeasure: 'oz', costPerUnit: 0.0200, totalCost: 0.0100, notes: 'For peel' },
    // Recipe 7: Tenderloin
    { recipeId: 7, ingredientName: 'Pork Tenderloin (breaded)', quantity: 8.0000, unitOfMeasure: 'oz', costPerUnit: 0.3800, totalCost: 3.0400, notes: 'Hand-breaded Iowa tenderloin' },
    { recipeId: 7, ingredientName: 'Hamburger Bun (large)', quantity: 1.0000, unitOfMeasure: 'each', costPerUnit: 0.4000, totalCost: 0.4000, notes: 'Oversized for tenderloin' },
    { recipeId: 7, ingredientName: 'Lettuce/Tomato/Onion/Pickle', quantity: 1.0000, unitOfMeasure: 'serving', costPerUnit: 0.3500, totalCost: 0.3500, notes: 'Standard garnish' },
    { recipeId: 7, ingredientName: 'Fry Oil (portion)', quantity: 0.3500, unitOfMeasure: 'gal', costPerUnit: 4.2000, totalCost: 1.4700, notes: 'Deep fry' },
    { recipeId: 7, ingredientName: 'French Fries (portion)', quantity: 6.0000, unitOfMeasure: 'oz', costPerUnit: 0.0800, totalCost: 0.4800, notes: 'Side fries included' },
    // Recipe 8: French Fries
    { recipeId: 8, ingredientName: 'Frozen French Fries', quantity: 8.0000, unitOfMeasure: 'oz', costPerUnit: 0.0800, totalCost: 0.6400, notes: 'PFG - crinkle cut' },
    { recipeId: 8, ingredientName: 'Fry Oil (portion)', quantity: 0.2000, unitOfMeasure: 'gal', costPerUnit: 4.2000, totalCost: 0.8400, notes: 'Deep fry' },
    { recipeId: 8, ingredientName: 'Salt', quantity: 0.2500, unitOfMeasure: 'tsp', costPerUnit: 0.0100, totalCost: 0.0025, notes: 'Seasoning' },
    // Recipe 9: Funnel Fries
    { recipeId: 9, ingredientName: 'Funnel Cake Batter Mix', quantity: 4.0000, unitOfMeasure: 'oz', costPerUnit: 0.1200, totalCost: 0.4800, notes: 'PFG' },
    { recipeId: 9, ingredientName: 'Powdered Sugar', quantity: 1.0000, unitOfMeasure: 'oz', costPerUnit: 0.0500, totalCost: 0.0500, notes: 'Dusting' },
    { recipeId: 9, ingredientName: 'Fry Oil (portion)', quantity: 0.2500, unitOfMeasure: 'gal', costPerUnit: 4.2000, totalCost: 1.0500, notes: 'Deep fry' },
    { recipeId: 9, ingredientName: 'Chocolate Sauce', quantity: 1.0000, unitOfMeasure: 'oz', costPerUnit: 0.1500, totalCost: 0.1500, notes: 'Drizzle' },
    // Recipe 10: Moscow Mule
    { recipeId: 10, ingredientName: 'Absolut Vodka', quantity: 1.5000, unitOfMeasure: 'oz', costPerUnit: 0.8500, totalCost: 1.2750, notes: 'Well vodka pour' },
    { recipeId: 10, ingredientName: 'Ginger Beer', quantity: 4.0000, unitOfMeasure: 'oz', costPerUnit: 0.3500, totalCost: 1.4000, notes: 'Premium ginger beer' },
    { recipeId: 10, ingredientName: 'Fresh Lime Juice', quantity: 0.7500, unitOfMeasure: 'oz', costPerUnit: 0.2000, totalCost: 0.1500, notes: 'Fresh squeezed' },
    { recipeId: 10, ingredientName: 'Lime Wedge (garnish)', quantity: 1.0000, unitOfMeasure: 'each', costPerUnit: 0.0800, totalCost: 0.0800, notes: 'Garnish' },
    { recipeId: 10, ingredientName: 'Ice', quantity: 8.0000, unitOfMeasure: 'oz', costPerUnit: 0.0100, totalCost: 0.0800, notes: 'Copper mug' },
  ];

  // Insert in batches
  for (let i = 0; i < ingredients.length; i += 10) {
    const batch = ingredients.slice(i, i + 10);
    const values = batch.map(ing => 
      `(${ing.recipeId}, '${ing.ingredientName.replace(/'/g, "\\'")}', ${ing.quantity}, '${ing.unitOfMeasure}', ${ing.costPerUnit}, ${ing.totalCost}, ${ing.yieldPercent || 100}, ${ing.notes ? `'${ing.notes.replace(/'/g, "\\'")}'` : 'NULL'})`
    ).join(',\n');
    await db.execute(sql.raw(`INSERT INTO recipe_ingredients (recipeId, ingredientName, quantity, unitOfMeasure, costPerUnit, totalCost, yieldPercent, notes) VALUES ${values}`));
  }
  console.log(`Seeded ${ingredients.length} recipe ingredients`);

  // 2. Update SKU prices (realistic Iowa bar prices)
  const skuPrices = [
    // Hughes beers
    { id: 1, price: 1.2500, lastOrder: 28.75 }, // Bud Light Bottle
    { id: 2, price: 1.2500, lastOrder: 28.75 }, // Budweiser Bottle
    { id: 3, price: 1.1000, lastOrder: 25.30 }, // Busch Light Bottle
    { id: 4, price: 1.4500, lastOrder: 33.35 }, // Michelob Ultra Can
    { id: 5, price: 1.4500, lastOrder: 33.35 }, // Michelob Ultra Bottle
    { id: 6, price: 1.5500, lastOrder: 35.65 }, // Cactus Lime Ultra
    { id: 7, price: 1.2000, lastOrder: 27.60 }, // Busch N/A
    { id: 8, price: 2.1500, lastOrder: 49.45 }, // Carbliss Watermelon
    { id: 9, price: 2.1500, lastOrder: 49.45 }, // Carbliss Cranberry
    { id: 10, price: 2.1500, lastOrder: 49.45 }, // Carbliss Pineapple
    { id: 11, price: 2.1500, lastOrder: 49.45 }, // Carbliss Lemon Lime
    { id: 12, price: 2.1500, lastOrder: 49.45 }, // Carbliss Black Cherry
    { id: 13, price: 1.3500, lastOrder: 31.05 }, // Bud Light Seltzer
    // Fort Dodge beers
    { id: 14, price: 1.2500, lastOrder: 28.75 }, // Coors Light Bottle
    { id: 15, price: 1.2500, lastOrder: 28.75 }, // Miller Lite Bottle
    { id: 16, price: 1.8500, lastOrder: 42.55 }, // White Claw Variety
    { id: 17, price: 1.6500, lastOrder: 37.95 }, // Corona Extra
    { id: 18, price: 1.5500, lastOrder: 35.65 }, // Blue Moon
    { id: 19, price: 1.9500, lastOrder: 44.85 }, // Skimmer Variety
    { id: 20, price: 1.8500, lastOrder: 42.55 }, // Nutrl Variety
    // Liquor (Hy-Vee) - per bottle
    { id: 21, price: 15.9900, lastOrder: 15.99 }, // Absolut Vodka 750ml
    { id: 22, price: 17.9900, lastOrder: 17.99 }, // Absolut Citron
    { id: 23, price: 17.9900, lastOrder: 17.99 }, // Absolut Mango
    { id: 24, price: 13.9900, lastOrder: 13.99 }, // Bacardi Superior
    { id: 25, price: 14.9900, lastOrder: 14.99 }, // Captain Morgan
    { id: 26, price: 16.9900, lastOrder: 16.99 }, // Jose Cuervo Gold
    { id: 27, price: 14.9900, lastOrder: 14.99 }, // Fireball
    { id: 28, price: 24.9900, lastOrder: 24.99 }, // Makers Mark
    { id: 29, price: 26.9900, lastOrder: 26.99 }, // Jameson
    { id: 30, price: 15.9900, lastOrder: 15.99 }, // Malibu
    { id: 31, price: 19.9900, lastOrder: 19.99 }, // Kahlua
    { id: 32, price: 22.9900, lastOrder: 22.99 }, // Baileys
    { id: 33, price: 14.9900, lastOrder: 14.99 }, // Southern Comfort
    { id: 34, price: 19.9900, lastOrder: 19.99 }, // Rumchata
    { id: 35, price: 8.9900, lastOrder: 8.99 },   // Triple Sec
    { id: 36, price: 22.9900, lastOrder: 22.99 }, // Tanqueray
    { id: 37, price: 11.9900, lastOrder: 11.99 }, // Peach Schnapps
    { id: 38, price: 11.9900, lastOrder: 11.99 }, // Butterscotch Schnapps
    { id: 39, price: 11.9900, lastOrder: 11.99 }, // Peppermint Schnapps
    { id: 40, price: 12.9900, lastOrder: 12.99 }, // Blue Curacao
    { id: 41, price: 12.9900, lastOrder: 12.99 }, // Midori
    { id: 42, price: 14.9900, lastOrder: 14.99 }, // Creme de Cacao
    { id: 43, price: 14.9900, lastOrder: 14.99 }, // Amaretto
    { id: 44, price: 22.9900, lastOrder: 22.99 }, // Ole Smoky Moonshine
    { id: 45, price: 7.9900, lastOrder: 7.99 },   // Angostura Bitters
    { id: 46, price: 18.9900, lastOrder: 18.99 }, // Jack Daniels
    { id: 47, price: 12.9900, lastOrder: 12.99 }, // Jim Beam
    { id: 48, price: 29.9900, lastOrder: 29.99 }, // Crown Royal
    { id: 49, price: 13.9900, lastOrder: 13.99 }, // Seagrams 7
    { id: 50, price: 24.9900, lastOrder: 24.99 }, // Titos Vodka
    { id: 51, price: 14.9900, lastOrder: 14.99 }, // New Amsterdam Vodka
    { id: 52, price: 16.9900, lastOrder: 16.99 }, // Deep Eddy Lemon
    { id: 53, price: 16.9900, lastOrder: 16.99 }, // Deep Eddy Cranberry
    { id: 54, price: 22.9900, lastOrder: 22.99 }, // Hendricks Gin
    { id: 55, price: 34.9900, lastOrder: 34.99 }, // Don Julio Blanco
  ];

  for (const sku of skuPrices) {
    await db.execute(sql.raw(`UPDATE sku_catalog SET currentPricePerUnit = ${sku.price}, lastOrderPrice = ${sku.lastOrder}, lastOrderDate = '2026-04-28 00:00:00' WHERE id = ${sku.id}`));
  }
  console.log(`Updated prices for ${skuPrices.length} SKUs`);

  // 3. Update recipe costs based on ingredients
  const recipeCosts = [
    { id: 1, cost: 2.44 },  // Cheese Balls per serving (bag/16 servings + oil)
    { id: 2, cost: 1.87 },  // Onion Rings per serving
    { id: 3, cost: 4.48 },  // Boneless Wings
    { id: 4, cost: 7.25 },  // Smoked Iowa Chop
    { id: 5, cost: 3.37 },  // Hamburger
    { id: 6, cost: 3.34 },  // Cheese Pizza
    { id: 7, cost: 5.74 },  // Tenderloin
    { id: 8, cost: 1.48 },  // French Fries
    { id: 9, cost: 1.73 },  // Funnel Fries
    { id: 10, cost: 2.98 }, // Moscow Mule
  ];
  for (const r of recipeCosts) {
    await db.execute(sql.raw(`UPDATE recipes SET totalCost = ${r.cost} WHERE id = ${r.id}`));
  }
  console.log('Updated recipe costs');

  // 4. Update menu items with theoretical costs and margins
  // Link recipes to menu items and calculate margins
  const menuUpdates = [
    { posItemName: 'CHEESE BALLS', recipeId: 1, theoreticalCost: 2.44 },
    { posItemName: 'ONION RINGS', recipeId: 2, theoreticalCost: 1.87 },
    { posItemName: 'BONELESS WINGS', recipeId: 3, theoreticalCost: 4.48 },
    { posItemName: 'SMOKED IOWA CHOP', recipeId: 4, theoreticalCost: 7.25 },
  ];
  for (const mu of menuUpdates) {
    await db.execute(sql.raw(`UPDATE menu_items SET recipeId = ${mu.recipeId}, theoreticalCost = ${mu.theoreticalCost}, marginPercent = ROUND((1 - ${mu.theoreticalCost}/menuPrice) * 100, 2) WHERE posItemName = '${mu.posItemName}'`));
  }
  console.log('Linked recipes to menu items');

  // 5. Add SKU price history entries for trend tracking
  const priceHistoryEntries = [];
  for (let weekOffset = 4; weekOffset >= 0; weekOffset--) {
    const date = new Date();
    date.setDate(date.getDate() - (weekOffset * 7));
    const dateStr = date.toISOString().split('T')[0];
    // Add some variance to prices
    for (const sku of skuPrices.slice(0, 20)) { // Just beers for history
      const variance = 1 + (Math.random() - 0.5) * 0.04; // +/- 2%
      const price = (sku.price * variance).toFixed(4);
      priceHistoryEntries.push(`(${sku.id}, ${price}, '${dateStr}', 'invoice')`);
    }
  }
  // Insert price history in batches
  for (let i = 0; i < priceHistoryEntries.length; i += 20) {
    const batch = priceHistoryEntries.slice(i, i + 20);
    await db.execute(sql.raw(`INSERT INTO sku_price_history (skuId, price, recordedAt, source) VALUES ${batch.join(',')}`));
  }
  console.log(`Seeded ${priceHistoryEntries.length} price history entries`);

  console.log('Done!');
  process.exit(0);
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
