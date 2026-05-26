import { eq } from 'drizzle-orm';
import { getDb, recalculateMenuItemMargin, recalculateRecipeCost } from './db';
import {
  menuItems,
  recipeIngredients,
  recipes,
  skuCatalog,
  type InsertRecipeIngredient,
  type MenuItem,
  type Recipe,
  type SkuCatalogItem,
} from '../drizzle/schema';

export type SeedRecipeIngredientsOptions = {
  /** Preview mappings without inserting, deleting, or recalculating rows. */
  dryRun?: boolean;
  /** Delete and rebuild ingredient rows for active recipes. Defaults to false for production safety. */
  refreshExisting?: boolean;
  /** Recalculate recipes and linked menu items after inserting. Defaults to true. */
  recalculate?: boolean;
};

type IngredientDraft = Omit<InsertRecipeIngredient, 'id' | 'createdAt'>;

type RecipeSeedDetail = {
  recipeId: number;
  recipeName: string;
  category: string;
  action: 'seeded' | 'skipped_existing' | 'dry_run' | 'no_mapping';
  ingredientCount: number;
  theoreticalCost: string;
  ingredientNames: string[];
};

export type SeedRecipeIngredientsResult = {
  dryRun: boolean;
  refreshExisting: boolean;
  recipeCount: number;
  skuCount: number;
  existingIngredientRows: number;
  recipesAlreadyCosted: number;
  recipesSeeded: number;
  recipesSkippedExisting: number;
  recipesWithoutMapping: number;
  ingredientRowsPrepared: number;
  ingredientRowsInserted: number;
  recipesRecalculated: number;
  linkedMenuItemsRecalculated: number;
  details: RecipeSeedDetail[];
  methodology: string[];
};

const OZ_PER_750ML_BOTTLE = 25.3605;

const normalize = (value: string | null | undefined) =>
  (value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const money4 = (value: number) => (Number.isFinite(value) ? Math.max(0, value).toFixed(4) : '0.0000');

const numberFromDecimal = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

function findSku(skus: SkuCatalogItem[], keywords: string[], preferredCategory?: string): SkuCatalogItem | null {
  const normalizedKeywords = keywords.map(normalize).filter(Boolean);
  let best: { sku: SkuCatalogItem; score: number } | null = null;

  for (const sku of skus) {
    const haystack = normalize(`${sku.productName} ${sku.sku || ''} ${sku.category || ''} ${sku.notes || ''}`);
    let score = 0;
    for (const keyword of normalizedKeywords) {
      if (haystack.includes(keyword)) score += keyword.length + 10;
    }
    if (preferredCategory && sku.category === preferredCategory) score += 15;
    if (score > 0 && (!best || score > best.score)) best = { sku, score };
  }

  return best?.sku || null;
}

function skuBottleCostPerOz(sku: SkuCatalogItem | null, fallbackPerOz: number) {
  const price = numberFromDecimal(sku?.currentPricePerUnit) ?? numberFromDecimal(sku?.lastOrderPrice);
  if (!sku || price === null || price <= 0) return fallbackPerOz;
  if (normalize(sku.unitSize).includes('750ml') || normalize(sku.unitOfMeasure).includes('bottle')) {
    return price / OZ_PER_750ML_BOTTLE;
  }
  return fallbackPerOz;
}

function ingredient(
  skus: SkuCatalogItem[],
  recipeId: number,
  ingredientName: string,
  quantity: number,
  unitOfMeasure: string,
  costPerUnit: number,
  yieldPercent = 100,
  skuKeywords: string[] = [],
  preferredCategory?: string,
  notes?: string,
): IngredientDraft {
  const sku = skuKeywords.length > 0 ? findSku(skus, skuKeywords, preferredCategory) : null;
  const totalCost = (quantity * costPerUnit) / (yieldPercent / 100);
  return {
    recipeId,
    skuId: sku?.id ?? null,
    ingredientName,
    quantity: money4(quantity),
    unitOfMeasure,
    costPerUnit: money4(costPerUnit),
    totalCost: money4(totalCost),
    yieldPercent: yieldPercent.toFixed(2),
    notes: [
      sku ? `Linked to SKU ${sku.sku}: ${sku.productName}` : 'Manual market-standard estimate; no exact active SKU found',
      notes,
    ].filter(Boolean).join(' | '),
  };
}

function liquorIngredient(
  skus: SkuCatalogItem[],
  recipeId: number,
  ingredientName: string,
  keywords: string[],
  quantity = 1.5,
  fallbackPerOz = 0.75,
): IngredientDraft {
  const sku = findSku(skus, keywords, 'liquor');
  return ingredient(
    skus,
    recipeId,
    ingredientName,
    quantity,
    'oz',
    skuBottleCostPerOz(sku, fallbackPerOz),
    100,
    keywords,
    'liquor',
    'Bottle price converted from 750ml to per-ounce beverage cost when available.',
  );
}

const MIXER_COST_PER_OZ: Record<string, number> = {
  'Fountain Soda': 0.0200,
  'Tonic Water': 0.0625,
  'Orange Juice': 0.0833,
  'Cranberry Juice': 0.0833,
  'Bloody Mary Mix': 0.1200,
  'Ginger Beer': 0.1249,
  'Milk (2%)': 0.0400,
  Coffee: 0.0300,
  'Sour Mix': 0.0800,
  'Margarita Mix': 0.0800,
  Grenadine: 0.1000,
  'Lime Juice': 0.0500,
  'Lemon/Lime Garnish': 0.1200,
  'Pickle/Spicy Pickle Garnish': 0.1500,
};

function mixerIngredient(skus: SkuCatalogItem[], recipeId: number, name: keyof typeof MIXER_COST_PER_OZ, quantity: number): IngredientDraft {
  const keywordsByMixer: Record<string, string[]> = {
    'Orange Juice': ['orange juice'],
    'Cranberry Juice': ['cranberry'],
    'Bloody Mary Mix': ['bloody mary mix'],
    'Ginger Beer': ['ginger beer'],
    'Milk (2%)': ['milk 2%'],
    'Lemon/Lime Garnish': ['lemon', 'lime'],
    'Pickle/Spicy Pickle Garnish': ['pickle dill'],
    'Lime Juice': ['lime'],
  };
  return ingredient(
    skus,
    recipeId,
    name,
    quantity,
    name.includes('Garnish') ? 'each' : 'oz',
    MIXER_COST_PER_OZ[name],
    100,
    keywordsByMixer[name] || [],
    undefined,
    'Mixer/garnish estimate based on bar portion standards unless a matching SKU is active.',
  );
}

function baseLiquorForRecipe(recipeName: string): { label: string; keywords: string[]; fallbackPerOz: number } {
  const name = normalize(recipeName);
  const mappings: Array<{ match: string[]; label: string; keywords: string[]; fallbackPerOz: number }> = [
    { match: ['absolut citron'], label: 'Absolut Citron Vodka', keywords: ['absolut citron'], fallbackPerOz: 0.53 },
    { match: ['absolut mango', 'absolut mandarin'], label: 'Absolut Mango Vodka', keywords: ['absolut mango'], fallbackPerOz: 0.53 },
    { match: ['absolut'], label: 'Absolut Vodka', keywords: ['absolut'], fallbackPerOz: 0.53 },
    { match: ['titos', 'tito'], label: "Tito's Vodka", keywords: ['titos'], fallbackPerOz: 0.63 },
    { match: ['ketel'], label: 'Ketel One Vodka', keywords: ['ketel one'], fallbackPerOz: 0.67 },
    { match: ['jeremiah', 'sweet tea', 'firefly'], label: 'Sweet Tea Vodka', keywords: ['jeremiah weed sweet tea'], fallbackPerOz: 0.60 },
    { match: ['spicy pickle'], label: 'Spicy Pickle Vodka', keywords: ['spicy pickle'], fallbackPerOz: 0.53 },
    { match: ['smirnoff'], label: 'Smirnoff Vodka', keywords: ['smirnoff'], fallbackPerOz: 0.53 },
    { match: ['uv blue'], label: 'UV Blue Vodka', keywords: ['uv blue'], fallbackPerOz: 0.36 },
    { match: ['grey goose'], label: 'Grey Goose Vodka', keywords: ['grey goose'], fallbackPerOz: 0.91 },
    { match: ['hawkeye', 'well'], label: 'Well Vodka', keywords: ['hawkeye vodka'], fallbackPerOz: 0.21 },
    { match: ['jose', 'cuervo'], label: 'Jose Cuervo Tequila', keywords: ['jose cuervo'], fallbackPerOz: 0.71 },
    { match: ['patron'], label: 'Patron Tequila', keywords: ['patron'], fallbackPerOz: 1.79 },
    { match: ['juarez'], label: 'Juarez Tequila', keywords: ['margaritaville tequila', 'jose cuervo'], fallbackPerOz: 0.43 },
    { match: ['margaritaville'], label: 'Margaritaville Tequila', keywords: ['margaritaville tequila'], fallbackPerOz: 0.47 },
    { match: ['bacardi limon'], label: 'Bacardi Limon Rum', keywords: ['bacardi limon'], fallbackPerOz: 0.53 },
    { match: ['bacardi'], label: 'Bacardi Superior Rum', keywords: ['bacardi superior'], fallbackPerOz: 0.53 },
    { match: ['captain'], label: 'Captain Morgan Spiced Rum', keywords: ['captain morgan'], fallbackPerOz: 0.56 },
    { match: ['malibu'], label: 'Malibu Rum', keywords: ['malibu'], fallbackPerOz: 0.53 },
    { match: ['myers'], label: 'Myers Dark Rum', keywords: ['myers dark rum'], fallbackPerOz: 0.62 },
    { match: ['bombay'], label: 'Bombay Sapphire Gin', keywords: ['bombay sapphire'], fallbackPerOz: 0.86 },
    { match: ['hendricks'], label: 'Hendricks Gin', keywords: ['hendricks gin'], fallbackPerOz: 1.18 },
    { match: ['tanqueray'], label: 'Tanqueray Gin', keywords: ['tanqueray'], fallbackPerOz: 0.86 },
    { match: ['jameson'], label: 'Jameson Irish Whiskey', keywords: ['jameson'], fallbackPerOz: 1.33 },
    { match: ['makers'], label: 'Maker\'s Mark Bourbon', keywords: ['makers mark'], fallbackPerOz: 1.06 },
    { match: ['woodford'], label: 'Woodford Reserve Bourbon', keywords: ['woodford reserve'], fallbackPerOz: 1.33 },
    { match: ['southern comfort'], label: 'Southern Comfort', keywords: ['southern comfort'], fallbackPerOz: 0.68 },
    { match: ['yukon'], label: 'Yukon Jack', keywords: ['yukon jack'], fallbackPerOz: 0.53 },
    { match: ['black velvet'], label: 'Black Velvet Whiskey', keywords: ['black velvet'], fallbackPerOz: 0.34 },
    { match: ['sunny brook', 'sunny brooks'], label: 'Sunny Brook Whiskey', keywords: ['sunny brook'], fallbackPerOz: 0.24 },
    { match: ['fireball'], label: 'Fireball Cinnamon Whisky', keywords: ['fireball'], fallbackPerOz: 0.53 },
    { match: ['amaretto'], label: 'Disaronno Amaretto', keywords: ['disaronno', 'amaretto'], fallbackPerOz: 0.83 },
    { match: ['baileys'], label: 'Baileys Irish Cream', keywords: ['baileys'], fallbackPerOz: 0.98 },
    { match: ['kahlua'], label: 'Kahlua', keywords: ['kahlua'], fallbackPerOz: 0.53 },
    { match: ['rumchata'], label: 'Rumchata', keywords: ['rumchata'], fallbackPerOz: 0.83 },
    { match: ['blue curacao'], label: 'Blue Curacao', keywords: ['blue curacao'], fallbackPerOz: 0.31 },
    { match: ['triple sec'], label: 'Triple Sec', keywords: ['triple sec'], fallbackPerOz: 0.22 },
    { match: ['peach'], label: 'Peach Schnapps', keywords: ['peach schnapps'], fallbackPerOz: 0.30 },
    { match: ['peppermint'], label: 'Peppermint Schnapps', keywords: ['peppermint schnapps'], fallbackPerOz: 0.83 },
    { match: ['mixed berry'], label: 'Mixed Berry Schnapps', keywords: ['mixed berry schnapps'], fallbackPerOz: 0.30 },
    { match: ['pucker', 'apple pucker', 'watermelon pucker'], label: 'Schnapps/Pucker', keywords: ['mixed berry schnapps', 'peach schnapps'], fallbackPerOz: 0.38 },
  ];

  for (const mapping of mappings) {
    if (mapping.match.some((term) => name.includes(normalize(term)))) {
      return { label: mapping.label, keywords: mapping.keywords, fallbackPerOz: mapping.fallbackPerOz };
    }
  }
  return { label: 'Well Liquor', keywords: ['hawkeye vodka', 'bacardi superior', 'jose cuervo'], fallbackPerOz: 0.45 };
}

function buildFoodRecipeIngredients(recipe: Recipe, skus: SkuCatalogItem[]): IngredientDraft[] {
  const recipeId = recipe.id;
  const name = normalize(recipe.name);

  if (name.includes('boneless wing')) {
    return [
      ingredient(skus, recipeId, 'Boneless Chicken Portion', 10, 'oz', 0.2600, 85, ['chicken tender'], 'meat'),
      ingredient(skus, recipeId, 'All-Purpose Breading', 2, 'oz', 0.1130, 100, ['breading all purpose'], 'bread'),
      ingredient(skus, recipeId, 'Buffalo Wing Sauce', 3, 'oz', 0.1659, 100, ['sauce buffalo wing'], 'meat'),
      ingredient(skus, recipeId, 'Fryer Oil Absorption', 1, 'oz', 0.0900, 100, ['oil soy clear fry'], 'dry_goods'),
      ingredient(skus, recipeId, 'Ranch Portion', 1, 'each', 0.1800, 100, ['mix dressing ranch'], 'dry_goods'),
    ];
  }

  if (name.includes('cheese ball')) {
    return [
      ingredient(skus, recipeId, 'Breaded Mozzarella/Cheese Ball Portion', 7, 'oz', 0.2700, 100, ['appetizer cheesestick mozzarella'], 'dairy'),
      ingredient(skus, recipeId, 'Fryer Oil Absorption', 1, 'oz', 0.0900, 100, ['oil soy clear fry'], 'dry_goods'),
      ingredient(skus, recipeId, 'Marinara/Pizza Sauce Cup', 2, 'oz', 0.0850, 100, ['sauce pizza'], 'produce'),
    ];
  }

  if (name.includes('onion ring')) {
    return [
      ingredient(skus, recipeId, 'Breaded Onion Rings', 8, 'oz', 0.2050, 100, ['onion yellow', 'breading all purpose'], undefined),
      ingredient(skus, recipeId, 'Fryer Oil Absorption', 1, 'oz', 0.0900, 100, ['oil soy clear fry'], 'dry_goods'),
      ingredient(skus, recipeId, 'Ranch Portion', 1, 'each', 0.1400, 100, ['mix dressing ranch'], 'dry_goods'),
    ];
  }

  if (name.includes('funnel')) {
    return [
      ingredient(skus, recipeId, 'Funnel Cake Fries', 12, 'each', 0.1249, 100, ['funnel cake fries'], 'frozen'),
      ingredient(skus, recipeId, 'Powdered Sugar / Finishing', 1, 'each', 0.0500, 100, [], undefined),
      ingredient(skus, recipeId, 'Fryer Oil Absorption', 1, 'oz', 0.0900, 100, ['oil soy clear fry'], 'dry_goods'),
    ];
  }

  if (name.includes('hamburger')) {
    return [
      ingredient(skus, recipeId, '80/20 Beef Patty 5.33 oz', 1, 'each', 2.2064, 92, ['beef patty 3-1'], 'meat'),
      ingredient(skus, recipeId, 'Brioche Hamburger Bun', 1, 'each', 0.6335, 100, ['bun hamburger brioche'], 'meat'),
      ingredient(skus, recipeId, 'Shredded Lettuce', 1, 'oz', 0.0983, 100, ['lettuce iceberg'], 'produce'),
      ingredient(skus, recipeId, 'Tomato Slices', 2, 'each', 0.0800, 100, ['tomato round red'], 'produce'),
      ingredient(skus, recipeId, 'Yellow Onion Slices', 1, 'oz', 0.0520, 100, ['onion yellow'], 'produce'),
      ingredient(skus, recipeId, 'Pickle Slices', 1, 'oz', 0.1150, 100, ['pickle dill'], 'dry_goods'),
      ingredient(skus, recipeId, 'French Fry Side', 5, 'oz', 0.1122, 100, ['fries straight cut'], 'frozen'),
    ];
  }

  if (name.includes('smoked iowa chop') || name.includes('iowa chop')) {
    return [
      ingredient(skus, recipeId, 'Smoked Iowa Pork Chop', 1, 'each', 6.5000, 90, [], undefined, 'Manual estimate: no pork chop SKU in current catalog.'),
      ingredient(skus, recipeId, 'Au Jus / Seasoning', 1, 'oz', 0.1200, 100, ['gravy mix au jus'], 'dry_goods'),
      ingredient(skus, recipeId, 'French Fry Side', 5, 'oz', 0.1122, 100, ['fries straight cut'], 'frozen'),
    ];
  }

  if (name.includes('cheese pizza')) {
    return [
      ingredient(skus, recipeId, 'Pizza Dough / Flour Portion', 1, 'each', 0.6500, 100, ['flour high gluten'], 'dry_goods'),
      ingredient(skus, recipeId, 'Mozzarella Cheese', 12, 'oz', 0.1800, 100, ['cheese mozzarella'], 'dairy', 'Manual per-ounce cheese cost used because live mozzarella invoice row appears to store unit price rather than full case price.'),
      ingredient(skus, recipeId, 'Pizza Sauce', 6, 'oz', 0.0800, 100, ['sauce pizza'], 'produce'),
      ingredient(skus, recipeId, 'Parmesan/Oregano Finish', 0.5, 'oz', 0.1600, 100, ['cheese parmesan', 'oregano'], undefined),
      ingredient(skus, recipeId, 'Pizza Box', 1, 'each', 0.6404, 100, ['box pizza 16'], 'supplies'),
      ingredient(skus, recipeId, 'Pizza Circle/Liner', 1, 'each', 0.3510, 100, ['pizza circle 16'], 'supplies'),
    ];
  }

  if (name.includes('tenderloin')) {
    return [
      ingredient(skus, recipeId, 'Breaded Pork Tenderloin', 1, 'each', 4.3500, 88, [], undefined, 'Manual estimate: no pork tenderloin SKU in current catalog.'),
      ingredient(skus, recipeId, 'Brioche Hamburger Bun', 1, 'each', 0.6335, 100, ['bun hamburger brioche'], 'meat'),
      ingredient(skus, recipeId, 'Lettuce/Tomato/Onion Garnish', 1, 'each', 0.2800, 100, ['lettuce iceberg', 'tomato round red', 'onion yellow'], undefined),
      ingredient(skus, recipeId, 'French Fry Side', 5, 'oz', 0.1122, 100, ['fries straight cut'], 'frozen'),
    ];
  }

  if (name.includes('french fries') || name === 'fries') {
    return [
      ingredient(skus, recipeId, 'Straight Cut Fries', 8, 'oz', 0.1122, 100, ['fries straight cut'], 'frozen'),
      ingredient(skus, recipeId, 'Fryer Oil Absorption', 1, 'oz', 0.0900, 100, ['oil soy clear fry'], 'dry_goods'),
      ingredient(skus, recipeId, 'Seasoning/Salt', 1, 'each', 0.0300, 100, [], undefined),
    ];
  }

  return [
    ingredient(skus, recipeId, `${recipe.name} estimated food ingredient cost`, 1, 'portion', Math.max(1.5, Number.parseFloat(recipe.menuPrice || '0') * 0.30), 100, [], undefined, 'Fallback target food cost estimate pending recipe-card validation.'),
  ];
}

function buildBeerOrWineIngredients(recipe: Recipe, skus: SkuCatalogItem[]): IngredientDraft[] {
  const name = normalize(recipe.name);
  const quantityMatch = recipe.name.match(/\((\d+)\)/);
  const bucketMultiplier = name.includes('bucket') ? 6 : 1;
  const pourOz = name.includes('draft') ? 10 : name.includes('wine') || name.includes('zinfandel') ? 5 : 12;
  const count = quantityMatch ? Number.parseInt(quantityMatch[1], 10) : bucketMultiplier;
  const displayName = name.includes('wine') || name.includes('zinfandel') ? 'Wine Pour' : name.includes('draft') ? 'Draft Beer Pour' : 'Packaged Beer Unit';
  const costPerServing = name.includes('wine') || name.includes('zinfandel') ? 0.8862 : name.includes('draft') ? 0.0750 * pourOz : 1.1500;
  return [
    ingredient(
      skus,
      recipe.id,
      displayName,
      count,
      count > 1 ? 'each' : 'serving',
      costPerServing,
      100,
      [],
      undefined,
      'Manual beer/wine cost estimate because current active SKU catalog does not include beer or wine package SKUs.',
    ),
  ];
}

function buildDrinkRecipeIngredients(recipe: Recipe, skus: SkuCatalogItem[]): IngredientDraft[] {
  const name = normalize(recipe.name);
  const ingredients: IngredientDraft[] = [];

  if (
    name.includes('bottle') ||
    name.includes('bucket') ||
    name.includes('draft') ||
    name.includes('can') ||
    name.includes('beer') ||
    name.includes('zinfandel') ||
    name.includes('cabernet') ||
    name.includes('chardonnay') ||
    name.includes('merlot') ||
    recipe.subcategory === 'beer_bottle_can' ||
    recipe.subcategory === 'draft_beer' ||
    recipe.subcategory === 'bucket' ||
    recipe.subcategory === 'wine'
  ) {
    return buildBeerOrWineIngredients(recipe, skus);
  }

  if (name.includes('bloody mary')) {
    const base = baseLiquorForRecipe(recipe.name);
    ingredients.push(liquorIngredient(skus, recipe.id, base.label, base.keywords, 1.5, base.fallbackPerOz));
    ingredients.push(mixerIngredient(skus, recipe.id, 'Bloody Mary Mix', name.includes('absolut bloody mary') || name.includes('titos bloody mary') ? 8 : 4));
    ingredients.push(mixerIngredient(skus, recipe.id, 'Pickle/Spicy Pickle Garnish', 1));
    return ingredients;
  }

  if (name.includes('moscow mule')) {
    const base = baseLiquorForRecipe(recipe.name);
    ingredients.push(liquorIngredient(skus, recipe.id, base.label, base.keywords, 1.5, base.fallbackPerOz));
    ingredients.push(mixerIngredient(skus, recipe.id, 'Ginger Beer', 6));
    ingredients.push(mixerIngredient(skus, recipe.id, 'Lime Juice', 0.5));
    return ingredients;
  }

  if (name.includes('margarita')) {
    const base = baseLiquorForRecipe(recipe.name);
    ingredients.push(liquorIngredient(skus, recipe.id, base.label, base.keywords, 1.5, base.fallbackPerOz));
    ingredients.push(liquorIngredient(skus, recipe.id, 'Triple Sec', ['triple sec'], 0.5, 0.22));
    ingredients.push(mixerIngredient(skus, recipe.id, 'Margarita Mix', 4));
    ingredients.push(mixerIngredient(skus, recipe.id, 'Lemon/Lime Garnish', 1));
    return ingredients;
  }

  if (name.includes('tequila sunrise')) {
    const base = baseLiquorForRecipe(recipe.name);
    ingredients.push(liquorIngredient(skus, recipe.id, base.label, base.keywords, 1.5, base.fallbackPerOz));
    ingredients.push(mixerIngredient(skus, recipe.id, 'Orange Juice', 4));
    ingredients.push(mixerIngredient(skus, recipe.id, 'Grenadine', 0.5));
    return ingredients;
  }

  if (name.includes('white russian')) {
    const base = baseLiquorForRecipe(recipe.name);
    ingredients.push(liquorIngredient(skus, recipe.id, base.label, base.keywords, 1.5, base.fallbackPerOz));
    ingredients.push(liquorIngredient(skus, recipe.id, 'Kahlua', ['kahlua'], 1, 0.53));
    ingredients.push(mixerIngredient(skus, recipe.id, 'Milk (2%)', 2));
    return ingredients;
  }

  const base = baseLiquorForRecipe(recipe.name);
  ingredients.push(liquorIngredient(skus, recipe.id, base.label, base.keywords, 1.5, base.fallbackPerOz));

  if (name.includes('tonic')) {
    ingredients.push(mixerIngredient(skus, recipe.id, 'Tonic Water', 6));
  } else if (name.includes('orange juice')) {
    ingredients.push(mixerIngredient(skus, recipe.id, 'Orange Juice', 6));
  } else if (name.includes('cranberry')) {
    ingredients.push(mixerIngredient(skus, recipe.id, 'Cranberry Juice', 6));
  } else if (name.includes('milk')) {
    ingredients.push(mixerIngredient(skus, recipe.id, 'Milk (2%)', 6));
  } else if (name.includes('coffee')) {
    ingredients.push(mixerIngredient(skus, recipe.id, 'Coffee', 6));
  } else if (name.includes('fountain') || name.includes('soda')) {
    ingredients.push(mixerIngredient(skus, recipe.id, 'Fountain Soda', 6));
  }

  return ingredients;
}

function buildIngredientsForRecipe(recipe: Recipe, skus: SkuCatalogItem[]): IngredientDraft[] {
  if (normalize(recipe.category) === 'drink') return buildDrinkRecipeIngredients(recipe, skus);
  return buildFoodRecipeIngredients(recipe, skus);
}

function totalCost(ingredients: IngredientDraft[]) {
  return ingredients.reduce((sum, ingredientRow) => sum + (numberFromDecimal(ingredientRow.totalCost as string) || 0), 0);
}

function recipeMatchesMenuItem(recipe: Recipe, menuItem: MenuItem) {
  const recipeName = normalize(recipe.name);
  const itemName = normalize(menuItem.posItemName);
  return itemName === recipeName || itemName.includes(recipeName) || recipeName.includes(itemName);
}

async function recalculateLinkedMenuItems(allRecipes: Recipe[], allMenuItems: MenuItem[]) {
  let count = 0;
  for (const item of allMenuItems) {
    if (item.recipeId) {
      await recalculateMenuItemMargin(item.id);
      count += 1;
    }
  }

  // Safety net: if menu items are already linked in future environments, they were handled above.
  // This script intentionally does not auto-link menu items by fuzzy name to avoid changing POS mappings without review.
  void allRecipes.some((recipe) => allMenuItems.some((item) => recipeMatchesMenuItem(recipe, item)));
  return count;
}

export async function seedRecipeIngredients(options: SeedRecipeIngredientsOptions = {}): Promise<SeedRecipeIngredientsResult> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const dryRun = options.dryRun ?? false;
  const refreshExisting = options.refreshExisting ?? false;
  const shouldRecalculate = options.recalculate ?? true;

  const allRecipes = await db.select().from(recipes).where(eq(recipes.isActive, true));
  const allSkus = await db.select().from(skuCatalog).where(eq(skuCatalog.isActive, true));
  const allMenuItems = await db.select().from(menuItems).where(eq(menuItems.isActive, true));
  const existingIngredients = await db.select().from(recipeIngredients);

  const existingByRecipeId = new Map<number, number>();
  for (const existing of existingIngredients) {
    existingByRecipeId.set(existing.recipeId, (existingByRecipeId.get(existing.recipeId) || 0) + 1);
  }

  const details: RecipeSeedDetail[] = [];
  const rowsToInsert: IngredientDraft[] = [];
  const recipeIdsToRecalculate: number[] = [];
  let recipesSkippedExisting = 0;
  let recipesWithoutMapping = 0;

  for (const recipe of allRecipes) {
    const existingCount = existingByRecipeId.get(recipe.id) || 0;
    if (existingCount > 0 && !refreshExisting) {
      recipesSkippedExisting += 1;
      details.push({
        recipeId: recipe.id,
        recipeName: recipe.name,
        category: recipe.category,
        action: 'skipped_existing',
        ingredientCount: existingCount,
        theoreticalCost: recipe.theoreticalCost || '0.0000',
        ingredientNames: [],
      });
      continue;
    }

    const ingredients = buildIngredientsForRecipe(recipe, allSkus);
    if (ingredients.length === 0) {
      recipesWithoutMapping += 1;
      details.push({
        recipeId: recipe.id,
        recipeName: recipe.name,
        category: recipe.category,
        action: 'no_mapping',
        ingredientCount: 0,
        theoreticalCost: '0.0000',
        ingredientNames: [],
      });
      continue;
    }

    rowsToInsert.push(...ingredients);
    recipeIdsToRecalculate.push(recipe.id);
    details.push({
      recipeId: recipe.id,
      recipeName: recipe.name,
      category: recipe.category,
      action: dryRun ? 'dry_run' : 'seeded',
      ingredientCount: ingredients.length,
      theoreticalCost: money4(totalCost(ingredients)),
      ingredientNames: ingredients.map((row) => row.ingredientName),
    });
  }

  let inserted = 0;
  let recalculated = 0;
  let menuRecalculated = 0;

  if (!dryRun) {
    if (refreshExisting) {
      for (const recipe of allRecipes) {
        await db.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, recipe.id));
      }
    }

    for (let i = 0; i < rowsToInsert.length; i += 50) {
      const chunk = rowsToInsert.slice(i, i + 50);
      if (chunk.length > 0) {
        await db.insert(recipeIngredients).values(chunk);
        inserted += chunk.length;
      }
    }

    if (shouldRecalculate) {
      for (const recipeId of recipeIdsToRecalculate) {
        await recalculateRecipeCost(recipeId);
        recalculated += 1;
      }
      menuRecalculated = await recalculateLinkedMenuItems(allRecipes, allMenuItems);
    }
  }

  return {
    dryRun,
    refreshExisting,
    recipeCount: allRecipes.length,
    skuCount: allSkus.length,
    existingIngredientRows: existingIngredients.length,
    recipesAlreadyCosted: allRecipes.filter((recipe) => Number.parseFloat(recipe.theoreticalCost || '0') > 0).length,
    recipesSeeded: recipeIdsToRecalculate.length,
    recipesSkippedExisting,
    recipesWithoutMapping,
    ingredientRowsPrepared: rowsToInsert.length,
    ingredientRowsInserted: inserted,
    recipesRecalculated: recalculated,
    linkedMenuItemsRecalculated: menuRecalculated,
    details,
    methodology: [
      'Recipe rows are read from the live database and matched to the active SKU catalog by normalized product-name keywords.',
      'Exact SKU links are preserved where the current catalog contains a matching liquor, dairy, meat, produce, bread, frozen, dry goods, or supplies item.',
      'When no exact SKU exists, the ingredient remains linked to the recipe with a manual restaurant-standard estimate and an explanatory note.',
      'The default mode is idempotent: recipes with existing ingredient rows are skipped unless refreshExisting is explicitly true.',
      'After insert, recalculateRecipeCost() is called for every newly seeded recipe; recalculateMenuItemMargin() is called only for menu items that already have recipeId links.',
      'The script deliberately does not create fuzzy menu item recipe links because POS-to-recipe matching requires owner review before margin-impacting production changes.',
    ],
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dryRun = process.argv.includes('--dry-run');
  const refreshExisting = process.argv.includes('--refresh-existing');
  seedRecipeIngredients({ dryRun, refreshExisting })
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error('[seedRecipeIngredients] Failed:', error);
      process.exit(1);
    });
}
