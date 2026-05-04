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

describe("Security — PII never exposed in API responses", () => {
  it("staff.list never returns pin field", async () => {
    const ctx = createStaffContext(1);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.staff.list();
    for (const staff of result) {
      expect(staff).not.toHaveProperty("pin");
    }
  });

  it("staff.list never returns phone field", async () => {
    const ctx = createStaffContext(1);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.staff.list();
    for (const staff of result) {
      expect(staff).not.toHaveProperty("phone");
    }
  });

  it("staff.list never returns email field", async () => {
    const ctx = createStaffContext(1);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.staff.list();
    for (const staff of result) {
      expect(staff).not.toHaveProperty("email");
    }
  });

  it("staff.active never returns pin, phone, or email", async () => {
    const ctx = createStaffContext(1);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.staff.active();
    for (const staff of result) {
      expect(staff).not.toHaveProperty("pin");
      expect(staff).not.toHaveProperty("phone");
      expect(staff).not.toHaveProperty("email");
    }
  });

  it("staff.loginByPin response never contains pin", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    // Valid PIN login
    const result = await caller.staff.loginByPin({ pin: "8686" });
    expect(result.success).toBe(true);
    if (result.staff) {
      expect(result.staff).not.toHaveProperty("pin");
    }
  });

  it("staff.loginByPin response never contains phone or email", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.staff.loginByPin({ pin: "8686" });
    expect(result.success).toBe(true);
    if (result.staff) {
      expect(result.staff).not.toHaveProperty("phone");
      expect(result.staff).not.toHaveProperty("email");
    }
  });

  it("failed PIN login does not reveal whether PIN exists", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.staff.loginByPin({ pin: "0000" });
    expect(result.success).toBe(false);
    expect(result.staff).toBeNull();
    // Should not contain any error message that reveals PIN existence
    expect(result).not.toHaveProperty("error");
  });

  it("leaderboard never returns pin, phone, or email", async () => {
    const ctx = createStaffContext(1);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.gamification.leaderboard();
    for (const entry of result) {
      expect(entry).not.toHaveProperty("pin");
      expect(entry).not.toHaveProperty("phone");
      expect(entry).not.toHaveProperty("email");
    }
  });

  it("staff.list returns only safe fields", async () => {
    const ctx = createStaffContext(1);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.staff.list();
    // Sensitive fields that must NEVER appear
    const sensitiveFields = ["pin", "phone", "email"];
    for (const staff of result) {
      const keys = Object.keys(staff);
      for (const key of keys) {
        expect(sensitiveFields).not.toContain(key);
      }
    }
  });

  it("staff.list and staff.active reject unauthenticated access", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.staff.list()).rejects.toThrow();
    await expect(caller.staff.active()).rejects.toThrow();
  });
});
