import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/**
 * Tests for admin operations:
 * 1. archiveInactiveStaff returns a count
 * 2. payoutTotals returns array with category/total/count
 * 3. invoiceTotals returns array with vendorName/total/count
 */

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-admin",
      name: "Test Admin",
      email: "admin@test.com",
      role: "admin",
      loginMethod: "oauth",
      lastSignedIn: new Date(),
      createdAt: new Date(),
    },
    staffId: null,
    req: {
      protocol: "https",
      headers: {},
      cookies: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as TrpcContext["res"],
  };
}

function createProtectedContext(): TrpcContext {
  return {
    user: {
      id: 2,
      openId: "test-user",
      name: "Test User",
      email: "user@test.com",
      role: "user",
      loginMethod: "oauth",
      lastSignedIn: new Date(),
      createdAt: new Date(),
    },
    staffId: null,
    req: {
      protocol: "https",
      headers: {},
      cookies: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    staffId: null,
    req: {
      protocol: "https",
      headers: {},
      cookies: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Admin Operations", () => {
  it("archiveInactive returns a number (admin only)", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.admin.archiveInactive();
    expect(typeof result).toBe("number");
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it("archiveInactive rejects non-admin users", async () => {
    const ctx = createProtectedContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.archiveInactive()).rejects.toThrow();
  });

  it("archiveInactive rejects unauthenticated users", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.archiveInactive()).rejects.toThrow();
  });

  it("payoutTotals returns an array", async () => {
    const ctx = createProtectedContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.admin.payoutTotals({ days: 7 });
    expect(Array.isArray(result)).toBe(true);
    // Each entry should have category, total, count
    for (const entry of result) {
      expect(entry).toHaveProperty("category");
      expect(entry).toHaveProperty("total");
      expect(entry).toHaveProperty("count");
    }
  });

  it("invoiceTotals returns an array", async () => {
    const ctx = createProtectedContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.admin.invoiceTotals({ days: 7 });
    expect(Array.isArray(result)).toBe(true);
    // Each entry should have vendorName, total, count
    for (const entry of result) {
      expect(entry).toHaveProperty("vendorName");
      expect(entry).toHaveProperty("total");
      expect(entry).toHaveProperty("count");
    }
  });

  it("payoutTotals rejects unauthenticated users", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.payoutTotals({ days: 7 })).rejects.toThrow();
  });

  it("invoiceTotals rejects unauthenticated users", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.invoiceTotals({ days: 7 })).rejects.toThrow();
  });

  it("payoutTotalsByVendor returns an array with vendor/total/count", async () => {
    const ctx = createProtectedContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.admin.payoutTotalsByVendor({ days: 7 });
    expect(Array.isArray(result)).toBe(true);
    for (const entry of result) {
      expect(entry).toHaveProperty("vendor");
      expect(entry).toHaveProperty("total");
      expect(entry).toHaveProperty("count");
    }
  });

  it("payoutTotalsByVendor rejects unauthenticated users", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.payoutTotalsByVendor({ days: 7 })).rejects.toThrow();
  });

  it("payoutTotals and invoiceTotals accept custom days parameter", async () => {
    const ctx = createProtectedContext();
    const caller = appRouter.createCaller(ctx);
    const payouts30 = await caller.admin.payoutTotals({ days: 30 });
    const invoices30 = await caller.admin.invoiceTotals({ days: 30 });
    const vendors30 = await caller.admin.payoutTotalsByVendor({ days: 30 });
    expect(Array.isArray(payouts30)).toBe(true);
    expect(Array.isArray(invoices30)).toBe(true);
    expect(Array.isArray(vendors30)).toBe(true);
  });
});
