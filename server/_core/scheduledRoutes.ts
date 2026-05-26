import { createHash, randomUUID } from "node:crypto";
import type { Express, Request, Response } from "express";
import { sdk } from "./sdk";
import { invokeLLM } from "./llm";
import { notifyOwner } from "./notification";
import {
  getBriefingDataSnapshot,
  saveManagementBriefing,
  getManagementBriefings,
  markBriefingNotified,
  archiveInactiveStaff,
  getAllPayouts,
  getDb,
  createScheduleShift,
  createDailySalesIfNew,
  createInvoiceIfNew,
  createScheduledJobRun,
  finishScheduledJobRun,
  recordIngestionDeadLetter,
  upsertSourceCatalogEntry,
} from "../db";
import { seedAllData } from "../seedAllData";
import { staff, type InsertInvoice } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import {
  findPdfAttachments as findGmailPdfAttachments,
  getAttachmentBuffer as getGmailAttachmentBuffer,
  hashAttachment as hashGmailAttachment,
  searchAndReadGmail,
  type GmailMessage,
} from "../integrations/gmail";
import {
  findPdfAttachments as findOutlookPdfAttachments,
  getAttachmentBuffer as getOutlookAttachmentBuffer,
  hashAttachment as hashOutlookAttachment,
  searchAndReadOutlook,
  type OutlookMessage,
} from "../integrations/outlook";
import { extractPdfTextFromBuffer } from "../integrations/pdf";
import {
  detectPdqZReports,
  PDQ_MAILBOX,
  PDQ_SENDER,
} from "../integrations/pdq/detector";
import {
  parsePdqZReportText,
  PDQ_PARSER_VERSION,
  toDailySalesInsert,
} from "../integrations/pdq/parser";
import {
  parsePfsOrderConfirmation,
  PFS_PARSER_VERSION,
  PFS_SENDER,
  PFS_VENDOR_NAME,
} from "../integrations/vendors/pfs";
import {
  NORTHERN_LIGHTS_PARSER_VERSION,
  NORTHERN_LIGHTS_VENDOR_NAME,
  parseNorthernLightsInvoice,
} from "../integrations/vendors/northernLights";
import {
  HUMES_MAILBOX,
  HUMES_PARSER_VERSION,
  HUMES_SENDER,
  HUMES_VENDOR_NAME,
  parseHumesInvoice,
} from "../integrations/vendors/humes";

type IngestionCounters = {
  source: Record<string, number>;
  inserted: Record<string, number>;
  updated: Record<string, number>;
  dead: Record<string, number>;
  errors: string[];
};

function makeRunId(jobName: string): string {
  return `${jobName}-${new Date().toISOString()}-${randomUUID()}`;
}

function stableDedupeKey(
  parts: Array<string | number | undefined | null>
): string {
  const payload = parts
    .map(part =>
      String(part ?? "")
        .trim()
        .toLowerCase()
    )
    .join("|");
  return createHash("sha256").update(payload).digest("hex");
}

function stripHtml(value?: string): string {
  return (value ?? "")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+\n/g, "\n")
    .trim();
}

function count(counter: Record<string, number>, key: string, amount = 1) {
  counter[key] = (counter[key] ?? 0) + amount;
}

async function authenticateScheduled(
  req: Request,
  res: Response
): Promise<boolean> {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user) {
      res.status(401).json({ error: "No user found" });
      return false;
    }
    return true;
  } catch {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
}

async function finishIngestionRun(
  jobName: string,
  runId: string,
  counters: IngestionCounters
) {
  const status =
    counters.errors.length > 0 ||
    Object.values(counters.dead).some(value => value > 0)
      ? "partial"
      : "success";
  await finishScheduledJobRun(runId, {
    jobName,
    runId,
    status,
    sourceCounts: counters.source,
    insertedCounts: counters.inserted,
    updatedCounts: counters.updated,
    deadLetterCounts: counters.dead,
    errorSummary: counters.errors.slice(0, 10).join("\n") || null,
    nextAction:
      status === "partial"
        ? "Review ingestion_dead_letters and parser warnings before relying on affected records."
        : "No action required.",
  });
}

async function deadLetter(input: {
  jobName: string;
  runId: string;
  sourceProvider: "gmail" | "outlook" | "manual" | "unknown";
  sourceMailbox?: string;
  sourceMessageId?: string;
  sourceAttachmentHash?: string;
  vendorName?: string;
  parserName: string;
  parserVersion?: string;
  errorSummary: string;
  rawText?: string;
  payload?: unknown;
}) {
  await recordIngestionDeadLetter({
    jobName: input.jobName,
    runId: input.runId,
    sourceProvider: input.sourceProvider,
    sourceMailbox: input.sourceMailbox,
    sourceMessageId: input.sourceMessageId,
    sourceAttachmentHash: input.sourceAttachmentHash,
    vendorName: input.vendorName,
    parserName: input.parserName,
    parserVersion: input.parserVersion,
    errorSummary: input.errorSummary,
    rawText: input.rawText,
    payload: input.payload as any,
  });
}

function invoiceInsertFromParsed(input: {
  vendorName: string;
  invoiceNumber?: string;
  date?: Date;
  totalAmount?: string;
  category: InsertInvoice["category"];
  items: unknown;
  rawText: string;
  sourceProvider: "gmail" | "outlook";
  sourceMailbox: string;
  sourceMessageId: string;
  sourceAttachmentHash?: string;
  parserVersion: string;
  parserConfidence: number;
  dedupeKey: string;
  needsReview: boolean;
  warnings: string[];
}): InsertInvoice | null {
  if (!input.date || !input.totalAmount) return null;
  return {
    vendorName: input.vendorName,
    invoiceNumber: input.invoiceNumber,
    date: input.date,
    totalAmount: input.totalAmount,
    category: input.category,
    items: input.items as any,
    sourceProvider: input.sourceProvider,
    sourceMailbox: input.sourceMailbox,
    sourceMessageId: input.sourceMessageId,
    sourceAttachmentHash: input.sourceAttachmentHash,
    parserVersion: input.parserVersion,
    parserConfidence: input.parserConfidence.toFixed(3),
    dedupeKey: input.dedupeKey,
    needsReview: input.needsReview,
    rawText: input.rawText,
    flagged: input.needsReview,
    flagReason: input.warnings.join("; ") || undefined,
  };
}
import { registerP2ScheduledRoutes } from "../scheduled/p2ScheduledRoutes";

/**
 * Scheduled task endpoint for generating management briefings.
 * Called by the Manus scheduled task agent via POST /api/scheduled/briefing
 * Auth: uses the auto-injected scheduled task cookie (user role).
 */
export function registerScheduledRoutes(app: Express) {
  registerP2ScheduledRoutes(app);
  // ─── Reactivate All Staff (one-time fix for archive bug) ───
  app.post(
    "/api/scheduled/reactivate-staff",
    async (req: Request, res: Response) => {
      let user;
      try {
        user = await sdk.authenticateRequest(req);
      } catch {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      if (!user) {
        res.status(401).json({ error: "No user found" });
        return;
      }

      console.log(
        `[Scheduled] Reactivate-staff triggered by user: ${user.name || user.openId}`
      );
      try {
        const db = await getDb();
        if (!db) {
          res.status(500).json({ error: "Database not available" });
          return;
        }

        // Set all inactive staff back to active and give them a recent lastClockIn
        const result = await db
          .update(staff)
          .set({ status: "active" as const, lastClockIn: new Date() })
          .where(eq(staff.status, "inactive"));
        const reactivated = (result as any)[0]?.affectedRows ?? 0;

        console.log(`[Scheduled] Reactivated ${reactivated} staff members`);
        await notifyOwner({
          title: "Staff Reactivation Complete",
          content: `${reactivated} staff member${reactivated !== 1 ? "s" : ""} reactivated after archive bug fix.`,
        });

        res.status(200).json({ success: true, reactivated });
      } catch (err) {
        console.error("[Scheduled] Reactivate-staff failed:", err);
        res.status(500).json({ success: false, error: "Reactivation failed" });
      }
    }
  );

  // ─── Auto-Archive Inactive Staff ───
  app.post(
    "/api/scheduled/auto-archive",
    async (req: Request, res: Response) => {
      let user;
      try {
        user = await sdk.authenticateRequest(req);
      } catch {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      if (!user) {
        res.status(401).json({ error: "No user found" });
        return;
      }

      console.log(
        `[Scheduled] Auto-archive triggered by user: ${user.name || user.openId}`
      );
      try {
        const archivedCount = await archiveInactiveStaff();
        console.log(
          `[Scheduled] Archived ${archivedCount} inactive staff members`
        );

        if (archivedCount > 0) {
          await notifyOwner({
            title: "Staff Auto-Archive Report",
            content: `${archivedCount} staff member${archivedCount > 1 ? "s" : ""} archived (no clock-in for 30+ days).`,
          });
        }

        res.status(200).json({ success: true, archivedCount });
      } catch (err) {
        console.error("[Scheduled] Auto-archive failed:", err);
        res.status(500).json({ success: false, error: "Auto-archive failed" });
      }
    }
  );

  // ─── Daily Payout Digest ───
  app.post(
    "/api/scheduled/payout-digest",
    async (req: Request, res: Response) => {
      let user;
      try {
        user = await sdk.authenticateRequest(req);
      } catch {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      if (!user) {
        res.status(401).json({ error: "No user found" });
        return;
      }

      console.log(
        `[Scheduled] Payout digest triggered by user: ${user.name || user.openId}`
      );
      try {
        const allPayouts = await getAllPayouts(200);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayPayouts = allPayouts.filter(p => new Date(p.date) >= today);
        const totalAmount = todayPayouts.reduce(
          (sum, p) => sum + parseFloat(p.amount),
          0
        );
        const flaggedCount = todayPayouts.filter(p => p.flagged).length;

        if (todayPayouts.length > 0) {
          const lines = [
            `Today's Payouts: ${todayPayouts.length} transactions totaling $${totalAmount.toFixed(2)}`,
            flaggedCount > 0
              ? `\n⚠️ ${flaggedCount} FLAGGED payout${flaggedCount > 1 ? "s" : ""} need review`
              : "",
            "",
            ...todayPayouts.map(
              p =>
                `• $${parseFloat(p.amount).toFixed(2)} — ${p.category || "misc"}${p.vendor ? ` at ${p.vendor}` : ""}`
            ),
          ].filter(Boolean);

          await notifyOwner({
            title: `CTap Payout Digest: $${totalAmount.toFixed(2)} (${todayPayouts.length} txns)`,
            content: lines.join("\n"),
          });
          console.log(
            `[Scheduled] Payout digest sent: ${todayPayouts.length} payouts, $${totalAmount.toFixed(2)}`
          );
        } else {
          console.log("[Scheduled] No payouts today — skipping digest");
        }

        res.status(200).json({
          success: true,
          count: todayPayouts.length,
          totalAmount: totalAmount.toFixed(2),
          flaggedCount,
        });
      } catch (err) {
        console.error("[Scheduled] Payout digest failed:", err);
        res.status(500).json({ success: false, error: "Payout digest failed" });
      }
    }
  );

  // ─── Seed All Platform Data (menu, achievements, rewards, missions) ───
  app.post(
    "/api/scheduled/seed-all-data",
    async (req: Request, res: Response) => {
      let user;
      try {
        user = await sdk.authenticateRequest(req);
      } catch {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      if (!user) {
        res.status(401).json({ error: "No user found" });
        return;
      }

      console.log(
        `[Scheduled] Seed-all-data triggered by user: ${user.name || user.openId}`
      );
      try {
        const results = await seedAllData();
        console.log(`[Scheduled] Seed-all-data results:`, results);
        await notifyOwner({
          title: "Platform Data Seeded",
          content: Object.entries(results)
            .map(([k, v]) => `${k}: ${v}`)
            .join("\n"),
        });
        res.status(200).json({ success: true, results });
      } catch (err) {
        console.error("[Scheduled] Seed-all-data failed:", err);
        res.status(500).json({ success: false, error: "Seed failed" });
      }
    }
  );

  // ─── End-of-Day Digest ───
  app.post("/api/scheduled/eod-digest", async (req: Request, res: Response) => {
    let user;
    try {
      user = await sdk.authenticateRequest(req);
    } catch {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!user) {
      res.status(401).json({ error: "No user found" });
      return;
    }

    console.log(
      `[Scheduled] EOD digest triggered by user: ${user.name || user.openId}`
    );

    try {
      const { getEodDigestData } = await import("../db");
      const data = await getEodDigestData();
      if (!data) {
        res.status(200).json({ success: false, error: "No data available" });
        return;
      }

      const today = new Date();
      const dayName = today.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      });

      const digestContent = [
        `📋 END-OF-DAY DIGEST — ${dayName}`,
        ``,
        `STAFFING`,
        `• ${data.staffWorked} staff clocked in today`,
        `• ${data.totalHoursToday} total hours worked`,
        `• ${data.tomorrowShiftsScheduled} shifts scheduled tomorrow`,
        ``,
        `OPERATIONS`,
        `• ${data.checklistsCompleted} checklists completed`,
        `• ${data.voidsToday} voids ($${data.voidTotal})`,
        `• ${data.issuesReported} issues reported`,
        data.active86dItems.length > 0
          ? `• 86'd: ${data.active86dItems.join(", ")}`
          : `• No active 86'd items`,
      ].join("\n");

      const sent = await notifyOwner({
        title: `CTap EOD — ${dayName}`,
        content: digestContent,
      });

      console.log(`[Scheduled] EOD digest sent: ${sent}`);
      res.status(200).json({ success: true, sent, data });
    } catch (err) {
      console.error("[Scheduled] EOD digest failed:", err);
      res.status(500).json({ success: false, error: "EOD digest failed" });
    }
  });

  // ─── Google Sheets Schedule Sync ───
  app.post(
    "/api/scheduled/sync-schedule",
    async (req: Request, res: Response) => {
      let user;
      try {
        user = await sdk.authenticateRequest(req);
      } catch {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      if (!user) {
        res.status(401).json({ error: "No user found" });
        return;
      }

      console.log(
        `[Scheduled] Schedule sync triggered by user: ${user.name || user.openId}`
      );
      try {
        const { shifts, department } = req.body;
        if (!shifts || !Array.isArray(shifts) || !department) {
          res
            .status(400)
            .json({
              success: false,
              error: "shifts array and department required",
            });
          return;
        }
        let synced = 0;
        const db = await getDb();
        if (!db) {
          res.status(500).json({ error: "Database not available" });
          return;
        }

        for (const shift of shifts) {
          try {
            await createScheduleShift({
              staffId: shift.staffId || 0,
              date: new Date(shift.date),
              startTime: shift.startTime,
              endTime: shift.endTime,
              position: shift.station || department,
              department: department as any,
              status: "scheduled",
              notes: shift.name ? `Synced: ${shift.name}` : undefined,
            });
            synced++;
          } catch (e) {
            /* skip invalid */
          }
        }

        console.log(
          `[Scheduled] Synced ${synced}/${shifts.length} shifts for ${department}`
        );
        res.status(200).json({ success: true, synced, total: shifts.length });
      } catch (err) {
        console.error("[Scheduled] Schedule sync failed:", err);
        res.status(500).json({ success: false, error: "Schedule sync failed" });
      }
    }
  );

  // ─── Daily Briefing Generation ───
  app.post("/api/scheduled/briefing", async (req: Request, res: Response) => {
    // Authenticate the request — scheduled tasks get "user" role
    let user;
    try {
      user = await sdk.authenticateRequest(req);
    } catch (err) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!user) {
      res.status(401).json({ error: "No user found" });
      return;
    }

    console.log(
      `[Scheduled] Briefing generation triggered by user: ${user.name || user.openId}`
    );

    try {
      const snapshot = await getBriefingDataSnapshot();
      if (!snapshot) {
        res
          .status(200)
          .json({ success: false, error: "No data available for briefing" });
        return;
      }

      const briefingIds: number[] = [];

      // Role definitions: Ashley = bar, Tom = BOH, Mychael = full schedule picture
      const roles = [
        {
          role: "michael",
          label: "Mychael (Scheduler)",
          focus: `Full schedule picture — staffing levels, revenue forecasts, event impacts, weather, all category trends (food, beer, liquor, pop), comp/promo/void patterns, and theories about anomalies. What days need extra staff? What days might be slow? Any upcoming events within 30 miles that could spike or kill traffic? What's weird in the numbers and why?`,
        },
        {
          role: "ashley",
          label: "Ashley (Bar)",
          focus: `Bar-specific intelligence — beer and liquor sales trends, which drinks are moving, which are dying, bar hourly patterns (when is the rush?), any bar-related voids or comps, weather impact on bar traffic, events that drive bar business (game nights, concerts), pop trends (mixers), and theories about what's changing in beverage sales.`,
        },
        {
          role: "tom",
          label: "Tom (BOH/Kitchen)",
          focus: `Back-of-house intelligence — food sales trends, pizza volume, prep level recommendations, kitchen void patterns (remakes, wrong orders), food cost indicators, hourly kitchen volume patterns, weather impact on food orders vs delivery, and theories about what's weird in the kitchen numbers.`,
        },
      ];

      for (const { role, label, focus } of roles) {
        const prompt = `You are the intelligence engine for Community Tap & Pizza in Fort Dodge, Iowa.
Generate a daily briefing for ${label}.

FOCUS: ${focus}

DATA SNAPSHOT:

Recent Daily Sales (last 14 days — food/beer/liquor/pop/total/voids/discounts):
${JSON.stringify(snapshot.categoryTrends, null, 2)}

Day-of-Week Revenue Patterns (Sun=0 thru Sat=6):
${JSON.stringify(snapshot.dowPatterns, null, 2)}

Product Mix — Top Beer:
${JSON.stringify(snapshot.productMix.beer, null, 2)}

Product Mix — Top Liquor:
${JSON.stringify(snapshot.productMix.liquor, null, 2)}

Product Mix — Top Food:
${JSON.stringify(snapshot.productMix.food, null, 2)}

Product Mix — Top Pop:
${JSON.stringify(snapshot.productMix.pop, null, 2)}

Weather (current + 7-day forecast):
${JSON.stringify(snapshot.weather, null, 2)}

Upcoming Events (within 30 miles, next 7 days):
${JSON.stringify(snapshot.events, null, 2)}

Void Summary by Employee:
${JSON.stringify(snapshot.voidSummary, null, 2)}

Recent Voids (last 7 days sample):
${JSON.stringify(snapshot.recentVoids.slice(0, 10), null, 2)}

Unacknowledged Anomalies:
${JSON.stringify(snapshot.anomalies, null, 2)}

Weather-Sales Correlation:
${JSON.stringify(snapshot.weatherCorrelation, null, 2)}

INSTRUCTIONS:
1. Be specific with dollar amounts and percentages
2. Call out what's WEIRD — unusual patterns, unexpected drops/spikes
3. Give THEORIES about WHY things are happening, not just what
4. Use plain language — these are busy restaurant managers, not data scientists
5. For Mychael: focus on staffing decisions for the coming week
6. For Ashley: focus on what to stock, what's trending, bar prep
7. For Tom: focus on food prep, kitchen efficiency, what to expect

Respond in JSON:
{
  "title": "Brief headline",
  "summary": "2-3 sentence executive summary",
  "sections": [
    { "heading": "Section Title", "content": "Detailed analysis" }
  ],
  "theories": ["Theory about something unusual"],
  "actionItems": ["Specific action to take"],
  "alerts": ["Urgent items needing immediate attention"]
}`;

        try {
          const response = await invokeLLM({
            messages: [
              {
                role: "system",
                content:
                  "You are a restaurant operations intelligence AI. Be specific with numbers. Call out what's weird. Give theories about WHY things are happening. Use plain language.",
              },
              { role: "user", content: prompt },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "management_briefing",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    summary: { type: "string" },
                    sections: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          heading: { type: "string" },
                          content: { type: "string" },
                        },
                        required: ["heading", "content"],
                        additionalProperties: false,
                      },
                    },
                    theories: { type: "array", items: { type: "string" } },
                    actionItems: { type: "array", items: { type: "string" } },
                    alerts: { type: "array", items: { type: "string" } },
                  },
                  required: [
                    "title",
                    "summary",
                    "sections",
                    "theories",
                    "actionItems",
                    "alerts",
                  ],
                  additionalProperties: false,
                },
              },
            },
          });

          const rawContent = response.choices?.[0]?.message?.content;
          const parsed =
            typeof rawContent === "string"
              ? JSON.parse(rawContent)
              : {
                  title: "Briefing",
                  summary: "No data",
                  sections: [],
                  theories: [],
                  actionItems: [],
                  alerts: [],
                };

          const fullContent = parsed.sections
            .map((s: any) => `## ${s.heading}\n\n${s.content}`)
            .join("\n\n");

          const id = await saveManagementBriefing({
            targetRole: role,
            briefingType: "daily",
            title: parsed.title,
            summary: parsed.summary,
            fullContent,
            dataSnapshot: snapshot.categoryTrends,
            weatherContext: snapshot.weather.slice(0, 3),
            eventsContext: snapshot.events,
            salesTrends: snapshot.categoryTrends,
            anomalies: snapshot.anomalies,
            theories: parsed.theories,
            actionItems: parsed.actionItems,
          });

          if (id) briefingIds.push(id);
          console.log(
            `[Scheduled] Generated ${role} briefing: ${parsed.title}`
          );
        } catch (err) {
          console.error(
            `[Scheduled] Failed to generate briefing for ${role}:`,
            err
          );
        }
      }

      // Send push notification to Mychael with the scheduler briefing
      if (briefingIds.length > 0) {
        const michaelBriefings = await getManagementBriefings("michael", 1);
        if (michaelBriefings.length > 0) {
          const latest = michaelBriefings[0];
          const theories = (latest.theories as string[]) || [];
          const actions = (latest.actionItems as string[]) || [];

          await notifyOwner({
            title: `CTap Intel: ${latest.title}`,
            content: [
              latest.summary,
              "",
              theories.length > 0 ? "THEORIES:" : "",
              ...theories.map((t: string) => `• ${t}`),
              "",
              actions.length > 0 ? "ACTION ITEMS:" : "",
              ...actions.map((a: string) => `• ${a}`),
            ]
              .filter(Boolean)
              .join("\n"),
          });
          await markBriefingNotified(latest.id);
          console.log("[Scheduled] Notification sent to owner");
        }
      }

      res.status(200).json({
        success: true,
        generated: briefingIds.length,
        ids: briefingIds,
        roles: ["michael", "ashley", "tom"],
      });
    } catch (err) {
      console.error("[Scheduled] Briefing generation failed:", err);
      res
        .status(500)
        .json({ success: false, error: "Briefing generation failed" });
    }
  });

  // ─── P1 Data Ingestion: PDQ Z-Report Detection ───
  app.post(
    ["/api/scheduled/pdq-detect", "/scheduled/pdq-detect"],
    async (req: Request, res: Response) => {
      if (!(await authenticateScheduled(req, res))) return;

      const jobName = "pdq-detect";
      const runId = makeRunId(jobName);
      const counters: IngestionCounters = {
        source: {},
        inserted: {},
        updated: {},
        dead: {},
        errors: [],
      };
      await createScheduledJobRun({
        jobName,
        runId,
        startedAt: new Date(),
        status: "running",
      });

      try {
        await upsertSourceCatalogEntry({
          vendorName: "PDQ",
          sourceProvider: "gmail",
          senderEmail: PDQ_SENDER,
          subjectPattern: "PDQ Z-report attachment",
          attachmentType: "pdf",
          frequency: "daily",
          lastSeenAt: new Date(),
          status: "active",
        });

        const candidates = await detectPdqZReports({
          daysBack: Number(req.body?.daysBack ?? 14),
          maxResults: Number(req.body?.maxResults ?? 50),
        });
        count(counters.source, "pdq_z_reports", candidates.length);

        for (const candidate of candidates) {
          try {
            const parsed = parsePdqZReportText(candidate.rawText);
            const dedupeKey = stableDedupeKey([
              "pdq",
              candidate.sourceProvider,
              candidate.sourceMailbox,
              candidate.attachmentHash,
            ]);
            const insert = toDailySalesInsert(parsed, {
              sourceProvider: "gmail",
              sourceMailbox: candidate.sourceMailbox,
              sourceMessageId: candidate.messageId,
              sourceAttachmentHash: candidate.attachmentHash,
              dedupeKey,
              rawText: candidate.rawText,
            });

            if (!insert || !parsed.grandTotal) {
              count(counters.dead, "pdq_z_reports");
              await deadLetter({
                jobName,
                runId,
                sourceProvider: "gmail",
                sourceMailbox: PDQ_MAILBOX,
                sourceMessageId: candidate.messageId,
                sourceAttachmentHash: candidate.attachmentHash,
                vendorName: "PDQ",
                parserName: "pdq-z-report",
                parserVersion: PDQ_PARSER_VERSION,
                errorSummary: `PDQ parse did not produce required daily-sales fields: ${parsed.warnings.join("; ")}`,
                rawText: candidate.rawText,
                payload: {
                  subject: candidate.subject,
                  warnings: parsed.warnings,
                  extractionWarnings: candidate.extractionWarnings,
                },
              });
              continue;
            }

            const result = await createDailySalesIfNew(
              insert as typeof insert & { dedupeKey: string }
            );
            count(
              counters.inserted,
              result.action === "inserted"
                ? "daily_sales"
                : "daily_sales_skipped_duplicate"
            );
          } catch (error) {
            const summary =
              error instanceof Error ? error.message : String(error);
            counters.errors.push(summary);
            count(counters.dead, "pdq_z_reports");
            await deadLetter({
              jobName,
              runId,
              sourceProvider: "gmail",
              sourceMailbox: PDQ_MAILBOX,
              sourceMessageId: candidate.messageId,
              sourceAttachmentHash: candidate.attachmentHash,
              vendorName: "PDQ",
              parserName: "pdq-z-report",
              parserVersion: PDQ_PARSER_VERSION,
              errorSummary: summary,
              rawText: candidate.rawText,
              payload: { subject: candidate.subject },
            });
          }
        }

        await finishIngestionRun(jobName, runId, counters);
        res.status(200).json({ success: true, runId, ...counters });
      } catch (error) {
        const summary = error instanceof Error ? error.message : String(error);
        counters.errors.push(summary);
        await finishScheduledJobRun(runId, {
          jobName,
          runId,
          status: "failed",
          errorSummary: summary,
          endedAt: new Date(),
          sourceCounts: counters.source,
          insertedCounts: counters.inserted,
          deadLetterCounts: counters.dead,
        });
        res.status(500).json({ success: false, runId, error: summary });
      }
    }
  );

  // ─── P1 Data Ingestion: Performance Foodservice Order Confirmations ───
  app.post(
    ["/api/scheduled/pfs-import", "/scheduled/pfs-import"],
    async (req: Request, res: Response) => {
      if (!(await authenticateScheduled(req, res))) return;

      const jobName = "pfs-import";
      const runId = makeRunId(jobName);
      const counters: IngestionCounters = {
        source: {},
        inserted: {},
        updated: {},
        dead: {},
        errors: [],
      };
      await createScheduledJobRun({
        jobName,
        runId,
        startedAt: new Date(),
        status: "running",
      });

      try {
        await upsertSourceCatalogEntry({
          vendorName: PFS_VENDOR_NAME,
          sourceProvider: "gmail",
          senderEmail: PFS_SENDER,
          subjectPattern: "order confirmation",
          attachmentType: "body-text",
          frequency: "as orders are placed",
          lastSeenAt: new Date(),
          status: "active",
        });

        const messages = await searchAndReadGmail(
          `from:${PFS_SENDER} newer_than:${Number(req.body?.daysBack ?? 30)}d`,
          Number(req.body?.maxResults ?? 50)
        );
        count(counters.source, "pfs_messages", messages.length);

        for (const message of messages) {
          const rawText = [
            message.bodyText,
            stripHtml(message.bodyHtml),
            message.snippet,
          ]
            .filter(Boolean)
            .join("\n\n");
          try {
            const parsed = parsePfsOrderConfirmation(rawText);
            const dedupeKey = stableDedupeKey([
              "pfs",
              "gmail",
              message.id,
              parsed.invoiceNumber,
              parsed.orderNumber,
              parsed.date?.toISOString(),
            ]);
            const invoice = invoiceInsertFromParsed({
              vendorName: parsed.vendorName,
              invoiceNumber: parsed.invoiceNumber,
              date: parsed.date,
              totalAmount: parsed.totalAmount,
              category: parsed.category,
              items: parsed.items,
              rawText: parsed.rawText,
              sourceProvider: "gmail",
              sourceMailbox: PDQ_MAILBOX,
              sourceMessageId: message.id,
              parserVersion: parsed.parserVersion,
              parserConfidence: parsed.confidence,
              dedupeKey,
              needsReview: parsed.needsReview,
              warnings: parsed.warnings,
            });

            if (!invoice) {
              count(counters.dead, "pfs_messages");
              await deadLetter({
                jobName,
                runId,
                sourceProvider: "gmail",
                sourceMailbox: PDQ_MAILBOX,
                sourceMessageId: message.id,
                vendorName: parsed.vendorName,
                parserName: "pfs-order-confirmation",
                parserVersion: PFS_PARSER_VERSION,
                errorSummary:
                  parsed.warnings.join("; ") ||
                  "PFS parse missing required invoice fields",
                rawText: parsed.rawText,
                payload: { subject: message.subject },
              });
              continue;
            }

            const result = await createInvoiceIfNew(
              invoice as InsertInvoice & { dedupeKey: string }
            );
            count(
              counters.inserted,
              result.action === "inserted"
                ? "invoices"
                : "invoices_skipped_duplicate"
            );
          } catch (error) {
            const summary =
              error instanceof Error ? error.message : String(error);
            counters.errors.push(summary);
            count(counters.dead, "pfs_messages");
            await deadLetter({
              jobName,
              runId,
              sourceProvider: "gmail",
              sourceMailbox: PDQ_MAILBOX,
              sourceMessageId: message.id,
              vendorName: PFS_VENDOR_NAME,
              parserName: "pfs-order-confirmation",
              parserVersion: PFS_PARSER_VERSION,
              errorSummary: summary,
              rawText,
              payload: { subject: message.subject },
            });
          }
        }

        await finishIngestionRun(jobName, runId, counters);
        res.status(200).json({ success: true, runId, ...counters });
      } catch (error) {
        const summary = error instanceof Error ? error.message : String(error);
        counters.errors.push(summary);
        await finishScheduledJobRun(runId, {
          jobName,
          runId,
          status: "failed",
          errorSummary: summary,
          endedAt: new Date(),
          sourceCounts: counters.source,
          insertedCounts: counters.inserted,
          deadLetterCounts: counters.dead,
        });
        res.status(500).json({ success: false, runId, error: summary });
      }
    }
  );

  // ─── P1 Data Ingestion: Northern Lights + Humes Vendor Invoice Detection ───
  app.post(
    ["/api/scheduled/vendor-detect", "/scheduled/vendor-detect"],
    async (req: Request, res: Response) => {
      if (!(await authenticateScheduled(req, res))) return;

      const jobName = "vendor-detect";
      const runId = makeRunId(jobName);
      const counters: IngestionCounters = {
        source: {},
        inserted: {},
        updated: {},
        dead: {},
        errors: [],
      };
      await createScheduledJobRun({
        jobName,
        runId,
        startedAt: new Date(),
        status: "running",
      });

      try {
        await upsertSourceCatalogEntry({
          vendorName: NORTHERN_LIGHTS_VENDOR_NAME,
          sourceProvider: "gmail",
          senderEmail: "unknown",
          subjectPattern: "Northern Lights invoice",
          attachmentType: "pdf",
          frequency: "invoice-driven",
          lastSeenAt: new Date(),
          status: "needs_review",
        });
        await upsertSourceCatalogEntry({
          vendorName: HUMES_VENDOR_NAME,
          sourceProvider: "outlook",
          senderEmail: HUMES_SENDER,
          subjectPattern: "invoice",
          attachmentType: "pdf",
          frequency: "twice weekly",
          lastSeenAt: new Date(),
          status: "active",
        });

        const gmailMessages = await searchAndReadGmail(
          `Northern Lights invoice has:attachment newer_than:${Number(req.body?.daysBack ?? 30)}d`,
          Number(req.body?.maxResults ?? 50)
        );
        count(
          counters.source,
          "northern_lights_messages",
          gmailMessages.length
        );
        for (const message of gmailMessages as GmailMessage[]) {
          for (const attachment of findGmailPdfAttachments(message)) {
            try {
              const buffer = await getGmailAttachmentBuffer(attachment);
              const attachmentHash = hashGmailAttachment(buffer);
              const extracted = await extractPdfTextFromBuffer(
                buffer,
                attachment.filename
              );
              const parsed = parseNorthernLightsInvoice(extracted.text);
              const dedupeKey = stableDedupeKey([
                "northern-lights",
                "gmail",
                message.id,
                attachmentHash,
                parsed.invoiceNumber,
              ]);
              const invoice = invoiceInsertFromParsed({
                vendorName: parsed.vendorName,
                invoiceNumber: parsed.invoiceNumber,
                date: parsed.date,
                totalAmount: parsed.totalAmount,
                category: parsed.category,
                items: parsed.items,
                rawText: parsed.rawText,
                sourceProvider: "gmail",
                sourceMailbox: PDQ_MAILBOX,
                sourceMessageId: message.id,
                sourceAttachmentHash: attachmentHash,
                parserVersion: parsed.parserVersion,
                parserConfidence: parsed.confidence,
                dedupeKey,
                needsReview:
                  parsed.needsReview || extracted.warnings.length > 0,
                warnings: [...parsed.warnings, ...extracted.warnings],
              });
              if (!invoice) {
                count(counters.dead, "northern_lights_invoices");
                await deadLetter({
                  jobName,
                  runId,
                  sourceProvider: "gmail",
                  sourceMailbox: PDQ_MAILBOX,
                  sourceMessageId: message.id,
                  sourceAttachmentHash: attachmentHash,
                  vendorName: parsed.vendorName,
                  parserName: "northern-lights-invoice",
                  parserVersion: NORTHERN_LIGHTS_PARSER_VERSION,
                  errorSummary:
                    parsed.warnings.join("; ") ||
                    "Northern Lights parse missing required invoice fields",
                  rawText: parsed.rawText,
                  payload: {
                    subject: message.subject,
                    attachment: attachment.filename,
                    extractionWarnings: extracted.warnings,
                  },
                });
                continue;
              }
              const result = await createInvoiceIfNew(
                invoice as InsertInvoice & { dedupeKey: string }
              );
              count(
                counters.inserted,
                result.action === "inserted"
                  ? "northern_lights_invoices"
                  : "northern_lights_skipped_duplicate"
              );
            } catch (error) {
              const summary =
                error instanceof Error ? error.message : String(error);
              counters.errors.push(summary);
              count(counters.dead, "northern_lights_invoices");
              await deadLetter({
                jobName,
                runId,
                sourceProvider: "gmail",
                sourceMailbox: PDQ_MAILBOX,
                sourceMessageId: message.id,
                vendorName: NORTHERN_LIGHTS_VENDOR_NAME,
                parserName: "northern-lights-invoice",
                parserVersion: NORTHERN_LIGHTS_PARSER_VERSION,
                errorSummary: summary,
                payload: {
                  subject: message.subject,
                  attachment: attachment.filename,
                },
              });
            }
          }
        }

        const outlookMessages = await searchAndReadOutlook(
          `from:${HUMES_SENDER} AND hasAttachments:true`,
          Number(req.body?.maxResults ?? 50)
        );
        count(counters.source, "humes_messages", outlookMessages.length);
        for (const message of outlookMessages as OutlookMessage[]) {
          for (const attachment of findOutlookPdfAttachments(message)) {
            try {
              const buffer = await getOutlookAttachmentBuffer(attachment);
              const attachmentHash = hashOutlookAttachment(buffer);
              const extracted = await extractPdfTextFromBuffer(
                buffer,
                attachment.filename
              );
              const parsed = parseHumesInvoice(extracted.text);
              const dedupeKey = stableDedupeKey([
                "humes",
                "outlook",
                message.id,
                attachmentHash,
                parsed.invoiceNumber,
              ]);
              const invoice = invoiceInsertFromParsed({
                vendorName: parsed.vendorName,
                invoiceNumber: parsed.invoiceNumber,
                date: parsed.date,
                totalAmount: parsed.totalAmount,
                category: parsed.category,
                items: parsed.items,
                rawText: parsed.rawText,
                sourceProvider: "outlook",
                sourceMailbox: HUMES_MAILBOX,
                sourceMessageId: message.id,
                sourceAttachmentHash: attachmentHash,
                parserVersion: parsed.parserVersion,
                parserConfidence: parsed.confidence,
                dedupeKey,
                needsReview:
                  parsed.needsReview || extracted.warnings.length > 0,
                warnings: [...parsed.warnings, ...extracted.warnings],
              });
              if (!invoice) {
                count(counters.dead, "humes_invoices");
                await deadLetter({
                  jobName,
                  runId,
                  sourceProvider: "outlook",
                  sourceMailbox: HUMES_MAILBOX,
                  sourceMessageId: message.id,
                  sourceAttachmentHash: attachmentHash,
                  vendorName: parsed.vendorName,
                  parserName: "humes-invoice",
                  parserVersion: HUMES_PARSER_VERSION,
                  errorSummary:
                    parsed.warnings.join("; ") ||
                    "Humes parse missing required invoice fields",
                  rawText: parsed.rawText,
                  payload: {
                    subject: message.subject,
                    attachment: attachment.filename,
                    extractionWarnings: extracted.warnings,
                  },
                });
                continue;
              }
              const result = await createInvoiceIfNew(
                invoice as InsertInvoice & { dedupeKey: string }
              );
              count(
                counters.inserted,
                result.action === "inserted"
                  ? "humes_invoices"
                  : "humes_skipped_duplicate"
              );
            } catch (error) {
              const summary =
                error instanceof Error ? error.message : String(error);
              counters.errors.push(summary);
              count(counters.dead, "humes_invoices");
              await deadLetter({
                jobName,
                runId,
                sourceProvider: "outlook",
                sourceMailbox: HUMES_MAILBOX,
                sourceMessageId: message.id,
                vendorName: HUMES_VENDOR_NAME,
                parserName: "humes-invoice",
                parserVersion: HUMES_PARSER_VERSION,
                errorSummary: summary,
                payload: {
                  subject: message.subject,
                  attachment: attachment.filename,
                },
              });
            }
          }
        }

        await finishIngestionRun(jobName, runId, counters);
        res.status(200).json({ success: true, runId, ...counters });
      } catch (error) {
        const summary = error instanceof Error ? error.message : String(error);
        counters.errors.push(summary);
        await finishScheduledJobRun(runId, {
          jobName,
          runId,
          status: "failed",
          errorSummary: summary,
          endedAt: new Date(),
          sourceCounts: counters.source,
          insertedCounts: counters.inserted,
          deadLetterCounts: counters.dead,
        });
        res.status(500).json({ success: false, runId, error: summary });
      }
    }
  );
}
