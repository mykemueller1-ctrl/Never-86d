import { describe, it, expect } from "vitest";

/**
 * Price Tracking & Week-over-Week Delta Tests
 *
 * Tests the logic that:
 * 1. scanForPriceChanges flags 5%+ price moves
 * 2. Week-over-week delta calculation is correct
 * 3. Price comparison from invoice history works
 * 4. Price alert notification priority classification
 * 5. Cross-vendor comparison sorts by price
 */

// ---- Price change detection logic (mirrors scanForPriceChanges) ----
function detectPriceChange(current: number, previous: number): { flagged: boolean; changePct: number; direction: 'up' | 'down' | 'stable' } {
  if (previous === 0) return { flagged: false, changePct: 0, direction: 'stable' };
  const changePct = ((current - previous) / previous) * 100;
  return {
    flagged: Math.abs(changePct) >= 5,
    changePct: Math.round(Math.abs(changePct) * 100) / 100,
    direction: changePct > 0 ? 'up' : changePct < 0 ? 'down' : 'stable',
  };
}

// ---- Week-over-week delta logic (mirrors getWeekOverWeekPriceDeltas) ----
function computeWoWDelta(currentWeekPrices: number[], priorWeekPrices: number[], fallbackPrice: number): {
  currentWeekAvg: number;
  priorWeekAvg: number;
  delta: number;
  deltaPct: number;
  direction: 'up' | 'down' | 'stable';
} {
  const currentAvg = currentWeekPrices.length > 0
    ? currentWeekPrices.reduce((a, b) => a + b, 0) / currentWeekPrices.length
    : fallbackPrice;
  const priorAvg = priorWeekPrices.length > 0
    ? priorWeekPrices.reduce((a, b) => a + b, 0) / priorWeekPrices.length
    : 0;

  const delta = currentAvg - priorAvg;
  const deltaPct = priorAvg > 0 ? (delta / priorAvg) * 100 : 0;

  return {
    currentWeekAvg: Math.round(currentAvg * 100) / 100,
    priorWeekAvg: Math.round(priorAvg * 100) / 100,
    delta: Math.round(delta * 100) / 100,
    deltaPct: Math.round(deltaPct * 10) / 10,
    direction: deltaPct > 2 ? 'up' : deltaPct < -2 ? 'down' : 'stable',
  };
}

// ---- Notification priority classification (mirrors invoice create logic) ----
function classifyPriceAlertPriority(changePercent: number): 'critical' | 'high' {
  return changePercent > 15 ? 'critical' : 'high';
}

// ---- Invoice price extraction logic ----
function extractPricesFromInvoiceItems(items: any[], productName: string): Array<{ price: number; description: string }> {
  const results: Array<{ price: number; description: string }> = [];
  for (const item of items) {
    const desc = (item.description || item.name || "").toLowerCase();
    if (desc.includes(productName.toLowerCase())) {
      const price = parseFloat(item.unitPrice || item.price || "0");
      if (price > 0) {
        results.push({ price, description: desc });
      }
    }
  }
  return results;
}

describe("Price Change Detection (scanForPriceChanges logic)", () => {
  it("flags a 10% price increase", () => {
    const result = detectPriceChange(55.00, 50.00);
    expect(result.flagged).toBe(true);
    expect(result.direction).toBe('up');
    expect(result.changePct).toBe(10);
  });

  it("flags a 10% price decrease", () => {
    const result = detectPriceChange(45.00, 50.00);
    expect(result.flagged).toBe(true);
    expect(result.direction).toBe('down');
    expect(result.changePct).toBe(10);
  });

  it("does not flag a 3% change (under 5% threshold)", () => {
    const result = detectPriceChange(51.50, 50.00);
    expect(result.flagged).toBe(false);
    expect(result.changePct).toBe(3);
  });

  it("flags exactly 5% change", () => {
    const result = detectPriceChange(52.50, 50.00);
    expect(result.flagged).toBe(true);
    expect(result.changePct).toBe(5);
  });

  it("handles zero previous price gracefully", () => {
    const result = detectPriceChange(50.00, 0);
    expect(result.flagged).toBe(false);
    expect(result.direction).toBe('stable');
  });

  it("detects no change as stable", () => {
    const result = detectPriceChange(50.00, 50.00);
    expect(result.flagged).toBe(false);
    expect(result.direction).toBe('stable');
  });
});

describe("Week-over-Week Price Delta Calculation", () => {
  it("computes correct delta for price increase", () => {
    const result = computeWoWDelta([55.00, 56.00], [50.00, 51.00], 0);
    expect(result.currentWeekAvg).toBe(55.5);
    expect(result.priorWeekAvg).toBe(50.5);
    expect(result.direction).toBe('up');
    expect(result.deltaPct).toBeGreaterThan(2);
  });

  it("computes correct delta for price decrease", () => {
    const result = computeWoWDelta([45.00, 44.00], [50.00, 51.00], 0);
    expect(result.currentWeekAvg).toBe(44.5);
    expect(result.priorWeekAvg).toBe(50.5);
    expect(result.direction).toBe('down');
    expect(result.deltaPct).toBeLessThan(-2);
  });

  it("marks stable when delta is within 2%", () => {
    const result = computeWoWDelta([50.50], [50.00], 0);
    expect(result.direction).toBe('stable');
    expect(Math.abs(result.deltaPct)).toBeLessThanOrEqual(2);
  });

  it("uses fallback price when no current week data", () => {
    const result = computeWoWDelta([], [50.00], 55.00);
    expect(result.currentWeekAvg).toBe(55);
    expect(result.priorWeekAvg).toBe(50);
    expect(result.direction).toBe('up');
  });

  it("handles single entry per week", () => {
    const result = computeWoWDelta([60.00], [50.00], 0);
    expect(result.currentWeekAvg).toBe(60);
    expect(result.priorWeekAvg).toBe(50);
    expect(result.delta).toBe(10);
    expect(result.deltaPct).toBe(20);
    expect(result.direction).toBe('up');
  });

  it("returns 0 deltaPct when no prior week data", () => {
    const result = computeWoWDelta([55.00], [], 0);
    expect(result.priorWeekAvg).toBe(0);
    expect(result.deltaPct).toBe(0);
  });
});

describe("Price Alert Priority Classification", () => {
  it("classifies >15% change as critical", () => {
    expect(classifyPriceAlertPriority(20)).toBe('critical');
    expect(classifyPriceAlertPriority(16)).toBe('critical');
  });

  it("classifies <=15% change as high", () => {
    expect(classifyPriceAlertPriority(15)).toBe('high');
    expect(classifyPriceAlertPriority(5)).toBe('high');
    expect(classifyPriceAlertPriority(10)).toBe('high');
  });
});

describe("Invoice Price Extraction", () => {
  it("extracts prices for matching products", () => {
    const items = [
      { description: "Mozzarella 6/5lb", unitPrice: "45.99" },
      { description: "Pepperoni 25lb", unitPrice: "62.50" },
      { description: "Mozzarella Sticks 4lb", unitPrice: "28.00" },
    ];
    const results = extractPricesFromInvoiceItems(items, "mozzarella");
    expect(results).toHaveLength(2);
    expect(results[0].price).toBe(45.99);
    expect(results[1].price).toBe(28.00);
  });

  it("is case-insensitive", () => {
    const items = [
      { description: "BACON 15LB", unitPrice: "62.50" },
    ];
    const results = extractPricesFromInvoiceItems(items, "bacon");
    expect(results).toHaveLength(1);
    expect(results[0].price).toBe(62.50);
  });

  it("skips items with zero or missing price", () => {
    const items = [
      { description: "Cheese Blend", unitPrice: "0" },
      { description: "Cheese Blend", price: "" },
      { name: "Cheese Blend" },
    ];
    const results = extractPricesFromInvoiceItems(items, "cheese");
    expect(results).toHaveLength(0);
  });

  it("handles items using 'name' and 'price' fields", () => {
    const items = [
      { name: "Wing Sauce 1gal", price: "18.50" },
    ];
    const results = extractPricesFromInvoiceItems(items, "wing sauce");
    expect(results).toHaveLength(1);
    expect(results[0].price).toBe(18.50);
  });

  it("returns empty for non-matching product", () => {
    const items = [
      { description: "Mozzarella 6/5lb", unitPrice: "45.99" },
    ];
    const results = extractPricesFromInvoiceItems(items, "pepperoni");
    expect(results).toHaveLength(0);
  });
});

describe("Cross-Vendor Price Sorting", () => {
  it("sorts vendors by price ascending (cheapest first)", () => {
    const vendors = [
      { vendor: "Hughes", price: 48.99 },
      { vendor: "Sawyers", price: 45.50 },
      { vendor: "Fort Dodge", price: 52.00 },
    ];
    const sorted = vendors.sort((a, b) => a.price - b.price);
    expect(sorted[0].vendor).toBe("Sawyers");
    expect(sorted[1].vendor).toBe("Hughes");
    expect(sorted[2].vendor).toBe("Fort Dodge");
  });

  it("identifies best price vendor", () => {
    const vendors = [
      { vendor: "Confluence", price: 38.00 },
      { vendor: "Sawyers", price: 42.00 },
    ];
    const sorted = vendors.sort((a, b) => a.price - b.price);
    expect(sorted[0].vendor).toBe("Confluence");
  });
});
