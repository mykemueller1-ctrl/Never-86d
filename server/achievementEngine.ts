/**
 * Achievement Auto-Progression Engine
 * 
 * Wires real events (checklist completion, void creation, feedback, shift login)
 * to automatic achievement progress updates and unlock triggers.
 * 
 * Achievement types:
 *   cumulative  — count goes up forever (e.g., "complete 100 checklists")
 *   consecutive — streak that resets on a specific event (e.g., "14-day on-time streak")
 *   window      — must maintain condition over N days (e.g., "zero voids in 30 days")
 *   milestone   — one-time event (e.g., "promoted to key employee")
 */

import {
  getAllAchievements,
  getStaffAchievementProgress,
  upsertAchievementProgress,
  createAchievementUnlock,
  updateStaffPoints,
  addGamificationEvent,
} from "./db";

type AchievementDef = {
  id: number;
  slug: string;
  thresholdType: "cumulative" | "consecutive" | "window" | "milestone";
  thresholdValue: number;
  windowDays?: number | null;
  resetEvent?: string | null;
  bonusPoints: number;
};

/**
 * Check and update achievement progress for a staff member after an event.
 * Returns list of newly unlocked achievement slugs (if any).
 */
export async function processAchievementEvent(
  staffId: number,
  eventType: string,
  eventData?: { count?: number; value?: number }
): Promise<string[]> {
  const allDefs = await getAllAchievements();
  if (!allDefs.length) return [];

  const currentProgress = await getStaffAchievementProgress(staffId);
  const progressMap = new Map(currentProgress.map(p => [p.achievementId, p]));
  const newUnlocks: string[] = [];

  for (const def of allDefs as AchievementDef[]) {
    const existing = progressMap.get(def.id);

    // Skip already completed achievements
    if (existing?.status === "completed") continue;

    let newValue: number | null = null;
    let shouldReset = false;

    switch (def.slug) {
      // ── Cumulative achievements ──
      case "rookie": // Complete N shifts (triggered on PIN login)
        if (eventType === "shift_login") {
          newValue = (existing?.currentValue ?? 0) + 1;
        }
        break;

      case "machine": // Complete N checklists
        if (eventType === "checklist_complete") {
          newValue = (existing?.currentValue ?? 0) + 1;
        }
        break;

      case "voice": // Submit N feedback entries
        if (eventType === "feedback_submitted") {
          newValue = (existing?.currentValue ?? 0) + 1;
        }
        break;

      case "ambassador": // N social media posts
        if (eventType === "social_post") {
          newValue = (existing?.currentValue ?? 0) + 1;
        }
        break;

      case "night_owl": // Work N closing shifts
        if (eventType === "closing_shift") {
          newValue = (existing?.currentValue ?? 0) + 1;
        }
        break;

      case "early_bird": // Work N opening shifts
        if (eventType === "opening_shift") {
          newValue = (existing?.currentValue ?? 0) + 1;
        }
        break;

      case "centurion": // Work N total shifts
        if (eventType === "shift_login") {
          newValue = (existing?.currentValue ?? 0) + 1;
        }
        break;

      case "veteran": // N days of active employment
        if (eventType === "shift_login") {
          newValue = (existing?.currentValue ?? 0) + 1;
        }
        break;

      case "mentor": // Train N new employees
        if (eventType === "training_mentor") {
          newValue = (existing?.currentValue ?? 0) + 1;
        }
        break;

      // ── Consecutive achievements ──
      case "iron_streak": // N-day consecutive on-time streak
        if (eventType === "shift_login") {
          // Increment streak
          newValue = (existing?.currentValue ?? 0) + 1;
        } else if (eventType === "late_clock_in") {
          // Reset streak
          shouldReset = true;
          newValue = 0;
        }
        break;

      // ── Window achievements ──
      case "clean_hands": // Zero voids in N days
        if (eventType === "void_created") {
          // Reset — a void happened
          shouldReset = true;
          newValue = 0;
        } else if (eventType === "shift_login") {
          // Increment days without void
          newValue = (existing?.currentValue ?? 0) + 1;
        }
        break;

      // ── Milestone achievements ──
      case "key_holder": // Promoted to key employee
        if (eventType === "promoted_key_employee") {
          newValue = 1;
        }
        break;
    }

    // Update progress if value changed
    if (newValue !== null) {
      const bestValue = Math.max(newValue, existing?.bestValue ?? 0);
      const isCompleted = newValue >= def.thresholdValue;
      const status = isCompleted ? "completed" as const : "in_progress" as const;

      await upsertAchievementProgress(staffId, def.id, newValue, bestValue, status);

      // If just completed, create unlock record and award bonus points
      if (isCompleted && (existing?.status as string) !== "completed") {
        await createAchievementUnlock({
          staffId,
          achievementId: def.id,
          earnedAt: new Date(),
          contextSnapshot: { eventType, eventData, progressAtUnlock: newValue },
          bonusPointsAwarded: def.bonusPoints,
        });

        // Award bonus points
        if (def.bonusPoints > 0) {
          await updateStaffPoints(staffId, def.bonusPoints);
          await addGamificationEvent({
            staffId,
            date: new Date(),
            eventType: "checklist_complete", // closest match for bonus
            points: def.bonusPoints,
            description: `Achievement unlocked: ${def.slug} (+${def.bonusPoints} bonus)`,
          });
        }

        newUnlocks.push(def.slug);
      }
    }
  }

  return newUnlocks;
}
