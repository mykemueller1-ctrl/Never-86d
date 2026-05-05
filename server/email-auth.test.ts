import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";

// Mock all dependencies
vi.mock("./db", () => ({
  getStaffByEmail: vi.fn(),
  registerStaffWithEmail: vi.fn(),
  getStaffByFacebookId: vi.fn(),
  linkFacebookToStaff: vi.fn(),
  updateStaffPassword: vi.fn(),
  updateLastLoginMethod: vi.fn(),
  getStaffByPinInternal: vi.fn(),
  getStaffByIdInternal: vi.fn(),
  logSecurityEvent: vi.fn(),
  getSecurityEvents: vi.fn(),
  getSecurityStats: vi.fn(),
  getRecentLockouts: vi.fn(),
  resolveSecurityEvent: vi.fn(),
  changeStaffPin: vi.fn(),
  getAllStaff: vi.fn().mockResolvedValue([]),
  getStaffByDepartment: vi.fn().mockResolvedValue([]),
  seedStaffData: vi.fn(),
  syncStaffFromDriveData: vi.fn(),
  normalizePhoneNumber: vi.fn((phone: string) => "+1" + phone.replace(/\D/g, "").slice(-10)),
  createPasswordResetToken: vi.fn().mockResolvedValue({ token: "a".repeat(64), expiresAt: new Date() }),
  validateResetToken: vi.fn().mockResolvedValue({ staffId: 1, id: 1 }),
  markResetTokenUsed: vi.fn(),
}));

vi.mock("./rateLimiter", () => ({
  checkPinRateLimit: vi.fn().mockReturnValue({ allowed: true, remaining: 5, message: "" }),
  recordFailedAttempt: vi.fn(),
  recordSuccessfulLogin: vi.fn(),
  resetAttempts: vi.fn(),
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
}));

vi.mock("./achievementEngine", () => ({
  processAchievementEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./_core/context", () => ({
  signStaffSession: vi.fn().mockResolvedValue("mock-jwt-token"),
  STAFF_COOKIE: "ctap_staff_session",
}));

vi.mock("./_core/cookies", () => ({
  getSessionCookieOptions: vi.fn().mockReturnValue({ httpOnly: true, secure: false, sameSite: "lax", path: "/" }),
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("$2a$12$hashedpassword123"),
    compare: vi.fn().mockImplementation((plain: string, hash: string) => {
      if (plain === "correctpass123" && hash === "$2a$12$existinghash") return Promise.resolve(true);
      return Promise.resolve(false);
    }),
  },
}));

vi.mock("jose", () => ({
  SignJWT: vi.fn().mockReturnValue({
    setProtectedHeader: vi.fn().mockReturnThis(),
    setExpirationTime: vi.fn().mockReturnThis(),
    sign: vi.fn().mockResolvedValue("mock-jwt-token"),
  }),
  jwtVerify: vi.fn(),
}));

import { getStaffByEmail, registerStaffWithEmail, getStaffByFacebookId, linkFacebookToStaff } from "./db";

const mockRes = { cookie: vi.fn() };

const createCaller = (ctx: any = {}) =>
  appRouter.createCaller({
    user: ctx.user || null,
    staffId: ctx.staffId || null,
    staffRecord: ctx.staffRecord || null,
    req: ctx.req || { headers: { "user-agent": "test-agent" } },
    resHeaders: ctx.resHeaders || new Headers(),
    res: ctx.res || mockRes,
  });

describe("Email Auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("emailAuth.register", () => {
    it("should register a new staff member with email and password", async () => {
      const caller = createCaller();
      (getStaffByEmail as any).mockResolvedValue(null);
      (registerStaffWithEmail as any).mockResolvedValue(42);

      const result = await caller.emailAuth.register({
        firstName: "John",
        lastName: "Smith",
        email: "john@example.com",
        phone: "5155550123",
        password: "securepass123",
        department: "kitchen_line",
        jobRole: "line_cook",
      });

      expect(result.success).toBe(true);
      expect(result.staffId).toBe(42);
      expect(registerStaffWithEmail).toHaveBeenCalled();
    });

    it("should reject registration with existing email", async () => {
      const caller = createCaller();
      (getStaffByEmail as any).mockResolvedValue({
        id: 1,
        email: "john@example.com",
      });

      await expect(
        caller.emailAuth.register({
          firstName: "John",
          lastName: "Smith",
          email: "john@example.com",
          password: "securepass123",
          department: "kitchen_line",
          jobRole: "line_cook",
        })
      ).rejects.toThrow();
    });

    it("should reject registration with short password (< 8 chars)", async () => {
      const caller = createCaller();

      await expect(
        caller.emailAuth.register({
          firstName: "John",
          lastName: "Smith",
          email: "john@example.com",
          password: "short",
          department: "kitchen_line",
          jobRole: "line_cook",
        })
      ).rejects.toThrow();
    });
  });

  describe("emailAuth.login", () => {
    it("should login with valid email and password", async () => {
      const caller = createCaller();
      (getStaffByEmail as any).mockResolvedValue({
        id: 1,
        firstName: "John",
        lastName: "Smith",
        email: "john@example.com",
        passwordHash: "$2a$12$existinghash",
        department: "kitchen_line",
        jobRole: "line_cook",
        status: "active",
        pin: "1234",
        phone: "5155550123",
        facebookAccessToken: null,
        facebookId: null,
      });

      const result = await caller.emailAuth.login({
        email: "john@example.com",
        password: "correctpass123",
      });

      expect(result.success).toBe(true);
      expect(result.staff).toBeTruthy();
      expect(result.staff!.firstName).toBe("John");
    });

    it("should reject login with wrong password", async () => {
      const caller = createCaller();
      (getStaffByEmail as any).mockResolvedValue({
        id: 1,
        firstName: "John",
        lastName: "Smith",
        email: "john@example.com",
        passwordHash: "$2a$12$existinghash",
        department: "kitchen_line",
        jobRole: "line_cook",
        status: "active",
      });

      const result = await caller.emailAuth.login({
        email: "john@example.com",
        password: "wrongpassword",
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("Invalid");
    });

    it("should reject login with non-existent email", async () => {
      const caller = createCaller();
      (getStaffByEmail as any).mockResolvedValue(null);

      const result = await caller.emailAuth.login({
        email: "nobody@example.com",
        password: "anypassword",
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("Invalid");
    });
  });

  describe("emailAuth.facebookLogin", () => {
    it("should login existing user with Facebook ID", async () => {
      const caller = createCaller();
      (getStaffByFacebookId as any).mockResolvedValue({
        id: 1,
        firstName: "John",
        lastName: "Smith",
        facebookId: "fb-123456",
        department: "bar",
        jobRole: "bartender",
        status: "active",
        pin: "1234",
        phone: "5155550123",
        email: "john@example.com",
        passwordHash: null,
        facebookAccessToken: "old-token",
      });

      const result = await caller.emailAuth.facebookLogin({
        facebookId: "fb-123456",
        accessToken: "token-abc",
        email: "john@facebook.com",
        name: "John Smith",
      });

      expect(result.success).toBe(true);
      expect(result.staff).toBeTruthy();
    });

    it("should return needsRegistration for unknown Facebook user without email match", async () => {
      const caller = createCaller();
      (getStaffByFacebookId as any).mockResolvedValue(null);
      (getStaffByEmail as any).mockResolvedValue(null);

      const result = await caller.emailAuth.facebookLogin({
        facebookId: "fb-789",
        accessToken: "token-xyz",
        email: "jane@facebook.com",
        name: "Jane Doe",
      });

      expect(result.success).toBe(false);
      expect(result.needsRegistration).toBe(true);
    });

    it("should link Facebook to existing email account", async () => {
      const caller = createCaller();
      (getStaffByFacebookId as any)
        .mockResolvedValueOnce(null)  // First call: not found by FB ID
        .mockResolvedValueOnce({      // Second call: after linking, found
          id: 1,
          firstName: "John",
          lastName: "Smith",
          email: "john@example.com",
          facebookId: "fb-123456",
          department: "bar",
          jobRole: "bartender",
          status: "active",
          pin: "1234",
          phone: "5155550123",
          passwordHash: null,
          facebookAccessToken: "token-abc",
        });
      (getStaffByEmail as any).mockResolvedValue({
        id: 1,
        firstName: "John",
        lastName: "Smith",
        email: "john@example.com",
        department: "bar",
        jobRole: "bartender",
        status: "active",
      });
      (linkFacebookToStaff as any).mockResolvedValue(true);

      const result = await caller.emailAuth.facebookLogin({
        facebookId: "fb-123456",
        accessToken: "token-abc",
        email: "john@example.com",
        name: "John Smith",
      });

      expect(result.success).toBe(true);
      expect(linkFacebookToStaff).toHaveBeenCalled();
    });
  });
});
