import {
  eq,
  desc,
  asc,
  and,
  gte,
  lte,
  or,
  sql,
  isNotNull,
  isNull,
} from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  staff,
  InsertStaff,
  Staff,
  payouts,
  InsertPayout,
  invoices,
  InsertInvoice,
  voids,
  InsertVoid,
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
  stationBroadcasts,
  InsertStationBroadcast,
  notificationQueue,
  InsertNotificationQueueItem,
  priceAlerts,
  InsertPriceAlert,
  vendorProducts,
  skuCatalog,
  InsertSkuCatalogItem,
  skuPriceHistory,
  InsertSkuPriceHistoryEntry,
  recipes,
  InsertRecipe,
  recipeIngredients,
  InsertRecipeIngredient,
  menuItems,
  InsertMenuItem,
  wasteLog,
  InsertWasteLogEntry,
  scheduleShifts,
  InsertScheduleShift,
  availabilityWindows,
  InsertAvailabilityWindow,
  timeOffRequests,
  InsertTimeOffRequest,
  shiftSwapRequests,
  InsertShiftSwapRequest,
  timeEntries,
  InsertTimeEntry,
  securityEvents,
  InsertSecurityEvent,
  passwordResetTokens,
  scheduledJobRuns,
  InsertScheduledJobRun,
  sourceCatalog,
  InsertSourceCatalogEntry,
  ingestionDeadLetters,
  InsertIngestionDeadLetter,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

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

type SafeStaff = Omit<
  Staff,
  | "pin"
  | "phone"
  | "email"
  | "passwordHash"
  | "facebookAccessToken"
  | "facebookId"
>;

function stripSensitiveFields(s: Staff): SafeStaff {
  const {
    pin,
    phone,
    email,
    passwordHash,
    facebookAccessToken,
    facebookId,
    ...safe
  } = s;
  return safe;
}

function stripSensitiveFieldsArray(arr: Staff[]): SafeStaff[] {
  return arr.map(stripSensitiveFields);
}

// ============ USER HELPERS ============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
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
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0)
      updateSet.lastSignedIn = new Date();
    await db
      .insert(users)
      .values(values)
      .onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ STAFF HELPERS ============

/** Internal: returns raw staff record WITH pin (used only for PIN verification) */
export async function getStaffByPinInternal(pin: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(staff)
    .where(eq(staff.pin, pin))
    .limit(1);
  return result[0];
}

/** Public-safe: returns all staff WITHOUT sensitive fields */
export async function getAllStaff(): Promise<SafeStaff[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(staff)
    .orderBy(staff.department, staff.lastName);
  return stripSensitiveFieldsArray(rows);
}

/** Public-safe: returns single staff WITHOUT sensitive fields */
export async function getStaffById(id: number): Promise<SafeStaff | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(staff).where(eq(staff.id, id)).limit(1);
  return result[0] ? stripSensitiveFields(result[0]) : undefined;
}

/** Internal: returns full staff record for role-based access checks */
export async function getStaffByIdInternal(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(staff).where(eq(staff.id, id)).limit(1);
  return result[0] ?? null;
}

/** Public-safe: returns staff by department WITHOUT sensitive fields */
export async function getStaffByDepartment(
  department: string
): Promise<SafeStaff[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(staff)
    .where(eq(staff.department, department as any));
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
  await db
    .update(staff)
    .set({
      totalPoints: sql`${staff.totalPoints} + ${points}`,
      // schedulePriority auto-syncs: higher points = higher priority (capped at 100)
      schedulePriority: sql`LEAST(100, GREATEST(1, 50 + FLOOR((${staff.totalPoints} + ${points}) / 10)))`,
    })
    .where(eq(staff.id, staffId));
}

export async function updateStaffStatus(
  staffId: number,
  status: "active" | "inactive" | "terminated"
) {
  const db = await getDb();
  if (!db) return;
  await db.update(staff).set({ status }).where(eq(staff.id, staffId));
}

// ============ GOOGLE DRIVE STAFF SYNC ============

/** Sync staff phone/email from Google Drive employee data. Updates existing staff, creates new ones. */
export async function syncStaffFromDriveData(
  employees: Array<{
    name: string;
    phone?: string;
    email?: string;
    role?: string;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let updated = 0;
  let created = 0;
  let skipped = 0;

  for (const emp of employees) {
    const nameParts = emp.name.trim().split(/\s+/);
    if (nameParts.length < 2) {
      skipped++;
      continue;
    }
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ");

    // Try to match existing staff by first+last name
    const existing = await db
      .select()
      .from(staff)
      .where(
        and(
          sql`LOWER(${staff.firstName}) = LOWER(${firstName})`,
          sql`LOWER(${staff.lastName}) = LOWER(${lastName})`
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update phone/email if provided and not already set
      const updates: Record<string, string> = {};
      if (emp.phone && !existing[0].phone) updates.phone = emp.phone;
      if (emp.email && !existing[0].email) updates.email = emp.email;
      if (Object.keys(updates).length > 0) {
        await db
          .update(staff)
          .set(updates as any)
          .where(eq(staff.id, existing[0].id));
        updated++;
      } else {
        skipped++;
      }
    } else {
      // Map Drive role to DB department/jobRole
      const roleLower = (emp.role || "").toLowerCase().trim();
      let department:
        | "bar"
        | "dining_room"
        | "kitchen_line"
        | "pizza_side"
        | "driver"
        | "dishwasher"
        | "management" = "kitchen_line";
      let jobRole:
        | "owner"
        | "key_manager"
        | "kitchen_manager"
        | "kitchen_key"
        | "bartender"
        | "bar_manager"
        | "server"
        | "wait_staff"
        | "driver"
        | "line_cook"
        | "pizza"
        | "dishwasher" = "line_cook";

      if (roleLower.includes("owner")) {
        department = "management";
        jobRole = "owner";
      } else if (roleLower.includes("kitchen manager")) {
        department = "kitchen_line";
        jobRole = "kitchen_manager";
      } else if (roleLower.includes("bar manager")) {
        department = "bar";
        jobRole = "bar_manager";
      } else if (roleLower.includes("bar")) {
        department = "bar";
        jobRole = "bartender";
      } else if (roleLower.includes("driver")) {
        department = "driver";
        jobRole = "driver";
      } else if (roleLower.includes("dishwasher")) {
        department = "dishwasher";
        jobRole = "dishwasher";
      } else if (roleLower.includes("pizza")) {
        department = "pizza_side";
        jobRole = "pizza";
      } else if (roleLower.includes("kitchen")) {
        department = "kitchen_line";
        jobRole = "line_cook";
      } else if (roleLower.includes("server") || roleLower.includes("wait")) {
        department = "dining_room";
        jobRole = "wait_staff";
      }

      // Generate a random 4-digit PIN
      const pin = String(Math.floor(1000 + Math.random() * 9000));

      await db.insert(staff).values({
        firstName,
        lastName,
        phone: emp.phone || null,
        email: emp.email || null,
        department,
        jobRole,
        isKeyEmployee: false,
        canAuthPayouts: false,
        pin,
        status: "active",
      });
      created++;
    }
  }

  return { updated, created, skipped, total: employees.length };
}

// ============ AUTO-ARCHIVE HELPERS ============

/** Archive staff who haven't clocked in for 30+ days.
 *  IMPORTANT: Records with NULL lastClockIn are EXCLUDED — they have never clocked in,
 *  which is different from "hasn't clocked in recently." Only archive staff who HAVE
 *  a lastClockIn timestamp AND it's older than 30 days. */
export async function archiveInactiveStaff() {
  const db = await getDb();
  if (!db) return 0;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const result = await db
    .update(staff)
    .set({ status: "inactive" })
    .where(
      and(
        eq(staff.status, "active"),
        isNotNull(staff.lastClockIn),
        sql`${staff.lastClockIn} < ${thirtyDaysAgo}`
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
  return db
    .select()
    .from(payouts)
    .where(eq(payouts.flagged, true))
    .orderBy(desc(payouts.date));
}

export async function getPayoutsByStaff(staffId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(payouts)
    .where(eq(payouts.staffId, staffId))
    .orderBy(desc(payouts.date));
}

// ============ VENDOR RUNNING TOTALS ============

/** Get running total of payouts by vendor/category for a given period */
export async function getPayoutTotalsByCategory(days = 7) {
  const db = await getDb();
  if (!db) return [];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return db
    .select({
      category: payouts.category,
      total: sql<string>`CAST(SUM(${payouts.amount}) AS CHAR)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(payouts)
    .where(gte(payouts.date, since))
    .groupBy(payouts.category);
}

/** Get running total of payouts by vendor for a given period */
export async function getPayoutTotalsByVendor(days = 7) {
  const db = await getDb();
  if (!db) return [];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return db
    .select({
      vendor: payouts.vendor,
      total: sql<string>`CAST(SUM(${payouts.amount}) AS CHAR)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(payouts)
    .where(and(gte(payouts.date, since), sql`${payouts.vendor} IS NOT NULL`))
    .groupBy(payouts.vendor);
}

/** Get running total of invoices by vendor for a given period */
export async function getInvoiceTotalsByVendor(days = 7) {
  const db = await getDb();
  if (!db) return [];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return db
    .select({
      vendorName: invoices.vendorName,
      total: sql<string>`CAST(SUM(${invoices.totalAmount}) AS CHAR)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(invoices)
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

export async function getInvoiceByDedupeKey(dedupeKey: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(invoices)
    .where(eq(invoices.dedupeKey, dedupeKey))
    .limit(1);
  return result[0];
}

/**
 * Idempotent insert path used by scheduled imports. The job code computes a
 * stable dedupeKey from source/vendor/date/invoice number before this helper is
 * called, so duplicate messages can be skipped without throwing.
 */
export async function createInvoiceIfNew(
  data: InsertInvoice & { dedupeKey: string }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getInvoiceByDedupeKey(data.dedupeKey);
  if (existing) return { action: "skipped" as const, invoice: existing };
  const result = await db.insert(invoices).values(data);
  return { action: "inserted" as const, result };
}

export async function getInvoicesByVendor(vendorName: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(invoices)
    .where(eq(invoices.vendorName, vendorName))
    .orderBy(desc(invoices.date));
}

// ============ INGESTION AUDIT HELPERS ============

export async function createScheduledJobRun(data: InsertScheduledJobRun) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .insert(scheduledJobRuns)
    .values(data)
    .onDuplicateKeyUpdate({
      set: {
        startedAt: data.startedAt ?? new Date(),
        status: data.status ?? "running",
        sourceCounts: data.sourceCounts ?? null,
        insertedCounts: data.insertedCounts ?? null,
        updatedCounts: data.updatedCounts ?? null,
        deadLetterCounts: data.deadLetterCounts ?? null,
        errorSummary: data.errorSummary ?? null,
        nextAction: data.nextAction ?? null,
        endedAt: data.endedAt ?? null,
      },
    });
}

export async function finishScheduledJobRun(
  runId: string,
  data: Partial<InsertScheduledJobRun>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(scheduledJobRuns)
    .set({
      ...data,
      endedAt: data.endedAt ?? new Date(),
    })
    .where(eq(scheduledJobRuns.runId, runId));
}

export async function upsertSourceCatalogEntry(data: InsertSourceCatalogEntry) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db
    .select()
    .from(sourceCatalog)
    .where(
      and(
        eq(sourceCatalog.vendorName, data.vendorName),
        eq(sourceCatalog.sourceProvider, data.sourceProvider),
        eq(sourceCatalog.senderEmail, data.senderEmail)
      )
    )
    .limit(1);

  if (existing[0]) {
    await db
      .update(sourceCatalog)
      .set({
        subjectPattern: data.subjectPattern ?? existing[0].subjectPattern,
        attachmentType: data.attachmentType ?? existing[0].attachmentType,
        frequency: data.frequency ?? existing[0].frequency,
        lastSeenAt: data.lastSeenAt ?? new Date(),
        status: data.status ?? existing[0].status,
      })
      .where(eq(sourceCatalog.id, existing[0].id));
    return;
  }

  await db.insert(sourceCatalog).values(data);
}

export async function recordIngestionDeadLetter(
  data: InsertIngestionDeadLetter
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(ingestionDeadLetters).values(data);
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
  return db
    .select()
    .from(voids)
    .where(eq(voids.staffId, staffId))
    .orderBy(desc(voids.date));
}

export async function getWeeklyVoidsByStaff(staffId: number) {
  const db = await getDb();
  if (!db) return [];
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return db
    .select()
    .from(voids)
    .where(and(eq(voids.staffId, staffId), gte(voids.date, oneWeekAgo)));
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
  return db
    .select()
    .from(checklists)
    .where(eq(checklists.department, department as any));
}

export async function createChecklistCompletion(
  data: typeof checklistCompletions.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(checklistCompletions).values(data);
}

// ============ DRIVER REPORT HELPERS ============

export async function createDriverReport(
  data: typeof driverReports.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(driverReports).values(data);
}

export async function getDriverReports(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(driverReports)
    .orderBy(desc(driverReports.date))
    .limit(limit);
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

export async function addGamificationEvent(
  data: typeof gamificationEvents.$inferInsert
) {
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
  const rows = await db
    .select()
    .from(staff)
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
  return db
    .select()
    .from(issues)
    .where(eq(issues.status, "open"))
    .orderBy(desc(issues.priority), desc(issues.date));
}

// ============ DAILY BRIEFING HELPERS ============

export async function getLatestBriefing() {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(dailyBriefings)
    .orderBy(desc(dailyBriefings.date))
    .limit(1);
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

  // Generate a recent lastClockIn for each staff member (within last 7 days)
  // This prevents archiveInactiveStaff from marking them inactive
  const recentClockIn = () =>
    new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000));

  const staffData: InsertStaff[] = [
    // Owners
    {
      firstName: "Mychael",
      lastName: "Mueller",
      department: "management",
      jobRole: "owner",
      isKeyEmployee: true,
      canAuthPayouts: true,
      pin: "8686",
      employeeNumber: "001",
      status: "active",
      lastClockIn: recentClockIn(),
    },
    {
      firstName: "Sally",
      lastName: "Hart",
      department: "management",
      jobRole: "owner",
      isKeyEmployee: true,
      canAuthPayouts: true,
      pin: "8687",
      employeeNumber: "002",
      status: "active",
      lastClockIn: recentClockIn(),
    },
    // Key Manager
    {
      firstName: "Gavin",
      lastName: "Thomas",
      department: "management",
      jobRole: "key_manager",
      isKeyEmployee: true,
      canAuthPayouts: true,
      pin: "1234",
      employeeNumber: "003",
      status: "active",
      lastClockIn: recentClockIn(),
    },
    // Kitchen Manager
    {
      firstName: "Moe",
      lastName: "Thomas",
      department: "kitchen_line",
      jobRole: "kitchen_manager",
      isKeyEmployee: true,
      canAuthPayouts: true,
      pin: "4321",
      employeeNumber: "004",
      status: "active",
      lastClockIn: recentClockIn(),
    },
    // Kitchen Keys
    {
      firstName: "Che",
      lastName: "Lyftogt",
      department: "kitchen_line",
      jobRole: "kitchen_key",
      isKeyEmployee: true,
      canAuthPayouts: true,
      pin: "5678",
      employeeNumber: "005",
      status: "active",
      lastClockIn: recentClockIn(),
    },
    {
      firstName: "Steven",
      lastName: "Klein",
      department: "kitchen_line",
      jobRole: "kitchen_key",
      isKeyEmployee: true,
      canAuthPayouts: true,
      pin: "5679",
      employeeNumber: "006",
      status: "active",
      lastClockIn: recentClockIn(),
    },
    // Bar Staff
    {
      firstName: "Jessica",
      lastName: "Gailey",
      department: "bar",
      jobRole: "bar_manager",
      isKeyEmployee: false,
      canAuthPayouts: false,
      pin: "1001",
      employeeNumber: "54",
      status: "active",
      lastClockIn: recentClockIn(),
    },
    {
      firstName: "Karlee",
      lastName: "Sturtz",
      department: "bar",
      jobRole: "bartender",
      isKeyEmployee: false,
      canAuthPayouts: false,
      pin: "1002",
      employeeNumber: "055",
      status: "active",
      lastClockIn: recentClockIn(),
    },
    {
      firstName: "Ashley",
      lastName: "Holding",
      department: "bar",
      jobRole: "bartender",
      isKeyEmployee: false,
      canAuthPayouts: false,
      pin: "1003",
      employeeNumber: "137",
      status: "active",
      lastClockIn: recentClockIn(),
    },
    {
      firstName: "Kenzy",
      lastName: "Thompson",
      department: "bar",
      jobRole: "bartender",
      isKeyEmployee: false,
      canAuthPayouts: false,
      pin: "1004",
      employeeNumber: "056",
      status: "active",
      lastClockIn: recentClockIn(),
    },
    {
      firstName: "Jeri",
      lastName: "Wilson",
      department: "bar",
      jobRole: "bartender",
      isKeyEmployee: false,
      canAuthPayouts: false,
      pin: "1005",
      employeeNumber: "057",
      status: "active",
      lastClockIn: recentClockIn(),
    },
    {
      firstName: "Bryson",
      lastName: "Cook",
      department: "bar",
      jobRole: "bartender",
      isKeyEmployee: false,
      canAuthPayouts: false,
      pin: "1006",
      employeeNumber: "058",
      status: "active",
      lastClockIn: recentClockIn(),
    },
    {
      firstName: "Kaillee",
      lastName: "Miller",
      department: "bar",
      jobRole: "bartender",
      isKeyEmployee: false,
      canAuthPayouts: false,
      pin: "1007",
      employeeNumber: "059",
      status: "active",
      lastClockIn: recentClockIn(),
    },
    {
      firstName: "Samantha",
      lastName: "Swearingen",
      department: "bar",
      jobRole: "bartender",
      isKeyEmployee: false,
      canAuthPayouts: false,
      pin: "1008",
      employeeNumber: "060",
      status: "active",
      lastClockIn: recentClockIn(),
    },
    {
      firstName: "Azaria",
      lastName: "Silvey",
      department: "bar",
      jobRole: "bartender",
      isKeyEmployee: false,
      canAuthPayouts: false,
      pin: "1009",
      employeeNumber: "061",
      status: "active",
      lastClockIn: recentClockIn(),
    },
    // Kitchen Manager (Tom Dorothy is Kitchen Manager per Drive data)
    {
      firstName: "Thomas",
      lastName: "Dorothy",
      department: "kitchen_line",
      jobRole: "kitchen_manager",
      isKeyEmployee: true,
      canAuthPayouts: true,
      pin: "2001",
      employeeNumber: "062",
      status: "active",
      lastClockIn: recentClockIn(),
    },
    // Kitchen Crew
    {
      firstName: "Ryan",
      lastName: "Berg",
      department: "kitchen_line",
      jobRole: "line_cook",
      isKeyEmployee: false,
      canAuthPayouts: false,
      pin: "2002",
      employeeNumber: "063",
      status: "active",
      lastClockIn: recentClockIn(),
    },
    {
      firstName: "Gavin",
      lastName: "Nore",
      department: "kitchen_line",
      jobRole: "line_cook",
      isKeyEmployee: false,
      canAuthPayouts: false,
      pin: "2013",
      employeeNumber: "074",
      status: "active",
      lastClockIn: recentClockIn(),
    },
    {
      firstName: "Peyton",
      lastName: "Jones",
      department: "kitchen_line",
      jobRole: "line_cook",
      isKeyEmployee: false,
      canAuthPayouts: false,
      pin: "2014",
      employeeNumber: "075",
      status: "active",
      lastClockIn: recentClockIn(),
    },
    {
      firstName: "Dohnovan",
      lastName: "Hart",
      department: "kitchen_line",
      jobRole: "line_cook",
      isKeyEmployee: false,
      canAuthPayouts: false,
      pin: "2015",
      employeeNumber: "076",
      status: "active",
      lastClockIn: recentClockIn(),
    },
    {
      firstName: "Chris",
      lastName: "Sorenson",
      department: "kitchen_line",
      jobRole: "line_cook",
      isKeyEmployee: false,
      canAuthPayouts: false,
      pin: "2016",
      employeeNumber: "077",
      status: "active",
      lastClockIn: recentClockIn(),
    },
    {
      firstName: "Ian",
      lastName: "Ebelsheiser",
      department: "kitchen_line",
      jobRole: "line_cook",
      isKeyEmployee: false,
      canAuthPayouts: false,
      pin: "2010",
      employeeNumber: "071",
      status: "active",
      lastClockIn: recentClockIn(),
    },
    {
      firstName: "Jacob",
      lastName: "Lawton",
      department: "kitchen_line",
      jobRole: "line_cook",
      isKeyEmployee: false,
      canAuthPayouts: false,
      pin: "2011",
      employeeNumber: "072",
      status: "active",
      lastClockIn: recentClockIn(),
    },
    {
      firstName: "Matt",
      lastName: "Jones",
      department: "kitchen_line",
      jobRole: "line_cook",
      isKeyEmployee: false,
      canAuthPayouts: false,
      pin: "2017",
      employeeNumber: "078",
      status: "active",
      lastClockIn: recentClockIn(),
    },
    {
      firstName: "Ben",
      lastName: "Mason",
      department: "kitchen_line",
      jobRole: "line_cook",
      isKeyEmployee: false,
      canAuthPayouts: false,
      pin: "2018",
      employeeNumber: "079",
      status: "active",
      lastClockIn: recentClockIn(),
    },
    {
      firstName: "Kyler",
      lastName: "Preston",
      department: "kitchen_line",
      jobRole: "line_cook",
      isKeyEmployee: false,
      canAuthPayouts: false,
      pin: "2019",
      employeeNumber: "080",
      status: "active",
      lastClockIn: recentClockIn(),
    },
    {
      firstName: "Tyson",
      lastName: "Anderson",
      department: "kitchen_line",
      jobRole: "line_cook",
      isKeyEmployee: false,
      canAuthPayouts: false,
      pin: "2012",
      employeeNumber: "073",
      status: "active",
      lastClockIn: recentClockIn(),
    },
    {
      firstName: "Brodey",
      lastName: "Laughman",
      department: "kitchen_line",
      jobRole: "line_cook",
      isKeyEmployee: false,
      canAuthPayouts: false,
      pin: "2006",
      employeeNumber: "067",
      status: "active",
      lastClockIn: recentClockIn(),
    },
    {
      firstName: "Max",
      lastName: "George",
      department: "kitchen_line",
      jobRole: "line_cook",
      isKeyEmployee: false,
      canAuthPayouts: false,
      pin: "2007",
      employeeNumber: "068",
      status: "active",
      lastClockIn: recentClockIn(),
    },
    {
      firstName: "Dustin",
      lastName: "Stein",
      department: "kitchen_line",
      jobRole: "line_cook",
      isKeyEmployee: false,
      canAuthPayouts: false,
      pin: "2008",
      employeeNumber: "069",
      status: "active",
      lastClockIn: recentClockIn(),
    },
    {
      firstName: "Doc",
      lastName: "",
      department: "kitchen_line",
      jobRole: "line_cook",
      isKeyEmployee: false,
      canAuthPayouts: false,
      pin: "2009",
      employeeNumber: "070",
      status: "active",
      lastClockIn: recentClockIn(),
    },
    // Dishwasher
    {
      firstName: "Andrik",
      lastName: "Roest",
      department: "dishwasher",
      jobRole: "dishwasher",
      isKeyEmployee: false,
      canAuthPayouts: false,
      pin: "2003",
      employeeNumber: "064",
      status: "active",
      lastClockIn: recentClockIn(),
    },
    // Drivers
    {
      firstName: "Kim",
      lastName: "Pratt",
      department: "driver",
      jobRole: "driver",
      isKeyEmployee: false,
      canAuthPayouts: false,
      pin: "3001",
      employeeNumber: "081",
      status: "active",
      lastClockIn: recentClockIn(),
    },
    {
      firstName: "Bryce",
      lastName: "Delaney",
      department: "driver",
      jobRole: "driver",
      isKeyEmployee: false,
      canAuthPayouts: false,
      pin: "3002",
      employeeNumber: "082",
      status: "active",
      lastClockIn: recentClockIn(),
    },
    {
      firstName: "Nathaniel",
      lastName: "Lowrey",
      department: "driver",
      jobRole: "driver",
      isKeyEmployee: false,
      canAuthPayouts: false,
      pin: "3003",
      employeeNumber: "083",
      status: "active",
      lastClockIn: recentClockIn(),
    },
    {
      firstName: "Stephen",
      lastName: "Wheaton",
      department: "driver",
      jobRole: "driver",
      isKeyEmployee: false,
      canAuthPayouts: false,
      pin: "3004",
      employeeNumber: "084",
      status: "active",
      lastClockIn: recentClockIn(),
    },
    {
      firstName: "Braydon",
      lastName: "Austin",
      department: "driver",
      jobRole: "driver",
      isKeyEmployee: false,
      canAuthPayouts: false,
      pin: "3005",
      employeeNumber: "085",
      status: "active",
      lastClockIn: recentClockIn(),
    },
    {
      firstName: "John",
      lastName: "Carr",
      department: "driver",
      jobRole: "driver",
      isKeyEmployee: false,
      canAuthPayouts: false,
      pin: "3006",
      employeeNumber: "086",
      status: "active",
      lastClockIn: recentClockIn(),
    },
    {
      firstName: "Keaton",
      lastName: "Seehusen",
      department: "driver",
      jobRole: "driver",
      isKeyEmployee: false,
      canAuthPayouts: false,
      pin: "3007",
      employeeNumber: "087",
      status: "active",
      lastClockIn: recentClockIn(),
    },
    {
      firstName: "Daniel",
      lastName: "Murphy",
      department: "driver",
      jobRole: "driver",
      isKeyEmployee: false,
      canAuthPayouts: false,
      pin: "3008",
      employeeNumber: "088",
      status: "active",
      lastClockIn: recentClockIn(),
    },
    // Dining Room / Wait Staff
    {
      firstName: "Kenzy",
      lastName: "Thompson",
      department: "dining_room",
      jobRole: "wait_staff",
      isKeyEmployee: false,
      canAuthPayouts: false,
      pin: "4001",
      employeeNumber: "089",
      status: "active",
      lastClockIn: recentClockIn(),
    },
    {
      firstName: "Jeri",
      lastName: "Wilson",
      department: "dining_room",
      jobRole: "wait_staff",
      isKeyEmployee: false,
      canAuthPayouts: false,
      pin: "4002",
      employeeNumber: "090",
      status: "active",
      lastClockIn: recentClockIn(),
    },
    {
      firstName: "Joleah",
      lastName: "Stuhr",
      department: "dining_room",
      jobRole: "wait_staff",
      isKeyEmployee: false,
      canAuthPayouts: false,
      pin: "4003",
      employeeNumber: "091",
      status: "active",
      lastClockIn: recentClockIn(),
    },
    // Pizza Side
    {
      firstName: "Josue",
      lastName: "Soto-Maldonado",
      department: "pizza_side",
      jobRole: "pizza",
      isKeyEmployee: false,
      canAuthPayouts: false,
      pin: "5001",
      employeeNumber: "092",
      status: "active",
      lastClockIn: recentClockIn(),
    },
  ];

  await db.insert(staff).values(staffData);
  return {
    message: `Seeded ${staffData.length} staff members (all active, with recent lastClockIn)`,
  };
}

// ============================================================
// AI-NATIVE INTELLIGENCE LAYER — DB HELPERS
// ============================================================

import {
  knowledgeEntries,
  InsertKnowledgeEntry,
  KnowledgeEntry,
  knowledgeCorrections,
  achievementDefinitions,
  AchievementDefinition,
  staffAchievementProgress,
  staffAchievementUnlocks,
  rewards,
  rewardRedemptions,
  photoMissions,
  photoSubmissions,
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
  return db
    .select()
    .from(knowledgeEntries)
    .where(eq(knowledgeEntries.station, station as any))
    .orderBy(desc(knowledgeEntries.confidence))
    .limit(limit);
}

export async function getKnowledgeByCategory(category: string, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(knowledgeEntries)
    .where(eq(knowledgeEntries.category, category as any))
    .limit(limit);
}

export async function searchKnowledge(
  query: string,
  station?: string,
  limit = 20
) {
  const db = await getDb();
  if (!db) return [];

  // Stop words that match too broadly
  const stopWords = new Set([
    "what",
    "how",
    "when",
    "where",
    "why",
    "who",
    "which",
    "is",
    "are",
    "was",
    "were",
    "do",
    "does",
    "did",
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "it",
    "this",
    "that",
    "my",
    "our",
    "we",
    "i",
    "me",
    "you",
    "can",
    "should",
    "would",
    "could",
  ]);

  // Split query into keywords, remove stop words for individual matching
  const allWords = query
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length >= 2);
  const contentWords = allWords.filter(w => !stopWords.has(w));
  // If all words are stop words, use all words anyway
  const words = contentWords.length > 0 ? contentWords : allWords;
  const fullQuery = query.toLowerCase();

  // Generate search term variants (handle apostrophes, common abbreviations)
  const variants: string[] = [];
  for (const word of words) {
    variants.push(word);
    // Add apostrophe variants: 86d -> 86'd, 86'd -> 86d
    if (!word.includes("'"))
      variants.push(word.replace(/(\d)([a-z])/g, "$1'$2"));
    if (word.includes("'")) variants.push(word.replace(/'/g, ""));
  }
  const uniqueVariants = Array.from(new Set(variants));

  // Build search conditions - match full query OR any keyword/variant
  const searchTerms = [fullQuery, ...uniqueVariants.slice(0, 8)];

  // Use drizzle's sql template for reliable execution
  const searchConditions = searchTerms.map(term =>
    or(
      sql`LOWER(${knowledgeEntries.question}) LIKE ${"%" + term + "%"}`,
      sql`LOWER(${knowledgeEntries.answer}) LIKE ${"%" + term + "%"}`,
      sql`LOWER(COALESCE(JSON_UNQUOTE(${knowledgeEntries.tags}), '')) LIKE ${"%" + term + "%"}`
    )
  );

  const conditions: any[] = [or(...searchConditions)!];
  if (station && station !== "general") {
    conditions.push(
      sql`(${knowledgeEntries.station} = ${station} OR ${knowledgeEntries.station} = 'general')`
    );
  }

  const results = await db
    .select()
    .from(knowledgeEntries)
    .where(and(...conditions))
    .limit(limit * 3); // Fetch more, then score and sort in JS

  // Score results in JavaScript for reliable relevance ranking
  const scored = results.map(entry => {
    let score = 0;
    const q = (entry.question || "").toLowerCase();
    const a = (entry.answer || "").toLowerCase();
    const t = JSON.stringify(entry.tags || []).toLowerCase();
    // Also check against a normalized version (no apostrophes/special chars)
    const qNorm = q.replace(/['']/g, "");
    const aNorm = a.replace(/['']/g, "");
    const tNorm = t.replace(/['']/g, "");
    const fullQueryNorm = fullQuery.replace(/['']/g, "");

    // Full query match in question = highest score
    if (q.includes(fullQuery) || qNorm.includes(fullQueryNorm)) score += 100;
    // Full query match in tags
    if (t.includes(fullQuery) || tNorm.includes(fullQueryNorm)) score += 50;
    // Full query match in answer
    if (a.includes(fullQuery) || aNorm.includes(fullQueryNorm)) score += 20;

    // Individual word + variant matches
    for (const variant of uniqueVariants) {
      if (q.includes(variant) || qNorm.includes(variant.replace(/['']/g, "")))
        score += 10;
      if (t.includes(variant) || tNorm.includes(variant.replace(/['']/g, "")))
        score += 5;
      if (a.includes(variant) || aNorm.includes(variant.replace(/['']/g, "")))
        score += 2;
    }

    // Confidence boost
    if (entry.confidence === "high") score += 3;
    else if (entry.confidence === "medium") score += 1;

    return { ...entry, relevance: score };
  });

  // Sort by relevance score descending, take top N
  scored.sort((a, b) => b.relevance - a.relevance);
  return scored.slice(0, limit);
}

export async function updateKnowledgeEntry(
  id: number,
  data: Partial<InsertKnowledgeEntry>
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(knowledgeEntries)
    .set(data)
    .where(eq(knowledgeEntries.id, id));
}

export async function getAllKnowledge(limit = 200) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(knowledgeEntries)
    .orderBy(desc(knowledgeEntries.updatedAt))
    .limit(limit);
}

// ============ KNOWLEDGE CORRECTIONS ============

export async function createKnowledgeCorrection(
  data: typeof knowledgeCorrections.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(knowledgeCorrections).values(data);
}

export async function getPendingCorrections() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(knowledgeCorrections)
    .where(eq(knowledgeCorrections.status, "pending"))
    .orderBy(desc(knowledgeCorrections.createdAt));
}

export async function approveCorrection(id: number, approvedByStaffId: number) {
  const db = await getDb();
  if (!db) return;
  // Get the correction
  const corrections = await db
    .select()
    .from(knowledgeCorrections)
    .where(eq(knowledgeCorrections.id, id))
    .limit(1);
  if (!corrections[0]) return;
  const correction = corrections[0];
  // Update the correction status
  await db
    .update(knowledgeCorrections)
    .set({
      status: "approved",
      approvedByStaffId,
      approvedAt: new Date(),
    })
    .where(eq(knowledgeCorrections.id, id));
  // Update the knowledge entry with the new answer
  await db
    .update(knowledgeEntries)
    .set({
      answer: correction.newAnswer,
      confidence: "high",
      source: "correction",
      correctionsCount: sql`${knowledgeEntries.correctionsCount} + 1`,
      lastCorrectedAt: new Date(),
    })
    .where(eq(knowledgeEntries.id, correction.entryId));
}

export async function rejectCorrection(id: number, approvedByStaffId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(knowledgeCorrections)
    .set({
      status: "rejected",
      approvedByStaffId,
      approvedAt: new Date(),
    })
    .where(eq(knowledgeCorrections.id, id));
}

// ============ ACHIEVEMENT DEFINITIONS ============

export async function getAllAchievements() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(achievementDefinitions)
    .orderBy(achievementDefinitions.category);
}

export async function createAchievementDefinition(
  data: typeof achievementDefinitions.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(achievementDefinitions).values(data);
}

// ============ STAFF ACHIEVEMENT PROGRESS ============

export async function getStaffAchievementProgress(staffId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(staffAchievementProgress)
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
  const existing = await db
    .select()
    .from(staffAchievementProgress)
    .where(
      and(
        eq(staffAchievementProgress.staffId, staffId),
        eq(staffAchievementProgress.achievementId, achievementId)
      )
    )
    .limit(1);
  if (existing[0]) {
    await db
      .update(staffAchievementProgress)
      .set({
        currentValue,
        bestValue: Math.max(bestValue, existing[0].bestValue),
        status,
        lastEventDate: new Date(),
      })
      .where(eq(staffAchievementProgress.id, existing[0].id));
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
  return db
    .select()
    .from(staffAchievementUnlocks)
    .where(eq(staffAchievementUnlocks.staffId, staffId))
    .orderBy(desc(staffAchievementUnlocks.earnedAt));
}

export async function createAchievementUnlock(
  data: typeof staffAchievementUnlocks.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(staffAchievementUnlocks).values(data);
}

export async function acknowledgeUnlock(
  staffId: number,
  achievementId: number
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(staffAchievementProgress)
    .set({
      acknowledgedAt: new Date(),
    })
    .where(
      and(
        eq(staffAchievementProgress.staffId, staffId),
        eq(staffAchievementProgress.achievementId, achievementId)
      )
    );
}

// ============ REWARDS ============

export async function getAllRewards() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(rewards)
    .where(eq(rewards.active, true))
    .orderBy(rewards.pointsCost);
}

export async function createReward(data: typeof rewards.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(rewards).values(data);
}

export async function createRedemption(
  data: typeof rewardRedemptions.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(rewardRedemptions).values(data);
}

export async function getStaffRedemptions(staffId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(rewardRedemptions)
    .where(eq(rewardRedemptions.staffId, staffId))
    .orderBy(desc(rewardRedemptions.createdAt));
}

export async function getPendingRedemptions() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(rewardRedemptions)
    .where(eq(rewardRedemptions.status, "pending"))
    .orderBy(desc(rewardRedemptions.createdAt));
}

export async function approveRedemption(id: number, approvedByStaffId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(rewardRedemptions)
    .set({
      status: "approved",
      approvedByStaffId,
      approvedAt: new Date(),
    })
    .where(eq(rewardRedemptions.id, id));
}

// ============ PHOTO MISSIONS ============

export async function getActiveMissions() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(photoMissions)
    .where(eq(photoMissions.active, true))
    .orderBy(desc(photoMissions.createdAt));
}

export async function createPhotoMission(
  data: typeof photoMissions.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(photoMissions).values(data);
}

// ============ PHOTO SUBMISSIONS ============

export async function createPhotoSubmission(
  data: typeof photoSubmissions.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(photoSubmissions).values(data);
}

export async function getPhotoSubmissionsByStaff(staffId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(photoSubmissions)
    .where(eq(photoSubmissions.staffId, staffId))
    .orderBy(desc(photoSubmissions.createdAt));
}

export async function getPhotoSubmissionsByMission(missionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(photoSubmissions)
    .where(eq(photoSubmissions.missionId, missionId))
    .orderBy(desc(photoSubmissions.createdAt));
}

export async function verifyPhotoSubmission(
  id: number,
  verifiedByStaffId: number
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(photoSubmissions)
    .set({
      verified: true,
      verifiedByStaffId,
    })
    .where(eq(photoSubmissions.id, id));
}

// ============ VENDOR PRODUCTS ============

export async function getVendorProducts(vendorName?: string) {
  const db = await getDb();
  if (!db) return [];
  if (vendorName) {
    return db
      .select()
      .from(vendorProducts)
      .where(
        and(
          eq(vendorProducts.vendorName, vendorName),
          eq(vendorProducts.active, true)
        )
      )
      .orderBy(vendorProducts.category, vendorProducts.productName);
  }
  return db
    .select()
    .from(vendorProducts)
    .where(eq(vendorProducts.active, true))
    .orderBy(
      vendorProducts.vendorName,
      vendorProducts.category,
      vendorProducts.productName
    );
}

export async function createVendorProduct(
  data: typeof vendorProducts.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(vendorProducts).values(data);
}

export async function updateVendorProductPrice(id: number, newPrice: string) {
  const db = await getDb();
  if (!db) return;
  // Get current price to store as previous
  const existing = await db
    .select()
    .from(vendorProducts)
    .where(eq(vendorProducts.id, id))
    .limit(1);
  if (!existing[0]) return;
  const oldPrice = existing[0].lastPrice;
  const changePercent = oldPrice
    ? (
        ((parseFloat(newPrice) - parseFloat(oldPrice)) / parseFloat(oldPrice)) *
        100
      ).toFixed(2)
    : null;
  await db
    .update(vendorProducts)
    .set({
      previousPrice: oldPrice,
      lastPrice: newPrice,
      priceChangePercent: changePercent,
      lastOrderedAt: new Date(),
    })
    .where(eq(vendorProducts.id, id));
}

export async function upsertVendorProductFromOCR(
  vendorName: string,
  productName: string,
  price: string,
  unit?: string,
  category?: string
) {
  const db = await getDb();
  if (!db) return;
  // Try to find existing product by vendor + product name (fuzzy match)
  const existing = await db
    .select()
    .from(vendorProducts)
    .where(
      and(
        eq(vendorProducts.vendorName, vendorName),
        eq(vendorProducts.productName, productName)
      )
    )
    .limit(1);
  if (existing[0]) {
    // Update price
    await updateVendorProductPrice(existing[0].id, price);
    return { action: "updated", id: existing[0].id };
  }
  // Create new product
  const validCategories = [
    "meat",
    "dairy",
    "produce",
    "bread",
    "frozen",
    "dry_goods",
    "paper",
    "chemicals",
    "liquor",
    "beer",
    "wine",
    "soda",
    "other",
  ] as const;
  const cat = validCategories.includes(category as any)
    ? (category as (typeof validCategories)[number])
    : "other";
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
    return db
      .select()
      .from(orderGuideTemplates)
      .where(eq(orderGuideTemplates.assignedToStaffId, staffId));
  }
  return db.select().from(orderGuideTemplates);
}

export async function createOrderGuide(
  data: typeof orderGuideTemplates.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(orderGuideTemplates).values(data);
}

// ============ BRIEFING MEMORY ============

export async function getRelevantMemories(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(briefingMemory)
    .where(
      sql`(${briefingMemory.expiresAt} IS NULL OR ${briefingMemory.expiresAt} > NOW())`
    )
    .orderBy(desc(briefingMemory.relevanceScore))
    .limit(limit);
}

export async function createBriefingMemory(
  data: typeof briefingMemory.$inferInsert
) {
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
  workerTrainingModules,
  workerTrainingCompletions,
  workerSkillCertifications,
  workerEvaluations,
  workerWriteUps,
  workerCareerTrack,
  dailySales,
  hourlySales,
} from "../drizzle/schema";

export async function getTrainingModules(track?: string) {
  const db = await getDb();
  if (!db) return [];
  if (track) {
    return db
      .select()
      .from(workerTrainingModules)
      .where(
        sql`${workerTrainingModules.requiredForTrack} = ${track} OR ${workerTrainingModules.requiredForTrack} = 'all'`
      )
      .orderBy(
        workerTrainingModules.requiredForLevel,
        workerTrainingModules.name
      );
  }
  return db
    .select()
    .from(workerTrainingModules)
    .orderBy(workerTrainingModules.category, workerTrainingModules.name);
}

export async function createTrainingModule(
  data: typeof workerTrainingModules.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(workerTrainingModules).values(data);
}

// ============ WORKER TRAINING COMPLETIONS ============

export async function getTrainingCompletions(staffId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(workerTrainingCompletions)
    .where(eq(workerTrainingCompletions.staffId, staffId))
    .orderBy(desc(workerTrainingCompletions.completedAt));
}

export async function createTrainingCompletion(
  data: typeof workerTrainingCompletions.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(workerTrainingCompletions).values(data);
}

// ============ WORKER SKILL CERTIFICATIONS ============

export async function getSkillCertifications(staffId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(workerSkillCertifications)
    .where(eq(workerSkillCertifications.staffId, staffId))
    .orderBy(desc(workerSkillCertifications.certifiedAt));
}

export async function createSkillCertification(
  data: typeof workerSkillCertifications.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(workerSkillCertifications).values(data);
}

// ============ WORKER EVALUATIONS ============

export async function getEvaluations(staffId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(workerEvaluations)
    .where(eq(workerEvaluations.staffId, staffId))
    .orderBy(desc(workerEvaluations.evaluatedAt));
}

export async function createEvaluation(
  data: typeof workerEvaluations.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Auto-compute average score
  const scores = [
    data.workQuality,
    data.attendance,
    data.jobKnowledge,
    data.teamwork,
    data.finishingTasks,
    data.overallAttitude,
    data.customerInteraction,
    data.multitasking,
    data.computerSkills,
  ];
  const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2);
  return db.insert(workerEvaluations).values({ ...data, averageScore: avg });
}

// ============ WORKER WRITE-UPS ============

export async function getWriteUps(staffId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(workerWriteUps)
    .where(eq(workerWriteUps.staffId, staffId))
    .orderBy(desc(workerWriteUps.issuedAt));
}

export async function getActiveWriteUps(staffId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(workerWriteUps)
    .where(
      sql`${workerWriteUps.staffId} = ${staffId} AND (${workerWriteUps.expiresAt} IS NULL OR ${workerWriteUps.expiresAt} > NOW()) AND ${workerWriteUps.resolvedAt} IS NULL`
    )
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
  return db
    .update(workerWriteUps)
    .set({ acknowledgedAt: new Date() })
    .where(eq(workerWriteUps.id, id));
}

// ============ WORKER CAREER TRACK ============

export async function getCareerTrack(staffId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(workerCareerTrack)
    .where(eq(workerCareerTrack.staffId, staffId));
}

export async function upsertCareerTrack(
  data: typeof workerCareerTrack.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Check if track exists for this staff + track combo
  const existing = await db
    .select()
    .from(workerCareerTrack)
    .where(
      sql`${workerCareerTrack.staffId} = ${data.staffId} AND ${workerCareerTrack.track} = ${data.track}`
    )
    .limit(1);
  if (existing.length > 0) {
    return db
      .update(workerCareerTrack)
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

export async function getDailySales(
  startDate?: string,
  endDate?: string,
  limit = 90
) {
  const db = await getDb();
  if (!db) return [];
  if (startDate && endDate) {
    return db
      .select()
      .from(dailySales)
      .where(
        sql`${dailySales.businessDate} >= ${startDate} AND ${dailySales.businessDate} <= ${endDate}`
      )
      .orderBy(desc(dailySales.businessDate))
      .limit(limit);
  }
  return db
    .select()
    .from(dailySales)
    .orderBy(desc(dailySales.businessDate))
    .limit(limit);
}

export async function upsertDailySales(data: typeof dailySales.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db
    .select()
    .from(dailySales)
    .where(eq(dailySales.businessDate, data.businessDate!))
    .limit(1);
  if (existing.length > 0) {
    return db
      .update(dailySales)
      .set(data)
      .where(eq(dailySales.id, existing[0].id));
  }
  return db.insert(dailySales).values(data);
}

export async function getDailySalesByDedupeKey(dedupeKey: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(dailySales)
    .where(eq(dailySales.dedupeKey, dedupeKey))
    .limit(1);
  return result[0];
}

export async function createDailySalesIfNew(
  data: typeof dailySales.$inferInsert & { dedupeKey: string }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existingByDedupe = await getDailySalesByDedupeKey(data.dedupeKey);
  if (existingByDedupe)
    return { action: "skipped" as const, dailySales: existingByDedupe };

  const existingByDate = await db
    .select()
    .from(dailySales)
    .where(eq(dailySales.businessDate, data.businessDate!))
    .limit(1);
  if (existingByDate[0])
    return { action: "skipped" as const, dailySales: existingByDate[0] };

  const result = await db.insert(dailySales).values(data);
  return { action: "inserted" as const, result };
}

// ============ HOURLY SALES ============

export async function getHourlySales(businessDate: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(hourlySales)
    .where(eq(hourlySales.businessDate, businessDate))
    .orderBy(hourlySales.hour);
}

export async function insertHourlySales(
  data: (typeof hourlySales.$inferInsert)[]
) {
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
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const dayName = dayNames[dayOfWeek];

  const results = await db
    .select()
    .from(dailySales)
    .orderBy(desc(dailySales.businessDate));

  if (results.length === 0) return null;

  // Filter to matching day of week
  const matchingDays = results.filter(r => {
    const d = new Date(r.businessDate + "T12:00:00");
    return d.getDay() === dayOfWeek;
  });

  if (matchingDays.length === 0) return null;

  const revenues = matchingDays
    .map(d => parseFloat(d.grandTotal || "0"))
    .filter(v => !isNaN(v));
  const avgRevenue =
    revenues.length > 0
      ? revenues.reduce((a, b) => a + b, 0) / revenues.length
      : 0;
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

  const results = await db
    .select()
    .from(dailySales)
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

  return db
    .select()
    .from(dailySales)
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
  const products = await db
    .select()
    .from(vendorProducts)
    .orderBy(vendorProducts.vendorName);
  if (products.length === 0) return [];

  // Get recent daily sales for pattern analysis (last 90 days)
  const sales = await getDailySales(undefined, undefined, 90);
  if (sales.length < 14)
    return products.map(p => ({
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
  const dayRevenues: Record<number, number[]> = {
    0: [],
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: [],
  };
  for (const day of sales) {
    const d = new Date(day.businessDate + "T12:00:00");
    const dow = d.getDay();
    const rev = parseFloat(day.grandTotal || "0");
    if (rev > 0) dayRevenues[dow].push(rev);
  }

  // Overall average daily revenue
  const allRevenues = sales
    .map(s => parseFloat(s.grandTotal || "0"))
    .filter(v => v > 0);
  const avgDailyRevenue =
    allRevenues.reduce((a, b) => a + b, 0) / allRevenues.length;

  // Peak day multiplier (Friday/Saturday typically 1.3-1.5x)
  const peakDayAvg = Math.max(
    ...[0, 1, 2, 3, 4, 5, 6].map(d => {
      const revs = dayRevenues[d];
      return revs.length > 0
        ? revs.reduce((a, b) => a + b, 0) / revs.length
        : 0;
    })
  );
  const peakMultiplier =
    avgDailyRevenue > 0 ? peakDayAvg / avgDailyRevenue : 1.3;

  return products.map(product => {
    const currentPar = product.parLevel || 0;

    // Category-based usage estimation
    // High-volume categories need more buffer
    const categoryMultiplier: Record<string, number> = {
      meat: 1.2,
      dairy: 1.1,
      produce: 1.3,
      bread: 1.2,
      frozen: 1.0,
      dry_goods: 0.8,
      paper: 0.7,
      chemicals: 0.5,
      liquor: 1.1,
      beer: 1.2,
      wine: 0.9,
      soda: 1.0,
      other: 1.0,
    };

    const catMult = categoryMultiplier[product.category] || 1.0;

    // Order frequency determines how many days of stock to keep
    const daysOfStock: Record<string, number> = {
      daily: 1.5,
      twice_weekly: 4,
      weekly: 8,
      biweekly: 16,
      monthly: 35,
      as_needed: 7,
    };
    const targetDays = daysOfStock[product.orderFrequency || "weekly"] || 8;

    // If we have a current par, suggest adjustment based on peak multiplier
    let suggestedPar = currentPar;
    let confidence: "high" | "medium" | "low" = "medium";
    let reason = "";

    if (currentPar > 0) {
      // Adjust existing par based on peak day patterns
      const adjustedPar = Math.ceil(
        (currentPar * peakMultiplier * catMult) / peakMultiplier
      );
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
      reason =
        "No par level set — suggestion based on category and order frequency";
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
export async function getVoidRecords(filters?: {
  startDate?: string;
  endDate?: string;
  employeeName?: string;
  recordType?: string;
}) {
  const db = await getDb();
  if (!db) return [];
  let query = db
    .select()
    .from(voidRecords)
    .orderBy(desc(voidRecords.businessDate));
  // Note: Drizzle doesn't support dynamic where chaining easily, use raw for complex filters
  const rows = await query.limit(500);
  if (filters?.employeeName) {
    return rows.filter(r =>
      r.employeeName
        ?.toLowerCase()
        .includes(filters.employeeName!.toLowerCase())
    );
  }
  if (filters?.startDate && filters?.endDate) {
    return rows.filter(
      r =>
        r.businessDate >= filters.startDate! &&
        r.businessDate <= filters.endDate!
    );
  }
  return rows;
}

/** Get void summary by employee — total voids, amount, avg per day */
export async function getVoidSummaryByEmployee() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(voidRecords);
  const byEmployee: Record<
    string,
    { name: string; count: number; total: number; days: Set<string> }
  > = {};
  for (const r of rows) {
    const name = r.employeeName || "Unknown";
    if (!byEmployee[name])
      byEmployee[name] = { name, count: 0, total: 0, days: new Set() };
    byEmployee[name].count++;
    byEmployee[name].total += parseFloat(r.amount?.toString() || "0");
    byEmployee[name].days.add(r.businessDate);
  }
  return Object.values(byEmployee)
    .map(e => ({
      name: e.name,
      totalVoids: e.count,
      totalAmount: Math.round(e.total * 100) / 100,
      daysWorked: e.days.size,
      avgPerDay: Math.round((e.count / e.days.size) * 10) / 10,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);
}

/** Get product mix with category filtering */
export async function getProductMix(category?: string) {
  const db = await getDb();
  if (!db) return [];
  let rows;
  if (category && category !== "all") {
    rows = await db
      .select()
      .from(productMixEntries)
      .where(eq(productMixEntries.category, category as any))
      .orderBy(desc(productMixEntries.totalAmount))
      .limit(100);
  } else {
    rows = await db
      .select()
      .from(productMixEntries)
      .orderBy(desc(productMixEntries.totalAmount))
      .limit(200);
  }
  // Aggregate by item name
  const byItem: Record<
    string,
    { name: string; category: string; totalAmount: number; totalQty: number }
  > = {};
  for (const r of rows) {
    const key = r.itemName;
    if (!byItem[key])
      byItem[key] = {
        name: r.itemName,
        category: r.category || "other",
        totalAmount: 0,
        totalQty: 0,
      };
    byItem[key].totalAmount += parseFloat(r.totalAmount?.toString() || "0");
    byItem[key].totalQty += r.totalQty || 0;
  }
  return Object.values(byItem)
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 50);
}

/** Get weather data with optional forecast */
export async function getWeatherData(includeForecast = false) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(weatherData)
    .orderBy(desc(weatherData.date))
    .limit(30);
  return rows;
}

/** Get weather correlation with sales — join weather + daily sales */
export async function getWeatherSalesCorrelation() {
  const db = await getDb();
  if (!db)
    return {
      rainyDays: { avg: 0, count: 0 },
      dryDays: { avg: 0, count: 0 },
      snowDays: { avg: 0, count: 0 },
      deliveryImpact: { badWeather: 0, goodWeather: 0 },
    };

  const weather = await db
    .select()
    .from(weatherData)
    .where(eq(weatherData.isForecast, false));
  const sales = await db.select().from(dailySales);

  const salesByDate: Record<string, any> = {};
  for (const s of sales) salesByDate[s.businessDate] = s;

  let rainyTotal = 0,
    rainyCount = 0,
    dryTotal = 0,
    dryCount = 0,
    snowTotal = 0,
    snowCount = 0;
  let badDeliveryPct = 0,
    badDeliveryCount = 0,
    goodDeliveryPct = 0,
    goodDeliveryCount = 0;

  for (const w of weather) {
    const s = salesByDate[w.date];
    if (!s) continue;
    const rev = parseFloat(s.grandTotal?.toString() || "0");
    const precip = parseFloat(w.precipitation?.toString() || "0");
    const snow = parseFloat(w.snowfall?.toString() || "0");
    const deliveryPct =
      (parseFloat(s.deliveryAmount?.toString() || "0") / (rev || 1)) * 100;

    if (snow > 0) {
      snowTotal += rev;
      snowCount++;
    }
    if (precip > 0) {
      rainyTotal += rev;
      rainyCount++;
      badDeliveryPct += deliveryPct;
      badDeliveryCount++;
    } else {
      dryTotal += rev;
      dryCount++;
      goodDeliveryPct += deliveryPct;
      goodDeliveryCount++;
    }
  }

  return {
    rainyDays: {
      avg: rainyCount ? Math.round(rainyTotal / rainyCount) : 0,
      count: rainyCount,
    },
    dryDays: {
      avg: dryCount ? Math.round(dryTotal / dryCount) : 0,
      count: dryCount,
    },
    snowDays: {
      avg: snowCount ? Math.round(snowTotal / snowCount) : 0,
      count: snowCount,
    },
    deliveryImpact: {
      badWeather: badDeliveryCount
        ? Math.round((badDeliveryPct / badDeliveryCount) * 10) / 10
        : 0,
      goodWeather: goodDeliveryCount
        ? Math.round((goodDeliveryPct / goodDeliveryCount) * 10) / 10
        : 0,
    },
  };
}

/** Get anomalies with severity filter */
export async function getAnomalies(severity?: string) {
  const db = await getDb();
  if (!db) return [];
  if (severity) {
    return db
      .select()
      .from(intelligenceAnomalies)
      .where(eq(intelligenceAnomalies.severity, severity as any))
      .orderBy(desc(intelligenceAnomalies.createdAt))
      .limit(100);
  }
  return db
    .select()
    .from(intelligenceAnomalies)
    .orderBy(desc(intelligenceAnomalies.createdAt))
    .limit(100);
}

/** Acknowledge an anomaly */
export async function acknowledgeAnomaly(id: number, acknowledgedBy: string) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(intelligenceAnomalies)
    .set({ acknowledged: true, acknowledgedBy })
    .where(eq(intelligenceAnomalies.id, id));
}

/** Get local events for upcoming week */
export async function getUpcomingEvents() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(localEvents)
    .orderBy(asc(localEvents.eventDate))
    .limit(20);
}

/** Add a local event */
export async function addLocalEvent(event: {
  eventName: string;
  eventDate: string;
  eventTime?: string;
  venue?: string;
  city?: string;
  distance?: number;
  category?: string;
  estimatedImpact?: string;
  attendanceEstimate?: number;
  notes?: string;
  source?: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(localEvents).values(event as any);
}

/** Get schedule intelligence for a week */
export async function getScheduleIntelligence(weekStart: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(scheduleIntelligence)
    .where(eq(scheduleIntelligence.weekStart, weekStart))
    .limit(1);
  return rows[0] || null;
}

/** Save schedule intelligence */
export async function saveScheduleIntelligence(data: {
  weekStart: string;
  weekEnd: string;
  recommendations: any;
}) {
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
  const heatmap: Record<
    string,
    {
      dow: number;
      hour: number;
      avgRevenue: number;
      count: number;
      total: number;
      orders: number;
      pickup: number;
      delivery: number;
      bar: number;
    }
  > = {};

  for (const r of rows) {
    const dt = new Date(r.businessDate + "T12:00:00");
    const dow = dt.getDay(); // 0=Sun

    // Parse hour from "1 PM-2 PM" format
    let hour = 0;
    const hourStr = r.hour || "";
    try {
      const parts = hourStr.split("-")[0].trim().split(" ");
      let h = parseInt(parts[0]);
      const ampm = parts[1]?.toUpperCase() || "";
      if (ampm === "PM" && h !== 12) h += 12;
      if (ampm === "AM" && h === 12) h = 0;
      hour = h;
    } catch {
      continue;
    }

    const key = `${dow}-${hour}`;
    // total column is NULL in PDQ data — compute revenue from orders * avgSales
    const orders = parseFloat(r.orders?.toString() || "0");
    const avgSale = parseFloat(r.avgSales?.toString() || "0");
    const revenue = orders * avgSale;
    const pickup = parseFloat(r.pickupAmount?.toString() || "0");
    const delivery = parseFloat(r.deliveryAmount?.toString() || "0");
    const bar = parseFloat(r.barAmount?.toString() || "0");
    if (!heatmap[key])
      heatmap[key] = {
        dow,
        hour,
        avgRevenue: 0,
        count: 0,
        total: 0,
        orders: 0,
        pickup: 0,
        delivery: 0,
        bar: 0,
      };
    heatmap[key].total += revenue;
    heatmap[key].orders += orders;
    heatmap[key].pickup += pickup;
    heatmap[key].delivery += delivery;
    heatmap[key].bar += bar;
    heatmap[key].count++;
  }

  return Object.values(heatmap).map(h => ({
    dow: h.dow,
    hour: h.hour,
    avgRevenue: Math.round(h.total / h.count),
    avgOrders: Math.round((h.orders / h.count) * 10) / 10,
    avgPickup: Math.round(h.pickup / h.count),
    avgDelivery: Math.round(h.delivery / h.count),
    avgBar: Math.round(h.bar / h.count),
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

  const products = await db
    .select()
    .from(vendorProducts)
    .orderBy(vendorProducts.vendorName);
  if (products.length === 0) return [];

  // Get all invoices with OCR line items
  const allInvoices = await db
    .select()
    .from(invoices)
    .orderBy(desc(invoices.createdAt));

  // Build price history per product from invoice line items
  const comparisons = products.map(product => {
    // Find invoices from same vendor
    const vendorInvoices = allInvoices.filter(
      inv => inv.vendorName?.toLowerCase() === product.vendorName.toLowerCase()
    );

    // Extract prices from OCR line items
    const priceHistory: { date: string; price: number }[] = [];
    for (const inv of vendorInvoices.slice(0, 8)) {
      try {
        const items =
          typeof inv.items === "string"
            ? JSON.parse(inv.items as string)
            : inv.items;
        if (Array.isArray(items)) {
          for (const item of items) {
            if (
              item.description
                ?.toLowerCase()
                .includes(product.productName.toLowerCase().split(" ")[0])
            ) {
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
      } catch {
        /* skip malformed OCR data */
      }
    }

    const currentPrice = parseFloat(product.lastPrice || "0");
    const previousPrice = parseFloat(product.previousPrice || "0");
    const priceDelta =
      previousPrice > 0
        ? ((currentPrice - previousPrice) / previousPrice) * 100
        : 0;

    return {
      id: product.id,
      vendorName: product.vendorName,
      productName: product.productName,
      category: product.category,
      currentPrice,
      previousPrice,
      priceDelta: Math.round(priceDelta * 10) / 10,
      direction:
        priceDelta > 5
          ? ("up" as const)
          : priceDelta < -5
            ? ("down" as const)
            : ("stable" as const),
      flagged: Math.abs(priceDelta) > 5,
      priceHistory: priceHistory.slice(0, 4),
      lastUpdated: product.updatedAt,
    };
  });

  return comparisons.sort(
    (a, b) => Math.abs(b.priceDelta) - Math.abs(a.priceDelta)
  );
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
  const events = await db
    .select()
    .from(localEvents)
    .where(
      sql`${localEvents.eventDate} >= ${todayStr} AND ${localEvents.eventDate} <= ${tomorrowStr}`
    )
    .orderBy(localEvents.eventDate);

  // Get today's weather
  const weatherResults = await db
    .select()
    .from(weatherData)
    .where(eq(weatherData.date, todayStr))
    .limit(1);

  // Get historical pattern for today's day of week
  const dayPattern = await getDayOfWeekPattern(today.getDay());

  // Get any high-severity anomalies from last 7 days
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const recentAnomalies = await db
    .select()
    .from(intelligenceAnomalies)
    .where(
      sql`${intelligenceAnomalies.severity} = 'high' AND ${intelligenceAnomalies.acknowledged} = false AND ${intelligenceAnomalies.createdAt} >= ${weekAgo}`
    )
    .orderBy(desc(intelligenceAnomalies.createdAt))
    .limit(5);

  return {
    todayEvents: events.filter(e => e.eventDate === todayStr),
    tomorrowEvents: events.filter(e => e.eventDate === tomorrowStr),
    weather: weatherResults[0] || null,
    dayPattern,
    recentAnomalies,
    prepRecommendations: generatePrepRecommendations(
      events,
      dayPattern,
      weatherResults[0]
    ),
  };
}

function generatePrepRecommendations(
  events: any[],
  dayPattern: any,
  weather: any
): string[] {
  const recs: string[] = [];

  if (dayPattern?.avgRevenue > 8000) {
    recs.push(
      `High-volume day expected ($${Math.round(dayPattern.avgRevenue).toLocaleString()} avg). Double-check prep levels.`
    );
  }

  if (events.length > 0) {
    for (const event of events) {
      if (event.estimatedImpact === "high") {
        recs.push(
          `${event.eventName} today — expect 15-25% surge. Extra prep on wings, pizza dough, and bar stock.`
        );
      } else if (event.estimatedImpact === "medium") {
        recs.push(
          `${event.eventName} nearby — may see 10-15% bump. Monitor and be ready to flex.`
        );
      }
    }
  }

  if (weather) {
    const temp = parseFloat(weather.tempHigh || "0");
    const precip = parseFloat(weather.precipitation || "0");
    if (precip > 0.5) {
      recs.push(
        "Rain/snow expected — delivery volume likely up 15-20%. Staff extra drivers."
      );
    }
    if (temp > 85) {
      recs.push(
        "Hot day — expect higher bar traffic, more cold drinks. Extra ice, check keg levels."
      );
    }
    if (temp < 20) {
      recs.push(
        "Extreme cold — delivery heavy, dine-in light. Comfort food (soups, hot sandwiches) will move."
      );
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
    return db
      .select()
      .from(managementBriefings)
      .where(
        sql`${managementBriefings.targetRole} = ${targetRole} OR ${managementBriefings.targetRole} = 'all'`
      )
      .orderBy(desc(managementBriefings.generatedAt))
      .limit(limit);
  }
  return db
    .select()
    .from(managementBriefings)
    .orderBy(desc(managementBriefings.generatedAt))
    .limit(limit);
}

/** Mark a briefing as read */
export async function markBriefingRead(id: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(managementBriefings)
    .set({ readAt: new Date() })
    .where(eq(managementBriefings.id, id));
}

/** Mark a briefing as notification sent */
export async function markBriefingNotified(id: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(managementBriefings)
    .set({ notificationSent: true })
    .where(eq(managementBriefings.id, id));
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
  const hourlyRows = await db
    .select()
    .from(hourlySales)
    .where(sql`${hourlySales.businessDate} >= ${weekAgoStr}`)
    .orderBy(hourlySales.businessDate, hourlySales.hour);

  // 3. Product mix — food, beer, liquor, pop trends
  const foodMix = await getProductMix("food");
  const beerMix = await getProductMix("beer");
  const liquorMix = await getProductMix("liquor");
  const popMix = await getProductMix("pop");

  // 4. Weather — current + forecast
  const weather = await getWeatherData(true);

  // 5. Events within 30 miles in next 7 days
  const events = await db
    .select()
    .from(localEvents)
    .where(
      sql`${localEvents.eventDate} >= ${todayStr} AND ${localEvents.eventDate} <= ${nextWeekStr}`
    )
    .orderBy(localEvents.eventDate);

  // 6. Void/comp/promo analysis (last 7 days)
  const recentVoids = await getVoidRecords({
    startDate: weekAgoStr,
    endDate: todayStr,
  });
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
    food: parseFloat(s.catFoodAmount?.toString() || "0"),
    beer: parseFloat(s.catBeerAmount?.toString() || "0"),
    liquor: parseFloat(s.catLiquorAmount?.toString() || "0"),
    pop: parseFloat(s.catPopAmount?.toString() || "0"),
    total: parseFloat(s.grandTotal?.toString() || "0"),
    voids: s.voidsCount || 0,
    voidsAmount: parseFloat(s.voidsAmount?.toString() || "0"),
    discounts: s.discountCount || 0,
    discountTotal: parseFloat(s.discountTotal?.toString() || "0"),
  }));

  return {
    recentSales,
    hourlyPatterns: hourlyRows,
    productMix: {
      food: foodMix.slice(0, 10),
      beer: beerMix.slice(0, 10),
      liquor: liquorMix.slice(0, 10),
      pop: popMix.slice(0, 10),
    },
    weather: weather.slice(0, 10),
    events: events.filter(
      e => parseFloat(e.distance?.toString() || "999") <= 30
    ),
    recentVoids: recentVoids.slice(0, 20),
    voidSummary: voidSummary.slice(0, 10),
    anomalies: anomalyList.filter((a: any) => !a.acknowledged).slice(0, 10),
    dowPatterns,
    weatherCorrelation,
    categoryTrends,
  };
}

// ============================================================
// FOOD COST INTELLIGENCE — DB HELPERS
// ============================================================

// ============ SKU CATALOG ============

export async function getAllSkus(activeOnly = true) {
  const db = await getDb();
  if (!db) return [];
  if (activeOnly) {
    return db
      .select()
      .from(skuCatalog)
      .where(eq(skuCatalog.isActive, true))
      .orderBy(skuCatalog.category, skuCatalog.productName);
  }
  return db
    .select()
    .from(skuCatalog)
    .orderBy(skuCatalog.category, skuCatalog.productName);
}

export async function getSkuById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(skuCatalog)
    .where(eq(skuCatalog.id, id))
    .limit(1);
  return result[0];
}

export async function getSkusByVendor(vendorName: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(skuCatalog)
    .where(eq(skuCatalog.vendorName, vendorName))
    .orderBy(skuCatalog.productName);
}

export async function getSkusByCategory(category: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(skuCatalog)
    .where(eq(skuCatalog.category, category))
    .orderBy(skuCatalog.productName);
}

export async function createSku(data: InsertSkuCatalogItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(skuCatalog).values(data);
}

export async function updateSku(
  id: number,
  data: Partial<InsertSkuCatalogItem>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(skuCatalog).set(data).where(eq(skuCatalog.id, id));
}

// ============ SKU PRICE HISTORY ============

export async function getSkuPriceHistory(skuId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(skuPriceHistory)
    .where(eq(skuPriceHistory.skuId, skuId))
    .orderBy(desc(skuPriceHistory.recordedAt))
    .limit(limit);
}

export async function addSkuPriceEntry(data: InsertSkuPriceHistoryEntry) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(skuPriceHistory).values(data);
}

/** Cross-vendor price comparison for a product name (fuzzy match) */
export async function crossVendorPriceComparison(productName: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(skuCatalog)
    .where(
      sql`LOWER(${skuCatalog.productName}) LIKE LOWER(${`%${productName}%`})`
    )
    .orderBy(asc(skuCatalog.currentPricePerUnit));
}

// ============ RECIPES ============

export async function getAllRecipes(activeOnly = true) {
  const db = await getDb();
  if (!db) return [];
  if (activeOnly) {
    return db
      .select()
      .from(recipes)
      .where(eq(recipes.isActive, true))
      .orderBy(recipes.category, recipes.name);
  }
  return db.select().from(recipes).orderBy(recipes.category, recipes.name);
}

export async function getRecipeById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(recipes)
    .where(eq(recipes.id, id))
    .limit(1);
  return result[0];
}

export async function createRecipe(data: InsertRecipe) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(recipes).values(data);
  return result;
}

export async function updateRecipe(id: number, data: Partial<InsertRecipe>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(recipes).set(data).where(eq(recipes.id, id));
}

// ============ RECIPE INGREDIENTS ============

export async function getRecipeIngredients(recipeId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(recipeIngredients)
    .where(eq(recipeIngredients.recipeId, recipeId));
}

export async function addRecipeIngredient(data: InsertRecipeIngredient) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(recipeIngredients).values(data);
}

export async function updateRecipeIngredient(
  id: number,
  data: Partial<InsertRecipeIngredient>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .update(recipeIngredients)
    .set(data)
    .where(eq(recipeIngredients.id, id));
}

export async function deleteRecipeIngredient(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(recipeIngredients).where(eq(recipeIngredients.id, id));
}

/** Calculate total recipe cost from its ingredients and update the recipe */
export async function recalculateRecipeCost(recipeId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const ingredients = await db
    .select()
    .from(recipeIngredients)
    .where(eq(recipeIngredients.recipeId, recipeId));
  let totalCost = 0;

  for (const ing of ingredients) {
    // If linked to a SKU, pull latest price
    if (ing.skuId) {
      const sku = await db
        .select()
        .from(skuCatalog)
        .where(eq(skuCatalog.id, ing.skuId))
        .limit(1);
      if (sku[0]?.currentPricePerUnit) {
        const costPerUnit = parseFloat(sku[0].currentPricePerUnit);
        const qty = parseFloat(ing.quantity);
        const yieldPct = parseFloat(ing.yieldPercent || "100") / 100;
        const adjustedCost = (costPerUnit * qty) / yieldPct;
        await db
          .update(recipeIngredients)
          .set({
            costPerUnit: costPerUnit.toFixed(4),
            totalCost: adjustedCost.toFixed(4),
          })
          .where(eq(recipeIngredients.id, ing.id));
        totalCost += adjustedCost;
        continue;
      }
    }
    // Use manual cost if no SKU link
    if (ing.totalCost) {
      totalCost += parseFloat(ing.totalCost);
    }
  }

  // Get the recipe to check menu price
  const recipe = await db
    .select()
    .from(recipes)
    .where(eq(recipes.id, recipeId))
    .limit(1);
  const menuPrice = recipe[0]?.menuPrice ? parseFloat(recipe[0].menuPrice) : 0;
  const foodCostPct = menuPrice > 0 ? (totalCost / menuPrice) * 100 : 0;

  await db
    .update(recipes)
    .set({
      theoreticalCost: totalCost.toFixed(4),
      foodCostPercent: foodCostPct.toFixed(2),
      lastCostedAt: new Date(),
    })
    .where(eq(recipes.id, recipeId));

  return {
    theoreticalCost: totalCost,
    foodCostPercent: foodCostPct,
    ingredientCount: ingredients.length,
  };
}

// ============ MENU ITEMS ============

export async function getAllMenuItems(activeOnly = true) {
  const db = await getDb();
  if (!db) return [];
  if (activeOnly) {
    return db
      .select()
      .from(menuItems)
      .where(eq(menuItems.isActive, true))
      .orderBy(menuItems.category, menuItems.posItemName);
  }
  return db
    .select()
    .from(menuItems)
    .orderBy(menuItems.category, menuItems.posItemName);
}

export async function createMenuItem(data: InsertMenuItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(menuItems).values(data);
}

export async function updateMenuItem(
  id: number,
  data: Partial<InsertMenuItem>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(menuItems).set(data).where(eq(menuItems.id, id));
}

/** Calculate menu item margin from linked recipe cost */
export async function recalculateMenuItemMargin(menuItemId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const item = await db
    .select()
    .from(menuItems)
    .where(eq(menuItems.id, menuItemId))
    .limit(1);
  if (!item[0]) return null;

  let theoreticalCost = 0;
  if (item[0].recipeId) {
    const recipe = await db
      .select()
      .from(recipes)
      .where(eq(recipes.id, item[0].recipeId))
      .limit(1);
    if (recipe[0]?.theoreticalCost) {
      theoreticalCost = parseFloat(recipe[0].theoreticalCost);
    }
  }

  const menuPrice = parseFloat(item[0].menuPrice);
  const marginPct =
    menuPrice > 0 ? ((menuPrice - theoreticalCost) / menuPrice) * 100 : 0;

  await db
    .update(menuItems)
    .set({
      theoreticalCost: theoreticalCost.toFixed(4),
      marginPercent: marginPct.toFixed(2),
      lastAnalyzedAt: new Date(),
    })
    .where(eq(menuItems.id, menuItemId));

  return { theoreticalCost, menuPrice, marginPercent: marginPct };
}

/** Get food cost summary — theoretical vs actual by category */
export async function getFoodCostSummary() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      category: menuItems.category,
      itemCount: sql<number>`COUNT(*)`,
      avgMenuPrice: sql<string>`CAST(AVG(${menuItems.menuPrice}) AS CHAR)`,
      avgTheoreticalCost: sql<string>`CAST(AVG(${menuItems.theoreticalCost}) AS CHAR)`,
      avgMarginPercent: sql<string>`CAST(AVG(${menuItems.marginPercent}) AS CHAR)`,
      totalRevenuePotential: sql<string>`CAST(SUM(${menuItems.avgDailySales}) AS CHAR)`,
    })
    .from(menuItems)
    .where(eq(menuItems.isActive, true))
    .groupBy(menuItems.category);
}

// ============ WASTE LOG ============

export async function getWasteLog(days = 7) {
  const db = await getDb();
  if (!db) return [];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return db
    .select()
    .from(wasteLog)
    .where(gte(wasteLog.date, since))
    .orderBy(desc(wasteLog.date));
}

export async function createWasteEntry(data: InsertWasteLogEntry) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(wasteLog).values(data);
}

export async function getWasteSummary(days = 7) {
  const db = await getDb();
  if (!db) return [];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return db
    .select({
      wasteType: wasteLog.wasteType,
      totalQuantity: sql<string>`CAST(SUM(${wasteLog.quantity}) AS CHAR)`,
      totalCost: sql<string>`CAST(SUM(${wasteLog.estimatedCost}) AS CHAR)`,
      count: sql<number>`COUNT(*)`,
      preventableCount: sql<number>`SUM(CASE WHEN ${wasteLog.preventable} = true THEN 1 ELSE 0 END)`,
    })
    .from(wasteLog)
    .where(gte(wasteLog.date, since))
    .groupBy(wasteLog.wasteType);
}

// ============ PRICE COMPARISON ALERTS ============

export async function getPriceAlerts(reviewedOnly = false) {
  const db = await getDb();
  if (!db) return [];
  if (reviewedOnly) {
    return db
      .select()
      .from(priceAlerts)
      .where(sql`${priceAlerts.reviewedAt} IS NOT NULL`)
      .orderBy(desc(priceAlerts.flaggedAt));
  }
  return db
    .select()
    .from(priceAlerts)
    .where(sql`${priceAlerts.reviewedAt} IS NULL`)
    .orderBy(desc(priceAlerts.flaggedAt));
}

export async function createPriceAlert(data: InsertPriceAlert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(priceAlerts).values(data);
}

export async function reviewPriceAlert(
  id: number,
  reviewedBy: number,
  notes?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .update(priceAlerts)
    .set({
      reviewedBy,
      reviewedAt: new Date(),
      notes: notes || null,
    })
    .where(eq(priceAlerts.id, id));
}

/** Scan invoices for price changes and generate alerts */
export async function scanForPriceChanges() {
  const db = await getDb();
  if (!db) return [];

  // Get all SKUs with price history (at least 2 entries)
  const allSkus = await db
    .select()
    .from(skuCatalog)
    .where(eq(skuCatalog.isActive, true));
  const alerts: Array<{
    vendorName: string;
    productName: string;
    previousPrice: string;
    currentPrice: string;
    changePercent: string;
    changeDirection: string;
  }> = [];

  for (const sku of allSkus) {
    const history = await db
      .select()
      .from(skuPriceHistory)
      .where(eq(skuPriceHistory.skuId, sku.id))
      .orderBy(desc(skuPriceHistory.recordedAt))
      .limit(2);

    if (history.length < 2) continue;

    const current = parseFloat(history[0].price);
    const previous = parseFloat(history[1].price);
    if (previous === 0) continue;

    const changePct = ((current - previous) / previous) * 100;
    // Flag if price changed more than 5%
    if (Math.abs(changePct) >= 5) {
      const alertData: InsertPriceAlert = {
        vendorName: sku.vendorName,
        productName: sku.productName,
        previousPrice: previous.toFixed(2),
        currentPrice: current.toFixed(2),
        changePercent: Math.abs(changePct).toFixed(2),
        changeDirection: changePct > 0 ? "up" : "down",
      };
      await db.insert(priceAlerts).values(alertData);
      alerts.push({
        vendorName: sku.vendorName,
        productName: sku.productName,
        previousPrice: previous.toFixed(2),
        currentPrice: current.toFixed(2),
        changePercent: Math.abs(changePct).toFixed(2),
        changeDirection: changePct > 0 ? "up" : "down",
      });
    }
  }

  return alerts;
}

// ============ STATION BROADCASTS (86'd) ============

export async function getActiveBroadcasts(station?: string) {
  const db = await getDb();
  if (!db) return [];
  // Get broadcasts that are not resolved and not expired
  const rows = await db
    .select()
    .from(stationBroadcasts)
    .where(
      sql`${stationBroadcasts.resolvedAt} IS NULL AND (${stationBroadcasts.expiresAt} IS NULL OR ${stationBroadcasts.expiresAt} > NOW())`
    )
    .orderBy(desc(stationBroadcasts.createdAt));

  if (station) {
    // Filter to broadcasts targeting this station
    return rows.filter((b: any) => {
      const targets =
        typeof b.targetStations === "string"
          ? JSON.parse(b.targetStations)
          : b.targetStations;
      return (
        Array.isArray(targets) &&
        (targets.includes(station) || targets.includes("all"))
      );
    });
  }
  return rows;
}

export async function createBroadcast(data: InsertStationBroadcast) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(stationBroadcasts).values(data);
}

export async function acknowledgeBroadcast(
  broadcastId: number,
  staffId: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const broadcast = await db
    .select()
    .from(stationBroadcasts)
    .where(eq(stationBroadcasts.id, broadcastId))
    .limit(1);
  if (!broadcast[0]) return;
  const currentAcks =
    typeof broadcast[0].acknowledgedBy === "string"
      ? JSON.parse(broadcast[0].acknowledgedBy)
      : broadcast[0].acknowledgedBy || [];
  if (!currentAcks.includes(staffId)) {
    currentAcks.push(staffId);
  }
  await db
    .update(stationBroadcasts)
    .set({ acknowledgedBy: JSON.stringify(currentAcks) })
    .where(eq(stationBroadcasts.id, broadcastId));
}

export async function resolveBroadcast(broadcastId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(stationBroadcasts)
    .set({ resolvedAt: new Date() })
    .where(eq(stationBroadcasts.id, broadcastId));
}

export async function getBroadcastHistory(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(stationBroadcasts)
    .orderBy(desc(stationBroadcasts.createdAt))
    .limit(limit);
}

// ============ SMART NOTIFICATION QUEUE ============

export async function queueNotification(data: InsertNotificationQueueItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Smart classification: auto-assign batchKey for low/normal priority
  const enriched = { ...data };
  if (
    !enriched.batchKey &&
    enriched.priority !== "critical" &&
    enriched.priority !== "high"
  ) {
    // Auto-batch by category + date
    const today = new Date().toISOString().split("T")[0];
    enriched.batchKey = `${enriched.category}_${enriched.targetRole || "all"}_${today}`;
  }

  const result = await db.insert(notificationQueue).values(enriched);

  // Critical notifications: mark as delivered immediately (instant delivery)
  if (enriched.priority === "critical" || enriched.priority === "high") {
    const insertedId = (result as any)[0]?.insertId;
    if (insertedId) {
      await db
        .update(notificationQueue)
        .set({ deliveredAt: new Date() })
        .where(eq(notificationQueue.id, insertedId));
    }
  }

  return result;
}

export async function getUndeliveredNotifications(
  targetStaffId?: number,
  targetRole?: string
) {
  const db = await getDb();
  if (!db) return [];
  let conditions = [
    sql`${notificationQueue.deliveredAt} IS NULL`,
    sql`${notificationQueue.batchedInto} IS NULL`,
  ];
  if (targetStaffId)
    conditions.push(eq(notificationQueue.targetStaffId, targetStaffId));
  if (targetRole) conditions.push(eq(notificationQueue.targetRole, targetRole));
  return db
    .select()
    .from(notificationQueue)
    .where(and(...conditions))
    .orderBy(desc(notificationQueue.createdAt));
}

export async function markNotificationDelivered(id: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(notificationQueue)
    .set({ deliveredAt: new Date() })
    .where(eq(notificationQueue.id, id));
}

export async function markNotificationRead(id: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(notificationQueue)
    .set({ readAt: new Date() })
    .where(eq(notificationQueue.id, id));
}

/** Batch low-priority notifications with the same batchKey */
// ============ SALES FORECAST ENGINE ============

/** Generate a sales forecast based on day-of-week patterns, weather, and events */
export async function generateSalesForecast(targetDate: Date) {
  const db = await getDb();
  if (!db) return null;

  const dayOfWeek = targetDate.getDay(); // 0=Sun, 6=Sat
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const dayName = dayNames[dayOfWeek];

  // 1. Get day-of-week historical pattern (last 90 days)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgoStr = ninetyDaysAgo.toISOString().split("T")[0];
  const dowSales = await db
    .select({
      avgTotalAmount: sql<string>`CAST(AVG(${dailySales.totalAmount}) AS CHAR)`,
      avgGrandTotal: sql<string>`CAST(AVG(${dailySales.grandTotal}) AS CHAR)`,
      avgTotalQty: sql<string>`CAST(AVG(${dailySales.totalQty}) AS CHAR)`,
      avgPerGuest: sql<string>`CAST(AVG(${dailySales.avgPerGuest}) AS CHAR)`,
      sampleCount: sql<number>`COUNT(*)`,
      minTotalAmount: sql<string>`CAST(MIN(${dailySales.totalAmount}) AS CHAR)`,
      maxTotalAmount: sql<string>`CAST(MAX(${dailySales.totalAmount}) AS CHAR)`,
      stdDev: sql<string>`CAST(STDDEV(${dailySales.totalAmount}) AS CHAR)`,
      avgFoodAmount: sql<string>`CAST(AVG(${dailySales.catFoodAmount}) AS CHAR)`,
      avgBeerAmount: sql<string>`CAST(AVG(${dailySales.catBeerAmount}) AS CHAR)`,
      avgLiquorAmount: sql<string>`CAST(AVG(${dailySales.catLiquorAmount}) AS CHAR)`,
      avgPopAmount: sql<string>`CAST(AVG(${dailySales.catPopAmount}) AS CHAR)`,
    })
    .from(dailySales)
    .where(
      and(
        sql`DAYOFWEEK(${dailySales.businessDate}) = ${dayOfWeek + 1}`,
        sql`${dailySales.businessDate} >= ${ninetyDaysAgoStr}`
      )
    );

  // 2. Get hourly pattern for this day of week
  const hourlyPattern = await db
    .select({
      hour: hourlySales.hour,
      avgSales: sql<string>`CAST(AVG(${hourlySales.total}) AS CHAR)`,
      avgOrders: sql<string>`CAST(AVG(${hourlySales.orders}) AS CHAR)`,
    })
    .from(hourlySales)
    .where(
      and(
        sql`DAYOFWEEK(${hourlySales.businessDate}) = ${dayOfWeek + 1}`,
        sql`${hourlySales.businessDate} >= ${ninetyDaysAgoStr}`
      )
    )
    .groupBy(hourlySales.hour)
    .orderBy(hourlySales.hour);

  // 3. Get weather for target date if available
  const targetDateStr = targetDate.toISOString().split("T")[0];
  const weatherRows = await db
    .select()
    .from(weatherData)
    .where(sql`DATE(${weatherData.date}) = ${targetDateStr}`)
    .limit(1);

  // 4. Get weather-sales correlation data
  const weatherCorr = await getWeatherSalesCorrelation();

  // 5. Get upcoming events near target date (eventDate is varchar YYYY-MM-DD)
  const twoDaysBefore = new Date(targetDate.getTime() - 2 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const twoDaysAfter = new Date(targetDate.getTime() + 2 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const nearbyEvents = await db
    .select()
    .from(localEvents)
    .where(
      and(
        sql`${localEvents.eventDate} >= ${twoDaysBefore}`,
        sql`${localEvents.eventDate} <= ${twoDaysAfter}`,
        sql`CAST(${localEvents.distance} AS DECIMAL) <= 30`
      )
    );

  // 6. Get product mix trends for this day of week
  const categoryTrends = await db
    .select({
      category: productMixEntries.category,
      avgSales: sql<string>`CAST(AVG(${productMixEntries.totalAmount}) AS CHAR)`,
      avgQuantity: sql<string>`CAST(AVG(${productMixEntries.totalQty}) AS CHAR)`,
    })
    .from(productMixEntries)
    .where(
      and(
        sql`DAYOFWEEK(${productMixEntries.periodStart}) = ${dayOfWeek + 1}`,
        sql`${productMixEntries.periodStart} >= ${ninetyDaysAgoStr}`
      )
    )
    .groupBy(productMixEntries.category);

  // 7. Calculate forecast with confidence
  const baseline = dowSales[0];
  const baseSales = parseFloat(baseline?.avgTotalAmount || "0");
  const stdDev = parseFloat(baseline?.stdDev || "0");
  const sampleCount = baseline?.sampleCount || 0;

  // Weather adjustment factor
  let weatherAdjustment = 1.0;
  let weatherNote = "";
  if (weatherRows[0]) {
    const temp = parseFloat(weatherRows[0].tempMax?.toString() || "70");
    const weatherCode = weatherRows[0].weatherCode || 0;
    // WMO weather codes: 0-3=clear, 45-48=fog, 51-67=rain/drizzle, 71-77=snow, 80-82=showers, 85-86=snow showers, 95-99=thunderstorm
    const condition =
      weatherCode >= 95
        ? "storm"
        : weatherCode >= 80
          ? "rain"
          : weatherCode >= 71
            ? "snow"
            : weatherCode >= 51
              ? "rain"
              : weatherCode >= 45
                ? "fog"
                : "clear";
    if (condition.includes("rain") || condition.includes("storm")) {
      weatherAdjustment = 0.85;
      weatherNote = "Rain expected — typically -15% sales";
    } else if (condition.includes("snow") || condition.includes("ice")) {
      weatherAdjustment = 0.7;
      weatherNote = "Snow/ice expected — typically -30% sales";
    } else if (temp > 85) {
      weatherAdjustment = 1.1;
      weatherNote = "Hot day — expect +10% (beer/frozen drinks up)";
    } else if (temp < 30) {
      weatherAdjustment = 0.8;
      weatherNote = "Very cold — typically -20% sales";
    }
  }

  // Event adjustment factor
  let eventAdjustment = 1.0;
  let eventNotes: string[] = [];
  for (const evt of nearbyEvents) {
    const dist = parseFloat(evt.distance?.toString() || "30");
    const cat = (evt.category || "").toLowerCase();
    if (dist <= 10) {
      if (cat.includes("fair") || cat.includes("festival")) {
        eventAdjustment += 0.25;
        eventNotes.push(
          `${evt.eventName} (${dist}mi) — county fair/festival typically +25%`
        );
      } else if (
        cat.includes("concert") ||
        cat.includes("band") ||
        cat.includes("music")
      ) {
        eventAdjustment += 0.15;
        eventNotes.push(
          `${evt.eventName} (${dist}mi) — live music nearby typically +15%`
        );
      } else if (cat.includes("sport") || cat.includes("game")) {
        eventAdjustment += 0.2;
        eventNotes.push(
          `${evt.eventName} (${dist}mi) — sporting event typically +20%`
        );
      } else {
        eventAdjustment += 0.1;
        eventNotes.push(
          `${evt.eventName} (${dist}mi) — local event typically +10%`
        );
      }
    } else if (dist <= 20) {
      eventAdjustment += 0.05;
      eventNotes.push(
        `${evt.eventName} (${dist}mi) — moderate distance, slight bump +5%`
      );
    }
  }

  const forecastedSales = baseSales * weatherAdjustment * eventAdjustment;
  const forecastedOrders =
    parseFloat(baseline?.avgTotalQty || "0") *
    weatherAdjustment *
    eventAdjustment;
  const confidence =
    sampleCount >= 8 ? "high" : sampleCount >= 4 ? "medium" : "low";

  return {
    targetDate: targetDateStr,
    dayOfWeek: dayName,
    baseline: {
      avgTotalAmount: baseSales,
      avgGrandTotal: parseFloat(baseline?.avgGrandTotal || "0"),
      avgTotalQty: parseFloat(baseline?.avgTotalQty || "0"),
      avgPerGuest: parseFloat(baseline?.avgPerGuest || "0"),
      minTotalAmount: parseFloat(baseline?.minTotalAmount || "0"),
      maxTotalAmount: parseFloat(baseline?.maxTotalAmount || "0"),
      avgFoodAmount: parseFloat(baseline?.avgFoodAmount || "0"),
      avgBeerAmount: parseFloat(baseline?.avgBeerAmount || "0"),
      avgLiquorAmount: parseFloat(baseline?.avgLiquorAmount || "0"),
      avgPopAmount: parseFloat(baseline?.avgPopAmount || "0"),
      sampleCount,
    },
    forecast: {
      predictedSales: Math.round(forecastedSales * 100) / 100,
      predictedOrders: Math.round(forecastedOrders),
      confidence,
      weatherAdjustmentPct: Math.round((weatherAdjustment - 1) * 100),
      eventAdjustmentPct: Math.round((eventAdjustment - 1) * 100),
    },
    weather: weatherRows[0] || null,
    weatherNote,
    events: nearbyEvents,
    eventNotes,
    hourlyPattern,
    categoryTrends,
    weatherCorrelation: weatherCorr,
  };
}

/** Get event impact history — match event types to past sales performance */
export async function getEventImpactHistory() {
  const db = await getDb();
  if (!db) return [];

  // Get all past events and match with daily sales on those dates
  const results = await db
    .select({
      eventName: localEvents.eventName,
      category: localEvents.category,
      eventDate: localEvents.eventDate,
      distance: localEvents.distance,
      totalAmount: dailySales.totalAmount,
      totalQty: dailySales.totalQty,
    })
    .from(localEvents)
    .leftJoin(
      dailySales,
      sql`${localEvents.eventDate} = ${dailySales.businessDate}`
    )
    .where(sql`${dailySales.totalAmount} IS NOT NULL`)
    .orderBy(sql`${localEvents.eventDate} DESC`);

  return results;
}

export async function batchNotifications() {
  const db = await getDb();
  if (!db) return 0;

  // Find undelivered low/normal priority notifications with batch keys
  const batchable = await db
    .select()
    .from(notificationQueue)
    .where(
      and(
        sql`${notificationQueue.deliveredAt} IS NULL`,
        sql`${notificationQueue.batchedInto} IS NULL`,
        sql`${notificationQueue.batchKey} IS NOT NULL`,
        sql`${notificationQueue.priority} IN ('low', 'normal')`
      )
    )
    .orderBy(notificationQueue.batchKey);

  // Group by batchKey
  const groups: Record<string, typeof batchable> = {};
  for (const n of batchable) {
    const key = n.batchKey || "misc";
    if (!groups[key]) groups[key] = [];
    groups[key].push(n);
  }

  let batchedCount = 0;
  for (const [key, items] of Object.entries(groups)) {
    if (items.length < 2) continue; // Only batch if 2+ items

    // Create a summary notification
    const summaryResult = await db.insert(notificationQueue).values({
      targetRole: items[0].targetRole,
      priority: "normal",
      category: items[0].category,
      title: `${items.length} ${items[0].category} updates`,
      body: items.map(i => `• ${i.title}`).join("\n"),
      batchKey: key,
    });

    const summaryId = (summaryResult as any)[0]?.insertId;
    if (summaryId) {
      // Mark originals as batched
      for (const item of items) {
        await db
          .update(notificationQueue)
          .set({ batchedInto: summaryId })
          .where(eq(notificationQueue.id, item.id));
      }
      batchedCount += items.length;
    }
  }

  return batchedCount;
}

// ============ WEEK-OVER-WEEK PRICE TRACKING ============
/**
 * Compute week-over-week price deltas for all active SKUs.
 * Groups price history entries by week and computes current vs prior week average price.
 * Returns items sorted by absolute delta descending (biggest movers first).
 */
export async function getWeekOverWeekPriceDeltas() {
  const db = await getDb();
  if (!db) return [];
  const allSkus = await db
    .select()
    .from(skuCatalog)
    .where(eq(skuCatalog.isActive, true));
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const results: Array<{
    skuId: number;
    vendorName: string;
    productName: string;
    category: string | null;
    unitSize: string | null;
    currentWeekAvg: number;
    priorWeekAvg: number;
    delta: number;
    deltaPct: number;
    direction: "up" | "down" | "stable";
    currentWeekEntries: number;
    priorWeekEntries: number;
  }> = [];

  for (const sku of allSkus) {
    const history = await db
      .select()
      .from(skuPriceHistory)
      .where(
        sql`${skuPriceHistory.skuId} = ${sku.id} AND ${skuPriceHistory.recordedAt} >= ${twoWeeksAgo}`
      )
      .orderBy(desc(skuPriceHistory.recordedAt));

    if (history.length === 0) continue;

    const currentWeekPrices: number[] = [];
    const priorWeekPrices: number[] = [];

    for (const entry of history) {
      const entryDate = entry.recordedAt ? new Date(entry.recordedAt) : null;
      if (!entryDate) continue;
      const price = parseFloat(entry.price);
      if (isNaN(price) || price <= 0) continue;

      if (entryDate >= oneWeekAgo) {
        currentWeekPrices.push(price);
      } else if (entryDate >= twoWeeksAgo) {
        priorWeekPrices.push(price);
      }
    }

    const currentAvg =
      currentWeekPrices.length > 0
        ? currentWeekPrices.reduce((a, b) => a + b, 0) /
          currentWeekPrices.length
        : parseFloat(sku.currentPricePerUnit || "0");
    const priorAvg =
      priorWeekPrices.length > 0
        ? priorWeekPrices.reduce((a, b) => a + b, 0) / priorWeekPrices.length
        : 0;

    if (priorAvg === 0 && currentWeekPrices.length === 0) continue;

    const delta = currentAvg - priorAvg;
    const deltaPct = priorAvg > 0 ? (delta / priorAvg) * 100 : 0;

    results.push({
      skuId: sku.id,
      vendorName: sku.vendorName,
      productName: sku.productName,
      category: sku.category,
      unitSize: sku.unitSize,
      currentWeekAvg: Math.round(currentAvg * 100) / 100,
      priorWeekAvg: Math.round(priorAvg * 100) / 100,
      delta: Math.round(delta * 100) / 100,
      deltaPct: Math.round(deltaPct * 10) / 10,
      direction: deltaPct > 2 ? "up" : deltaPct < -2 ? "down" : "stable",
      currentWeekEntries: currentWeekPrices.length,
      priorWeekEntries: priorWeekPrices.length,
    });
  }

  return results.sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct));
}

/**
 * Get price comparison from invoice history for a specific product.
 * Compares the last 4-8 invoice prices for the product across all vendors.
 */
export async function getInvoicePriceComparison(productName: string) {
  const db = await getDb();
  if (!db) return [];
  const allInvoices = await db
    .select()
    .from(invoices)
    .orderBy(desc(invoices.createdAt));

  const priceEntries: Array<{
    vendorName: string;
    invoiceDate: string;
    price: number;
    quantity: string;
    invoiceNumber: string | null;
  }> = [];

  for (const inv of allInvoices) {
    try {
      const items =
        typeof inv.items === "string"
          ? JSON.parse(inv.items as string)
          : inv.items;
      if (!Array.isArray(items)) continue;
      for (const item of items) {
        const itemDesc = (item.description || item.name || "").toLowerCase();
        if (itemDesc.includes(productName.toLowerCase())) {
          const price = parseFloat(item.unitPrice || item.price || "0");
          if (price > 0) {
            priceEntries.push({
              vendorName: inv.vendorName || "Unknown",
              invoiceDate:
                inv.createdAt?.toISOString().split("T")[0] || "unknown",
              price,
              quantity: item.quantity || "1",
              invoiceNumber: inv.invoiceNumber,
            });
          }
        }
      }
    } catch {
      /* skip malformed */
    }
  }

  return priceEntries.slice(0, 8);
}

// ============ ML SALES PREDICTION ============

/**
 * Simple linear regression helper — fits y = mx + b
 * Returns slope, intercept, and R² (coefficient of determination)
 */
function linearRegression(
  xs: number[],
  ys: number[]
): { slope: number; intercept: number; r2: number } {
  const n = xs.length;
  if (n < 2) return { slope: 0, intercept: ys[0] || 0, r2: 0 };

  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((a, x, i) => a + x * ys[i], 0);
  const sumX2 = xs.reduce((a, x) => a + x * x, 0);

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n, r2: 0 };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // R² calculation
  const meanY = sumY / n;
  const ssTotal = ys.reduce((a, y) => a + (y - meanY) ** 2, 0);
  const ssResidual = ys.reduce(
    (a, y, i) => a + (y - (slope * xs[i] + intercept)) ** 2,
    0
  );
  const r2 = ssTotal === 0 ? 0 : 1 - ssResidual / ssTotal;

  return { slope, intercept, r2 };
}

/**
 * ML Sales Prediction — uses multiple regression features:
 * 1. Day-of-week seasonality (categorical)
 * 2. Time trend (linear growth/decline)
 * 3. Weather impact (temperature coefficient)
 * 4. Category breakdown (food, beer, liquor, pop trends)
 *
 * Returns predictions for the next 14 days with confidence intervals
 */
export async function getMLSalesPrediction(daysAhead = 14) {
  const db = await getDb();
  if (!db) return { predictions: [], model: null, trends: null };

  // Get all daily sales data
  const allSales = await db
    .select()
    .from(dailySales)
    .orderBy(asc(dailySales.businessDate));
  if (allSales.length < 14)
    return {
      predictions: [],
      model: { error: "Need at least 14 days of data" },
      trends: null,
    };

  // Get weather data for correlation
  const allWeather = await db.select().from(weatherData);
  const weatherByDate: Record<
    string,
    { tempMax: number; weatherCode: string }
  > = {};
  for (const w of allWeather) {
    weatherByDate[w.date] = {
      tempMax: parseFloat(w.tempMax?.toString() || "65"),
      weatherCode: String(w.weatherCode ?? ""),
    };
  }

  // Parse sales into numeric arrays
  const salesData: Array<{
    date: string;
    dow: number;
    dayIndex: number;
    totalAmount: number;
    foodAmount: number;
    beerAmount: number;
    liquorAmount: number;
    popAmount: number;
    totalQty: number;
    temp: number;
  }> = [];

  const startDate = new Date(allSales[0].businessDate + "T12:00:00");

  for (const s of allSales) {
    const dt = new Date(s.businessDate + "T12:00:00");
    const dow = dt.getDay();
    const dayIndex = Math.floor(
      (dt.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)
    );
    const weather = weatherByDate[s.businessDate];

    salesData.push({
      date: s.businessDate,
      dow,
      dayIndex,
      totalAmount: parseFloat(s.totalAmount?.toString() || "0"),
      foodAmount: parseFloat(s.catFoodAmount?.toString() || "0"),
      beerAmount: parseFloat(s.catBeerAmount?.toString() || "0"),
      liquorAmount: parseFloat(s.catLiquorAmount?.toString() || "0"),
      popAmount: parseFloat(s.catPopAmount?.toString() || "0"),
      totalQty: parseFloat(s.totalQty?.toString() || "0"),
      temp: weather?.tempMax || 65,
    });
  }

  // ─── Feature 1: Overall time trend ───
  const timeTrend = linearRegression(
    salesData.map(d => d.dayIndex),
    salesData.map(d => d.totalAmount)
  );

  // ─── Feature 2: Day-of-week averages ───
  const dowStats: Record<
    number,
    { total: number; count: number; values: number[] }
  > = {};
  for (let d = 0; d < 7; d++) dowStats[d] = { total: 0, count: 0, values: [] };
  for (const s of salesData) {
    dowStats[s.dow].total += s.totalAmount;
    dowStats[s.dow].count++;
    dowStats[s.dow].values.push(s.totalAmount);
  }
  const overallAvg =
    salesData.reduce((a, s) => a + s.totalAmount, 0) / salesData.length;
  const dowMultipliers: Record<number, number> = {};
  for (let d = 0; d < 7; d++) {
    const avg =
      dowStats[d].count > 0
        ? dowStats[d].total / dowStats[d].count
        : overallAvg;
    dowMultipliers[d] = overallAvg > 0 ? avg / overallAvg : 1;
  }

  // ─── Feature 3: Temperature coefficient ───
  const tempTrend = linearRegression(
    salesData.filter(d => d.temp > 0).map(d => d.temp),
    salesData.filter(d => d.temp > 0).map(d => d.totalAmount)
  );

  // ─── Feature 4: Category trends (last 30 days vs prior 30 days) ───
  const recent30 = salesData.slice(-30);
  const prior30 = salesData.slice(-60, -30);
  const categoryTrends = {
    food: {
      recent:
        recent30.reduce((a, s) => a + s.foodAmount, 0) /
        Math.max(recent30.length, 1),
      prior:
        prior30.reduce((a, s) => a + s.foodAmount, 0) /
        Math.max(prior30.length, 1),
      change: 0,
    },
    beer: {
      recent:
        recent30.reduce((a, s) => a + s.beerAmount, 0) /
        Math.max(recent30.length, 1),
      prior:
        prior30.reduce((a, s) => a + s.beerAmount, 0) /
        Math.max(prior30.length, 1),
      change: 0,
    },
    liquor: {
      recent:
        recent30.reduce((a, s) => a + s.liquorAmount, 0) /
        Math.max(recent30.length, 1),
      prior:
        prior30.reduce((a, s) => a + s.liquorAmount, 0) /
        Math.max(prior30.length, 1),
      change: 0,
    },
    pop: {
      recent:
        recent30.reduce((a, s) => a + s.popAmount, 0) /
        Math.max(recent30.length, 1),
      prior:
        prior30.reduce((a, s) => a + s.popAmount, 0) /
        Math.max(prior30.length, 1),
      change: 0,
    },
  };
  for (const cat of Object.keys(categoryTrends) as Array<
    keyof typeof categoryTrends
  >) {
    const c = categoryTrends[cat];
    c.change = c.prior > 0 ? ((c.recent - c.prior) / c.prior) * 100 : 0;
  }

  // ─── Feature 5: Variance for confidence intervals ───
  const dowVariance: Record<number, number> = {};
  for (let d = 0; d < 7; d++) {
    const vals = dowStats[d].values;
    const mean =
      dowStats[d].count > 0 ? dowStats[d].total / dowStats[d].count : 0;
    const variance =
      vals.length > 1
        ? vals.reduce((a, v) => a + (v - mean) ** 2, 0) / (vals.length - 1)
        : mean * 0.15; // 15% default if not enough data
    dowVariance[d] = Math.sqrt(variance);
  }

  // ─── Generate predictions ───
  const lastDayIndex = salesData[salesData.length - 1].dayIndex;
  const lastDate = new Date(salesData[salesData.length - 1].date + "T12:00:00");
  const predictions: Array<{
    date: string;
    dayOfWeek: string;
    predictedSales: number;
    confidenceLow: number;
    confidenceHigh: number;
    dowMultiplier: number;
    trendComponent: number;
    confidence: string;
  }> = [];

  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  for (let i = 1; i <= daysAhead; i++) {
    const futureDate = new Date(lastDate.getTime() + i * 24 * 60 * 60 * 1000);
    const dow = futureDate.getDay();
    const dayIndex = lastDayIndex + i;

    // Combine trend + DOW seasonality
    const trendValue = timeTrend.slope * dayIndex + timeTrend.intercept;
    const predicted = trendValue * dowMultipliers[dow];

    // Confidence interval (1.96 * std dev for 95%)
    const stdDev = dowVariance[dow] || overallAvg * 0.15;
    const confidenceLow = Math.max(0, predicted - 1.96 * stdDev);
    const confidenceHigh = predicted + 1.96 * stdDev;

    const sampleSize = dowStats[dow].count;
    const conf =
      sampleSize >= 20 ? "high" : sampleSize >= 10 ? "medium" : "low";

    predictions.push({
      date: futureDate.toISOString().split("T")[0],
      dayOfWeek: dayNames[dow],
      predictedSales: Math.round(predicted * 100) / 100,
      confidenceLow: Math.round(confidenceLow * 100) / 100,
      confidenceHigh: Math.round(confidenceHigh * 100) / 100,
      dowMultiplier: Math.round(dowMultipliers[dow] * 100) / 100,
      trendComponent: Math.round(trendValue * 100) / 100,
      confidence: conf,
    });
  }

  return {
    predictions,
    model: {
      totalDataPoints: salesData.length,
      dateRange: {
        from: salesData[0].date,
        to: salesData[salesData.length - 1].date,
      },
      timeTrend: {
        dailyChange: Math.round(timeTrend.slope * 100) / 100,
        r2: Math.round(timeTrend.r2 * 1000) / 1000,
        direction:
          timeTrend.slope > 0
            ? "growing"
            : timeTrend.slope < 0
              ? "declining"
              : "flat",
      },
      tempCoefficient: {
        perDegree: Math.round(tempTrend.slope * 100) / 100,
        r2: Math.round(tempTrend.r2 * 1000) / 1000,
      },
      dowMultipliers: Object.fromEntries(
        Object.entries(dowMultipliers).map(([k, v]) => [
          dayNames[parseInt(k)],
          Math.round(v * 100) / 100,
        ])
      ),
      overallAvgSales: Math.round(overallAvg * 100) / 100,
    },
    trends: categoryTrends,
  };
}

// ============ SCHEDULE HELPERS ============

export async function createScheduleShift(data: InsertScheduleShift) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(scheduleShifts).values(data).$returningId();
  return result;
}

export async function getScheduleByDateRange(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(scheduleShifts)
    .where(
      and(
        gte(scheduleShifts.date, startDate),
        lte(scheduleShifts.date, endDate)
      )
    )
    .orderBy(asc(scheduleShifts.date), asc(scheduleShifts.startTime));
}

export async function getScheduleByStaff(
  staffId: number,
  startDate: Date,
  endDate: Date
) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(scheduleShifts)
    .where(
      and(
        eq(scheduleShifts.staffId, staffId),
        gte(scheduleShifts.date, startDate),
        lte(scheduleShifts.date, endDate)
      )
    )
    .orderBy(asc(scheduleShifts.date), asc(scheduleShifts.startTime));
}

export async function getScheduleByDepartment(
  department: string,
  startDate: Date,
  endDate: Date
) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(scheduleShifts)
    .where(
      and(
        eq(scheduleShifts.department, department as any),
        gte(scheduleShifts.date, startDate),
        lte(scheduleShifts.date, endDate)
      )
    )
    .orderBy(asc(scheduleShifts.date), asc(scheduleShifts.startTime));
}

export async function updateScheduleShift(
  id: number,
  data: Partial<InsertScheduleShift>
) {
  const db = await getDb();
  if (!db) return null;
  await db.update(scheduleShifts).set(data).where(eq(scheduleShifts.id, id));
  return { id };
}

export async function deleteScheduleShift(id: number) {
  const db = await getDb();
  if (!db) return null;
  await db.delete(scheduleShifts).where(eq(scheduleShifts.id, id));
  return { id };
}

export async function bulkCreateScheduleShifts(shifts: InsertScheduleShift[]) {
  const db = await getDb();
  if (!db) return [];
  if (shifts.length === 0) return [];
  await db.insert(scheduleShifts).values(shifts);
  return shifts;
}

// ============ AVAILABILITY HELPERS ============

export async function setAvailability(data: InsertAvailabilityWindow) {
  const db = await getDb();
  if (!db) return null;
  // Upsert: delete existing for same staff+day, then insert
  await db
    .delete(availabilityWindows)
    .where(
      and(
        eq(availabilityWindows.staffId, data.staffId),
        eq(availabilityWindows.dayOfWeek, data.dayOfWeek)
      )
    );
  const [result] = await db
    .insert(availabilityWindows)
    .values(data)
    .$returningId();
  return result;
}

export async function getAvailabilityByStaff(staffId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(availabilityWindows)
    .where(eq(availabilityWindows.staffId, staffId))
    .orderBy(asc(availabilityWindows.dayOfWeek));
}

export async function getAllAvailability() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(availabilityWindows)
    .orderBy(
      asc(availabilityWindows.staffId),
      asc(availabilityWindows.dayOfWeek)
    );
}

// ============ TIME OFF HELPERS ============

export async function createTimeOffRequest(data: InsertTimeOffRequest) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(timeOffRequests).values(data).$returningId();
  return result;
}

export async function getTimeOffByStaff(staffId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(timeOffRequests)
    .where(eq(timeOffRequests.staffId, staffId))
    .orderBy(desc(timeOffRequests.createdAt));
}

export async function getPendingTimeOff() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(timeOffRequests)
    .where(eq(timeOffRequests.status, "pending"))
    .orderBy(asc(timeOffRequests.startDate));
}

export async function approveTimeOff(id: number, approvedBy: number) {
  const db = await getDb();
  if (!db) return null;
  await db
    .update(timeOffRequests)
    .set({ status: "approved", approvedBy, approvedAt: new Date() })
    .where(eq(timeOffRequests.id, id));
  return { id };
}

export async function denyTimeOff(id: number, approvedBy: number) {
  const db = await getDb();
  if (!db) return null;
  await db
    .update(timeOffRequests)
    .set({ status: "denied", approvedBy, approvedAt: new Date() })
    .where(eq(timeOffRequests.id, id));
  return { id };
}

// ============ SHIFT SWAP HELPERS ============

export async function createShiftSwapRequest(data: InsertShiftSwapRequest) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db
    .insert(shiftSwapRequests)
    .values(data)
    .$returningId();
  return result;
}

export async function getPendingSwaps() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(shiftSwapRequests)
    .where(eq(shiftSwapRequests.status, "pending"))
    .orderBy(desc(shiftSwapRequests.createdAt));
}

export async function getSwapsByStaff(staffId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(shiftSwapRequests)
    .where(
      or(
        eq(shiftSwapRequests.requesterId, staffId),
        eq(shiftSwapRequests.targetId, staffId)
      )
    )
    .orderBy(desc(shiftSwapRequests.createdAt));
}

export async function approveSwap(id: number, approvedBy: number) {
  const db = await getDb();
  if (!db) return null;
  // Get the swap request
  const [swap] = await db
    .select()
    .from(shiftSwapRequests)
    .where(eq(shiftSwapRequests.id, id));
  if (!swap || !swap.targetId) return null;
  // Update the shift to the new staff
  await db
    .update(scheduleShifts)
    .set({ staffId: swap.targetId })
    .where(eq(scheduleShifts.id, swap.shiftId));
  // Mark swap as accepted
  await db
    .update(shiftSwapRequests)
    .set({ status: "accepted", approvedBy, approvedAt: new Date() })
    .where(eq(shiftSwapRequests.id, id));
  return { id };
}

export async function denySwap(id: number, approvedBy: number) {
  const db = await getDb();
  if (!db) return null;
  await db
    .update(shiftSwapRequests)
    .set({ status: "denied", approvedBy, approvedAt: new Date() })
    .where(eq(shiftSwapRequests.id, id));
  return { id };
}

// ============ TIME ENTRY (CLOCK IN/OUT) HELPERS ============

export async function clockIn(staffId: number) {
  const db = await getDb();
  if (!db) return null;
  // Check if already clocked in
  const existing = await db
    .select()
    .from(timeEntries)
    .where(
      and(
        eq(timeEntries.staffId, staffId),
        eq(timeEntries.status, "clocked_in")
      )
    );
  if (existing.length > 0) return existing[0]; // Already clocked in
  const [result] = await db
    .insert(timeEntries)
    .values({
      staffId,
      clockIn: new Date(),
      status: "clocked_in",
    })
    .$returningId();
  return { id: result.id, staffId, clockIn: new Date(), status: "clocked_in" };
}

export async function clockOut(staffId: number) {
  const db = await getDb();
  if (!db) return null;
  // Find the active time entry
  const [active] = await db
    .select()
    .from(timeEntries)
    .where(
      and(
        eq(timeEntries.staffId, staffId),
        eq(timeEntries.status, "clocked_in")
      )
    );
  if (!active) return null; // Not clocked in
  const clockOutTime = new Date();
  const hoursWorked = (
    (clockOutTime.getTime() - active.clockIn.getTime()) /
    3600000
  ).toFixed(2);
  const breakMins = active.breakMinutes || 0;
  const netHours = (parseFloat(hoursWorked) - breakMins / 60).toFixed(2);
  const overtime = Math.max(0, parseFloat(netHours) - 8).toFixed(2);
  await db
    .update(timeEntries)
    .set({
      clockOut: clockOutTime,
      hoursWorked: netHours,
      overtime,
      status: "clocked_out",
    })
    .where(eq(timeEntries.id, active.id));
  return {
    id: active.id,
    staffId,
    clockIn: active.clockIn,
    clockOut: clockOutTime,
    hoursWorked: netHours,
    overtime,
    status: "clocked_out",
  };
}

export async function startBreak(staffId: number) {
  const db = await getDb();
  if (!db) return null;
  const [active] = await db
    .select()
    .from(timeEntries)
    .where(
      and(
        eq(timeEntries.staffId, staffId),
        eq(timeEntries.status, "clocked_in")
      )
    );
  if (!active) return null;
  await db
    .update(timeEntries)
    .set({ breakStarted: new Date(), status: "on_break" })
    .where(eq(timeEntries.id, active.id));
  return { id: active.id, status: "on_break" };
}

export async function endBreak(staffId: number) {
  const db = await getDb();
  if (!db) return null;
  const [active] = await db
    .select()
    .from(timeEntries)
    .where(
      and(eq(timeEntries.staffId, staffId), eq(timeEntries.status, "on_break"))
    );
  if (!active || !active.breakStarted) return null;
  const breakMins = Math.round(
    (new Date().getTime() - active.breakStarted.getTime()) / 60000
  );
  const totalBreak = (active.breakMinutes || 0) + breakMins;
  await db
    .update(timeEntries)
    .set({
      breakEnded: new Date(),
      breakMinutes: totalBreak,
      status: "clocked_in",
    })
    .where(eq(timeEntries.id, active.id));
  return { id: active.id, breakMinutes: totalBreak, status: "clocked_in" };
}

export async function getActiveTimeEntry(staffId: number) {
  const db = await getDb();
  if (!db) return null;
  const [active] = await db
    .select()
    .from(timeEntries)
    .where(
      and(
        eq(timeEntries.staffId, staffId),
        or(
          eq(timeEntries.status, "clocked_in"),
          eq(timeEntries.status, "on_break")
        )
      )
    );
  return active || null;
}

export async function getTimeEntriesByStaff(
  staffId: number,
  startDate: Date,
  endDate: Date
) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(timeEntries)
    .where(
      and(
        eq(timeEntries.staffId, staffId),
        gte(timeEntries.clockIn, startDate),
        lte(timeEntries.clockIn, endDate)
      )
    )
    .orderBy(desc(timeEntries.clockIn));
}

export async function getWeeklyHours(staffId: number) {
  const db = await getDb();
  if (!db) return { totalHours: 0, overtime: 0, shifts: 0 };
  // Get start of current week (Monday)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  monday.setHours(0, 0, 0, 0);
  const entries = await db
    .select()
    .from(timeEntries)
    .where(
      and(
        eq(timeEntries.staffId, staffId),
        gte(timeEntries.clockIn, monday),
        eq(timeEntries.status, "clocked_out")
      )
    );
  const totalHours = entries.reduce(
    (sum, e) => sum + parseFloat(e.hoursWorked || "0"),
    0
  );
  const overtime = Math.max(0, totalHours - 40);
  return {
    totalHours: Math.round(totalHours * 100) / 100,
    overtime: Math.round(overtime * 100) / 100,
    shifts: entries.length,
  };
}

export async function getAllActiveClocks() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(timeEntries)
    .where(
      or(
        eq(timeEntries.status, "clocked_in"),
        eq(timeEntries.status, "on_break")
      )
    );
}

export async function getAllWeeklyHours() {
  const db = await getDb();
  if (!db) return [];
  // Get start of current week (Monday)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  monday.setHours(0, 0, 0, 0);
  const entries = await db
    .select()
    .from(timeEntries)
    .where(
      and(
        gte(timeEntries.clockIn, monday),
        eq(timeEntries.status, "clocked_out")
      )
    );
  // Group by staffId
  const byStaff = new Map<number, { totalHours: number; shifts: number }>();
  for (const e of entries) {
    const existing = byStaff.get(e.staffId) || { totalHours: 0, shifts: 0 };
    existing.totalHours += parseFloat(e.hoursWorked || "0");
    existing.shifts += 1;
    byStaff.set(e.staffId, existing);
  }
  return Array.from(byStaff.entries()).map(([staffId, data]) => ({
    staffId,
    totalHours: Math.round(data.totalHours * 100) / 100,
    overtime: Math.round(Math.max(0, data.totalHours - 40) * 100) / 100,
    shifts: data.shifts,
  }));
}

// ============ EOD DIGEST HELPERS ============

export async function getEodDigestData() {
  const db = await getDb();
  if (!db) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Who worked today
  const todayEntries = await db
    .select()
    .from(timeEntries)
    .where(
      and(gte(timeEntries.clockIn, today), lte(timeEntries.clockIn, tomorrow))
    );

  // Checklists completed today
  const todayChecklists = await db
    .select()
    .from(checklistCompletions)
    .where(
      and(
        gte(checklistCompletions.createdAt, today),
        lte(checklistCompletions.createdAt, tomorrow)
      )
    );

  // Voids today
  const todayVoids = await db
    .select()
    .from(voids)
    .where(and(gte(voids.date, today), lte(voids.date, tomorrow)));

  // Issues reported today
  const todayIssues = await db
    .select()
    .from(issues)
    .where(and(gte(issues.createdAt, today), lte(issues.createdAt, tomorrow)));

  // Active 86'd broadcasts (not resolved)
  const active86d = await db
    .select()
    .from(stationBroadcasts)
    .where(
      and(
        eq(stationBroadcasts.broadcastType, "86d"),
        sql`${stationBroadcasts.resolvedAt} IS NULL`
      )
    );

  // Tomorrow's schedule
  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
  const tomorrowSchedule = await db
    .select()
    .from(scheduleShifts)
    .where(
      and(
        gte(scheduleShifts.date, tomorrow),
        lte(scheduleShifts.date, tomorrowEnd)
      )
    );

  return {
    staffWorked: todayEntries.length,
    totalHoursToday: todayEntries
      .reduce((sum, e) => sum + parseFloat(e.hoursWorked || "0"), 0)
      .toFixed(1),
    checklistsCompleted: todayChecklists.length,
    voidsToday: todayVoids.length,
    voidTotal: todayVoids
      .reduce((sum, v) => sum + parseFloat(v.amount || "0"), 0)
      .toFixed(2),
    issuesReported: todayIssues.length,
    active86dItems: active86d.map(b => b.itemName).filter(Boolean),
    tomorrowShiftsScheduled: tomorrowSchedule.length,
  };
}

// ============ SECURITY EVENTS (AUDIT LOG) ============

export type SecurityEventType = InsertSecurityEvent["eventType"];

export async function logSecurityEvent(event: {
  eventType: InsertSecurityEvent["eventType"];
  staffId?: number | null;
  staffName?: string | null;
  ipAddress: string;
  userAgent?: string | null;
  details?: string | null;
  severity?: "info" | "warning" | "critical";
}): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Security] Cannot log event: database not available");
    return;
  }
  try {
    await db.insert(securityEvents).values({
      eventType: event.eventType,
      staffId: event.staffId ?? null,
      staffName: event.staffName ?? null,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent ?? null,
      details: event.details ?? null,
      severity: event.severity ?? "info",
    });
  } catch (error) {
    console.error("[Security] Failed to log event:", error);
  }
}

export async function getSecurityEvents(
  options: {
    limit?: number;
    offset?: number;
    eventType?: string;
    severity?: string;
    staffId?: number;
    startDate?: Date;
    endDate?: Date;
  } = {}
): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  const {
    limit = 100,
    offset = 0,
    eventType,
    severity,
    staffId,
    startDate,
    endDate,
  } = options;
  const conditions: any[] = [];
  if (eventType)
    conditions.push(eq(securityEvents.eventType, eventType as any));
  if (severity) conditions.push(eq(securityEvents.severity, severity as any));
  if (staffId) conditions.push(eq(securityEvents.staffId, staffId));
  if (startDate) conditions.push(gte(securityEvents.createdAt, startDate));
  if (endDate) conditions.push(lte(securityEvents.createdAt, endDate));
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  return db
    .select()
    .from(securityEvents)
    .where(whereClause)
    .orderBy(desc(securityEvents.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getSecurityEventsByStaff(
  staffId: number,
  limit: number = 50
): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(securityEvents)
    .where(eq(securityEvents.staffId, staffId))
    .orderBy(desc(securityEvents.createdAt))
    .limit(limit);
}

export async function getRecentLockouts(hours: number = 24): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  return db
    .select()
    .from(securityEvents)
    .where(
      and(
        eq(securityEvents.eventType, "lockout_triggered"),
        gte(securityEvents.createdAt, since)
      )
    )
    .orderBy(desc(securityEvents.createdAt));
}

export async function getSecurityStats(): Promise<{
  totalEvents24h: number;
  failedLogins24h: number;
  lockouts24h: number;
  pinChanges24h: number;
  criticalEvents24h: number;
}> {
  const db = await getDb();
  if (!db)
    return {
      totalEvents24h: 0,
      failedLogins24h: 0,
      lockouts24h: 0,
      pinChanges24h: 0,
      criticalEvents24h: 0,
    };
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const events = await db
    .select()
    .from(securityEvents)
    .where(gte(securityEvents.createdAt, since));
  return {
    totalEvents24h: events.length,
    failedLogins24h: events.filter(e => e.eventType === "login_failed").length,
    lockouts24h: events.filter(e => e.eventType === "lockout_triggered").length,
    pinChanges24h: events.filter(e => e.eventType === "pin_changed").length,
    criticalEvents24h: events.filter(e => e.severity === "critical").length,
  };
}

export async function resolveSecurityEvent(
  eventId: number,
  resolvedBy: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(securityEvents)
    .set({ resolved: true, resolvedBy, resolvedAt: new Date() })
    .where(eq(securityEvents.id, eventId));
}

export async function changeStaffPin(
  staffId: number,
  newPin: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(staff).set({ pin: newPin }).where(eq(staff.id, staffId));
}

// ============ EMAIL/PASSWORD AUTH HELPERS ============

/** Get staff by email (for email login) - returns full record including passwordHash */
export async function getStaffByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(staff)
    .where(eq(staff.email, email.toLowerCase().trim()))
    .limit(1);
  return result[0];
}

/** Get staff by Facebook ID (for Facebook OAuth login) */
export async function getStaffByFacebookId(facebookId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(staff)
    .where(eq(staff.facebookId, facebookId))
    .limit(1);
  return result[0];
}

/** Register a new staff member with email/password */
export async function registerStaffWithEmail(data: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  passwordHash: string;
  department: string;
  jobRole: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(staff).values({
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email.toLowerCase().trim(),
    phone: data.phone || null,
    passwordHash: data.passwordHash,
    department: data.department as any,
    jobRole: data.jobRole as any,
    isKeyEmployee: false,
    canAuthPayouts: false,
    status: "active",
    lastLoginMethod: "email",
  });
  return result[0].insertId;
}

/** Update staff password hash */
export async function updateStaffPassword(
  staffId: number,
  passwordHash: string
) {
  const db = await getDb();
  if (!db) return;
  await db.update(staff).set({ passwordHash }).where(eq(staff.id, staffId));
}

/** Link Facebook account to existing staff */
export async function linkFacebookToStaff(
  staffId: number,
  facebookId: string,
  accessToken: string,
  profilePhotoUrl?: string
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(staff)
    .set({
      facebookId,
      facebookAccessToken: accessToken,
      profilePhotoUrl: profilePhotoUrl || undefined,
      lastLoginMethod: "facebook",
    })
    .where(eq(staff.id, staffId));
}

/** Update last login method */
export async function updateLastLoginMethod(
  staffId: number,
  method: "pin" | "email" | "facebook"
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(staff)
    .set({ lastLoginMethod: method })
    .where(eq(staff.id, staffId));
}

// ============ FORGOT PASSWORD ============
import crypto from "crypto";

export async function createPasswordResetToken(
  staffId: number
): Promise<{ token: string; expiresAt: Date } | null> {
  const db = await getDb();
  if (!db) return null;
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  await db.insert(passwordResetTokens).values({ staffId, token, expiresAt });
  return { token, expiresAt };
}

export async function validateResetToken(
  token: string
): Promise<{ staffId: number; id: number } | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.token, token),
        isNull(passwordResetTokens.usedAt)
      )
    )
    .limit(1);
  if (!row) return null;
  // Check expiry
  if (new Date() > row.expiresAt) return null;
  return { staffId: row.staffId, id: row.id };
}

export async function markResetTokenUsed(tokenId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, tokenId));
}

export function normalizePhoneNumber(phone: string): string {
  // Strip all non-digit characters
  let digits = phone.replace(/\D/g, "");
  // If 10 digits (US), prepend +1
  if (digits.length === 10) digits = "1" + digits;
  // If 11 digits starting with 1 (US), format as +1XXXXXXXXXX
  if (digits.length === 11 && digits.startsWith("1")) return "+" + digits;
  // Otherwise return with + prefix
  return "+" + digits;
}
