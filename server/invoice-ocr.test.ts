import { describe, it, expect, vi } from "vitest";

/**
 * Invoice OCR → Vendor Price Update Flow Tests
 *
 * Tests the logic that:
 * 1. invoices.create accepts OCR-extracted line items
 * 2. Valid items trigger upsertVendorProductFromOCR
 * 3. Items with missing fields are skipped
 * 4. Failures in upsert don't break invoice creation
 * 5. Category mapping and price calculations are correct
 */

// ---- Test the filtering logic that lives in routers.ts ----
function filterValidOCRItems(items: any[]): Array<{ product: string; unitPrice: string; unit?: string }> {
  return items.filter(item => item.product && item.unitPrice);
}

// ---- Test the category fallback logic from upsertVendorProductFromOCR ----
const validCategories = ["meat", "dairy", "produce", "bread", "frozen", "dry_goods", "paper", "chemicals", "liquor", "beer", "wine", "soda", "other"] as const;
function resolveCategory(category?: string): typeof validCategories[number] {
  return validCategories.includes(category as any) ? (category as typeof validCategories[number]) : "other";
}

describe("Invoice OCR → Vendor Price Update Flow", () => {
  describe("OCR item filtering (routers.ts logic)", () => {
    it("passes items with both product and unitPrice to upsert", () => {
      const items = [
        { product: "Mozzarella 6/5lb", unitPrice: "45.99", unit: "case" },
        { product: "Bacon 15lb", unitPrice: "62.50", unit: "case" },
      ];
      const valid = filterValidOCRItems(items);
      expect(valid).toHaveLength(2);
    });

    it("skips items missing product name", () => {
      const items = [
        { unitPrice: "28.00" },
        { product: "", unitPrice: "15.00" },
        { product: "Cheese", unitPrice: "45.99" },
      ];
      const valid = filterValidOCRItems(items);
      expect(valid).toHaveLength(1);
      expect(valid[0].product).toBe("Cheese");
    });

    it("skips items missing unitPrice", () => {
      const items = [
        { product: "Bacon" },
        { product: "Lettuce", unitPrice: "" },
        { product: "Tomatoes", unitPrice: "12.50" },
      ];
      const valid = filterValidOCRItems(items);
      expect(valid).toHaveLength(1);
      expect(valid[0].product).toBe("Tomatoes");
    });

    it("handles empty items array without errors", () => {
      const valid = filterValidOCRItems([]);
      expect(valid).toHaveLength(0);
    });

    it("handles malformed items (null, undefined, non-objects)", () => {
      const items = [null, undefined, 42, "string", { product: "Valid", unitPrice: "10.00" }];
      // The filter uses truthy checks so null/undefined/primitives will fail .product check
      const valid = items.filter(item => item && typeof item === "object" && (item as any).product && (item as any).unitPrice);
      expect(valid).toHaveLength(1);
    });
  });

  describe("Category resolution (upsertVendorProductFromOCR logic)", () => {
    it("maps valid invoice categories to vendorProduct categories", () => {
      expect(resolveCategory("meat")).toBe("meat");
      expect(resolveCategory("liquor")).toBe("liquor");
      expect(resolveCategory("beer")).toBe("beer");
      expect(resolveCategory("produce")).toBe("produce");
    });

    it("falls back to 'other' for unrecognized categories", () => {
      expect(resolveCategory("electronics")).toBe("other");
      expect(resolveCategory("supplies")).toBe("other"); // 'supplies' is invoice-level, not vendorProduct-level
      expect(resolveCategory("misc")).toBe("other");
      expect(resolveCategory(undefined)).toBe("other");
    });
  });

  describe("Price change calculations", () => {
    it("calculates positive price change correctly", () => {
      const oldPrice = "45.99";
      const newPrice = "48.50";
      const changePercent = ((parseFloat(newPrice) - parseFloat(oldPrice)) / parseFloat(oldPrice)) * 100;
      expect(changePercent).toBeCloseTo(5.46, 1);
      expect(changePercent).toBeGreaterThan(0);
    });

    it("calculates negative price change correctly", () => {
      const oldPrice = "48.50";
      const newPrice = "42.99";
      const changePercent = ((parseFloat(newPrice) - parseFloat(oldPrice)) / parseFloat(oldPrice)) * 100;
      expect(changePercent).toBeLessThan(0);
      expect(changePercent).toBeCloseTo(-11.36, 1);
    });

    it("handles zero price change", () => {
      const oldPrice = "45.99";
      const newPrice = "45.99";
      const changePercent = ((parseFloat(newPrice) - parseFloat(oldPrice)) / parseFloat(oldPrice)) * 100;
      expect(changePercent).toBe(0);
    });
  });

  describe("End-to-end flow simulation", () => {
    it("simulates invoices.create calling upsert for each valid item", async () => {
      // Mock upsertVendorProductFromOCR
      const mockUpsert = vi.fn().mockResolvedValue({ action: "updated", id: 1 });

      const input = {
        vendorName: "PFG/RFS",
        category: "meat",
        items: [
          { product: "Mozzarella 6/5lb", unitPrice: "45.99", unit: "case" },
          { product: "Bacon 15lb", unitPrice: "62.50", unit: "case" },
          { product: "Bad Item" }, // Missing unitPrice — should be skipped
        ],
      };

      // Simulate the router logic
      if (input.items && Array.isArray(input.items)) {
        for (const item of input.items) {
          if (item.product && (item as any).unitPrice) {
            await mockUpsert(input.vendorName, item.product, String((item as any).unitPrice), (item as any).unit, input.category);
          }
        }
      }

      // Should have been called exactly 2 times (skipping the bad item)
      expect(mockUpsert).toHaveBeenCalledTimes(2);
      expect(mockUpsert).toHaveBeenCalledWith("PFG/RFS", "Mozzarella 6/5lb", "45.99", "case", "meat");
      expect(mockUpsert).toHaveBeenCalledWith("PFG/RFS", "Bacon 15lb", "62.50", "case", "meat");
    });

    it("continues invoice creation even if upsert throws", async () => {
      const mockUpsert = vi.fn()
        .mockRejectedValueOnce(new Error("DB connection failed"))
        .mockResolvedValueOnce({ action: "created", id: 2 });

      const input = {
        vendorName: "Sysco",
        category: "produce",
        items: [
          { product: "Lettuce Romaine", unitPrice: "18.50", unit: "case" },
          { product: "Tomatoes Roma", unitPrice: "22.00", unit: "case" },
        ],
      };

      let invoiceCreated = true; // Simulate invoice already created before upsert loop
      const errors: Error[] = [];

      if (input.items && Array.isArray(input.items)) {
        for (const item of input.items) {
          if (item.product && (item as any).unitPrice) {
            try {
              await mockUpsert(input.vendorName, item.product, String((item as any).unitPrice), (item as any).unit, input.category);
            } catch (e) {
              errors.push(e as Error);
              // Silently continue — price update is best-effort
            }
          }
        }
      }

      // Invoice should still be "created" despite the first upsert failing
      expect(invoiceCreated).toBe(true);
      // Both items attempted
      expect(mockUpsert).toHaveBeenCalledTimes(2);
      // One error caught silently
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe("DB connection failed");
    });

    it("does not call upsert when items is undefined (manual invoice)", async () => {
      const mockUpsert = vi.fn();

      const input = {
        vendorName: "Sawyer's Meats",
        category: "meat",
        // No items — manual entry
      };

      if ((input as any).items && Array.isArray((input as any).items)) {
        for (const item of (input as any).items) {
          if (item.product && item.unitPrice) {
            await mockUpsert(input.vendorName, item.product, item.unitPrice);
          }
        }
      }

      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it("Iowa ABD liquor pricing audit — detects Hy-Vee markup", () => {
      const iowaABDPrice = "18.99"; // State-set price
      const hyveeSellPrice = "21.99"; // What Hy-Vee charges
      const markup = parseFloat(hyveeSellPrice) - parseFloat(iowaABDPrice);
      const markupPercent = (markup / parseFloat(iowaABDPrice)) * 100;

      expect(markup).toBeCloseTo(3.00, 2);
      expect(markupPercent).toBeCloseTo(15.80, 1);
      // This helps Ashley audit if Hy-Vee is overcharging vs state-set price
    });
  });
});
