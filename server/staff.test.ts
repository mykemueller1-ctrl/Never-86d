import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    staffId: null,
    req: {
      protocol: "https",
      headers: {},
      cookies: {},
      socket: { remoteAddress: "127.0.0.1" },
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as TrpcContext["res"],
  };
}

function createStaffContext(staffId: number): TrpcContext {
  return {
    user: null,
    staffId,
    req: {
      protocol: "https",
      headers: {},
      cookies: {},
      socket: { remoteAddress: "127.0.0.1" },
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as TrpcContext["res"],
  };
}

function createAuthContext(): TrpcContext {
  return {
    user: { id: 1, openId: "test-owner", name: "Test Owner", role: "admin", avatarUrl: null, createdAt: new Date(), updatedAt: new Date() } as any,
    staffId: null,
    req: {
      protocol: "https",
      headers: {},
      cookies: {},
      socket: { remoteAddress: "127.0.0.1" },
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("staff procedures", () => {
  it("staff.list requires authentication (rejects public)", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.staff.list()).rejects.toThrow();
  });

  it("staff.list returns an array when authenticated via staff session", async () => {
    const ctx = createStaffContext(1);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.staff.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("staff.active requires authentication (rejects public)", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.staff.active()).rejects.toThrow();
  });

  it("staff.active returns only active staff when authenticated", async () => {
    const ctx = createStaffContext(1);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.staff.active();
    expect(Array.isArray(result)).toBe(true);
    for (const s of result) {
      expect(s.status).toBe("active");
    }
  });

  it("staff.loginByPin returns success for valid PIN", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    // PIN 8686 is Mychael Mueller (owner) from seed data
    const result = await caller.staff.loginByPin({ pin: "8686" });
    expect(result.success).toBe(true);
    expect(result.staff).not.toBeNull();
    if (result.staff) {
      expect(result.staff.firstName).toBe("Mychael");
      expect(result.staff.lastName).toBe("Mueller");
      expect(result.staff.department).toBe("management");
      expect(result.staff.jobRole).toBe("owner");
    }
  });

  it("staff.loginByPin returns failure for invalid PIN", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.staff.loginByPin({ pin: "0001" });
    expect(result.success).toBe(false);
    expect(result.staff).toBeNull();
  });

  it("staff.leaderboard returns sorted by totalPoints desc", async () => {
    const ctx = createStaffContext(1);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.gamification.leaderboard();
    expect(Array.isArray(result)).toBe(true);
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].totalPoints).toBeGreaterThanOrEqual(result[i].totalPoints);
    }
  });

  it("briefing.latest returns a briefing or undefined", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.briefing.latest();
    // Should have our seeded briefing
    if (result) {
      expect(result.salesYesterday).toBeDefined();
      expect(result.ordersYesterday).toBeDefined();
    }
  });

  it("checklists.list returns seeded checklists", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.checklists.list();
    expect(Array.isArray(result)).toBe(true);
    // We seeded 3 checklists
    expect(result.length).toBeGreaterThanOrEqual(3);
    const names = result.map(c => c.name);
    expect(names).toContain("Pizza Nightly Closing");
    expect(names).toContain("Bar Closing Checklist");
    expect(names).toContain("Opening Checklist");
  });
});
