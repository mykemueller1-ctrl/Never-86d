import type { Express, Request, Response } from "express";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { staff, scheduleShifts, checklistCompletions, payouts, timeEntries } from "../../drizzle/schema";
import { getDb, getBriefingDataSnapshot, getEodDigestData } from "../db";
import { sdk } from "../_core/sdk";
import { notifyOwner } from "../_core/notification";
import { readAshleyParSheet } from "../integrations/sheets/parSheet";
import { readSalesHubReconciliationData } from "../integrations/sheets/salesHub";
import { readStaffScheduleFromSheets, type ParsedScheduleShift } from "../integrations/sheets/scheduleSync";
import { buildDailyIdempotencyKey, runScheduledJob } from "./jobRunner";

interface AuthenticatedUser {
  name?: string | null;
  openId: string;
}

type RouteHandler = (req: Request, user: AuthenticatedUser) => Promise<Record<string, unknown>>;

/**
 * P2 scheduled endpoints.
 *
 * Register both /scheduled/* (requested P2 route shape) and /api/scheduled/* (existing CTap convention) so callers can migrate safely.
 */
export function registerP2ScheduledRoutes(app: Express) {
  registerJobRoute(app, ["/scheduled/par-sync", "/api/scheduled/par-sync"], "p2.par-sync", async (req) => {
    return runParSync(req.body as Record<string, unknown> | undefined);
  });

  registerJobRoute(app, ["/scheduled/schedule-sync", "/api/scheduled/schedule-sync"], "p2.schedule-sync", async (req) => {
    return runScheduleSync(req.body as Record<string, unknown> | undefined);
  });

  registerJobRoute(app, ["/scheduled/workbook-reconcile", "/api/scheduled/workbook-reconcile"], "p2.workbook-reconcile", async (req) => {
    return runWorkbookReconcile(req.body as Record<string, unknown> | undefined);
  });

  registerJobRoute(app, ["/scheduled/daily-briefing", "/api/scheduled/daily-briefing"], "p2.daily-briefing", async () => {
    return runDailyBriefingSummary();
  });

  registerJobRoute(app, ["/scheduled/eod-digest", "/api/scheduled/p2-eod-digest"], "p2.eod-digest", async () => {
    return runP2EodDigest();
  });
}

function registerJobRoute(app: Express, paths: string[], jobName: string, handler: RouteHandler) {
  for (const path of paths) {
    app.post(path, async (req: Request, res: Response) => {
      const user = await authenticateScheduledRequest(req, res);
      if (!user) return;
      console.log(`[Scheduled:P2] ${jobName} triggered by ${user.name || user.openId} via ${path}`);

      try {
        const run = await runScheduledJob({
          jobName,
          trigger: "scheduled",
          idempotencyKey: buildDailyIdempotencyKey(jobName),
          handler: async () => ({ summary: await handler(req, user) }),
        });
        res.status(200).json({ success: run.status !== "failed", jobName, runId: run.runId, idempotencyKey: run.idempotencyKey, ...run.summary });
      } catch (error) {
        console.error(`[Scheduled:P2] ${jobName} failed:`, error);
        res.status(500).json({ success: false, jobName, error: error instanceof Error ? error.message : String(error) });
      }
    });
  }
}

async function authenticateScheduledRequest(req: Request, res: Response): Promise<AuthenticatedUser | null> {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user) {
      res.status(401).json({ error: "No user found" });
      return null;
    }
    return user as AuthenticatedUser;
  } catch {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
}

async function runParSync(body: Record<string, unknown> | undefined): Promise<Record<string, unknown>> {
  const snapshot = await readAshleyParSheet();
  const highConfidenceProducts = snapshot.products.filter((product) => product.confidence === "high").length;
  const readOnly = body?.readOnly !== false;

  // P2 deliberately starts READ-ONLY: no product catalog writes occur here until Beer tab normalization is reviewed.
  return {
    readOnly,
    spreadsheetId: snapshot.spreadsheetId,
    fetchedAt: snapshot.fetchedAt,
    productCount: snapshot.products.length,
    highConfidenceProducts,
    liquorProducts: snapshot.report.liquorProducts,
    beerProducts: snapshot.report.beerProducts,
    beerRowsNeedingParNormalization: snapshot.report.beerRowsNeedingParNormalization,
    normalizationReport: snapshot.report,
  };
}

async function runScheduleSync(body: Record<string, unknown> | undefined): Promise<Record<string, unknown>> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const activeStaff = await db.select({ id: staff.id, firstName: staff.firstName, lastName: staff.lastName }).from(staff).where(eq(staff.status, "active"));
  const snapshot = await readStaffScheduleFromSheets({
    spreadsheetId: asOptionalString(body?.spreadsheetId),
    sheetTitle: asOptionalString(body?.sheetTitle),
    range: asOptionalString(body?.range),
    staffDirectory: activeStaff,
  });

  const write = body?.write === true;
  let upserted = 0;
  let skipped = 0;
  const rejectedForWrite: Array<{ staffName: string; date: string; reason: string }> = [];

  if (write) {
    for (const shift of snapshot.shifts) {
      if (!canWriteShift(shift)) {
        skipped++;
        rejectedForWrite.push({ staffName: shift.staffName, date: shift.date, reason: "Shift lacks staff match or has conflict reasons." });
        continue;
      }
      const existing = await db.select().from(scheduleShifts).where(and(
        eq(scheduleShifts.staffId, shift.staffId as number),
        eq(scheduleShifts.date, new Date(shift.date)),
        eq(scheduleShifts.startTime, shift.startTime),
        eq(scheduleShifts.endTime, shift.endTime),
      )).limit(1);

      const values = {
        staffId: shift.staffId as number,
        date: new Date(shift.date),
        startTime: shift.startTime,
        endTime: shift.endTime,
        position: shift.position,
        department: shift.department,
        status: "scheduled" as const,
        notes: `Synced from Sheets: ${shift.staffName}${shift.notes ? ` — ${shift.notes}` : ""}`,
      };

      if (existing[0]) {
        await db.update(scheduleShifts).set(values).where(eq(scheduleShifts.id, existing[0].id));
      } else {
        await db.insert(scheduleShifts).values(values);
      }
      upserted++;
    }
  }

  return {
    readOnly: !write,
    spreadsheetId: snapshot.spreadsheetId,
    parsed: snapshot.summary.parsed,
    rejected: snapshot.summary.rejected,
    highConfidence: snapshot.summary.highConfidence,
    conflicts: snapshot.summary.conflicts,
    upserted,
    skipped,
    rejectedForWrite,
    rejectedRows: snapshot.rejectedRows,
  };
}

async function runWorkbookReconcile(body: Record<string, unknown> | undefined): Promise<Record<string, unknown>> {
  const snapshot = await readSalesHubReconciliationData({
    spreadsheetId: asOptionalString(body?.spreadsheetId),
    sheetTitles: Array.isArray(body?.sheetTitles) ? body.sheetTitles.filter((value): value is string => typeof value === "string") : undefined,
  });

  return {
    spreadsheetId: snapshot.spreadsheetId,
    fetchedAt: snapshot.fetchedAt,
    sheetCount: snapshot.totals.sheetCount,
    rowCount: snapshot.totals.rowCount,
    invoiceLikeRows: snapshot.totals.invoiceLikeRows,
    salesLikeRows: snapshot.totals.salesLikeRows,
    reconciliationNotes: buildWorkbookReconciliationNotes(snapshot),
  };
}

async function runDailyBriefingSummary(): Promise<Record<string, unknown>> {
  const snapshot = await getBriefingDataSnapshot();
  if (!snapshot) return { generated: false, reason: "No briefing data available" };

  const alerts = [
    ...((snapshot.anomalies ?? []) as Array<{ description?: string; anomalyType?: string }>).slice(0, 5).map((item) => item.description ?? item.anomalyType ?? "Operational anomaly"),
  ];
  await notifyOwner({
    title: "CTap P2 Daily Briefing Snapshot",
    content: [
      `Sales trend rows: ${snapshot.categoryTrends?.length ?? 0}`,
      `Upcoming events: ${snapshot.events?.length ?? 0}`,
      `Unacknowledged anomalies: ${snapshot.anomalies?.length ?? 0}`,
      alerts.length > 0 ? `Top alerts:\n${alerts.map((alert) => `• ${alert}`).join("\n")}` : "No high-priority alerts in snapshot.",
    ].join("\n"),
  });

  return {
    generated: true,
    categoryTrendRows: snapshot.categoryTrends?.length ?? 0,
    events: snapshot.events?.length ?? 0,
    anomalies: snapshot.anomalies?.length ?? 0,
  };
}

async function runP2EodDigest(): Promise<Record<string, unknown>> {
  const [digestData, db] = await Promise.all([getEodDigestData(), getDb()]);
  if (!digestData) return { sent: false, reason: "No EOD data available" };

  const today = getLocalDayRange(new Date());
  let payoutSummary = { count: 0, total: 0 };
  let checklistCompletionRows = 0;
  let scheduleAdherence = { scheduled: 0, clockedIn: 0 };

  if (db) {
    const todaysPayouts = await db.select().from(payouts).where(and(gte(payouts.date, today.start), lte(payouts.date, today.end)));
    payoutSummary = {
      count: todaysPayouts.length,
      total: todaysPayouts.reduce((sum, payout) => sum + Number.parseFloat(payout.amount), 0),
    };

    const completions = await db.select({ count: sql<number>`COUNT(*)` }).from(checklistCompletions).where(and(
      gte(checklistCompletions.date, today.start),
      lte(checklistCompletions.date, today.end),
    ));
    checklistCompletionRows = Number(completions[0]?.count ?? 0);

    const todaysShifts = await db.select().from(scheduleShifts).where(and(gte(scheduleShifts.date, today.start), lte(scheduleShifts.date, today.end)));
    const todaysTimeEntries = await db.select().from(timeEntries).where(and(gte(timeEntries.clockIn, today.start), lte(timeEntries.clockIn, today.end)));
    scheduleAdherence = { scheduled: todaysShifts.length, clockedIn: new Set(todaysTimeEntries.map((entry) => entry.staffId)).size };
  }

  const content = [
    "END-OF-DAY DIGEST",
    `Checklists completed: ${digestData.checklistsCompleted} (${checklistCompletionRows} completion rows today)`,
    `Payouts: ${payoutSummary.count} transactions, $${payoutSummary.total.toFixed(2)}`,
    `Schedule adherence: ${scheduleAdherence.clockedIn}/${scheduleAdherence.scheduled} scheduled staff clocked in`,
    `Voids: ${digestData.voidsToday} ($${digestData.voidTotal})`,
    `Issues reported: ${digestData.issuesReported}`,
  ].join("\n");

  const sent = await notifyOwner({ title: "CTap P2 EOD Digest", content });
  return { sent, payoutSummary, checklistCompletionRows, scheduleAdherence };
}

function buildWorkbookReconciliationNotes(snapshot: Awaited<ReturnType<typeof readSalesHubReconciliationData>>): string[] {
  const notes: string[] = [];
  if (snapshot.totals.rowCount === 0) notes.push("No rows were read from the hub workbook; confirm tab permissions and ranges.");
  if (snapshot.totals.invoiceLikeRows === 0) notes.push("No invoice-like rows were detected; reconciliation remains source-review only.");
  if (snapshot.totals.salesLikeRows === 0) notes.push("No sales-like rows were detected; POS comparison is not yet available from this snapshot.");
  return notes;
}

function canWriteShift(shift: ParsedScheduleShift): boolean {
  return Boolean(shift.staffId && shift.confidence === "high" && shift.conflictReasons.length === 0);
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function getLocalDayRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}
