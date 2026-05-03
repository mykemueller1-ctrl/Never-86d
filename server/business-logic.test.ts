import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Business logic tests for:
 * 1. Payout authorization enforcement (key employee only)
 * 2. Void alert deduplication (alerts at 3 and 5 only)
 */

// Mock db helpers
vi.mock("./db", () => ({
  getStaffById: vi.fn(),
  createPayout: vi.fn().mockResolvedValue({ insertId: 1 }),
  createVoid: vi.fn().mockResolvedValue({ insertId: 1 }),
  getWeeklyVoidsByStaff: vi.fn(),
  createIssue: vi.fn().mockResolvedValue({ insertId: 1 }),
}));

import { getStaffById, createPayout, createVoid, getWeeklyVoidsByStaff, createIssue } from "./db";

// Simulate the payout authorization logic from routers.ts
async function simulatePayoutCreate(input: {
  staffId: number;
  authorizedById?: number;
  amount: string;
  posPayoutAmount?: string;
}) {
  const discrepancy = input.posPayoutAmount
    ? (parseFloat(input.posPayoutAmount) - parseFloat(input.amount)).toFixed(2)
    : undefined;

  if (!input.authorizedById) {
    throw new Error("Payout requires authorization by a key employee");
  }
  const authorizer = await getStaffById(input.authorizedById);
  if (!authorizer || (!(authorizer as any).isKeyEmployee && !(authorizer as any).canAuthPayouts)) {
    throw new Error("Authorizer is not a key employee — payout rejected");
  }

  let flagReasons: string[] = [];
  if (discrepancy && Math.abs(parseFloat(discrepancy)) > 1) {
    flagReasons.push(`POS/receipt discrepancy: $${discrepancy}`);
  }
  const flagged = flagReasons.length > 0;
  return createPayout({
    staffId: input.staffId,
    authorizedById: input.authorizedById,
    date: new Date(),
    amount: input.amount,
    category: "store_run",
    discrepancy: discrepancy || undefined,
    flagged,
    flagReason: flagReasons.join("; ") || undefined,
  } as any);
}

// Simulate the void creation with alert logic from routers.ts
async function simulateVoidCreate(input: {
  staffId: number;
  type: string;
  amount: string;
  reason: string;
}) {
  const result = await createVoid({
    staffId: input.staffId,
    date: new Date(),
    type: input.type as any,
    amount: input.amount,
    reason: input.reason,
  } as any);

  const weeklyVoids = await getWeeklyVoidsByStaff(input.staffId);
  if ((weeklyVoids as any[]).length === 3 || (weeklyVoids as any[]).length === 5) {
    const staffMember = await getStaffById(input.staffId);
    const name = staffMember ? `${(staffMember as any).firstName} ${(staffMember as any).lastName}` : `Staff #${input.staffId}`;
    const severity = (weeklyVoids as any[]).length >= 5 ? "high" : "medium";
    const label = (weeklyVoids as any[]).length >= 5 ? "URGENT" : "ATTENTION";
    await createIssue({
      reportedById: input.staffId,
      date: new Date(),
      title: `[${label}] Void Alert: ${name} — ${(weeklyVoids as any[]).length} voids this week`,
      description: `${name} has reached ${(weeklyVoids as any[]).length} voids/comps this week.`,
      category: "other",
      priority: severity,
    } as any);
  }
  return result;
}

describe("Payout Authorization Enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects payout when no authorizedById is provided", async () => {
    await expect(
      simulatePayoutCreate({ staffId: 1, amount: "25.00" })
    ).rejects.toThrow("Payout requires authorization by a key employee");
    expect(createPayout).not.toHaveBeenCalled();
  });

  it("rejects payout when authorizer is not a key employee", async () => {
    (getStaffById as any).mockResolvedValue({
      id: 5,
      firstName: "Jessica",
      lastName: "Gailey",
      isKeyEmployee: false,
      canAuthPayouts: false,
    });

    await expect(
      simulatePayoutCreate({ staffId: 1, authorizedById: 5, amount: "25.00" })
    ).rejects.toThrow("Authorizer is not a key employee");
    expect(createPayout).not.toHaveBeenCalled();
  });

  it("allows payout when authorizer is a key employee", async () => {
    (getStaffById as any).mockResolvedValue({
      id: 3,
      firstName: "Gavin",
      lastName: "Thomas",
      isKeyEmployee: true,
      canAuthPayouts: true,
    });

    await simulatePayoutCreate({ staffId: 1, authorizedById: 3, amount: "25.00" });
    expect(createPayout).toHaveBeenCalledTimes(1);
  });

  it("allows payout but flags POS discrepancy", async () => {
    (getStaffById as any).mockResolvedValue({
      id: 3,
      firstName: "Gavin",
      lastName: "Thomas",
      isKeyEmployee: true,
      canAuthPayouts: true,
    });

    await simulatePayoutCreate({
      staffId: 1,
      authorizedById: 3,
      amount: "25.00",
      posPayoutAmount: "30.00",
    });
    expect(createPayout).toHaveBeenCalledTimes(1);
    const callArgs = (createPayout as any).mock.calls[0][0];
    expect(callArgs.flagged).toBe(true);
    expect(callArgs.flagReason).toContain("POS/receipt discrepancy");
  });

  it("rejects payout when authorizer does not exist in DB", async () => {
    (getStaffById as any).mockResolvedValue(undefined);

    await expect(
      simulatePayoutCreate({ staffId: 1, authorizedById: 999, amount: "25.00" })
    ).rejects.toThrow("Authorizer is not a key employee");
    expect(createPayout).not.toHaveBeenCalled();
  });
});

describe("Void Alert Deduplication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates alert at exactly 3 weekly voids", async () => {
    (getWeeklyVoidsByStaff as any).mockResolvedValue([{}, {}, {}]); // 3 voids
    (getStaffById as any).mockResolvedValue({ firstName: "Test", lastName: "User" });

    await simulateVoidCreate({ staffId: 1, type: "void", amount: "10.00", reason: "wrong item" });

    expect(createIssue).toHaveBeenCalledTimes(1);
    const issueArgs = (createIssue as any).mock.calls[0][0];
    expect(issueArgs.title).toContain("[ATTENTION]");
    expect(issueArgs.priority).toBe("medium");
  });

  it("creates alert at exactly 5 weekly voids with high priority", async () => {
    (getWeeklyVoidsByStaff as any).mockResolvedValue([{}, {}, {}, {}, {}]); // 5 voids
    (getStaffById as any).mockResolvedValue({ firstName: "Test", lastName: "User" });

    await simulateVoidCreate({ staffId: 1, type: "void", amount: "10.00", reason: "wrong item" });

    expect(createIssue).toHaveBeenCalledTimes(1);
    const issueArgs = (createIssue as any).mock.calls[0][0];
    expect(issueArgs.title).toContain("[URGENT]");
    expect(issueArgs.priority).toBe("high");
  });

  it("does NOT create alert at 1, 2, 4, 6+ weekly voids", async () => {
    for (const count of [1, 2, 4, 6, 7]) {
      vi.clearAllMocks();
      (getWeeklyVoidsByStaff as any).mockResolvedValue(Array(count).fill({}));
      (getStaffById as any).mockResolvedValue({ firstName: "Test", lastName: "User" });

      await simulateVoidCreate({ staffId: 1, type: "void", amount: "10.00", reason: "test" });
      expect(createIssue).not.toHaveBeenCalled();
    }
  });

  it("always creates the void even when alert is triggered", async () => {
    (getWeeklyVoidsByStaff as any).mockResolvedValue([{}, {}, {}]); // 3 voids
    (getStaffById as any).mockResolvedValue({ firstName: "Test", lastName: "User" });

    await simulateVoidCreate({ staffId: 1, type: "comp", amount: "15.00", reason: "customer complaint" });

    expect(createVoid).toHaveBeenCalledTimes(1);
    expect(createIssue).toHaveBeenCalledTimes(1);
  });
});
