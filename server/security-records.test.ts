/**
 * Security Records & PIN Change Tests
 * Tests the audit log, PIN change flow, and security event endpoints
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db functions
vi.mock("./db", () => ({
  logSecurityEvent: vi.fn().mockResolvedValue(undefined),
  getSecurityEvents: vi.fn().mockResolvedValue([
    {
      id: 1,
      eventType: "login_success",
      severity: "info",
      staffId: "staff-1",
      staffName: "Mike Mueller",
      ipAddress: "192.168.1.1",
      details: JSON.stringify({ department: "management" }),
      resolved: false,
      resolvedBy: null,
      resolvedAt: null,
      createdAt: new Date("2026-05-04T10:00:00Z"),
    },
    {
      id: 2,
      eventType: "lockout_triggered",
      severity: "critical",
      staffId: null,
      staffName: null,
      ipAddress: "10.0.0.5",
      details: JSON.stringify({ attempts: 5, reason: "max_attempts_exceeded" }),
      resolved: false,
      resolvedBy: null,
      resolvedAt: null,
      createdAt: new Date("2026-05-04T11:00:00Z"),
    },
  ]),
  getSecurityStats: vi.fn().mockResolvedValue({
    totalEvents24h: 42,
    lockouts24h: 2,
    failedLogins24h: 7,
    pinChanges24h: 1,
    criticalEvents24h: 2,
  }),
  getRecentLockouts: vi.fn().mockResolvedValue([
    {
      ipAddress: "10.0.0.5",
      staffName: null,
      createdAt: new Date("2026-05-04T11:00:00Z"),
    },
  ]),
  resolveSecurityEvent: vi.fn().mockResolvedValue(undefined),
  changeStaffPin: vi.fn().mockResolvedValue(true),
  getStaffByPinInternal: vi.fn().mockImplementation(async (pin: string) => {
    if (pin === "1234") {
      return { id: "staff-1", firstName: "Mike", lastName: "Mueller", department: "management", jobRole: "owner", pin: "1234" };
    }
    return null;
  }),
  getStaffByIdInternal: vi.fn().mockResolvedValue({
    id: "staff-1",
    firstName: "Mike",
    lastName: "Mueller",
    department: "management",
    jobRole: "owner",
    pin: "1234",
  }),
}));

// Mock notification
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

// Mock rate limiter
vi.mock("./rateLimiter", () => ({
  checkRateLimit: vi.fn().mockReturnValue({ allowed: true, remainingAttempts: 5, lockedUntil: null }),
  recordFailedAttempt: vi.fn(),
  resetAttempts: vi.fn(),
  cleanupExpired: vi.fn(),
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
}));

// Mock LLM
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: "Test response" } }],
  }),
}));

import { appRouter } from "./routers";

describe("Security Records Endpoints", () => {
  let adminCaller: ReturnType<typeof appRouter.createCaller>;
  let staffCaller: ReturnType<typeof appRouter.createCaller>;
  let unauthCaller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(() => {
    vi.clearAllMocks();

    adminCaller = appRouter.createCaller({
      user: { id: "user-1", name: "Admin", email: "admin@test.com", role: "admin" },
      staffId: "staff-1",
      staffRecord: { id: "staff-1", firstName: "Mike", lastName: "Mueller", jobRole: "owner", department: "management" },
    } as any);

    staffCaller = appRouter.createCaller({
      user: null,
      staffId: "staff-2",
      staffRecord: { id: "staff-2", firstName: "John", lastName: "Doe", jobRole: "cook", department: "kitchen_line" },
    } as any);

    unauthCaller = appRouter.createCaller({
      user: null,
      staffId: null,
      staffRecord: null,
    } as any);
  });

  describe("security.events", () => {
    it("returns security events for admin/manager", async () => {
      const result = await adminCaller.security.events({ limit: 50 });
      expect(result).toHaveLength(2);
      expect(result[0].eventType).toBe("login_success");
      expect(result[1].eventType).toBe("lockout_triggered");
    });

    it("rejects unauthenticated access", async () => {
      await expect(unauthCaller.security.events({ limit: 50 })).rejects.toThrow();
    });
  });

  describe("security.stats", () => {
    it("returns security stats for admin", async () => {
      const result = await adminCaller.security.stats();
      expect(result.totalEvents24h).toBe(42);
      expect(result.lockouts24h).toBe(2);
      expect(result.failedLogins24h).toBe(7);
      expect(result.pinChanges24h).toBe(1);
      expect(result.criticalEvents24h).toBe(2);
    });

    it("rejects unauthenticated access", async () => {
      await expect(unauthCaller.security.stats()).rejects.toThrow();
    });
  });

  describe("security.recentLockouts", () => {
    it("returns recent lockouts for admin", async () => {
      const result = await adminCaller.security.recentLockouts({ hours: 24 });
      expect(result).toHaveLength(1);
      expect(result[0].ipAddress).toBe("10.0.0.5");
    });
  });

  describe("security.resolve", () => {
    it("allows admin to resolve a security event", async () => {
      await adminCaller.security.resolve({ eventId: 2, resolvedBy: "Mike Mueller" });
      const { resolveSecurityEvent } = await import("./db");
      expect(resolveSecurityEvent).toHaveBeenCalledWith(2, "Mike Mueller");
    });

    it("rejects unauthenticated resolve", async () => {
      await expect(unauthCaller.security.resolve({ eventId: 2, resolvedBy: "test" })).rejects.toThrow();
    });
  });
});

describe("PIN Change Endpoint", () => {
  let staffCaller: ReturnType<typeof appRouter.createCaller>;
  let unauthCaller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(() => {
    vi.clearAllMocks();

    staffCaller = appRouter.createCaller({
      user: null,
      staffId: "staff-1",
      staffRecord: { id: "staff-1", firstName: "Mike", lastName: "Mueller", jobRole: "owner", department: "management", pin: "1234" },
    } as any);

    unauthCaller = appRouter.createCaller({
      user: null,
      staffId: null,
      staffRecord: null,
    } as any);
  });

  describe("pinManagement.changePin", () => {
    it("changes PIN when current PIN is correct", async () => {
      const { changeStaffPin } = await import("./db");
      await staffCaller.pinManagement.changePin({ currentPin: "1234", newPin: "5678" });
      expect(changeStaffPin).toHaveBeenCalledWith("staff-1", "5678");
    });

    it("rejects when current PIN is wrong", async () => {
      const { getStaffByPinInternal } = await import("./db");
      (getStaffByPinInternal as any).mockResolvedValueOnce(null);
      await expect(
        staffCaller.pinManagement.changePin({ currentPin: "0000", newPin: "5678" })
      ).rejects.toThrow();
    });

    it("rejects unauthenticated PIN change", async () => {
      await expect(
        unauthCaller.pinManagement.changePin({ currentPin: "1234", newPin: "5678" })
      ).rejects.toThrow();
    });

    it("rejects PIN shorter than 4 digits", async () => {
      await expect(
        staffCaller.pinManagement.changePin({ currentPin: "1234", newPin: "12" })
      ).rejects.toThrow();
    });
  });
});
