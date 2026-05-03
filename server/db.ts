import { eq, desc, asc, and, gte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  staff, InsertStaff, Staff,
  payouts, InsertPayout,
  invoices, InsertInvoice,
  voids, InsertVoid,
  checklists,
  checklistCompletions,
  driverReports,
  feedback,
  dailyBriefings,
  gamificationEvents,
  issues,
  voidRecords,
  productMixEntries,
  weatherData,
  localEvents,
  intelligenceAnomalies,
  scheduleIntelligence,
  managementBriefings,
} from "../drizzle/schema";
import { ENV } from './_core/env';

// Use a type alias to avoid conflict with the Feedback type from schema
type InsertFeedbackType = typeof feedback.$inferInsert;

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ SAFE PROJECTION ============
// Strip sensitive fields (pin, phone, email) from staff records before sending to client

type SafeStaff = Omit<Staff, "pin" | "phone" | "email">;

function stripSensitiveFields(s: Staff): SafeStaff {
  const { pin, phone, email, ...safe } = s;
  return safe;
}

function stripSensitiveFieldsArray(arr: Staff[]): SafeStaff[] {
  return arr.map(stripSensitiveFields);
}

// ============ USER HELPERS ============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ STAFF HELPERS ============

/** Internal: returns raw staff record WITH pin (used only for PIN verification) */
export async function getStaffByPinInternal(pin: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(staff).where(eq(staff.pin, pin)).limit(1);
  return result[0];
}

/** Public-safe: returns all staff WITHOUT sensitive fields */
export async function getAllStaff(): Promise<SafeStaff[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(staff).orderBy(staff.department, staff.lastName);
  return stripSensitiveFieldsArray(rows);
}

/** Public-safe: returns single staff WITHOUT sensitive fields */
export async function getStaffById(id: number): Promise<SafeStaff | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(staff).where(eq(staff.id, id)).limit(1);
  return result[0] ? stripSensitiveFields(result[0]) : undefined;
}

/** Public-safe: returns staff by department WITHOUT sensitive fields */
export async function getStaffByDepartment(department: string): Promise<SafeStaff[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(staff).where(eq(staff.department, department as any));
  return stripSensitiveFieldsArray(rows);
}

/** Public-safe: returns active staff WITHOUT sensitive fields */
export async function getActiveStaff(): Promise<SafeStaff[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(staff).where(eq(staff.status, "active"));
  return stripSensitiveFieldsArray(rows);
}

export async function createStaff(data: InsertStaff) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(staff).values(data);
  return result;
}

export async function updateStaffPoints(staffId: number, points: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(staff).set({
    totalPoints: sql`${staff.totalPoints} + ${points}`,
  }).where(eq(staff.id, staffId));
}

export async function updateStaffStatus(staffId: number, status: "active" | "inactive" | "terminated") {
  const db = await getDb();
  if (!db) return;
  await db.update(staff).set({ status }).where(eq(staff.id, staffId));
}

// ============ AUTO-ARCHIVE HELPERS ============

/** Archive staff who haven't clocked in for 30+ days */
export async function archiveInactiveStaff() {
  const db = await getDb();
  if (!db) return 0;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const result = await db.update(staff)
    .set({ status: "inactive" })
    .where(
      and(
        eq(staff.status, "active"),
        sql`(${staff.lastClockIn} IS NULL OR ${staff.lastClockIn} < ${thirtyDaysAgo})`
      )
    );
  return (result as any)[0]?.affectedRows ?? 0;
}

// ============ PAYOUT HELPERS ============

export async function getAllPayouts(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(payouts).orderBy(desc(payouts.date)).limit(limit);
}

export async function createPayout(data: InsertPayout) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(payouts).values(data);
}

export async function getFlaggedPayouts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(payouts).where(eq(payouts.flagged, true)).orderBy(desc(payouts.date));
}

export async function getPayoutsByStaff(staffId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(payouts).where(eq(payouts.staffId, staffId)).orderBy(desc(payouts.date));
}

// ============ VENDOR RUNNING TOTALS ============

/** Get running total of payouts by vendor/category for a given period */
export async function getPayoutTotalsByCategory(days = 7) {
  const db = await getDb();
  if (!db) return [];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return db.select({
    category: payouts.category,
    total: sql<string>`CAST(SUM(${payouts.amount}) AS CHAR)`,
    count: sql<number>`COUNT(*)`,
  }).from(payouts)
    .where(gte(payouts.date, since))
    .groupBy(payouts.category);
}

/** Get running total of payouts by vendor for a given period */
export async function getPayoutTotalsByVendor(days = 7) {
  const db = await getDb();
  if (!db) return [];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return db.select({
    vendor: payouts.vendor,
    total: sql<string>`CAST(SUM(${payouts.amount}) AS CHAR)`,
    count: sql<number>`COUNT(*)`,
  }).from(payouts)
    .where(and(gte(payouts.date, since), sql`${payouts.vendor} IS NOT NULL`))
    .groupBy(payouts.vendor);
}

/** Get running total of invoices by vendor for a given period */
export async function getInvoiceTotalsByVendor(days = 7) {
  const db = await getDb();
  if (!db) return [];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return db.select({
    vendorName: invoices.vendorName,
    total: sql<string>`CAST(SUM(${invoices.totalAmount}) AS CHAR)`,
    count: sql<number>`COUNT(*)`,
  }).from(invoices)
    .where(gte(invoices.date, since))
    .groupBy(invoices.vendorName);
}

// ============ INVOICE HELPERS ============

export async function getAllInvoices(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(invoices).orderBy(desc(invoices.date)).limit(limit);
}

export async function createInvoice(data: InsertInvoice) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(invoices).values(data);
}

export async function getInvoicesByVendor(vendorName: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(invoices).where(eq(invoices.vendorName, vendorName)).orderBy(desc(invoices.date));
}

// ============ VOID HELPERS ============

export async function getAllVoids(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(voids).orderBy(desc(voids.date)).limit(limit);
}

export async function createVoid(data: InsertVoid) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(voids).values(data);
}

export async function getVoidsByStaff(staffId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(voids).where(eq(voids.staffId, staffId)).orderBy(desc(voids.date));
}

export async function getWeeklyVoidsByStaff(staffId: number) {
  const db = await getDb();
  if (!db) return [];
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return db.select().from(voids).where(
    and(eq(voids.staffId, staffId), gte(voids.date, oneWeekAgo))
  );
}

// ============ CHECKLIST HELPERS ============

export async function getAllChecklists() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(checklists);
}

export async function getChecklistsByDepartment(department: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(checklists).where(eq(checklists.department, department as any));
}

export async function createChecklistCompletion(data: typeof checklistCompletions.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(checklistCompletions).values(data);
}

// ============ DRIVER REPORT HELPERS ============

export async function createDriverReport(data: typeof driverReports.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(driverReports).values(data);
}

export async function getDriverReports(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(driverReports).orderBy(desc(driverReports.date)).limit(limit);
}

// ============ FEEDBACK HELPERS ============

export async function createFeedback(data: InsertFeedbackType) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(feedback).values(data);
}

export async function getAllFeedback(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(feedback).orderBy(desc(feedback.date)).limit(limit);
}

// ============ GAMIFICATION HELPERS ============

export async function addGamificationEvent(data: typeof gamificationEvents.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(gamificationEvents).values(data);
  // Also update staff points
  await updateStaffPoints(data.staffId, data.points);
}

/** Public-safe: returns leaderboard WITHOUT sensitive fields */
export async function getLeaderboard(): Promise<SafeStaff[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(staff)
    .where(eq(staff.status, "active"))
    .orderBy(desc(staff.totalPoints))
    .limit(20);
  return stripSensitiveFieldsArray(rows);
}

// ============ ISSUE HELPERS ============

export async function createIssue(data: typeof issues.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(issues).values(data);
}

export async function getOpenIssues() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(issues)
    .where(eq(issues.status, "open"))
    .orderBy(desc(issues.priority), desc(issues.date));
}

// ============ DAILY BRIEFING HELPERS ============

export async function getLatestBriefing() {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(dailyBriefings).orderBy(desc(dailyBriefings.date)).limit(1);
  return result[0];
}

export async function createBriefing(data: typeof dailyBriefings.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(dailyBriefings).values(data);
}

// ============ SEED DATA ============

export async function seedStaffData() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if staff already seeded
  const existing = await db.select().from(staff).limit(1);
  if (existing.length > 0) return { message: "Staff already seeded" };

  const staffData: InsertStaff[] = [
    // Owners
    { firstName: "Mychael", lastName: "Mueller", department: "management", jobRole: "owner", isKeyEmployee: true, canAuthPayouts: true, pin: "8686", employeeNumber: "001" },
    { firstName: "Sally", lastName: "Hart", department: "management", jobRole: "owner", isKeyEmployee: true, canAuthPayouts: true, pin: "8687", employeeNumber: "002" },
    // Key Manager
    { firstName: "Gavin", lastName: "Thomas", department: "management", jobRole: "key_manager", isKeyEmployee: true, canAuthPayouts: true, pin: "1234", employeeNumber: "003" },
    // Kitchen Manager
    { firstName: "Moe", lastName: "Thomas", department: "kitchen", jobRole: "kitchen_manager", isKeyEmployee: true, canAuthPayouts: true, pin: "4321", employeeNumber: "004" },
    // Kitchen Keys
    { firstName: "Che", lastName: "Lyftogt", department: "kitchen", jobRole: "kitchen_key", isKeyEmployee: true, canAuthPayouts: true, pin: "5678", employeeNumber: "005" },
    { firstName: "Steven", lastName: "Klein", department: "kitchen", jobRole: "kitchen_key", isKeyEmployee: true, canAuthPayouts: true, pin: "5679", employeeNumber: "006" },
    // Bar Staff
    { firstName: "Jessica", lastName: "Gailey", department: "bar", jobRole: "bar_manager", isKeyEmployee: false, canAuthPayouts: false, pin: "1001", employeeNumber: "54" },
    { firstName: "Karlee", lastName: "Sturtz", department: "bar", jobRole: "bartender", isKeyEmployee: false, canAuthPayouts: false, pin: "1002", employeeNumber: "055" },
    { firstName: "Ashley", lastName: "Holding", department: "bar", jobRole: "bartender", isKeyEmployee: false, canAuthPayouts: false, pin: "1003", employeeNumber: "137" },
    { firstName: "Kenzy", lastName: "Thompson", department: "bar", jobRole: "bartender", isKeyEmployee: false, canAuthPayouts: false, pin: "1004", employeeNumber: "056" },
    { firstName: "Jeri", lastName: "Wilson", department: "bar", jobRole: "bartender", isKeyEmployee: false, canAuthPayouts: false, pin: "1005", employeeNumber: "057" },
    { firstName: "Bryson", lastName: "Cook", department: "bar", jobRole: "bartender", isKeyEmployee: false, canAuthPayouts: false, pin: "1006", employeeNumber: "058" },
    { firstName: "Kaillee", lastName: "Miller", department: "bar", jobRole: "bartender", isKeyEmployee: false, canAuthPayouts: false, pin: "1007", employeeNumber: "059" },
    { firstName: "Samantha", lastName: "Swearingen", department: "bar", jobRole: "bartender", isKeyEmployee: false, canAuthPayouts: false, pin: "1008", employeeNumber: "060" },
    { firstName: "Azaria", lastName: "Silvey", department: "bar", jobRole: "bartender", isKeyEmployee: false, canAuthPayouts: false, pin: "1009", employeeNumber: "061" },
    // Kitchen Crew
    { firstName: "Thomas", lastName: "Dorothy", department: "kitchen", jobRole: "line_cook", isKeyEmployee: false, canAuthPayouts: false, pin: "2001", employeeNumber: "062" },
    { firstName: "Ryan", lastName: "Berg", department: "kitchen", jobRole: "line_cook", isKeyEmployee: false, canAuthPayouts: false, pin: "2002", employeeNumber: "063" },
    { firstName: "Aundrik", lastName: "Roast", department: "kitchen", jobRole: "line_cook", isKeyEmployee: false, canAuthPayouts: false, pin: "2003", employeeNumber: "064" },
    { firstName: "Aundry", lastName: "Roast", department: "kitchen", jobRole: "line_cook", isKeyEmployee: false, canAuthPayouts: false, pin: "2004", employeeNumber: "065" },
    { firstName: "Nash", lastName: "Wheaton", department: "kitchen", jobRole: "line_cook", isKeyEmployee: false, canAuthPayouts: false, pin: "2005", employeeNumber: "066" },
    { firstName: "Brodey", lastName: "Laughman", department: "kitchen", jobRole: "line_cook", isKeyEmployee: false, canAuthPayouts: false, pin: "2006", employeeNumber: "067" },
    { firstName: "Max", lastName: "George", department: "kitchen", jobRole: "line_cook", isKeyEmployee: false, canAuthPayouts: false, pin: "2007", employeeNumber: "068" },
    { firstName: "Dustin", lastName: "Stein", department: "kitchen", jobRole: "line_cook", isKeyEmployee: false, canAuthPayouts: false, pin: "2008", employeeNumber: "069" },
    { firstName: "Doc", lastName: "", department: "kitchen", jobRole: "line_cook", isKeyEmployee: false, canAuthPayouts: false, pin: "2009", employeeNumber: "070" },
    { firstName: "Ian", lastName: "Ebelsheiser", department: "kitchen", jobRole: "line_cook", isKeyEmployee: false, canAuthPayouts: false, pin: "2010", employeeNumber: "071" },
    { firstName: "Jacob", lastName: "Lawton", department: "kitchen", jobRole: "line_cook", isKeyEmployee: false, canAuthPayouts: false, pin: "2011", employeeNumber: "072" },
    { firstName: "Tyson", lastName: "Anderson", department: "kitchen", jobRole: "line_cook", isKeyEmployee: false, canAuthPayouts: false, pin: "2012", employeeNumber: "073" },
  ];

  await db.insert(staff).values(staffData);
  return { message: `Seeded ${staffData.length} staff members` };
}

// ============================================================
// AI-NATIVE INTELLIGENCE LAYER — DB HELPERS
// ============================================================

import {
  knowledgeEntries, InsertKnowledgeEntry, KnowledgeEntry,
  knowledgeCorrections,
  achievementDefinitions, AchievementDefinition,
  staffAchievementProgress,
  staffAchievementUnlocks,
  rewards,
  rewardRedemptions,
  photoMissions,
  photoSubmissions,
  vendorProducts,
  orderGuideTemplates,
  briefingMemory,
} from "../drizzle/schema";

// ============ KNOWLEDGE ENTRIES ============

export async function createKnowledgeEntry(data: InsertKnowledgeEntry) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(knowledgeEntries).values(data);
  return result;
}

export async function getKnowledgeByStation(station: string, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(knowledgeEntries)
    .where(eq(knowledgeEntries.station, station as any))
    .orderBy(desc(knowledgeEntries.confidence))
    .limit(limit);
}

export async function getKnowledgeByCategory(category: string, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(knowledgeEntries)
    .where(eq(knowledgeEntries.category, category as any))
    .limit(limit);
}

export async function searchKnowledge(query: string, station?: string, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [
    sql`(${knowledgeEntries.question} LIKE ${'%' + query + '%'} OR ${knowledgeEntries.answer} LIKE ${'%' + query + '%'})`,
  ];
  if (station && station !== "general") {
    conditions.push(
      sql`(${knowledgeEntries.station} = ${station} OR ${knowledgeEntries.station} = 'general')`
    );
  }
  return db.select().from(knowledgeEntries)
    .where(and(...conditions))
    .orderBy(desc(knowledgeEntries.confidence))
    .limit(limit);
}

export async function updateKnowledgeEntry(id: number, data: Partial<InsertKnowledgeEntry>) {
  const db = await getDb();
  if (!db) return;
  await db.update(knowledgeEntries).set(data).where(eq(knowledgeEntries.id, id));
}

export async function getAllKnowledge(limit = 200) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(knowledgeEntries).orderBy(desc(knowledgeEntries.updatedAt)).limit(limit);
}

// ============ KNOWLEDGE CORRECTIONS ============

export async function createKnowledgeCorrection(data: typeof knowledgeCorrections.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(knowledgeCorrections).values(data);
}

export async function getPendingCorrections() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(knowledgeCorrections)
    .where(eq(knowledgeCorrections.status, "pending"))
    .orderBy(desc(knowledgeCorrections.createdAt));
}

export async function approveCorrection(id: number, approvedByStaffId: number) {
  const db = await getDb();
  if (!db) return;
  // Get the correction
  const corrections = await db.select().from(knowledgeCorrections).where(eq(knowledgeCorrections.id, id)).limit(1);
  if (!corrections[0]) return;
  const correction = corrections[0];
  // Update the correction status
  await db.update(knowledgeCorrections).set({
    status: "approved",
    approvedByStaffId,
    approvedAt: new Date(),
  }).where(eq(knowledgeCorrections.id, id));
  // Update the knowledge entry with the new answer
  await db.update(knowledgeEntries).set({
    answer: correction.newAnswer,
    confidence: "high",
    source: "correction",
    correctionsCount: sql`${knowledgeEntries.correctionsCount} + 1`,
    lastCorrectedAt: new Date(),
  }).where(eq(knowledgeEntries.id, correction.entryId));
}

export async function rejectCorrection(id: number, approvedByStaffId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(knowledgeCorrections).set({
    status: "rejected",
    approvedByStaffId,
    approvedAt: new Date(),
  }).where(eq(knowledgeCorrections.id, id));
}

// ============ ACHIEVEMENT DEFINITIONS ============

export async function getAllAchievements() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(achievementDefinitions).orderBy(achievementDefinitions.category);
}

export async function createAchievementDefinition(data: typeof achievementDefinitions.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(achievementDefinitions).values(data);
}

// ============ STAFF ACHIEVEMENT PROGRESS ============

export async function getStaffAchievementProgress(staffId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(staffAchievementProgress)
    .where(eq(staffAchievementProgress.staffId, staffId));
}

export async function upsertAchievementProgress(
  staffId: number,
  achievementId: number,
  currentValue: number,
  bestValue: number,
  status: "in_progress" | "completed" | "locked" = "in_progress"
) {
  const db = await getDb();
  if (!db) return;
  // Check if progress exists
  const existing = await db.select().from(staffAchievementProgress)
    .where(and(
      eq(staffAchievementProgress.staffId, staffId),
      eq(staffAchievementProgress.achievementId, achievementId)
    )).limit(1);
  if (existing[0]) {
    await db.update(staffAchievementProgress).set({
      currentValue,
      bestValue: Math.max(bestValue, existing[0].bestValue),
      status,
      lastEventDate: new Date(),
    }).where(eq(staffAchievementProgress.id, existing[0].id));
  } else {
    await db.insert(staffAchievementProgress).values({
      staffId,
      achievementId,
      currentValue,
      bestValue,
      status,
      lastEventDate: new Date(),
    });
  }
}

export async function getUnacknowledgedUnlocks(staffId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(staffAchievementUnlocks)
    .where(eq(staffAchievementUnlocks.staffId, staffId))
    .orderBy(desc(staffAchievementUnlocks.earnedAt));
}

export async function createAchievementUnlock(data: typeof staffAchievementUnlocks.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(staffAchievementUnlocks).values(data);
}

export async function acknowledgeUnlock(staffId: number, achievementId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(staffAchievementProgress).set({
    acknowledgedAt: new Date(),
  }).where(and(
    eq(staffAchievementProgress.staffId, staffId),
    eq(staffAchievementProgress.achievementId, achievementId)
  ));
}

// ============ REWARDS ============

export async function getAllRewards() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(rewards).where(eq(rewards.active, true)).orderBy(rewards.pointsCost);
}

export async function createReward(data: typeof rewards.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(rewards).values(data);
}

export async function createRedemption(data: typeof rewardRedemptions.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(rewardRedemptions).values(data);
}

export async function getStaffRedemptions(staffId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(rewardRedemptions)
    .where(eq(rewardRedemptions.staffId, staffId))
    .orderBy(desc(rewardRedemptions.createdAt));
}

export async function getPendingRedemptions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(rewardRedemptions)
    .where(eq(rewardRedemptions.status, "pending"))
    .orderBy(desc(rewardRedemptions.createdAt));
}

export async function approveRedemption(id: number, approvedByStaffId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(rewardRedemptions).set({
    status: "approved",
    approvedByStaffId,
    approvedAt: new Date(),
  }).where(eq(rewardRedemptions.id, id));
}

// ============ PHOTO MISSIONS ============

export async function getActiveMissions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(photoMissions)
    .where(eq(photoMissions.active, true))
    .orderBy(desc(photoMissions.createdAt));
}

export async function createPhotoMission(data: typeof photoMissions.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(photoMissions).values(data);
}

// ============ PHOTO SUBMISSIONS ============

export async function createPhotoSubmission(data: typeof photoSubmissions.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(photoSubmissions).values(data);
}

export async function getPhotoSubmissionsByStaff(staffId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(photoSubmissions)
    .where(eq(photoSubmissions.staffId, staffId))
    .orderBy(desc(photoSubmissions.createdAt));
}

export async function getPhotoSubmissionsByMission(missionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(photoSubmissions)
    .where(eq(photoSubmissions.missionId, missionId))
    .orderBy(desc(photoSubmissions.createdAt));
}

export async function verifyPhotoSubmission(id: number, verifiedByStaffId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(photoSubmissions).set({
    verified: true,
    verifiedByStaffId,
  }).where(eq(photoSubmissions.id, id));
}

// ============ VENDOR PRODUCTS ============

export async function getVendorProducts(vendorName?: string) {
  const db = await getDb();
  if (!db) return [];
  if (vendorName) {
    return db.select().from(vendorProducts)
      .where(and(eq(vendorProducts.vendorName, vendorName), eq(vendorProducts.active, true)))
      .orderBy(vendorProducts.category, vendorProducts.productName);
  }
  return db.select().from(vendorProducts)
    .where(eq(vendorProducts.active, true))
    .orderBy(vendorProducts.vendorName, vendorProducts.category, vendorProducts.productName);
}

export async function createVendorProduct(data: typeof vendorProducts.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(vendorProducts).values(data);
}

export async function updateVendorProductPrice(id: number, newPrice: string) {
  const db = await getDb();
  if (!db) return;
  // Get current price to store as previous
  const existing = await db.select().from(vendorProducts).where(eq(vendorProducts.id, id)).limit(1);
  if (!existing[0]) return;
  const oldPrice = existing[0].lastPrice;
  const changePercent = oldPrice ? (((parseFloat(newPrice) - parseFloat(oldPrice)) / parseFloat(oldPrice)) * 100).toFixed(2) : null;
  await db.update(vendorProducts).set({
    previousPrice: oldPrice,
    lastPrice: newPrice,
    priceChangePercent: changePercent,
    lastOrderedAt: new Date(),
  }).where(eq(vendorProducts.id, id));
}

export async function upsertVendorProductFromOCR(vendorName: string, productName: string, price: string, unit?: string, category?: string) {
  const db = await getDb();
  if (!db) return;
  // Try to find existing product by vendor + product name (fuzzy match)
  const existing = await db.select().from(vendorProducts)
    .where(and(eq(vendorProducts.vendorName, vendorName), eq(vendorProducts.productName, productName)))
    .limit(1);
  if (existing[0]) {
    // Update price
    await updateVendorProductPrice(existing[0].id, price);
    return { action: "updated", id: existing[0].id };
  }
  // Create new product
  const validCategories = ["meat", "dairy", "produce", "bread", "frozen", "dry_goods", "paper", "chemicals", "liquor", "beer", "wine", "soda", "other"] as const;
  const cat = validCategories.includes(category as any) ? (category as typeof validCategories[number]) : "other";
  const result = await db.insert(vendorProducts).values({
    vendorName,
    productName,
    lastPrice: price,
    unit: unit || "each",
    category: cat,
    lastOrderedAt: new Date(),
  });
  return { action: "created", id: Number(result[0].insertId) };
}

// ============ ORDER GUIDE TEMPLATES ============

export async function getOrderGuides(staffId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (staffId) {
    return db.select().from(orderGuideTemplates)
      .where(eq(orderGuideTemplates.assignedToStaffId, staffId));
  }
  return db.select().from(orderGuideTemplates);
}

export async function createOrderGuide(data: typeof orderGuideTemplates.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(orderGuideTemplates).values(data);
}

// ============ BRIEFING MEMORY ============

export async function getRelevantMemories(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(briefingMemory)
    .where(
      sql`(${briefingMemory.expiresAt} IS NULL OR ${briefingMemory.expiresAt} > NOW())`
    )
    .orderBy(desc(briefingMemory.relevanceScore))
    .limit(limit);
}

export async function createBriefingMemory(data: typeof briefingMemory.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(briefingMemory).values(data);
}

export async function decayMemoryRelevance() {
  const db = await getDb();
  if (!db) return;
  // Decay all memories by 5% per day (called by daily job)
  await db.update(briefingMemory).set({
    relevanceScore: sql`GREATEST(${briefingMemory.relevanceScore} - 5, 0)`,
  });
}


// ============ WORKER TRAINING MODULES ============
import {
  workerTrainingModules, workerTrainingCompletions,
  workerSkillCertifications, workerEvaluations,
  workerWriteUps, workerCareerTrack,
  dailySales, hourlySales,
} from "../drizzle/schema";

export async function getTrainingModules(track?: string) {
  const db = await getDb();
  if (!db) return [];
  if (track) {
    return db.select().from(workerTrainingModules)
      .where(sql`${workerTrainingModules.requiredForTrack} = ${track} OR ${workerTrainingModules.requiredForTrack} = 'all'`)
      .orderBy(workerTrainingModules.requiredForLevel, workerTrainingModules.name);
  }
  return db.select().from(workerTrainingModules).orderBy(workerTrainingModules.category, workerTrainingModules.name);
}

export async function createTrainingModule(data: typeof workerTrainingModules.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(workerTrainingModules).values(data);
}

// ============ WORKER TRAINING COMPLETIONS ============

export async function getTrainingCompletions(staffId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(workerTrainingCompletions)
    .where(eq(workerTrainingCompletions.staffId, staffId))
    .orderBy(desc(workerTrainingCompletions.completedAt));
}

export async function createTrainingCompletion(data: typeof workerTrainingCompletions.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(workerTrainingCompletions).values(data);
}

// ============ WORKER SKILL CERTIFICATIONS ============

export async function getSkillCertifications(staffId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(workerSkillCertifications)
    .where(eq(workerSkillCertifications.staffId, staffId))
    .orderBy(desc(workerSkillCertifications.certifiedAt));
}

export async function createSkillCertification(data: typeof workerSkillCertifications.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(workerSkillCertifications).values(data);
}

// ============ WORKER EVALUATIONS ============

export async function getEvaluations(staffId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(workerEvaluations)
    .where(eq(workerEvaluations.staffId, staffId))
    .orderBy(desc(workerEvaluations.evaluatedAt));
}

export async function createEvaluation(data: typeof workerEvaluations.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Auto-compute average score
  const scores = [
    data.workQuality, data.attendance, data.jobKnowledge,
    data.teamwork, data.finishingTasks, data.overallAttitude,
    data.customerInteraction, data.multitasking, data.computerSkills,
  ];
  const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2);
  return db.insert(workerEvaluations).values({ ...data, averageScore: avg });
}

// ============ WORKER WRITE-UPS ============

export async function getWriteUps(staffId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(workerWriteUps)
    .where(eq(workerWriteUps.staffId, staffId))
    .orderBy(desc(workerWriteUps.issuedAt));
}

export async function getActiveWriteUps(staffId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(workerWriteUps)
    .where(sql`${workerWriteUps.staffId} = ${staffId} AND (${workerWriteUps.expiresAt} IS NULL OR ${workerWriteUps.expiresAt} > NOW()) AND ${workerWriteUps.resolvedAt} IS NULL`)
    .orderBy(desc(workerWriteUps.issuedAt));
}

export async function createWriteUp(data: typeof workerWriteUps.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(workerWriteUps).values(data);
}

export async function acknowledgeWriteUp(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(workerWriteUps)
    .set({ acknowledgedAt: new Date() })
    .where(eq(workerWriteUps.id, id));
}

// ============ WORKER CAREER TRACK ============

export async function getCareerTrack(staffId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(workerCareerTrack)
    .where(eq(workerCareerTrack.staffId, staffId));
}

export async function upsertCareerTrack(data: typeof workerCareerTrack.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Check if track exists for this staff + track combo
  const existing = await db.select().from(workerCareerTrack)
    .where(sql`${workerCareerTrack.staffId} = ${data.staffId} AND ${workerCareerTrack.track} = ${data.track}`)
    .limit(1);
  if (existing.length > 0) {
    return db.update(workerCareerTrack)
      .set({
        currentLevel: data.currentLevel,
        advancementReadinessScore: data.advancementReadinessScore,
        nextLevelRequirements: data.nextLevelRequirements,
        promotedAt: data.promotedAt,
        promotedById: data.promotedById,
      })
      .where(eq(workerCareerTrack.id, existing[0].id));
  }
  return db.insert(workerCareerTrack).values(data);
}

// ============ DAILY SALES ============

export async function getDailySales(startDate?: string, endDate?: string, limit = 90) {
  const db = await getDb();
  if (!db) return [];
  if (startDate && endDate) {
    return db.select().from(dailySales)
      .where(sql`${dailySales.businessDate} >= ${startDate} AND ${dailySales.businessDate} <= ${endDate}`)
      .orderBy(desc(dailySales.businessDate))
      .limit(limit);
  }
  return db.select().from(dailySales)
    .orderBy(desc(dailySales.businessDate))
    .limit(limit);
}

export async function upsertDailySales(data: typeof dailySales.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(dailySales)
    .where(eq(dailySales.businessDate, data.businessDate!))
    .limit(1);
  if (existing.length > 0) {
    return db.update(dailySales).set(data).where(eq(dailySales.id, existing[0].id));
  }
  return db.insert(dailySales).values(data);
}

// ============ HOURLY SALES ============

export async function getHourlySales(businessDate: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(hourlySales)
    .where(eq(hourlySales.businessDate, businessDate))
    .orderBy(hourlySales.hour);
}

export async function insertHourlySales(data: (typeof hourlySales.$inferInsert)[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (data.length === 0) return;
  return db.insert(hourlySales).values(data);
}

// ============ HISTORICAL PATTERN INTELLIGENCE ============

/**
 * Get historical sales patterns for a specific day of week.
 * Returns avg revenue, avg orders, peak hour, and comparison data
 * for the same day-of-week across all available history.
 */
export async function getDayOfWeekPattern(dayOfWeek: number) {
  const db = await getDb();
  if (!db) return null;
  // dayOfWeek: 0=Sunday, 1=Monday, ... 6=Saturday
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayName = dayNames[dayOfWeek];

  const results = await db.select().from(dailySales)
    .orderBy(desc(dailySales.businessDate));

  if (results.length === 0) return null;

  // Filter to matching day of week
  const matchingDays = results.filter(r => {
    const d = new Date(r.businessDate + "T12:00:00");
    return d.getDay() === dayOfWeek;
  });

  if (matchingDays.length === 0) return null;

  const revenues = matchingDays.map(d => parseFloat(d.grandTotal || "0")).filter(v => !isNaN(v));
  const avgRevenue = revenues.length > 0 ? revenues.reduce((a, b) => a + b, 0) / revenues.length : 0;
  const maxRevenue = Math.max(...revenues);
  const minRevenue = Math.min(...revenues);

  // Get the most recent same-day for comparison
  const lastSameDay = matchingDays[0];
  const lastSameDayRevenue = parseFloat(lastSameDay?.grandTotal || "0");

  return {
    dayName,
    sampleSize: matchingDays.length,
    avgRevenue: Math.round(avgRevenue * 100) / 100,
    maxRevenue: Math.round(maxRevenue * 100) / 100,
    minRevenue: Math.round(minRevenue * 100) / 100,
    lastSameDayDate: lastSameDay?.businessDate,
    lastSameDayRevenue: Math.round(lastSameDayRevenue * 100) / 100,
  };
}

/**
 * Get yesterday's sales data for briefing context.
 */
export async function getYesterdaySales() {
  const db = await getDb();
  if (!db) return null;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split("T")[0];

  const results = await db.select().from(dailySales)
    .where(eq(dailySales.businessDate, dateStr))
    .limit(1);

  return results[0] || null;
}

/**
 * Get recent sales trend (last 7 days) for briefing.
 */
export async function getRecentSalesTrend(days = 7) {
  const db = await getDb();
  if (!db) return [];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  return db.select().from(dailySales)
    .where(sql`${dailySales.businessDate} >= ${cutoffStr}`)
    .orderBy(desc(dailySales.businessDate));
}

// ============ PAR LEVEL SUGGESTIONS ============

/**
 * Suggest par levels for vendor products based on historical sales patterns.
 * Uses day-of-week averages + safety margin to recommend stock levels.
 * Returns suggestions for products that have sales correlation data.
 */
export async function getParLevelSuggestions() {
  const db = await getDb();
  if (!db) return [];

  // Get all vendor products
  const products = await db.select().from(vendorProducts).orderBy(vendorProducts.vendorName);
  if (products.length === 0) return [];

  // Get recent daily sales for pattern analysis (last 90 days)
  const sales = await getDailySales(undefined, undefined, 90);
  if (sales.length < 14) return products.map(p => ({
    id: p.id,
    vendorName: p.vendorName,
    productName: p.productName,
    category: p.category,
    unit: p.unit,
    currentPar: p.parLevel || 0,
    suggestedPar: p.parLevel || 0,
    confidence: "low" as const,
    reason: "Insufficient sales data (need 14+ days)",
    orderFrequency: p.orderFrequency,
    lastPrice: p.lastPrice,
  }));

  // Calculate day-of-week revenue averages
  const dayRevenues: Record<number, number[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  for (const day of sales) {
    const d = new Date(day.businessDate + "T12:00:00");
    const dow = d.getDay();
    const rev = parseFloat(day.grandTotal || "0");
    if (rev > 0) dayRevenues[dow].push(rev);
  }

  // Overall average daily revenue
  const allRevenues = sales.map(s => parseFloat(s.grandTotal || "0")).filter(v => v > 0);
  const avgDailyRevenue = allRevenues.reduce((a, b) => a + b, 0) / allRevenues.length;

  // Peak day multiplier (Friday/Saturday typically 1.3-1.5x)
  const peakDayAvg = Math.max(
    ...[0, 1, 2, 3, 4, 5, 6].map(d => {
      const revs = dayRevenues[d];
      return revs.length > 0 ? revs.reduce((a, b) => a + b, 0) / revs.length : 0;
    })
  );
  const peakMultiplier = avgDailyRevenue > 0 ? peakDayAvg / avgDailyRevenue : 1.3;

  return products.map(product => {
    const currentPar = product.parLevel || 0;

    // Category-based usage estimation
    // High-volume categories need more buffer
    const categoryMultiplier: Record<string, number> = {
      meat: 1.2, dairy: 1.1, produce: 1.3, bread: 1.2, frozen: 1.0,
      dry_goods: 0.8, paper: 0.7, chemicals: 0.5, liquor: 1.1,
      beer: 1.2, wine: 0.9, soda: 1.0, other: 1.0,
    };

    const catMult = categoryMultiplier[product.category] || 1.0;

    // Order frequency determines how many days of stock to keep
    const daysOfStock: Record<string, number> = {
      daily: 1.5, twice_weekly: 4, weekly: 8, biweekly: 16, monthly: 35, as_needed: 7,
    };
    const targetDays = daysOfStock[product.orderFrequency || "weekly"] || 8;

    // If we have a current par, suggest adjustment based on peak multiplier
    let suggestedPar = currentPar;
    let confidence: "high" | "medium" | "low" = "medium";
    let reason = "";

    if (currentPar > 0) {
      // Adjust existing par based on peak day patterns
      const adjustedPar = Math.ceil(currentPar * peakMultiplier * catMult / (peakMultiplier));
      if (adjustedPar > currentPar * 1.15) {
        suggestedPar = adjustedPar;
        reason = `Peak day revenue is ${Math.round(peakMultiplier * 100)}% of average — consider increasing par for ${product.category} items`;
        confidence = "medium";
      } else if (adjustedPar < currentPar * 0.85) {
        suggestedPar = adjustedPar;
        reason = `Current par may be high for typical volume — consider reducing to avoid waste`;
        confidence = "medium";
      } else {
        suggestedPar = currentPar;
        reason = "Current par level aligns with sales patterns";
        confidence = "high";
      }
    } else {
      // No par set — suggest based on category and frequency
      reason = "No par level set — suggestion based on category and order frequency";
      confidence = "low";
    }

    return {
      id: product.id,
      vendorName: product.vendorName,
      productName: product.productName,
      category: product.category,
      unit: product.unit,
      currentPar: currentPar,
      suggestedPar,
      confidence,
      reason,
      orderFrequency: product.orderFrequency,
      lastPrice: product.lastPrice,
    };
  });
}


// ============ INTELLIGENCE ENGINE HELPERS ============

/** Get void records with optional filters */
export async function getVoidRecords(filters?: { startDate?: string; endDate?: string; employeeName?: string; recordType?: string }) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(voidRecords).orderBy(desc(voidRecords.businessDate));
  // Note: Drizzle doesn't support dynamic where chaining easily, use raw for complex filters
  const rows = await query.limit(500);
  if (filters?.employeeName) {
    return rows.filter(r => r.employeeName?.toLowerCase().includes(filters.employeeName!.toLowerCase()));
  }
  if (filters?.startDate && filters?.endDate) {
    return rows.filter(r => r.businessDate >= filters.startDate! && r.businessDate <= filters.endDate!);
  }
  return rows;
}

/** Get void summary by employee — total voids, amount, avg per day */
export async function getVoidSummaryByEmployee() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(voidRecords);
  const byEmployee: Record<string, { name: string; count: number; total: number; days: Set<string> }> = {};
  for (const r of rows) {
    const name = r.employeeName || 'Unknown';
    if (!byEmployee[name]) byEmployee[name] = { name, count: 0, total: 0, days: new Set() };
    byEmployee[name].count++;
    byEmployee[name].total += parseFloat(r.amount?.toString() || '0');
    byEmployee[name].days.add(r.businessDate);
  }
  return Object.values(byEmployee).map(e => ({
    name: e.name,
    totalVoids: e.count,
    totalAmount: Math.round(e.total * 100) / 100,
    daysWorked: e.days.size,
    avgPerDay: Math.round((e.count / e.days.size) * 10) / 10,
  })).sort((a, b) => b.totalAmount - a.totalAmount);
}

/** Get product mix with category filtering */
export async function getProductMix(category?: string) {
  const db = await getDb();
  if (!db) return [];
  let rows;
  if (category && category !== 'all') {
    rows = await db.select().from(productMixEntries).where(eq(productMixEntries.category, category as any)).orderBy(desc(productMixEntries.totalAmount)).limit(100);
  } else {
    rows = await db.select().from(productMixEntries).orderBy(desc(productMixEntries.totalAmount)).limit(200);
  }
  // Aggregate by item name
  const byItem: Record<string, { name: string; category: string; totalAmount: number; totalQty: number }> = {};
  for (const r of rows) {
    const key = r.itemName;
    if (!byItem[key]) byItem[key] = { name: r.itemName, category: r.category || 'other', totalAmount: 0, totalQty: 0 };
    byItem[key].totalAmount += parseFloat(r.totalAmount?.toString() || '0');
    byItem[key].totalQty += r.totalQty || 0;
  }
  return Object.values(byItem).sort((a, b) => b.totalAmount - a.totalAmount).slice(0, 50);
}

/** Get weather data with optional forecast */
export async function getWeatherData(includeForecast = false) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(weatherData).orderBy(desc(weatherData.date)).limit(30);
  return rows;
}

/** Get weather correlation with sales — join weather + daily sales */
export async function getWeatherSalesCorrelation() {
  const db = await getDb();
  if (!db) return { rainyDays: { avg: 0, count: 0 }, dryDays: { avg: 0, count: 0 }, snowDays: { avg: 0, count: 0 }, deliveryImpact: { badWeather: 0, goodWeather: 0 } };
  
  const weather = await db.select().from(weatherData).where(eq(weatherData.isForecast, false));
  const sales = await db.select().from(dailySales);
  
  const salesByDate: Record<string, any> = {};
  for (const s of sales) salesByDate[s.businessDate] = s;
  
  let rainyTotal = 0, rainyCount = 0, dryTotal = 0, dryCount = 0, snowTotal = 0, snowCount = 0;
  let badDeliveryPct = 0, badDeliveryCount = 0, goodDeliveryPct = 0, goodDeliveryCount = 0;
  
  for (const w of weather) {
    const s = salesByDate[w.date];
    if (!s) continue;
    const rev = parseFloat(s.grandTotal?.toString() || '0');
    const precip = parseFloat(w.precipitation?.toString() || '0');
    const snow = parseFloat(w.snowfall?.toString() || '0');
    const deliveryPct = parseFloat(s.deliveryAmount?.toString() || '0') / (rev || 1) * 100;
    
    if (snow > 0) { snowTotal += rev; snowCount++; }
    if (precip > 0) { rainyTotal += rev; rainyCount++; badDeliveryPct += deliveryPct; badDeliveryCount++; }
    else { dryTotal += rev; dryCount++; goodDeliveryPct += deliveryPct; goodDeliveryCount++; }
  }
  
  return {
    rainyDays: { avg: rainyCount ? Math.round(rainyTotal / rainyCount) : 0, count: rainyCount },
    dryDays: { avg: dryCount ? Math.round(dryTotal / dryCount) : 0, count: dryCount },
    snowDays: { avg: snowCount ? Math.round(snowTotal / snowCount) : 0, count: snowCount },
    deliveryImpact: {
      badWeather: badDeliveryCount ? Math.round(badDeliveryPct / badDeliveryCount * 10) / 10 : 0,
      goodWeather: goodDeliveryCount ? Math.round(goodDeliveryPct / goodDeliveryCount * 10) / 10 : 0,
    },
  };
}

/** Get anomalies with severity filter */
export async function getAnomalies(severity?: string) {
  const db = await getDb();
  if (!db) return [];
  if (severity) {
    return db.select().from(intelligenceAnomalies).where(eq(intelligenceAnomalies.severity, severity as any)).orderBy(desc(intelligenceAnomalies.createdAt)).limit(100);
  }
  return db.select().from(intelligenceAnomalies).orderBy(desc(intelligenceAnomalies.createdAt)).limit(100);
}

/** Acknowledge an anomaly */
export async function acknowledgeAnomaly(id: number, acknowledgedBy: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(intelligenceAnomalies).set({ acknowledged: true, acknowledgedBy }).where(eq(intelligenceAnomalies.id, id));
}

/** Get local events for upcoming week */
export async function getUpcomingEvents() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(localEvents).orderBy(asc(localEvents.eventDate)).limit(20);
}

/** Add a local event */
export async function addLocalEvent(event: { eventName: string; eventDate: string; eventTime?: string; venue?: string; city?: string; distance?: number; category?: string; estimatedImpact?: string; attendanceEstimate?: number; notes?: string; source?: string }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(localEvents).values(event as any);
}

/** Get schedule intelligence for a week */
export async function getScheduleIntelligence(weekStart: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(scheduleIntelligence).where(eq(scheduleIntelligence.weekStart, weekStart)).limit(1);
  return rows[0] || null;
}

/** Save schedule intelligence */
export async function saveScheduleIntelligence(data: { weekStart: string; weekEnd: string; recommendations: any }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(scheduleIntelligence).values(data);
}

/** Get hourly sales heatmap data — average revenue by hour and day of week */
export async function getHourlySalesHeatmap() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(hourlySales);
  
  // Parse hours and aggregate by DOW + hour
  const heatmap: Record<string, { dow: number; hour: number; avgRevenue: number; count: number; total: number }> = {};
  
  for (const r of rows) {
    const dt = new Date(r.businessDate + 'T12:00:00');
    const dow = dt.getDay(); // 0=Sun
    
    // Parse hour from "1 PM-2 PM" format
    let hour = 0;
    const hourStr = r.hour || '';
    try {
      const parts = hourStr.split('-')[0].trim().split(' ');
      let h = parseInt(parts[0]);
      const ampm = parts[1]?.toUpperCase() || '';
      if (ampm === 'PM' && h !== 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      hour = h;
    } catch { continue; }
    
    const key = `${dow}-${hour}`;
    const total = parseFloat(r.total?.toString() || '0');
    if (!heatmap[key]) heatmap[key] = { dow, hour, avgRevenue: 0, count: 0, total: 0 };
    heatmap[key].total += total;
    heatmap[key].count++;
  }
  
  return Object.values(heatmap).map(h => ({
    dow: h.dow,
    hour: h.hour,
    avgRevenue: Math.round(h.total / h.count),
    dataPoints: h.count,
  }));
}


// ============ PRICE COMPARISON ============

/**
 * Compare current vendor product prices against historical invoice data.
 * Flags items with significant price changes (>5%) over last 4 invoices.
 */
export async function getPriceComparisons() {
  const db = await getDb();
  if (!db) return [];

  const products = await db.select().from(vendorProducts).orderBy(vendorProducts.vendorName);
  if (products.length === 0) return [];

  // Get all invoices with OCR line items
  const allInvoices = await db.select().from(invoices).orderBy(desc(invoices.createdAt));

  // Build price history per product from invoice line items
  const comparisons = products.map(product => {
    // Find invoices from same vendor
    const vendorInvoices = allInvoices.filter(inv =>
      inv.vendorName?.toLowerCase() === product.vendorName.toLowerCase()
    );

    // Extract prices from OCR line items
    const priceHistory: { date: string; price: number }[] = [];
    for (const inv of vendorInvoices.slice(0, 8)) {
      try {
        const items = typeof inv.items === "string" ? JSON.parse(inv.items as string) : inv.items;
        if (Array.isArray(items)) {
          for (const item of items) {
            if (item.description?.toLowerCase().includes(product.productName.toLowerCase().split(" ")[0])) {
              const price = parseFloat(item.unitPrice || item.price || "0");
              if (price > 0) {
                priceHistory.push({
                  date: inv.createdAt?.toISOString().split("T")[0] || "unknown",
                  price,
                });
              }
            }
          }
        }
      } catch { /* skip malformed OCR data */ }
    }

    const currentPrice = parseFloat(product.lastPrice || "0");
    const previousPrice = parseFloat(product.previousPrice || "0");
    const priceDelta = previousPrice > 0 ? ((currentPrice - previousPrice) / previousPrice * 100) : 0;

    return {
      id: product.id,
      vendorName: product.vendorName,
      productName: product.productName,
      category: product.category,
      currentPrice,
      previousPrice,
      priceDelta: Math.round(priceDelta * 10) / 10,
      direction: priceDelta > 5 ? "up" as const : priceDelta < -5 ? "down" as const : "stable" as const,
      flagged: Math.abs(priceDelta) > 5,
      priceHistory: priceHistory.slice(0, 4),
      lastUpdated: product.updatedAt,
    };
  });

  return comparisons.sort((a, b) => Math.abs(b.priceDelta) - Math.abs(a.priceDelta));
}

// ============ EVENT-AWARE BRIEFING ============

/**
 * Get event-aware context for daily briefings.
 * Combines upcoming events, weather, and historical patterns for today.
 */
export async function getEventAwareBriefingContext() {
  const db = await getDb();
  if (!db) return null;

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  // Get today's and tomorrow's events
  const events = await db.select().from(localEvents)
    .where(sql`${localEvents.eventDate} >= ${todayStr} AND ${localEvents.eventDate} <= ${tomorrowStr}`)
    .orderBy(localEvents.eventDate);

  // Get today's weather
  const weatherResults = await db.select().from(weatherData)
    .where(eq(weatherData.date, todayStr))
    .limit(1);

  // Get historical pattern for today's day of week
  const dayPattern = await getDayOfWeekPattern(today.getDay());

  // Get any high-severity anomalies from last 7 days
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const recentAnomalies = await db.select().from(intelligenceAnomalies)
    .where(sql`${intelligenceAnomalies.severity} = 'high' AND ${intelligenceAnomalies.acknowledged} = false AND ${intelligenceAnomalies.createdAt} >= ${weekAgo}`)
    .orderBy(desc(intelligenceAnomalies.createdAt))
    .limit(5);

  return {
    todayEvents: events.filter(e => e.eventDate === todayStr),
    tomorrowEvents: events.filter(e => e.eventDate === tomorrowStr),
    weather: weatherResults[0] || null,
    dayPattern,
    recentAnomalies,
    prepRecommendations: generatePrepRecommendations(events, dayPattern, weatherResults[0]),
  };
}

function generatePrepRecommendations(
  events: any[],
  dayPattern: any,
  weather: any
): string[] {
  const recs: string[] = [];

  if (dayPattern?.avgRevenue > 8000) {
    recs.push(`High-volume day expected ($${Math.round(dayPattern.avgRevenue).toLocaleString()} avg). Double-check prep levels.`);
  }

  if (events.length > 0) {
    for (const event of events) {
      if (event.estimatedImpact === "high") {
        recs.push(`${event.eventName} today — expect 15-25% surge. Extra prep on wings, pizza dough, and bar stock.`);
      } else if (event.estimatedImpact === "medium") {
        recs.push(`${event.eventName} nearby — may see 10-15% bump. Monitor and be ready to flex.`);
      }
    }
  }

  if (weather) {
    const temp = parseFloat(weather.tempHigh || "0");
    const precip = parseFloat(weather.precipitation || "0");
    if (precip > 0.5) {
      recs.push("Rain/snow expected — delivery volume likely up 15-20%. Staff extra drivers.");
    }
    if (temp > 85) {
      recs.push("Hot day — expect higher bar traffic, more cold drinks. Extra ice, check keg levels.");
    }
    if (temp < 20) {
      recs.push("Extreme cold — delivery heavy, dine-in light. Comfort food (soups, hot sandwiches) will move.");
    }
  }

  if (recs.length === 0) {
    recs.push("Standard day expected. Follow normal prep levels.");
  }

  return recs;
}


// ============ MANAGEMENT BRIEFING HELPERS ============

/** Save a management briefing */
export async function saveManagementBriefing(data: {
  targetRole: string;
  briefingType: string;
  title: string;
  summary: string;
  fullContent: string;
  dataSnapshot?: any;
  weatherContext?: any;
  eventsContext?: any;
  salesTrends?: any;
  anomalies?: any;
  theories?: any;
  actionItems?: any;
}) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(managementBriefings).values({
    targetRole: data.targetRole,
    briefingType: data.briefingType,
    title: data.title,
    summary: data.summary,
    fullContent: data.fullContent,
    dataSnapshot: data.dataSnapshot || null,
    weatherContext: data.weatherContext || null,
    eventsContext: data.eventsContext || null,
    salesTrends: data.salesTrends || null,
    anomalies: data.anomalies || null,
    theories: data.theories || null,
    actionItems: data.actionItems || null,
  });
  return result.insertId;
}

/** Get recent briefings for a role */
export async function getManagementBriefings(targetRole?: string, limit = 10) {
  const db = await getDb();
  if (!db) return [];
  if (targetRole) {
    return db.select().from(managementBriefings)
      .where(sql`${managementBriefings.targetRole} = ${targetRole} OR ${managementBriefings.targetRole} = 'all'`)
      .orderBy(desc(managementBriefings.generatedAt))
      .limit(limit);
  }
  return db.select().from(managementBriefings)
    .orderBy(desc(managementBriefings.generatedAt))
    .limit(limit);
}

/** Mark a briefing as read */
export async function markBriefingRead(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(managementBriefings).set({ readAt: new Date() }).where(eq(managementBriefings.id, id));
}

/** Mark a briefing as notification sent */
export async function markBriefingNotified(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(managementBriefings).set({ notificationSent: true }).where(eq(managementBriefings.id, id));
}

/** Get comprehensive data snapshot for briefing generation */
export async function getBriefingDataSnapshot() {
  const db = await getDb();
  if (!db) return null;

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().split("T")[0];

  // Next 7 days for events
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().split("T")[0];

  // 1. Recent daily sales (last 14 days for trend)
  const recentSales = await getDailySales(undefined, undefined, 14);

  // 2. Hourly sales patterns (last 7 days)
  const hourlyRows = await db.select().from(hourlySales)
    .where(sql`${hourlySales.businessDate} >= ${weekAgoStr}`)
    .orderBy(hourlySales.businessDate, hourlySales.hour);

  // 3. Product mix — food, beer, liquor, pop trends
  const foodMix = await getProductMix('food');
  const beerMix = await getProductMix('beer');
  const liquorMix = await getProductMix('liquor');
  const popMix = await getProductMix('pop');

  // 4. Weather — current + forecast
  const weather = await getWeatherData(true);

  // 5. Events within 30 miles in next 7 days
  const events = await db.select().from(localEvents)
    .where(sql`${localEvents.eventDate} >= ${todayStr} AND ${localEvents.eventDate} <= ${nextWeekStr}`)
    .orderBy(localEvents.eventDate);

  // 6. Void/comp/promo analysis (last 7 days)
  const recentVoids = await getVoidRecords({ startDate: weekAgoStr, endDate: todayStr });
  const voidSummary = await getVoidSummaryByEmployee();

  // 7. Anomalies (unacknowledged)
  const anomalyList = await getAnomalies();

  // 8. Day-of-week patterns
  const dowPatterns = await Promise.all(
    [0, 1, 2, 3, 4, 5, 6].map(d => getDayOfWeekPattern(d))
  );

  // 9. Weather-sales correlation
  const weatherCorrelation = await getWeatherSalesCorrelation();

  // Calculate category trends from daily sales
  const categoryTrends = recentSales.map(s => ({
    date: s.businessDate,
    food: parseFloat(s.catFoodAmount?.toString() || '0'),
    beer: parseFloat(s.catBeerAmount?.toString() || '0'),
    liquor: parseFloat(s.catLiquorAmount?.toString() || '0'),
    pop: parseFloat(s.catPopAmount?.toString() || '0'),
    total: parseFloat(s.grandTotal?.toString() || '0'),
    voids: s.voidsCount || 0,
    voidsAmount: parseFloat(s.voidsAmount?.toString() || '0'),
    discounts: s.discountCount || 0,
    discountTotal: parseFloat(s.discountTotal?.toString() || '0'),
  }));

  return {
    recentSales,
    hourlyPatterns: hourlyRows,
    productMix: { food: foodMix.slice(0, 10), beer: beerMix.slice(0, 10), liquor: liquorMix.slice(0, 10), pop: popMix.slice(0, 10) },
    weather: weather.slice(0, 10),
    events: events.filter(e => parseFloat(e.distance?.toString() || '999') <= 30),
    recentVoids: recentVoids.slice(0, 20),
    voidSummary: voidSummary.slice(0, 10),
    anomalies: anomalyList.filter((a: any) => !a.acknowledged).slice(0, 10),
    dowPatterns,
    weatherCorrelation,
    categoryTrends,
  };
}
