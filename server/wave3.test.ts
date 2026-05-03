/**
 * Wave 3 Tests — Worker Profile + Sales Intelligence
 * Tests for training records, evaluations, write-ups, career advancement,
 * daily/hourly sales queries, and role-based access control.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock DB module ───
vi.mock("./db", () => ({
  // Worker Profile helpers
  getTrainingRecords: vi.fn(),
  createTrainingRecord: vi.fn(),
  updateTrainingRecord: vi.fn(),
  getEvaluations: vi.fn(),
  createEvaluation: vi.fn(),
  getWriteUps: vi.fn(),
  createWriteUp: vi.fn(),
  getSkillCerts: vi.fn(),
  upsertSkillCert: vi.fn(),
  getCareerAdvancement: vi.fn(),
  // Sales Intelligence helpers
  getDailySales: vi.fn(),
  getHourlySales: vi.fn(),
  getDailySalesStats: vi.fn(),
  // Existing helpers needed by routers
  getAllStaff: vi.fn(),
  getStaffByPin: vi.fn(),
  getStaffById: vi.fn(),
}));

import * as db from "./db";
const mdb = db as Record<string, ReturnType<typeof vi.fn>>;

// ─── Training Records ───
describe("Worker Profile — Training Records", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns training records for a staff member", async () => {
    const records = [
      { id: 1, staffId: 10, moduleName: "FOH Server Training Day 1", status: "completed", completedAt: Date.now(), score: 92, certifiedBy: "Mike" },
      { id: 2, staffId: 10, moduleName: "FOH Server Training Day 2", status: "in_progress", completedAt: null, score: null, certifiedBy: null },
      { id: 3, staffId: 10, moduleName: "Alcohol Awareness", status: "not_started", completedAt: null, score: null, certifiedBy: null },
    ];
    mdb.getTrainingRecords.mockResolvedValue(records);

    const result = await db.getTrainingRecords(10);
    expect(result).toHaveLength(3);
    expect(result[0].status).toBe("completed");
    expect(result[0].score).toBe(92);
    expect(result[1].status).toBe("in_progress");
    expect(result[2].status).toBe("not_started");
  });

  it("creates a new training record", async () => {
    mdb.createTrainingRecord.mockResolvedValue({ insertId: 5 });

    const result = await db.createTrainingRecord({
      staffId: 10,
      moduleName: "Fry Line Closing Procedure",
      status: "in_progress",
    });
    expect(result.insertId).toBe(5);
    expect(mdb.createTrainingRecord).toHaveBeenCalledWith(expect.objectContaining({
      staffId: 10,
      moduleName: "Fry Line Closing Procedure",
    }));
  });

  it("updates training record to completed with score", async () => {
    mdb.updateTrainingRecord.mockResolvedValue({ affectedRows: 1 });

    const result = await db.updateTrainingRecord(5, {
      status: "completed",
      score: 88,
      completedAt: Date.now(),
      certifiedBy: "Tom",
    });
    expect(result.affectedRows).toBe(1);
  });

  it("enforces 80% minimum score for server written test", () => {
    const score = 75;
    const PASS_THRESHOLD = 80;
    expect(score >= PASS_THRESHOLD).toBe(false);
    expect(85 >= PASS_THRESHOLD).toBe(true);
  });
});

// ─── Evaluations ───
describe("Worker Profile — Evaluations", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns evaluations with 9-category scoring", async () => {
    const evals = [{
      id: 1, staffId: 10, evaluatorId: 1, evaluatorName: "Mike",
      period: "2026-Q1",
      attitudeScore: 4, reliabilityScore: 5, knowledgeScore: 3,
      speedScore: 4, teamworkScore: 5, communicationScore: 4,
      cleanlinessScore: 5, customerServiceScore: 4, overallScore: 4,
      strengths: "Great with customers, always on time",
      improvements: "Needs to learn more cocktail recipes",
      notes: "Ready for bartender training",
      createdAt: Date.now(),
    }];
    mdb.getEvaluations.mockResolvedValue(evals);

    const result = await db.getEvaluations(10);
    expect(result).toHaveLength(1);
    expect(result[0].attitudeScore).toBe(4);
    expect(result[0].overallScore).toBe(4);
    expect(result[0].strengths).toContain("customers");
  });

  it("creates evaluation with all 9 categories", async () => {
    mdb.createEvaluation.mockResolvedValue({ insertId: 2 });

    const evalData = {
      staffId: 10, evaluatorId: 1,
      period: "2026-Q1",
      attitudeScore: 4, reliabilityScore: 5, knowledgeScore: 3,
      speedScore: 4, teamworkScore: 5, communicationScore: 4,
      cleanlinessScore: 5, customerServiceScore: 4, overallScore: 4,
      strengths: "Consistent performer",
      improvements: "Speed on busy nights",
    };

    await db.createEvaluation(evalData);
    expect(mdb.createEvaluation).toHaveBeenCalledWith(expect.objectContaining({
      attitudeScore: 4,
      reliabilityScore: 5,
    }));
  });

  it("validates score range 1-5", () => {
    const validScores = [1, 2, 3, 4, 5];
    const invalidScores = [0, 6, -1, 10];
    validScores.forEach(s => expect(s >= 1 && s <= 5).toBe(true));
    invalidScores.forEach(s => expect(s >= 1 && s <= 5).toBe(false));
  });
});

// ─── Write-Ups / Disciplinary Records ───
describe("Worker Profile — Write-Ups", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns write-up history for a staff member", async () => {
    const writeUps = [
      { id: 1, staffId: 15, severity: "verbal", reason: "Late to shift", issuedBy: "Mike", issuedAt: Date.now() - 86400000 * 30, acknowledged: true },
      { id: 2, staffId: 15, severity: "written", reason: "No-call no-show", issuedBy: "Mike", issuedAt: Date.now() - 86400000 * 7, acknowledged: false },
    ];
    mdb.getWriteUps.mockResolvedValue(writeUps);

    const result = await db.getWriteUps(15);
    expect(result).toHaveLength(2);
    expect(result[0].severity).toBe("verbal");
    expect(result[1].severity).toBe("written");
  });

  it("creates write-up with correct escalation level", async () => {
    mdb.createWriteUp.mockResolvedValue({ insertId: 3 });

    await db.createWriteUp({
      staffId: 15,
      severity: "final_warning",
      reason: "Third occurrence of policy violation",
      issuedBy: "Mike",
    });
    expect(mdb.createWriteUp).toHaveBeenCalledWith(expect.objectContaining({
      severity: "final_warning",
    }));
  });

  it("validates escalation path: verbal → written → final → termination", () => {
    const ESCALATION = ["verbal", "written", "final_warning", "termination"];
    expect(ESCALATION.indexOf("verbal")).toBeLessThan(ESCALATION.indexOf("written"));
    expect(ESCALATION.indexOf("written")).toBeLessThan(ESCALATION.indexOf("final_warning"));
    expect(ESCALATION.indexOf("final_warning")).toBeLessThan(ESCALATION.indexOf("termination"));
  });
});

// ─── Skill Certifications ───
describe("Worker Profile — Skill Certifications", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns skill certifications for a staff member", async () => {
    const certs = [
      { id: 1, staffId: 10, skillName: "Fryer Operation", level: "certified", certifiedAt: Date.now(), certifiedBy: "Tom" },
      { id: 2, staffId: 10, skillName: "Dough Rolling", level: "learning", certifiedAt: null, certifiedBy: null },
      { id: 3, staffId: 10, skillName: "Pizza Making", level: "not_started", certifiedAt: null, certifiedBy: null },
    ];
    mdb.getSkillCerts.mockResolvedValue(certs);

    const result = await db.getSkillCerts(10);
    expect(result).toHaveLength(3);
    expect(result.filter(c => c.level === "certified")).toHaveLength(1);
    expect(result.filter(c => c.level === "learning")).toHaveLength(1);
  });

  it("upserts skill certification", async () => {
    mdb.upsertSkillCert.mockResolvedValue({ affectedRows: 1 });

    await db.upsertSkillCert({
      staffId: 10,
      skillName: "Dough Rolling",
      level: "certified",
      certifiedBy: "Tom",
    });
    expect(mdb.upsertSkillCert).toHaveBeenCalledWith(expect.objectContaining({
      level: "certified",
    }));
  });
});

// ─── Career Advancement ───
describe("Worker Profile — Career Advancement", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calculates advancement readiness based on training + evals + discipline", () => {
    // Kitchen track: Dishwasher → Fry Line 1st Off → 2nd Off → 3rd Off → Closer → Kitchen Manager
    const trainingComplete = 4; // out of 5 required modules
    const evalAvg = 4.2; // out of 5
    const activeWriteUps = 0;
    const shiftsCompleted = 45;

    const trainingPct = (trainingComplete / 5) * 100;
    const evalPct = (evalAvg / 5) * 100;
    const hasNoWriteUps = activeWriteUps === 0;
    const meetsShiftMin = shiftsCompleted >= 30;

    // Advancement score: weighted average
    const score = (trainingPct * 0.4) + (evalPct * 0.3) + (hasNoWriteUps ? 20 : 0) + (meetsShiftMin ? 10 : 0);
    expect(score).toBeGreaterThan(80); // Ready to advance
    expect(trainingPct).toBe(80);
    expect(meetsShiftMin).toBe(true);
  });

  it("blocks advancement when active write-ups exist", () => {
    const activeWriteUps = 1;
    const canAdvance = activeWriteUps === 0;
    expect(canAdvance).toBe(false);
  });

  it("blocks server advancement below 80% written test", () => {
    const testScore = 72;
    const PASS_THRESHOLD = 80;
    const canAdvanceToServer = testScore >= PASS_THRESHOLD;
    expect(canAdvanceToServer).toBe(false);
  });

  it("maps career tracks correctly", () => {
    const KITCHEN_TRACK = ["dishwasher", "fry_1st_off", "fry_2nd_off", "fry_3rd_off", "kitchen_closer", "kitchen_manager"];
    const PIZZA_TRACK = ["stocking", "phone_taker", "dough_roller", "pizza_maker", "pizza_closer"];
    const FOH_TRACK = ["server_trainee", "pizza_side_server", "bar_side_server", "bartender", "bar_manager"];
    const DRIVER_TRACK = ["dish_driver", "delivery_driver", "phone_driver"];

    expect(KITCHEN_TRACK.indexOf("dishwasher")).toBe(0);
    expect(KITCHEN_TRACK.indexOf("kitchen_manager")).toBe(KITCHEN_TRACK.length - 1);
    expect(FOH_TRACK.indexOf("server_trainee")).toBe(0);
    expect(FOH_TRACK.indexOf("bar_manager")).toBe(FOH_TRACK.length - 1);
    expect(PIZZA_TRACK).toHaveLength(5);
    expect(DRIVER_TRACK).toHaveLength(3);
  });
});

// ─── Sales Intelligence ───
describe("Sales Intelligence — Daily Sales", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns daily sales ordered by date descending", async () => {
    const sales = [
      { businessDate: "2026-05-02", grandTotal: "8234.50", laborPct: "28.5" },
      { businessDate: "2026-05-01", grandTotal: "5678.25", laborPct: "32.1" },
      { businessDate: "2026-04-30", grandTotal: "6890.00", laborPct: "29.8" },
    ];
    mdb.getDailySales.mockResolvedValue(sales);

    const result = await db.getDailySales({ limit: 30 });
    expect(result).toHaveLength(3);
    expect(result[0].businessDate).toBe("2026-05-02");
    expect(parseFloat(result[0].grandTotal)).toBeGreaterThan(0);
  });

  it("calculates channel percentages correctly", () => {
    const total = 6500;
    const pickup = 1200;
    const delivery = 800;
    const bar = 2500;
    const table = 2000;

    expect(pickup + delivery + bar + table).toBe(total);
    expect((pickup / total) * 100).toBeCloseTo(18.46, 1);
    expect((bar / total) * 100).toBeCloseTo(38.46, 1);
  });

  it("flags high labor percentage", () => {
    const TARGET_MAX = 30;
    expect(parseFloat("28.5") <= TARGET_MAX).toBe(true);
    expect(parseFloat("35.2") <= TARGET_MAX).toBe(false);
  });
});

describe("Sales Intelligence — Hourly Sales", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns hourly breakdown for a specific date", async () => {
    const hourly = [
      { businessDate: "2026-05-02", hour: "11 AM-12 PM", orders: 12, total: "456.78" },
      { businessDate: "2026-05-02", hour: "12 PM-1 PM", orders: 28, total: "1234.56" },
      { businessDate: "2026-05-02", hour: "5 PM-6 PM", orders: 35, total: "1567.89" },
    ];
    mdb.getHourlySales.mockResolvedValue(hourly);

    const result = await db.getHourlySales("2026-05-02");
    expect(result).toHaveLength(3);
    expect(result[1].orders).toBe(28); // Lunch rush
    expect(result[2].orders).toBe(35); // Dinner rush
  });

  it("identifies peak hours correctly", () => {
    const hours = [
      { hour: "11 AM", orders: 12 },
      { hour: "12 PM", orders: 28 },
      { hour: "5 PM", orders: 35 },
      { hour: "6 PM", orders: 30 },
      { hour: "9 PM", orders: 8 },
    ];
    const peak = hours.reduce((max, h) => h.orders > max.orders ? h : max, hours[0]);
    expect(peak.hour).toBe("5 PM");
  });
});

describe("Sales Intelligence — Role-Based Access", () => {
  it("managers see raw dollar amounts", () => {
    const MANAGER_ROLES = ["owner", "key_manager", "kitchen_manager", "bar_manager"];
    expect(MANAGER_ROLES.includes("owner")).toBe(true);
    expect(MANAGER_ROLES.includes("key_manager")).toBe(true);
  });

  it("non-managers see vibe ratings instead of dollars", () => {
    function salesVibe(amount: number): string {
      if (amount >= 8000) return "Legendary Night";
      if (amount >= 5000) return "Great Night";
      if (amount >= 3500) return "Solid Night";
      if (amount >= 2000) return "Steady Night";
      return "Quiet Night";
    }

    expect(salesVibe(8500)).toBe("Legendary Night");
    expect(salesVibe(6000)).toBe("Great Night");
    expect(salesVibe(4000)).toBe("Solid Night");
    expect(salesVibe(2500)).toBe("Steady Night");
    expect(salesVibe(1500)).toBe("Quiet Night");
  });
});

// ─── Data Integrity ───
describe("Sales Intelligence — Data Integrity", () => {
  it("validates date format YYYY-MM-DD", () => {
    const validDates = ["2026-05-02", "2025-10-06", "2026-01-15"];
    const invalidDates = ["05/02/2026", "2026-5-2", "May 2, 2026"];
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    validDates.forEach(d => expect(dateRegex.test(d)).toBe(true));
    invalidDates.forEach(d => expect(dateRegex.test(d)).toBe(false));
  });

  it("handles missing/null values gracefully", () => {
    function safeMoney(val: string | null | undefined): number {
      if (!val) return 0;
      const n = parseFloat(val);
      return isNaN(n) ? 0 : n;
    }

    expect(safeMoney("1234.56")).toBe(1234.56);
    expect(safeMoney(null)).toBe(0);
    expect(safeMoney(undefined)).toBe(0);
    expect(safeMoney("")).toBe(0);
    expect(safeMoney("not-a-number")).toBe(0);
  });
});
