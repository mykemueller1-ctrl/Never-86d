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
