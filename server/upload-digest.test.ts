import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";

const mockAdminCtx = {
  user: { id: "admin-1", name: "Admin", role: "admin", openId: "admin-open-1" },
  staffId: null,
  req: { headers: { cookie: "" } } as any,
  res: {
    cookie: () => {},
    clearCookie: () => {},
  } as any,
};

const mockUserCtx = {
  user: { id: "user-1", name: "User", role: "user", openId: "user-open-1" },
  staffId: null,
  req: { headers: { cookie: "" } } as any,
  res: {
    cookie: () => {},
    clearCookie: () => {},
  } as any,
};

const mockPublicCtx = {
  user: null,
  staffId: null,
  req: { headers: { cookie: "" } } as any,
  res: {
    cookie: () => {},
    clearCookie: () => {},
  } as any,
};

const caller = appRouter.createCaller;

describe("Upload & Admin Digest Endpoints", () => {
  it("upload.receiptPhoto requires authentication (rejects public)", async () => {
    const publicCaller = caller(mockPublicCtx as any);
    await expect(
      publicCaller.upload.receiptPhoto({
        base64: "dGVzdA==",
        filename: "test.jpg",
        mimeType: "image/jpeg",
        context: "payout",
      })
    ).rejects.toThrow();
  });

  it("admin.dailyPayoutDigest requires admin role (rejects regular user)", async () => {
    const userCaller = caller(mockUserCtx as any);
    await expect(
      userCaller.admin.dailyPayoutDigest()
    ).rejects.toThrow();
  });

  it("admin.dailyPayoutDigest works for admin", async () => {
    const adminCaller = caller(mockAdminCtx as any);
    const result = await adminCaller.admin.dailyPayoutDigest();
    expect(result).toHaveProperty("date");
    expect(result).toHaveProperty("count");
    expect(result).toHaveProperty("totalAmount");
    expect(result).toHaveProperty("flaggedCount");
    expect(typeof result.count).toBe("number");
  });

  it("admin.miscPayoutPatterns returns array", async () => {
    const adminCaller = caller(mockAdminCtx as any);
    const result = await adminCaller.admin.miscPayoutPatterns({ days: 14 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("admin.miscPayoutPatterns requires auth (rejects public)", async () => {
    const publicCaller = caller(mockPublicCtx as any);
    await expect(
      publicCaller.admin.miscPayoutPatterns({ days: 14 })
    ).rejects.toThrow();
  });

  it("admin.payoutTotalsByVendor returns array", async () => {
    const adminCaller = caller(mockAdminCtx as any);
    const result = await adminCaller.admin.payoutTotalsByVendor({ days: 7 });
    expect(Array.isArray(result)).toBe(true);
  });
});
