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
} from "../db";
import { seedAllData } from "../seedAllData";
import { staff } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Scheduled task endpoint for generating management briefings.
 * Called by the Manus scheduled task agent via POST /api/scheduled/briefing
 * Auth: uses the auto-injected scheduled task cookie (user role).
 */
export function registerScheduledRoutes(app: Express) {

  // ─── Reactivate All Staff (one-time fix for archive bug) ───
  app.post("/api/scheduled/reactivate-staff", async (req: Request, res: Response) => {
    let user;
    try {
      user = await sdk.authenticateRequest(req);
    } catch {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!user) { res.status(401).json({ error: "No user found" }); return; }

    console.log(`[Scheduled] Reactivate-staff triggered by user: ${user.name || user.openId}`);
    try {
      const db = await getDb();
      if (!db) { res.status(500).json({ error: "Database not available" }); return; }

      // Set all inactive staff back to active and give them a recent lastClockIn
      const result = await db.update(staff)
        .set({ status: "active" as const, lastClockIn: new Date() })
        .where(eq(staff.status, "inactive"));
      const reactivated = (result as any)[0]?.affectedRows ?? 0;

      console.log(`[Scheduled] Reactivated ${reactivated} staff members`);
      await notifyOwner({
        title: "Staff Reactivation Complete",
        content: `${reactivated} staff member${reactivated !== 1 ? 's' : ''} reactivated after archive bug fix.`,
      });

      res.status(200).json({ success: true, reactivated });
    } catch (err) {
      console.error("[Scheduled] Reactivate-staff failed:", err);
      res.status(500).json({ success: false, error: "Reactivation failed" });
    }
  });

  // ─── Auto-Archive Inactive Staff ───
  app.post("/api/scheduled/auto-archive", async (req: Request, res: Response) => {
    let user;
    try {
      user = await sdk.authenticateRequest(req);
    } catch {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!user) { res.status(401).json({ error: "No user found" }); return; }

    console.log(`[Scheduled] Auto-archive triggered by user: ${user.name || user.openId}`);
    try {
      const archivedCount = await archiveInactiveStaff();
      console.log(`[Scheduled] Archived ${archivedCount} inactive staff members`);

      if (archivedCount > 0) {
        await notifyOwner({
          title: "Staff Auto-Archive Report",
          content: `${archivedCount} staff member${archivedCount > 1 ? 's' : ''} archived (no clock-in for 30+ days).`,
        });
      }

      res.status(200).json({ success: true, archivedCount });
    } catch (err) {
      console.error("[Scheduled] Auto-archive failed:", err);
      res.status(500).json({ success: false, error: "Auto-archive failed" });
    }
  });

  // ─── Daily Payout Digest ───
  app.post("/api/scheduled/payout-digest", async (req: Request, res: Response) => {
    let user;
    try {
      user = await sdk.authenticateRequest(req);
    } catch {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!user) { res.status(401).json({ error: "No user found" }); return; }

    console.log(`[Scheduled] Payout digest triggered by user: ${user.name || user.openId}`);
    try {
      const allPayouts = await getAllPayouts(200);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayPayouts = allPayouts.filter(p => new Date(p.date) >= today);
      const totalAmount = todayPayouts.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const flaggedCount = todayPayouts.filter(p => p.flagged).length;

      if (todayPayouts.length > 0) {
        const lines = [
          `Today's Payouts: ${todayPayouts.length} transactions totaling $${totalAmount.toFixed(2)}`,
          flaggedCount > 0 ? `\n⚠️ ${flaggedCount} FLAGGED payout${flaggedCount > 1 ? 's' : ''} need review` : '',
          '',
          ...todayPayouts.map(p => `• $${parseFloat(p.amount).toFixed(2)} — ${p.category || 'misc'}${p.vendor ? ` at ${p.vendor}` : ''}`),
        ].filter(Boolean);

        await notifyOwner({
          title: `CTap Payout Digest: $${totalAmount.toFixed(2)} (${todayPayouts.length} txns)`,
          content: lines.join('\n'),
        });
        console.log(`[Scheduled] Payout digest sent: ${todayPayouts.length} payouts, $${totalAmount.toFixed(2)}`);
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
  });

  // ─── Seed All Platform Data (menu, achievements, rewards, missions) ───
  app.post("/api/scheduled/seed-all-data", async (req: Request, res: Response) => {
    let user;
    try {
      user = await sdk.authenticateRequest(req);
    } catch {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!user) { res.status(401).json({ error: "No user found" }); return; }

    console.log(`[Scheduled] Seed-all-data triggered by user: ${user.name || user.openId}`);
    try {
      const results = await seedAllData();
      console.log(`[Scheduled] Seed-all-data results:`, results);
      await notifyOwner({
        title: "Platform Data Seeded",
        content: Object.entries(results).map(([k, v]) => `${k}: ${v}`).join('\n'),
      });
      res.status(200).json({ success: true, results });
    } catch (err) {
      console.error("[Scheduled] Seed-all-data failed:", err);
      res.status(500).json({ success: false, error: "Seed failed" });
    }
  });

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

    console.log(`[Scheduled] Briefing generation triggered by user: ${user.name || user.openId}`);

    try {
      const snapshot = await getBriefingDataSnapshot();
      if (!snapshot) {
        res.status(200).json({ success: false, error: "No data available for briefing" });
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
                  required: ["title", "summary", "sections", "theories", "actionItems", "alerts"],
                  additionalProperties: false,
                },
              },
            },
          });

          const rawContent = response.choices?.[0]?.message?.content;
          const parsed =
            typeof rawContent === "string"
              ? JSON.parse(rawContent)
              : { title: "Briefing", summary: "No data", sections: [], theories: [], actionItems: [], alerts: [] };

          const fullContent = parsed.sections.map((s: any) => `## ${s.heading}\n\n${s.content}`).join("\n\n");

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
          console.log(`[Scheduled] Generated ${role} briefing: ${parsed.title}`);
        } catch (err) {
          console.error(`[Scheduled] Failed to generate briefing for ${role}:`, err);
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
      res.status(500).json({ success: false, error: "Briefing generation failed" });
    }
  });
}
