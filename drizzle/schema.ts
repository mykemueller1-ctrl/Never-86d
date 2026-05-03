import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow (Manus OAuth).
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * CTAP Staff — all employees with roles, hierarchy, and gamification scores.
 * This is the internal employee roster, separate from Manus OAuth users.
 */
export const staff = mysqlTable("staff", {
  id: int("id").autoincrement().primaryKey(),
  firstName: varchar("firstName", { length: 100 }).notNull(),
  lastName: varchar("lastName", { length: 100 }).notNull(),
  employeeNumber: varchar("employeeNumber", { length: 20 }),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  department: mysqlEnum("department", ["bar", "kitchen", "driver", "server", "management"]).notNull(),
  jobRole: mysqlEnum("jobRole", [
    "owner", "key_manager", "kitchen_manager", "kitchen_key",
    "bartender", "bar_manager", "server", "driver", "line_cook", "pizza"
  ]).notNull(),
  isKeyEmployee: boolean("isKeyEmployee").default(false).notNull(),
  canAuthPayouts: boolean("canAuthPayouts").default(false).notNull(),
  pin: varchar("pin", { length: 10 }),
  status: mysqlEnum("status", ["active", "inactive", "terminated"]).default("active").notNull(),
  hireDate: timestamp("hireDate"),
  lastClockIn: timestamp("lastClockIn"),
  // Gamification
  totalPoints: int("totalPoints").default(0).notNull(),
  currentStreak: int("currentStreak").default(0).notNull(),
  weeklyVoids: int("weeklyVoids").default(0).notNull(),
  schedulePriority: int("schedulePriority").default(50).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Staff = typeof staff.$inferSelect;
export type InsertStaff = typeof staff.$inferInsert;

/**
 * Pay Outs — store runs, cash from till, misc payouts.
 * Requires receipt photo, authorization, and matching.
 */
export const payouts = mysqlTable("payouts", {
  id: int("id").autoincrement().primaryKey(),
  staffId: int("staffId").notNull(),
  authorizedById: int("authorizedById"),
  date: timestamp("date").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  category: mysqlEnum("category", [
    "store_run", "supplies", "bread", "meat", "produce",
    "miscellaneous", "driver_payout", "redelivery", "other"
  ]).notNull(),
  vendor: varchar("vendor", { length: 200 }),
  receiptPhotoUrl: text("receiptPhotoUrl"),
  posPayoutAmount: decimal("posPayoutAmount", { precision: 10, scale: 2 }),
  discrepancy: decimal("discrepancy", { precision: 10, scale: 2 }),
  flagged: boolean("flagged").default(false).notNull(),
  flagReason: text("flagReason"),
  managerReviewed: boolean("managerReviewed").default(false).notNull(),
  reviewedById: int("reviewedById"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Payout = typeof payouts.$inferSelect;
export type InsertPayout = typeof payouts.$inferInsert;

/**
 * Vendor Invoices — weekly orders from Sawyer's, Hy-Vee, Fareway, etc.
 */
export const invoices = mysqlTable("invoices", {
  id: int("id").autoincrement().primaryKey(),
  vendorName: varchar("vendorName", { length: 200 }).notNull(),
  vendorAddress: text("vendorAddress"),
  vendorPhone: varchar("vendorPhone", { length: 20 }),
  invoiceNumber: varchar("invoiceNumber", { length: 50 }),
  date: timestamp("date").notNull(),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).notNull(),
  category: mysqlEnum("category", [
    "meat", "bread", "produce", "liquor", "beer", "supplies", "misc"
  ]).notNull(),
  items: json("items"), // Array of {item, price, quantity, total}
  receiptPhotoUrl: text("receiptPhotoUrl"),
  orderedById: int("orderedById"),
  receivedById: int("receivedById"),
  flagged: boolean("flagged").default(false).notNull(),
  flagReason: text("flagReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;

/**
 * Voids / Comps / Promos — tracked by employee with reasons.
 */
export const voids = mysqlTable("voids", {
  id: int("id").autoincrement().primaryKey(),
  staffId: int("staffId").notNull(),
  date: timestamp("date").notNull(),
  orderNumber: varchar("orderNumber", { length: 20 }),
  type: mysqlEnum("type", ["void", "comp", "promo", "discount", "credit"]).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  reason: text("reason").notNull(),
  managerNotified: boolean("managerNotified").default(false).notNull(),
  managerApproved: boolean("managerApproved").default(false).notNull(),
  approvedById: int("approvedById"),
  flagged: boolean("flagged").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Void = typeof voids.$inferSelect;
export type InsertVoid = typeof voids.$inferInsert;

/**
 * Checklists — closing, opening, cleaning tasks with completion tracking.
 */
export const checklists = mysqlTable("checklists", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  department: mysqlEnum("department", ["bar", "kitchen", "driver", "server", "all"]).notNull(),
  type: mysqlEnum("type", ["opening", "closing", "weekly", "daily"]).notNull(),
  items: json("items"), // Array of {task, required, order}
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Checklist = typeof checklists.$inferSelect;

/**
 * Checklist completions — who completed what, when, with anti-click-fast timing.
 */
export const checklistCompletions = mysqlTable("checklist_completions", {
  id: int("id").autoincrement().primaryKey(),
  checklistId: int("checklistId").notNull(),
  staffId: int("staffId").notNull(),
  date: timestamp("date").notNull(),
  completedItems: json("completedItems"), // Array of {itemIndex, completedAt, timeSpent}
  totalTimeSeconds: int("totalTimeSeconds"),
  percentComplete: int("percentComplete").default(0).notNull(),
  flaggedRush: boolean("flaggedRush").default(false).notNull(), // anti-click-fast
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChecklistCompletion = typeof checklistCompletions.$inferSelect;

/**
 * Driver EOD Reports — end of day driver accountability.
 */
export const driverReports = mysqlTable("driver_reports", {
  id: int("id").autoincrement().primaryKey(),
  staffId: int("staffId").notNull(),
  date: timestamp("date").notNull(),
  totalDeliveries: int("totalDeliveries").default(0).notNull(),
  outOfTownRuns: json("outOfTownRuns"), // Array of {destination, fee}
  specialRuns: json("specialRuns"), // Array of {description, amount}
  cashFromTill: decimal("cashFromTill", { precision: 10, scale: 2 }),
  cashReason: text("cashReason"),
  redeliveries: json("redeliveries"), // Array of {ticketNumber, reason, creditAmount}
  totalTips: decimal("totalTips", { precision: 10, scale: 2 }),
  managerHandedCash: boolean("managerHandedCash").default(false).notNull(),
  handedByStaffId: int("handedByStaffId"),
  flagged: boolean("flagged").default(false).notNull(),
  flagReason: text("flagReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DriverReport = typeof driverReports.$inferSelect;

/**
 * Shift Feedback — staff feedback each shift for operator intelligence.
 */
export const feedback = mysqlTable("feedback", {
  id: int("id").autoincrement().primaryKey(),
  staffId: int("staffId").notNull(),
  date: timestamp("date").notNull(),
  shiftType: mysqlEnum("shiftType", ["open", "mid", "close"]),
  rating: int("rating"), // 1-5
  comment: text("comment"),
  category: mysqlEnum("category", [
    "equipment", "staffing", "inventory", "customer", "management", "other"
  ]),
  urgency: mysqlEnum("urgency", ["low", "medium", "high", "critical"]),
  resolved: boolean("resolved").default(false).notNull(),
  resolvedById: int("resolvedById"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Feedback = typeof feedback.$inferSelect;

/**
 * Daily Briefings — auto-generated shift start summaries.
 */
export const dailyBriefings = mysqlTable("daily_briefings", {
  id: int("id").autoincrement().primaryKey(),
  date: timestamp("date").notNull(),
  salesYesterday: decimal("salesYesterday", { precision: 10, scale: 2 }),
  ordersYesterday: int("ordersYesterday"),
  eightySixedItems: json("eightySixedItems"), // Array of item names
  specials: json("specials"), // Array of {name, description}
  openIssues: json("openIssues"), // Array of {description, priority}
  shoutouts: json("shoutouts"), // Array of {staffId, reason}
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DailyBriefing = typeof dailyBriefings.$inferSelect;

/**
 * Gamification Events — point awards and deductions.
 */
export const gamificationEvents = mysqlTable("gamification_events", {
  id: int("id").autoincrement().primaryKey(),
  staffId: int("staffId").notNull(),
  date: timestamp("date").notNull(),
  eventType: mysqlEnum("eventType", [
    "checklist_complete", "zero_void_week", "on_time_streak",
    "social_post", "social_engagement", "customer_review_mention",
    "training_mentor", "feedback_submitted", "void_deduction",
    "break_violation", "wifi_disconnect"
  ]).notNull(),
  points: int("points").notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GamificationEvent = typeof gamificationEvents.$inferSelect;

/**
 * Issues / Maintenance — equipment, facility, inventory issues.
 */
export const issues = mysqlTable("issues", {
  id: int("id").autoincrement().primaryKey(),
  reportedById: int("reportedById").notNull(),
  date: timestamp("date").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  category: mysqlEnum("category", [
    "equipment", "plumbing", "electrical", "inventory",
    "safety", "pest", "other"
  ]).notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "critical"]).notNull(),
  status: mysqlEnum("status", ["open", "in_progress", "resolved", "wont_fix"]).default("open").notNull(),
  photoUrl: text("photoUrl"),
  resolvedById: int("resolvedById"),
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Issue = typeof issues.$inferSelect;

// ============================================================
// AI-NATIVE INTELLIGENCE LAYER
// ============================================================

/**
 * Knowledge Entries — the restaurant's tribal knowledge brain.
 * Every piece of knowledge: recipes, locations, processes, vendor info.
 * Station-aware, confidence-scored, correction-learning.
 */
export const knowledgeEntries = mysqlTable("knowledge_entries", {
  id: int("id").autoincrement().primaryKey(),
  station: mysqlEnum("station", [
    "pizza_line", "fry_line", "bar", "waitstaff", "bbq_room",
    "store_room", "bathroom", "dish_pit", "general"
  ]).notNull(),
  category: mysqlEnum("category", [
    "recipe", "location", "process", "equipment", "vendor",
    "allergen", "prep", "cleaning", "safety", "menu_info"
  ]).notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  confidence: mysqlEnum("confidence", ["high", "medium", "low"]).default("medium").notNull(),
  source: mysqlEnum("source", ["manual", "photo_extraction", "correction", "ai_inferred", "imported"]).default("manual").notNull(),
  correctionsCount: int("correctionsCount").default(0).notNull(),
  lastCorrectedAt: timestamp("lastCorrectedAt"),
  tags: json("tags"), // Array of string tags for search
  photoUrl: text("photoUrl"), // Visual reference if applicable
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KnowledgeEntry = typeof knowledgeEntries.$inferSelect;
export type InsertKnowledgeEntry = typeof knowledgeEntries.$inferInsert;

/**
 * Knowledge Corrections — workers fix wrong answers, managers approve.
 * Every correction makes the system smarter.
 */
export const knowledgeCorrections = mysqlTable("knowledge_corrections", {
  id: int("id").autoincrement().primaryKey(),
  entryId: int("entryId").notNull(),
  correctedByStaffId: int("correctedByStaffId").notNull(),
  oldAnswer: text("oldAnswer").notNull(),
  newAnswer: text("newAnswer").notNull(),
  reason: text("reason"),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  approvedByStaffId: int("approvedByStaffId"),
  approvedAt: timestamp("approvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type KnowledgeCorrection = typeof knowledgeCorrections.$inferSelect;

/**
 * Achievement Definitions — the 12+ permanent unlockable badges.
 */
export const achievementDefinitions = mysqlTable("achievement_definitions", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description").notNull(),
  badge: varchar("badge", { length: 10 }).notNull(), // emoji badge
  category: mysqlEnum("category", [
    "onboarding", "reliability", "quality", "engagement", "leadership", "longevity"
  ]).notNull(),
  thresholdType: mysqlEnum("thresholdType", ["cumulative", "consecutive", "window", "milestone"]).notNull(),
  thresholdValue: int("thresholdValue").notNull(),
  windowDays: int("windowDays"), // for window type
  resetEvent: varchar("resetEvent", { length: 100 }), // what resets consecutive/window
  bonusPoints: int("bonusPoints").default(0).notNull(),
  difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard", "legendary"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AchievementDefinition = typeof achievementDefinitions.$inferSelect;

/**
 * Staff Achievement Progress — per-worker progress toward each achievement.
 */
export const staffAchievementProgress = mysqlTable("staff_achievement_progress", {
  id: int("id").autoincrement().primaryKey(),
  staffId: int("staffId").notNull(),
  achievementId: int("achievementId").notNull(),
  currentValue: int("currentValue").default(0).notNull(),
  bestValue: int("bestValue").default(0).notNull(), // personal best (preserved on reset)
  status: mysqlEnum("status", ["in_progress", "completed", "locked"]).default("in_progress").notNull(),
  streakStartDate: timestamp("streakStartDate"),
  lastEventDate: timestamp("lastEventDate"),
  acknowledgedAt: timestamp("acknowledgedAt"), // null = celebration not yet shown
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StaffAchievementProgress = typeof staffAchievementProgress.$inferSelect;

/**
 * Staff Achievement Unlocks — immutable log of when achievements were earned.
 */
export const staffAchievementUnlocks = mysqlTable("staff_achievement_unlocks", {
  id: int("id").autoincrement().primaryKey(),
  staffId: int("staffId").notNull(),
  achievementId: int("achievementId").notNull(),
  earnedAt: timestamp("earnedAt").notNull(),
  contextSnapshot: json("contextSnapshot"), // what was happening when earned
  bonusPointsAwarded: int("bonusPointsAwarded").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type StaffAchievementUnlock = typeof staffAchievementUnlocks.$inferSelect;

/**
 * Rewards — tangible rewards workers can redeem with points.
 */
export const rewards = mysqlTable("rewards", {
  id: int("id").autoincrement().primaryKey(),
  tier: mysqlEnum("tier", ["bronze", "silver", "gold", "platinum", "diamond", "legend"]).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  pointsCost: int("pointsCost").notNull(),
  type: mysqlEnum("type", ["meal", "merch", "schedule", "gift_card", "time_off", "cash"]).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Reward = typeof rewards.$inferSelect;

/**
 * Reward Redemptions — staff claims, manager approves.
 */
export const rewardRedemptions = mysqlTable("reward_redemptions", {
  id: int("id").autoincrement().primaryKey(),
  staffId: int("staffId").notNull(),
  rewardId: int("rewardId").notNull(),
  pointsSpent: int("pointsSpent").notNull(),
  status: mysqlEnum("status", ["pending", "approved", "denied", "fulfilled"]).default("pending").notNull(),
  approvedByStaffId: int("approvedByStaffId"),
  approvedAt: timestamp("approvedAt"),
  fulfilledAt: timestamp("fulfilledAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RewardRedemption = typeof rewardRedemptions.$inferSelect;

/**
 * Photo Missions — weekly rotating challenges that build the knowledge base.
 */
export const photoMissions = mysqlTable("photo_missions", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  category: mysqlEnum("category", [
    "walk_in", "station_setup", "invoice", "equipment", "prep", "plate", "delivery", "general"
  ]).notNull(),
  pointsPerPhoto: int("pointsPerPhoto").default(5).notNull(),
  bonusPoints: int("bonusPoints").default(0).notNull(), // bonus for completing mission
  targetPhotoCount: int("targetPhotoCount").default(10).notNull(),
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PhotoMission = typeof photoMissions.$inferSelect;

/**
 * Photo Submissions — photos taken by workers, AI-analyzed, knowledge-building.
 */
export const photoSubmissions = mysqlTable("photo_submissions", {
  id: int("id").autoincrement().primaryKey(),
  staffId: int("staffId").notNull(),
  missionId: int("missionId"),
  photoUrl: text("photoUrl").notNull(),
  photoType: mysqlEnum("photoType", [
    "invoice", "shelf", "station", "equipment", "plate", "delivery", "prep", "other"
  ]).notNull(),
  aiExtraction: json("aiExtraction"), // structured data extracted by LLM vision
  aiSummary: text("aiSummary"), // human-readable summary of what AI found
  verified: boolean("verified").default(false).notNull(),
  verifiedByStaffId: int("verifiedByStaffId"),
  pointsAwarded: int("pointsAwarded").default(0).notNull(),
  knowledgeEntryIds: json("knowledgeEntryIds"), // IDs of knowledge entries created from this photo
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PhotoSubmission = typeof photoSubmissions.$inferSelect;

/**
 * Vendor Products — SKU-level tracking per vendor for order guides.
 */
export const vendorProducts = mysqlTable("vendor_products", {
  id: int("id").autoincrement().primaryKey(),
  vendorName: varchar("vendorName", { length: 200 }).notNull(),
  sku: varchar("sku", { length: 50 }),
  productName: varchar("productName", { length: 300 }).notNull(),
  category: mysqlEnum("category", [
    "meat", "dairy", "produce", "bread", "frozen", "dry_goods",
    "paper", "chemicals", "liquor", "beer", "wine", "soda", "other"
  ]).notNull(),
  unit: varchar("unit", { length: 50 }), // "case", "lb", "each", "bottle"
  lastPrice: decimal("lastPrice", { precision: 10, scale: 2 }),
  previousPrice: decimal("previousPrice", { precision: 10, scale: 2 }),
  priceChangePercent: decimal("priceChangePercent", { precision: 5, scale: 2 }),
  parLevel: int("parLevel"), // how many to keep in stock
  orderFrequency: mysqlEnum("orderFrequency", ["daily", "twice_weekly", "weekly", "biweekly", "monthly", "as_needed"]),
  lastOrderedAt: timestamp("lastOrderedAt"),
  notes: text("notes"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VendorProduct = typeof vendorProducts.$inferSelect;

/**
 * Order Guide Templates — assigned order guides per manager.
 */
export const orderGuideTemplates = mysqlTable("order_guide_templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  assignedToStaffId: int("assignedToStaffId"),
  vendorName: varchar("vendorName", { length: 200 }).notNull(),
  products: json("products"), // Array of { vendorProductId, customParLevel, notes }
  lastUpdated: timestamp("lastUpdated"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OrderGuideTemplate = typeof orderGuideTemplates.$inferSelect;

/**
 * Briefing Memory — persistent facts that carry across briefings.
 * The system remembers what happened and references it in future briefings.
 */
export const briefingMemory = mysqlTable("briefing_memory", {
  id: int("id").autoincrement().primaryKey(),
  factType: mysqlEnum("factType", [
    "event_pattern", "shortage", "equipment_issue", "staff_pattern",
    "vendor_change", "menu_change", "seasonal", "custom"
  ]).notNull(),
  fact: text("fact").notNull(),
  relevanceScore: int("relevanceScore").default(50).notNull(), // 0-100, decays over time
  expiresAt: timestamp("expiresAt"), // null = never expires
  sourceType: varchar("sourceType", { length: 50 }), // "checklist", "invoice", "feedback", etc.
  sourceId: int("sourceId"), // reference to source record
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BriefingMemory = typeof briefingMemory.$inferSelect;


// ============================================================
// PORTABLE WORKER PROFILE SYSTEM
// ============================================================

/**
 * Worker Training Modules — every trainable skill mapped from real SOPs.
 * Each module has a specific assessment type and passing criteria.
 */
export const workerTrainingModules = mysqlTable("worker_training_modules", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  category: mysqlEnum("category", ["equipment", "food_prep", "service", "management", "safety"]).notNull(),
  requiredForTrack: mysqlEnum("requiredForTrack", ["kitchen", "pizza", "foh", "driver", "all"]).notNull(),
  requiredForLevel: int("requiredForLevel").default(1).notNull(),
  estimatedMinutes: int("estimatedMinutes"),
  assessmentType: mysqlEnum("assessmentType", [
    "trainer_signoff", "written_test", "weight_check",
    "checklist_completion", "manager_observation", "practical_demo"
  ]).notNull(),
  passingScore: int("passingScore"), // nullable, e.g., 80 for written test
  sourceDocument: varchar("sourceDocument", { length: 300 }), // reference to SOP
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WorkerTrainingModule = typeof workerTrainingModules.$inferSelect;
export type InsertWorkerTrainingModule = typeof workerTrainingModules.$inferInsert;

/**
 * Worker Training Completions — who completed what training, when, and how they scored.
 */
export const workerTrainingCompletions = mysqlTable("worker_training_completions", {
  id: int("id").autoincrement().primaryKey(),
  staffId: int("staffId").notNull(),
  moduleId: int("moduleId").notNull(),
  completedAt: timestamp("completedAt").notNull(),
  trainerId: int("trainerId"), // FK → staff, who trained them
  assessmentScore: int("assessmentScore"), // nullable
  passed: boolean("passed").default(false).notNull(),
  notes: text("notes"),
  verifiedByManagerId: int("verifiedByManagerId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WorkerTrainingCompletion = typeof workerTrainingCompletions.$inferSelect;

/**
 * Worker Skill Certifications — specific equipment/process certifications.
 * Separate from training modules — these are ongoing competency markers.
 */
export const workerSkillCertifications = mysqlTable("worker_skill_certifications", {
  id: int("id").autoincrement().primaryKey(),
  staffId: int("staffId").notNull(),
  skillName: varchar("skillName", { length: 200 }).notNull(),
  skillCategory: mysqlEnum("skillCategory", ["equipment", "food_prep", "service", "management", "safety"]).notNull(),
  certifiedAt: timestamp("certifiedAt").notNull(),
  certifiedById: int("certifiedById"), // FK → staff
  expiresAt: timestamp("expiresAt"), // nullable, for recertification
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WorkerSkillCertification = typeof workerSkillCertifications.$inferSelect;

/**
 * Worker Evaluations — the 9-category, 1-5 scoring system from bar staff evaluations.
 * Matches the exact evaluation form found in Google Drive.
 */
export const workerEvaluations = mysqlTable("worker_evaluations", {
  id: int("id").autoincrement().primaryKey(),
  staffId: int("staffId").notNull(),
  evaluatorId: int("evaluatorId").notNull(),
  evaluatedAt: timestamp("evaluatedAt").notNull(),
  workQuality: int("workQuality").notNull(), // 1-5
  attendance: int("attendance").notNull(), // 1-5
  jobKnowledge: int("jobKnowledge").notNull(), // 1-5
  teamwork: int("teamwork").notNull(), // 1-5
  finishingTasks: int("finishingTasks").notNull(), // 1-5
  overallAttitude: int("overallAttitude").notNull(), // 1-5
  customerInteraction: int("customerInteraction").notNull(), // 1-5
  multitasking: int("multitasking").notNull(), // 1-5
  computerSkills: int("computerSkills").notNull(), // 1-5
  averageScore: decimal("averageScore", { precision: 3, scale: 2 }), // computed
  overallSuccession: text("overallSuccession"), // strengths / succession notes
  needsImprovement: text("needsImprovement"),
  employeeConcerns: text("employeeConcerns"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WorkerEvaluation = typeof workerEvaluations.$inferSelect;

/**
 * Worker Write-Ups — disciplinary records following the escalation protocol.
 * verbal → written → final → termination (from Kitchen Protocol Final Warning SOP).
 */
export const workerWriteUps = mysqlTable("worker_write_ups", {
  id: int("id").autoincrement().primaryKey(),
  staffId: int("staffId").notNull(),
  issuedById: int("issuedById").notNull(),
  issuedAt: timestamp("issuedAt").notNull(),
  severity: mysqlEnum("severity", ["verbal", "written", "final", "termination"]).notNull(),
  category: mysqlEnum("category", ["attendance", "performance", "conduct", "safety", "policy"]).notNull(),
  description: text("description").notNull(),
  employeeResponse: text("employeeResponse"),
  acknowledgedAt: timestamp("acknowledgedAt"), // digital signature timestamp
  followUpDate: timestamp("followUpDate"),
  resolvedAt: timestamp("resolvedAt"),
  expiresAt: timestamp("expiresAt"), // when it falls off active record
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WorkerWriteUp = typeof workerWriteUps.$inferSelect;

/**
 * Worker Career Track — current position in advancement ladder.
 * Tracks level, readiness score, and what's needed for next promotion.
 */
export const workerCareerTrack = mysqlTable("worker_career_track", {
  id: int("id").autoincrement().primaryKey(),
  staffId: int("staffId").notNull(),
  track: mysqlEnum("track", ["kitchen", "pizza", "foh", "driver"]).notNull(),
  currentLevel: int("currentLevel").default(1).notNull(),
  promotedAt: timestamp("promotedAt"),
  promotedById: int("promotedById"),
  advancementReadinessScore: int("advancementReadinessScore").default(0).notNull(), // 0-100
  nextLevelRequirements: json("nextLevelRequirements"), // JSON: what's still needed
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WorkerCareerTrack = typeof workerCareerTrack.$inferSelect;

// ============================================================
// POS SALES INTELLIGENCE
// ============================================================

/**
 * Daily Sales — structured data from PDQ Z-Reports.
 * One row per business day with revenue, labor, categories, delivery metrics.
 */
export const dailySales = mysqlTable("daily_sales", {
  id: int("id").autoincrement().primaryKey(),
  businessDate: varchar("businessDate", { length: 10 }).notNull().unique(), // YYYY-MM-DD
  grandTotal: decimal("grandTotal", { precision: 10, scale: 2 }),
  tax: decimal("tax", { precision: 10, scale: 2 }),
  // Channel breakdown
  pickupQty: int("pickupQty"),
  pickupAmount: decimal("pickupAmount", { precision: 10, scale: 2 }),
  deliveryQty: int("deliveryQty"),
  deliveryAmount: decimal("deliveryAmount", { precision: 10, scale: 2 }),
  barQty: int("barQty"),
  barAmount: decimal("barAmount", { precision: 10, scale: 2 }),
  tableQty: int("tableQty"),
  tableAmount: decimal("tableAmount", { precision: 10, scale: 2 }),
  totalQty: int("totalQty"),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }),
  // Menu categories
  catFoodQty: int("catFoodQty"),
  catFoodAmount: decimal("catFoodAmount", { precision: 10, scale: 2 }),
  catBeerQty: int("catBeerQty"),
  catBeerAmount: decimal("catBeerAmount", { precision: 10, scale: 2 }),
  catLiquorQty: int("catLiquorQty"),
  catLiquorAmount: decimal("catLiquorAmount", { precision: 10, scale: 2 }),
  catPopQty: int("catPopQty"),
  catPopAmount: decimal("catPopAmount", { precision: 10, scale: 2 }),
  catLargePizzasQty: int("catLargePizzasQty"),
  catLargePizzasAmount: decimal("catLargePizzasAmount", { precision: 10, scale: 2 }),
  // Labor
  laborHeadcount: int("laborHeadcount"),
  laborTotal: decimal("laborTotal", { precision: 10, scale: 2 }),
  laborPct: decimal("laborPct", { precision: 5, scale: 2 }),
  // Operational
  voidsCount: int("voidsCount"),
  voidsAmount: decimal("voidsAmount", { precision: 10, scale: 2 }),
  lateDeliveriesCount: int("lateDeliveriesCount"),
  avgDeliveryTimeMin: int("avgDeliveryTimeMin"),
  wasteCount: int("wasteCount"),
  wasteAmount: decimal("wasteAmount", { precision: 10, scale: 2 }),
  discountCount: int("discountCount"),
  discountTotal: decimal("discountTotal", { precision: 10, scale: 2 }),
  discountPct: decimal("discountPct", { precision: 5, scale: 2 }),
  // Cash management
  expectedCash: decimal("expectedCash", { precision: 10, scale: 2 }),
  creditCards: decimal("creditCards", { precision: 10, scale: 2 }),
  creditCardTips: decimal("creditCardTips", { precision: 10, scale: 2 }),
  payOuts: decimal("payOuts", { precision: 10, scale: 2 }),
  // Table service
  tableOrders: int("tableOrders"),
  tableGuests: int("tableGuests"),
  avgGuestPerOrder: decimal("avgGuestPerOrder", { precision: 4, scale: 2 }),
  avgPerGuest: decimal("avgPerGuest", { precision: 8, scale: 2 }),
  // Year-over-year
  totalLastYear: decimal("totalLastYear", { precision: 10, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DailySales = typeof dailySales.$inferSelect;
export type InsertDailySales = typeof dailySales.$inferInsert;

/**
 * Hourly Sales — per-hour breakdown from PDQ Hourly Sales Reports.
 */
export const hourlySales = mysqlTable("hourly_sales", {
  id: int("id").autoincrement().primaryKey(),
  businessDate: varchar("businessDate", { length: 10 }).notNull(), // YYYY-MM-DD
  hour: varchar("hour", { length: 20 }).notNull(), // "7 AM-8 AM"
  orders: int("orders"),
  total: decimal("total", { precision: 10, scale: 2 }),
  avgSales: decimal("avgSales", { precision: 10, scale: 2 }),
  laborPct: decimal("laborPct", { precision: 5, scale: 2 }),
  pickupQty: int("pickupQty"),
  pickupAmount: decimal("pickupAmount", { precision: 10, scale: 2 }),
  deliveryQty: int("deliveryQty"),
  deliveryAmount: decimal("deliveryAmount", { precision: 10, scale: 2 }),
  barQty: int("barQty"),
  barAmount: decimal("barAmount", { precision: 10, scale: 2 }),
  tableQty: int("tableQty"),
  tableAmount: decimal("tableAmount", { precision: 10, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type HourlySales = typeof hourlySales.$inferSelect;
export type InsertHourlySales = typeof hourlySales.$inferInsert;


// ============ INTELLIGENCE ENGINE TABLES ============

/**
 * Void/Promo Records — parsed from PDQ Void_Promo_Report PDFs.
 * Tracks every void item, employee meal, manager meal, and promo.
 */
export const voidRecords = mysqlTable("void_records", {
  id: int("id").autoincrement().primaryKey(),
  businessDate: varchar("businessDate", { length: 20 }).notNull(),
  orderId: varchar("orderId", { length: 20 }),
  recordType: mysqlEnum("recordType", ["void_item", "void_order"]).notNull(),
  itemType: varchar("itemType", { length: 50 }),
  itemDesc: varchar("itemDesc", { length: 300 }),
  employeeName: varchar("employeeName", { length: 200 }),
  amount: decimal("amount", { precision: 10, scale: 2 }),
  timeIn: varchar("timeIn", { length: 50 }),
  timeApplied: varchar("timeApplied", { length: 50 }),
  reason: text("reason"),
  sourceFile: varchar("sourceFile", { length: 300 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type VoidRecord = typeof voidRecords.$inferSelect;

/**
 * Product Mix Entries — historical menu sales data from PDQ.
 */
export const productMixEntries = mysqlTable("product_mix_entries", {
  id: int("id").autoincrement().primaryKey(),
  periodStart: varchar("periodStart", { length: 20 }).notNull(),
  periodEnd: varchar("periodEnd", { length: 20 }).notNull(),
  itemName: varchar("itemName", { length: 300 }).notNull(),
  itemId: varchar("itemId", { length: 20 }),
  category: mysqlEnum("category", ["food", "pizza", "beer", "liquor", "pop", "other"]).default("other"),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }),
  totalQty: int("totalQty"),
  sourceFile: varchar("sourceFile", { length: 300 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ProductMixEntry = typeof productMixEntries.$inferSelect;

/**
 * Weather Data — daily weather conditions for Fort Dodge, Iowa.
 */
export const weatherData = mysqlTable("weather_data", {
  id: int("id").autoincrement().primaryKey(),
  date: varchar("date", { length: 20 }).notNull(),
  tempMax: decimal("tempMax", { precision: 5, scale: 1 }),
  tempMin: decimal("tempMin", { precision: 5, scale: 1 }),
  precipitation: decimal("precipitation", { precision: 6, scale: 2 }),
  snowfall: decimal("snowfall", { precision: 6, scale: 2 }),
  windMax: decimal("windMax", { precision: 5, scale: 1 }),
  weatherCode: int("weatherCode"),
  isForecast: boolean("isForecast").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type WeatherData = typeof weatherData.$inferSelect;

/**
 * Local Events — events within 30 miles of Fort Dodge.
 */
export const localEvents = mysqlTable("local_events", {
  id: int("id").autoincrement().primaryKey(),
  eventName: varchar("eventName", { length: 500 }).notNull(),
  eventDate: varchar("eventDate", { length: 20 }).notNull(),
  eventTime: varchar("eventTime", { length: 50 }),
  venue: varchar("venue", { length: 300 }),
  city: varchar("city", { length: 100 }),
  distance: decimal("distance", { precision: 5, scale: 1 }),
  category: mysqlEnum("category", ["sports", "school", "community", "concert", "festival", "holiday", "other"]).default("other"),
  estimatedImpact: mysqlEnum("estimatedImpact", ["high", "medium", "low"]).default("low"),
  attendanceEstimate: int("attendanceEstimate"),
  notes: text("notes"),
  source: varchar("source", { length: 200 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type LocalEvent = typeof localEvents.$inferSelect;

/**
 * Intelligence Anomalies — detected anomalies from void/sales analysis.
 */
export const intelligenceAnomalies = mysqlTable("intelligence_anomalies", {
  id: int("id").autoincrement().primaryKey(),
  anomalyType: varchar("anomalyType", { length: 100 }).notNull(),
  severity: mysqlEnum("severity", ["high", "medium", "low"]).notNull(),
  employeeName: varchar("employeeName", { length: 200 }),
  detail: text("detail").notNull(),
  theory: text("theory"),
  businessDate: varchar("businessDate", { length: 20 }),
  acknowledged: boolean("acknowledged").default(false),
  acknowledgedBy: varchar("acknowledgedBy", { length: 200 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type IntelligenceAnomaly = typeof intelligenceAnomalies.$inferSelect;

/**
 * Schedule Intelligence — weekly scheduling recommendations.
 */
export const scheduleIntelligence = mysqlTable("schedule_intelligence", {
  id: int("id").autoincrement().primaryKey(),
  weekStart: varchar("weekStart", { length: 20 }).notNull(),
  weekEnd: varchar("weekEnd", { length: 20 }).notNull(),
  recommendations: json("recommendations"),
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  acknowledgedBy: varchar("acknowledgedBy", { length: 200 }),
});
export type ScheduleIntelligence = typeof scheduleIntelligence.$inferSelect;
