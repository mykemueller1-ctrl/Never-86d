import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/**
 * Tests for the staff session cookie flow:
 * 1. loginByPin sets a staff_session cookie
 * 2. myVoids/myPayouts use the server-side staffId from the cookie
 * 3. Unauthenticated requests return empty arrays
 * 4. staff.logout clears the cookie
 */

function createMockContext(staffId: number | null = null): TrpcContext & { _cookies: Record<string, any> } {
  const cookies: Record<string, any> = {};
  return {
    user: null,
    staffId,
    req: {
      protocol: "https",
      headers: {},
      cookies: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string) => { delete cookies[name]; },
      cookie: (name: string, value: string, opts: any) => { cookies[name] = { value, opts }; },
    } as TrpcContext["res"],
    _cookies: cookies,
  };
}

describe("Staff Session Cookie Flow", () => {
  it("loginByPin sets a staff_session cookie", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.staff.loginByPin({ pin: "8686" });
    expect(result.success).toBe(true);
    expect(ctx._cookies).toHaveProperty("staff_session");
    expect(ctx._cookies.staff_session.value).toBeTruthy();
    expect(typeof ctx._cookies.staff_session.value).toBe("string");
  });

  it("myVoids rejects when no staff session (security hardened)", async () => {
    const ctx = createMockContext(null); // No staffId
    const caller = appRouter.createCaller(ctx);
    await expect(caller.voids.myVoids()).rejects.toThrow("Staff session required");
  });

  it("myPayouts rejects when no staff session (security hardened)", async () => {
    const ctx = createMockContext(null); // No staffId
    const caller = appRouter.createCaller(ctx);
    await expect(caller.payouts.myPayouts()).rejects.toThrow("Staff session required");
  });

  it("myVoids returns data when staff session is set", async () => {
    // Use staffId 1 (Mychael Mueller) — may or may not have voids
    const ctx = createMockContext(1);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.voids.myVoids();
    expect(Array.isArray(result)).toBe(true);
    // Should not throw, regardless of whether there are voids
  });

  it("myPayouts returns data when staff session is set", async () => {
    const ctx = createMockContext(1);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.payouts.myPayouts();
    expect(Array.isArray(result)).toBe(true);
  });

  it("staff.logout clears the staff_session cookie", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    
    // First login to set the cookie
    await caller.staff.loginByPin({ pin: "8686" });
    expect(ctx._cookies).toHaveProperty("staff_session");
    
    // Now logout to clear it
    const result = await caller.staff.logout();
    expect(result.success).toBe(true);
    expect(ctx._cookies).not.toHaveProperty("staff_session");
  });
});
