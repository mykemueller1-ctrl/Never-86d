/**
 * Achievement Auto-Progression Engine Tests
 * 
 * Tests the processAchievementEvent function that wires real events
 * to achievement progress updates and unlock triggers.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db module
vi.mock("./db", () => {
  const achievementDefs = [
    { id: 1, slug: "rookie", thresholdType: "cumulative", thresholdValue: 5, bonusPoints: 25, windowDays: null, resetEvent: null },
    { id: 2, slug: "machine", thresholdType: "cumulative", thresholdValue: 100, bonusPoints: 50, windowDays: null, resetEvent: null },
    { id: 3, slug: "voice", thresholdType: "cumulative", thresholdValue: 50, bonusPoints: 50, windowDays: null, resetEvent: null },
    { id: 4, slug: "iron_streak", thresholdType: "consecutive", thresholdValue: 14, bonusPoints: 50, windowDays: null, resetEvent: "late_clock_in" },
    { id: 5, slug: "clean_hands", thresholdType: "window", thresholdValue: 30, bonusPoints: 75, windowDays: 30, resetEvent: "void_created" },
    { id: 6, slug: "centurion", thresholdType: "cumulative", thresholdValue: 100, bonusPoints: 75, windowDays: null, resetEvent: null },
    { id: 7, slug: "key_holder", thresholdType: "milestone", thresholdValue: 1, bonusPoints: 100, windowDays: null, resetEvent: null },
    { id: 8, slug: "ambassador", thresholdType: "cumulative", thresholdValue: 10, bonusPoints: 50, windowDays: null, resetEvent: null },
  ];

  let progressStore: Map<string, any> = new Map();

  return {
    getAllAchievements: vi.fn(() => achievementDefs),
    getStaffAchievementProgress: vi.fn((staffId: number) => {
      const results: any[] = [];
      for (const [key, val] of progressStore.entries()) {
        if (key.startsWith(`${staffId}-`)) results.push(val);
      }
      return results;
    }),
    upsertAchievementProgress: vi.fn((staffId: number, achievementId: number, currentValue: number, bestValue: number, status: string) => {
      const key = `${staffId}-${achievementId}`;
      progressStore.set(key, { staffId, achievementId, currentValue, bestValue, status });
    }),
    createAchievementUnlock: vi.fn(() => ({})),
    updateStaffPoints: vi.fn(() => ({})),
    addGamificationEvent: vi.fn(() => ({})),
    // Reset helper for tests
    _resetProgressStore: () => { progressStore = new Map(); },
    _getProgressStore: () => progressStore,
  };
});

import { processAchievementEvent } from "./achievementEngine";
import * as db from "./db";

const mockDb = db as any;

beforeEach(() => {
  vi.clearAllMocks();
  mockDb._resetProgressStore();
});

describe("Achievement Auto-Progression Engine", () => {
  describe("Cumulative achievements", () => {
    it("increments Rookie progress on shift_login", async () => {
      const unlocks = await processAchievementEvent(1, "shift_login");
      expect(mockDb.upsertAchievementProgress).toHaveBeenCalledWith(1, 1, 1, 1, "in_progress"); // rookie
      expect(unlocks).not.toContain("rookie"); // not yet at threshold (5)
    });

    it("unlocks Rookie after 5 shift logins", async () => {
      // Simulate 4 prior logins
      mockDb._getProgressStore().set("1-1", { staffId: 1, achievementId: 1, currentValue: 4, bestValue: 4, status: "in_progress" });
      const unlocks = await processAchievementEvent(1, "shift_login");
      expect(unlocks).toContain("rookie");
      expect(mockDb.createAchievementUnlock).toHaveBeenCalledWith(
        expect.objectContaining({ staffId: 1, achievementId: 1, bonusPointsAwarded: 25 })
      );
      expect(mockDb.updateStaffPoints).toHaveBeenCalledWith(1, 25);
    });

    it("does not re-unlock already completed achievements", async () => {
      mockDb._getProgressStore().set("1-1", { staffId: 1, achievementId: 1, currentValue: 10, bestValue: 10, status: "completed" });
      const unlocks = await processAchievementEvent(1, "shift_login");
      expect(unlocks).not.toContain("rookie");
      expect(mockDb.createAchievementUnlock).not.toHaveBeenCalled();
    });

    it("increments Machine progress on checklist_complete", async () => {
      const unlocks = await processAchievementEvent(1, "checklist_complete");
      expect(mockDb.upsertAchievementProgress).toHaveBeenCalledWith(1, 2, 1, 1, "in_progress"); // machine
      expect(unlocks).toEqual([]);
    });

    it("increments Voice progress on feedback_submitted", async () => {
      await processAchievementEvent(1, "feedback_submitted");
      expect(mockDb.upsertAchievementProgress).toHaveBeenCalledWith(1, 3, 1, 1, "in_progress"); // voice
    });

    it("increments Ambassador progress on social_post", async () => {
      await processAchievementEvent(1, "social_post");
      expect(mockDb.upsertAchievementProgress).toHaveBeenCalledWith(1, 8, 1, 1, "in_progress"); // ambassador
    });

    it("increments both Rookie and Centurion on shift_login", async () => {
      await processAchievementEvent(1, "shift_login");
      // Should update rookie (id:1) and centurion (id:6) and others that respond to shift_login
      const calls = mockDb.upsertAchievementProgress.mock.calls;
      const achievementIds = calls.map((c: any[]) => c[1]);
      expect(achievementIds).toContain(1); // rookie
      expect(achievementIds).toContain(6); // centurion
    });
  });

  describe("Consecutive achievements", () => {
    it("increments Iron Streak on shift_login", async () => {
      await processAchievementEvent(1, "shift_login");
      const calls = mockDb.upsertAchievementProgress.mock.calls;
      const ironStreakCall = calls.find((c: any[]) => c[1] === 4);
      expect(ironStreakCall).toBeDefined();
      expect(ironStreakCall![2]).toBe(1); // currentValue = 1
    });

    it("resets Iron Streak on late_clock_in", async () => {
      mockDb._getProgressStore().set("1-4", { staffId: 1, achievementId: 4, currentValue: 10, bestValue: 10, status: "in_progress" });
      await processAchievementEvent(1, "late_clock_in");
      expect(mockDb.upsertAchievementProgress).toHaveBeenCalledWith(1, 4, 0, 10, "in_progress");
    });

    it("unlocks Iron Streak at 14 consecutive days", async () => {
      mockDb._getProgressStore().set("1-4", { staffId: 1, achievementId: 4, currentValue: 13, bestValue: 13, status: "in_progress" });
      const unlocks = await processAchievementEvent(1, "shift_login");
      expect(unlocks).toContain("iron_streak");
      expect(mockDb.createAchievementUnlock).toHaveBeenCalledWith(
        expect.objectContaining({ staffId: 1, achievementId: 4, bonusPointsAwarded: 50 })
      );
    });
  });

  describe("Window achievements", () => {
    it("resets Clean Hands on void_created", async () => {
      mockDb._getProgressStore().set("1-5", { staffId: 1, achievementId: 5, currentValue: 20, bestValue: 20, status: "in_progress" });
      await processAchievementEvent(1, "void_created");
      expect(mockDb.upsertAchievementProgress).toHaveBeenCalledWith(1, 5, 0, 20, "in_progress");
    });

    it("increments Clean Hands on shift_login (days without void)", async () => {
      await processAchievementEvent(1, "shift_login");
      const calls = mockDb.upsertAchievementProgress.mock.calls;
      const cleanHandsCall = calls.find((c: any[]) => c[1] === 5);
      expect(cleanHandsCall).toBeDefined();
      expect(cleanHandsCall![2]).toBe(1); // first day
    });

    it("unlocks Clean Hands after 30 void-free days", async () => {
      mockDb._getProgressStore().set("1-5", { staffId: 1, achievementId: 5, currentValue: 29, bestValue: 29, status: "in_progress" });
      const unlocks = await processAchievementEvent(1, "shift_login");
      expect(unlocks).toContain("clean_hands");
    });
  });

  describe("Milestone achievements", () => {
    it("unlocks Key Holder on promoted_key_employee", async () => {
      const unlocks = await processAchievementEvent(1, "promoted_key_employee");
      expect(unlocks).toContain("key_holder");
      expect(mockDb.createAchievementUnlock).toHaveBeenCalledWith(
        expect.objectContaining({ staffId: 1, achievementId: 7, bonusPointsAwarded: 100 })
      );
      expect(mockDb.updateStaffPoints).toHaveBeenCalledWith(1, 100);
    });

    it("does not trigger Key Holder on unrelated events", async () => {
      const unlocks = await processAchievementEvent(1, "shift_login");
      expect(unlocks).not.toContain("key_holder");
    });
  });

  describe("Edge cases", () => {
    it("returns empty array when no achievements exist", async () => {
      mockDb.getAllAchievements.mockReturnValueOnce([]);
      const unlocks = await processAchievementEvent(1, "shift_login");
      expect(unlocks).toEqual([]);
    });

    it("handles unknown event types gracefully", async () => {
      const unlocks = await processAchievementEvent(1, "unknown_event");
      expect(unlocks).toEqual([]);
      // Should not call upsert for any achievement since no slug matches
      expect(mockDb.upsertAchievementProgress).not.toHaveBeenCalled();
    });

    it("preserves bestValue even after reset", async () => {
      mockDb._getProgressStore().set("1-4", { staffId: 1, achievementId: 4, currentValue: 12, bestValue: 12, status: "in_progress" });
      await processAchievementEvent(1, "late_clock_in");
      // bestValue should stay at 12 even though currentValue resets to 0
      expect(mockDb.upsertAchievementProgress).toHaveBeenCalledWith(1, 4, 0, 12, "in_progress");
    });

    it("awards gamification event on unlock", async () => {
      mockDb._getProgressStore().set("1-1", { staffId: 1, achievementId: 1, currentValue: 4, bestValue: 4, status: "in_progress" });
      await processAchievementEvent(1, "shift_login");
      expect(mockDb.addGamificationEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          staffId: 1,
          points: 25,
          description: expect.stringContaining("rookie"),
        })
      );
    });
  });
});
