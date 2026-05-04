/**
 * Auth Flow Security Tests
 * Covers: OAuth user creation, admin/protected procedure access, 
 * staff PIN login security, and new user onboarding.
 */
import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";

// ─── Mock Contexts ────────────────────────────────────────────────────────

function createPublicContext(): TrpcContext {
  return {
    user: null,
    staffId: null,
    req: { protocol: "https", headers: {}, cookies: {} } as TrpcContext["req"],
    res: { clearCookie: () => {}, cookie: () => {} } as TrpcContext["res"],
  };
}

function createAuthenticatedContext(role: "user" | "admin" = "user"): TrpcContext {
  const mockUser: User = {
    id: 1,
    openId: "test-open-id-123",
    name: "Test User",
    email: "test@example.com",
    role,
    loginMethod: "email",
    lastSignedIn: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  return {
    user: mockUser,
    staffId: null,
    req: { protocol: "https", headers: {}, cookies: {} } as TrpcContext["req"],
    res: { clearCookie: () => {}, cookie: () => {} } as TrpcContext["res"],
  };
}

function createStaffContext(staffId: number): TrpcContext {
  return {
    user: null,
    staffId,
    req: { protocol: "https", headers: {}, cookies: {} } as TrpcContext["req"],
    res: { clearCookie: () => {}, cookie: () => {} } as TrpcContext["res"],
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe("Auth Flow — Public vs Protected Access", () => {
  it("PIN login is the only public staff procedure", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    // staff.loginByPin is the only public entry point
    const result = await caller.staff.loginByPin({ pin: "8686" });
    expect(result.success).toBe(true);
  });

  it("staff.list rejects unauthenticated access", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.staff.list()).rejects.toThrow();
  });

  it("staff.active rejects unauthenticated access", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.staff.active()).rejects.toThrow();
  });

  it("protected procedures reject unauthenticated requests", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.staff.create({
      firstName: "Test",
      lastName: "User",
      department: "bar",
      jobRole: "bartender",
    })).rejects.toThrow();
  });

  it("admin procedures reject non-admin users", async () => {
    const ctx = createAuthenticatedContext("user"); // regular user, not admin
    const caller = appRouter.createCaller(ctx);
    await expect(caller.staff.seed()).rejects.toThrow();
  });

  it("admin procedures allow admin users", async () => {
    const ctx = createAuthenticatedContext("admin");
    const caller = appRouter.createCaller(ctx);
    // seedAllData is admin-only — should not throw (may fail on DB but won't throw auth error)
    try {
      await caller.staff.seedAllData();
    } catch (e: any) {
      // Should NOT be a FORBIDDEN error — it's an admin
      expect(e.code).not.toBe("FORBIDDEN");
    }
  });

  it("authenticated user can create new staff", async () => {
    const ctx = createAuthenticatedContext("admin");
    const caller = appRouter.createCaller(ctx);
    // This should succeed (admin can create staff)
    const result = await caller.staff.create({
      firstName: "NewHire",
      lastName: "TestPerson",
      department: "kitchen_line",
      jobRole: "line_cook",
      pin: "9999",
    });
    expect(result).toBeDefined();
  });
});

describe("Auth Flow — Staff PIN Login Security", () => {
  it("valid PIN returns success with safe staff data", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.staff.loginByPin({ pin: "8686" });
    expect(result.success).toBe(true);
    expect(result.staff).toBeDefined();
    expect(result.staff!.firstName).toBe("Mychael");
  });

  it("invalid PIN returns failure without revealing info", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.staff.loginByPin({ pin: "0000" });
    expect(result.success).toBe(false);
    expect(result.staff).toBeNull();
  });

  it("PIN brute-force: empty PIN is rejected", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.staff.loginByPin({ pin: "" });
    expect(result.success).toBe(false);
    expect(result.staff).toBeNull();
  });

  it("PIN login never exposes PIN in response", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.staff.loginByPin({ pin: "8686" });
    if (result.staff) {
      expect(result.staff).not.toHaveProperty("pin");
    }
  });

  it("PIN login never exposes phone/email in response", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.staff.loginByPin({ pin: "8686" });
    if (result.staff) {
      expect(result.staff).not.toHaveProperty("phone");
      expect(result.staff).not.toHaveProperty("email");
    }
  });
});

describe("Auth Flow — Staff Self-Only Data Access", () => {
  it("myVoids requires staff session (rejects unauthenticated)", async () => {
    const ctx = createPublicContext(); // no staffId
    const caller = appRouter.createCaller(ctx);
    await expect(caller.voids.myVoids()).rejects.toThrow("Staff session required");
  });

  it("myPayouts requires staff session (rejects unauthenticated)", async () => {
    const ctx = createPublicContext(); // no staffId
    const caller = appRouter.createCaller(ctx);
    await expect(caller.payouts.myPayouts()).rejects.toThrow("Staff session required");
  });

  it("staff with session can access their own voids", async () => {
    const ctx = createStaffContext(1); // staffId = 1
    const caller = appRouter.createCaller(ctx);
    const result = await caller.voids.myVoids();
    expect(Array.isArray(result)).toBe(true);
  });

  it("staff with session can access their own payouts", async () => {
    const ctx = createStaffContext(1);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.payouts.myPayouts();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("Auth Flow — Department Enum Validation", () => {
  it("rejects invalid department on staff creation", async () => {
    const ctx = createAuthenticatedContext("admin");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.staff.create({
      firstName: "Bad",
      lastName: "Dept",
      department: "invalid_dept" as any,
      jobRole: "line_cook",
    })).rejects.toThrow();
  });

  it("rejects invalid jobRole on staff creation", async () => {
    const ctx = createAuthenticatedContext("admin");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.staff.create({
      firstName: "Bad",
      lastName: "Role",
      department: "bar",
      jobRole: "invalid_role" as any,
    })).rejects.toThrow();
  });

  it("accepts all valid departments (requires staff session)", async () => {
    const validDepts = ["bar", "dining_room", "kitchen_line", "pizza_side", "driver", "dishwasher", "management"] as const;
    const ctx = createStaffContext(1);
    const caller = appRouter.createCaller(ctx);
    
    for (const dept of validDepts) {
      const result = await caller.staff.byDepartment({ department: dept });
      expect(Array.isArray(result)).toBe(true);
    }
  });
});
