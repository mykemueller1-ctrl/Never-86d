import { eq, desc, and, gte, sql } from "drizzle-orm";
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
