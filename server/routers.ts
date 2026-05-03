import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { signStaffSession, STAFF_COOKIE } from "./_core/context";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getAllStaff, getStaffById, getStaffByDepartment, getActiveStaff, createStaff, updateStaffPoints, updateStaffStatus, getStaffByPinInternal,
  getAllPayouts, createPayout, getFlaggedPayouts, getPayoutsByStaff,
  getAllInvoices, createInvoice, getInvoicesByVendor,
  getAllVoids, createVoid, getVoidsByStaff, getWeeklyVoidsByStaff,
  getAllChecklists, getChecklistsByDepartment, createChecklistCompletion,
  createDriverReport, getDriverReports,
  createFeedback, getAllFeedback,
  addGamificationEvent, getLeaderboard,
  createIssue, getOpenIssues,
  getLatestBriefing, createBriefing,
  seedStaffData,
  archiveInactiveStaff, getPayoutTotalsByCategory, getPayoutTotalsByVendor, getInvoiceTotalsByVendor,
} from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ============ STAFF ============
  staff: router({
    list: publicProcedure.query(() => getAllStaff()),
    loginByPin: publicProcedure.input(z.object({ pin: z.string() })).mutation(async ({ input, ctx }) => {
      const found = await getStaffByPinInternal(input.pin);
      if (!found) return { success: false as const, staff: null };
      // Set staff session cookie (signed JWT with staffId)
      const staffToken = await signStaffSession(found.id);
      const cookieOpts = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(STAFF_COOKIE, staffToken, { ...cookieOpts, maxAge: 12 * 60 * 60 * 1000 });
      // Strip sensitive fields before returning to client
      const { pin, phone, email, ...safeStaff } = found;
      return { success: true as const, staff: safeStaff };
    }),
    logout: publicProcedure.mutation(async ({ ctx }) => {
      const cookieOpts = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(STAFF_COOKIE, cookieOpts);
      return { success: true };
    }),
    active: publicProcedure.query(() => getActiveStaff()),
    byId: publicProcedure.input(z.object({ id: z.number() })).query(({ input }) => getStaffById(input.id)),
    byDepartment: publicProcedure.input(z.object({ department: z.string() })).query(({ input }) => getStaffByDepartment(input.department)),
    leaderboard: publicProcedure.query(() => getLeaderboard()),
    create: protectedProcedure.input(z.object({
      firstName: z.string(),
      lastName: z.string(),
      department: z.enum(["bar", "kitchen", "driver", "server", "management"]),
      jobRole: z.enum(["owner", "key_manager", "kitchen_manager", "kitchen_key", "bartender", "bar_manager", "server", "driver", "line_cook", "pizza"]),
      isKeyEmployee: z.boolean().optional(),
      canAuthPayouts: z.boolean().optional(),
      pin: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      employeeNumber: z.string().optional(),
    })).mutation(({ input }) => createStaff(input)),
    updateStatus: protectedProcedure.input(z.object({
      staffId: z.number(),
      status: z.enum(["active", "inactive", "terminated"]),
    })).mutation(({ input }) => updateStaffStatus(input.staffId, input.status)),
    seed: adminProcedure.mutation(() => seedStaffData()),
  }),

  // ============ PAYOUTS ============
  payouts: router({
    list: protectedProcedure.query(() => getAllPayouts()),
    flagged: protectedProcedure.query(() => getFlaggedPayouts()),
    byStaff: protectedProcedure.input(z.object({ staffId: z.number() })).query(({ input }) => getPayoutsByStaff(input.staffId)),
    // Staff self-only: uses server-side staff session cookie, ignores client-supplied staffId
    myPayouts: publicProcedure.query(({ ctx }) => {
      if (!ctx.staffId) return [];
      return getPayoutsByStaff(ctx.staffId);
    }),
    create: protectedProcedure.input(z.object({
      staffId: z.number(),
      authorizedById: z.number().optional(),
      date: z.date(),
      amount: z.string(),
      description: z.string().optional(),
      category: z.enum(["store_run", "supplies", "bread", "meat", "produce", "miscellaneous", "driver_payout", "redelivery", "other"]),
      vendor: z.string().optional(),
      receiptPhotoUrl: z.string().optional(),
      posPayoutAmount: z.string().optional(),
    })).mutation(async ({ input }) => {
      const discrepancy = input.posPayoutAmount
        ? (parseFloat(input.posPayoutAmount) - parseFloat(input.amount)).toFixed(2)
        : undefined;
      // ENFORCE: Only key employees can authorize payouts
      if (!input.authorizedById) {
        throw new Error("Payout requires authorization by a key employee");
      }
      const authorizer = await getStaffById(input.authorizedById);
      if (!authorizer || (!authorizer.isKeyEmployee && !authorizer.canAuthPayouts)) {
        throw new Error("Authorizer is not a key employee — payout rejected");
      }
      // Check for POS discrepancy (flag but allow)
      let flagReasons: string[] = [];
      if (discrepancy && Math.abs(parseFloat(discrepancy)) > 1) {
        flagReasons.push(`POS/receipt discrepancy: $${discrepancy}`);
      }
      const flagged = flagReasons.length > 0;
      return createPayout({
        ...input,
        discrepancy: discrepancy || undefined,
        flagged,
        flagReason: flagReasons.join("; ") || undefined,
      });
    }),
  }),

  // ============ INVOICES ============
  invoices: router({
    list: protectedProcedure.query(() => getAllInvoices()),
    byVendor: protectedProcedure.input(z.object({ vendorName: z.string() })).query(({ input }) => getInvoicesByVendor(input.vendorName)),
    create: protectedProcedure.input(z.object({
      vendorName: z.string(),
      vendorAddress: z.string().optional(),
      vendorPhone: z.string().optional(),
      invoiceNumber: z.string().optional(),
      date: z.date(),
      totalAmount: z.string(),
      category: z.enum(["meat", "bread", "produce", "liquor", "beer", "supplies", "misc"]),
      items: z.any().optional(),
      receiptPhotoUrl: z.string().optional(),
      orderedById: z.number().optional(),
    })).mutation(({ input }) => createInvoice(input)),
  }),

  // ============ VOIDS ============
  voids: router({
    list: protectedProcedure.query(() => getAllVoids()),
    byStaff: protectedProcedure.input(z.object({ staffId: z.number() })).query(({ input }) => getVoidsByStaff(input.staffId)),
    // Staff self-only: uses server-side staff session cookie, ignores client-supplied staffId
    myVoids: publicProcedure.query(({ ctx }) => {
      if (!ctx.staffId) return [];
      return getVoidsByStaff(ctx.staffId);
    }),
    weeklyByStaff: protectedProcedure.input(z.object({ staffId: z.number() })).query(({ input }) => getWeeklyVoidsByStaff(input.staffId)),
    create: protectedProcedure.input(z.object({
      staffId: z.number(),
      date: z.date(),
      orderNumber: z.string().optional(),
      type: z.enum(["void", "comp", "promo", "discount", "credit"]),
      amount: z.string(),
      reason: z.string(),
    })).mutation(async ({ input }) => {
      const result = await createVoid(input);
      // Check if this employee now has 3+ voids this week — flag for manager nudge
      const weeklyVoids = await getWeeklyVoidsByStaff(input.staffId);
      // Only create alert at exact thresholds (3 and 5) to avoid duplicate issues
      if (weeklyVoids.length === 3 || weeklyVoids.length === 5) {
        const staffMember = await getStaffById(input.staffId);
        const name = staffMember ? `${staffMember.firstName} ${staffMember.lastName}` : `Staff #${input.staffId}`;
        const severity = weeklyVoids.length >= 5 ? "high" : "medium";
        const label = weeklyVoids.length >= 5 ? "URGENT" : "ATTENTION";
        await createIssue({
          reportedById: input.staffId,
          date: new Date(),
          title: `[${label}] Void Alert: ${name} — ${weeklyVoids.length} voids this week`,
          description: `${name} has reached ${weeklyVoids.length} voids/comps this week. Latest: ${input.type} for $${input.amount} — "${input.reason}". Manager review recommended.`,
          category: "other",
          priority: severity,
        });
      }
      return result;
    }),
  }),

  // ============ CHECKLISTS ============
  checklists: router({
    list: publicProcedure.query(() => getAllChecklists()),
    byDepartment: publicProcedure.input(z.object({ department: z.string() })).query(({ input }) => getChecklistsByDepartment(input.department)),
    complete: protectedProcedure.input(z.object({
      checklistId: z.number(),
      staffId: z.number(),
      date: z.date(),
      completedItems: z.any(),
      totalTimeSeconds: z.number().optional(),
      percentComplete: z.number(),
      flaggedRush: z.boolean().optional(),
    })).mutation(({ input }) => createChecklistCompletion(input)),
  }),

  // ============ DRIVER REPORTS ============
  driverReports: router({
    list: protectedProcedure.query(() => getDriverReports()),
    create: protectedProcedure.input(z.object({
      staffId: z.number(),
      date: z.date(),
      totalDeliveries: z.number(),
      outOfTownRuns: z.any().optional(),
      specialRuns: z.any().optional(),
      cashFromTill: z.string().optional(),
      cashReason: z.string().optional(),
      redeliveries: z.any().optional(),
      totalTips: z.string().optional(),
      managerHandedCash: z.boolean(),
      handedByStaffId: z.number().optional(),
    })).mutation(async ({ input }) => {
      // ENFORCE: Manager must hand driver cash, not front staff
      if (input.cashFromTill && parseFloat(input.cashFromTill) > 0) {
        if (!input.managerHandedCash) {
          throw new Error("Cash from till requires manager handoff — not front staff");
        }
        if (!input.handedByStaffId) {
          throw new Error("Must specify which manager handed the cash");
        }
        const hander = await getStaffById(input.handedByStaffId);
        if (!hander || (!hander.isKeyEmployee && !hander.canAuthPayouts)) {
          throw new Error("Cash must be handed by a manager or key employee");
        }
      }
      return createDriverReport(input);
    }),
  }),

  // ============ FEEDBACK ============
  feedback: router({
    list: protectedProcedure.query(() => getAllFeedback()),
    create: protectedProcedure.input(z.object({
      staffId: z.number(),
      date: z.date(),
      shiftType: z.enum(["open", "mid", "close"]).optional(),
      rating: z.number().optional(),
      comment: z.string().optional(),
      category: z.enum(["equipment", "staffing", "inventory", "customer", "management", "other"]).optional(),
      urgency: z.enum(["low", "medium", "high", "critical"]).optional(),
    })).mutation(({ input }) => createFeedback(input)),
  }),

  // ============ GAMIFICATION ============
  gamification: router({
    leaderboard: publicProcedure.query(() => getLeaderboard()),
    addEvent: protectedProcedure.input(z.object({
      staffId: z.number(),
      date: z.date(),
      eventType: z.enum([
        "checklist_complete", "zero_void_week", "on_time_streak",
        "social_post", "social_engagement", "customer_review_mention",
        "training_mentor", "feedback_submitted", "void_deduction",
        "break_violation", "wifi_disconnect"
      ]),
      points: z.number(),
      description: z.string().optional(),
    })).mutation(({ input }) => addGamificationEvent(input)),
  }),

  // ============ ISSUES ============
  issues: router({
    open: publicProcedure.query(() => getOpenIssues()),
    create: protectedProcedure.input(z.object({
      reportedById: z.number(),
      date: z.date(),
      title: z.string(),
      description: z.string().optional(),
      category: z.enum(["equipment", "plumbing", "electrical", "inventory", "safety", "pest", "other"]),
      priority: z.enum(["low", "medium", "high", "critical"]),
      photoUrl: z.string().optional(),
    })).mutation(({ input }) => createIssue(input)),
  }),

  // ============ PHOTO UPLOAD ============
  upload: router({
    receiptPhoto: protectedProcedure.input(z.object({
      base64: z.string(),
      filename: z.string(),
      mimeType: z.string().default("image/jpeg"),
      context: z.enum(["payout", "invoice", "issue"]),
    })).mutation(async ({ input }) => {
      const { storagePut } = await import("./storage");
      const buffer = Buffer.from(input.base64, "base64");
      const key = `receipts/${input.context}/${Date.now()}-${input.filename}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      return { url };
    }),
  }),

  // ============ ADMIN OPERATIONS ============
  admin: router({
    archiveInactive: adminProcedure.mutation(() => archiveInactiveStaff()),
    payoutTotals: protectedProcedure.input(z.object({ days: z.number().default(7) }).optional()).query(({ input }) => getPayoutTotalsByCategory(input?.days ?? 7)),
    payoutTotalsByVendor: protectedProcedure.input(z.object({ days: z.number().default(7) }).optional()).query(({ input }) => getPayoutTotalsByVendor(input?.days ?? 7)),
    invoiceTotals: protectedProcedure.input(z.object({ days: z.number().default(7) }).optional()).query(({ input }) => getInvoiceTotalsByVendor(input?.days ?? 7)),
    // Pattern detection: find employees with repeated misc payouts
    miscPayoutPatterns: protectedProcedure.input(z.object({ days: z.number().default(14) }).optional()).query(async ({ input }) => {
      const allPayouts = await getAllPayouts();
      const since = new Date(Date.now() - (input?.days ?? 14) * 24 * 60 * 60 * 1000);
      const miscPayouts = allPayouts.filter(p => p.category === "miscellaneous" && new Date(p.date) >= since);
      // Group by staffId
      const byStaff = new Map<number, typeof miscPayouts>();
      for (const p of miscPayouts) {
        const list = byStaff.get(p.staffId) || [];
        list.push(p);
        byStaff.set(p.staffId, list);
      }
      // Return staff with 2+ misc payouts (pattern)
      const patterns: { staffId: number; count: number; totalAmount: string; payouts: typeof miscPayouts }[] = [];
      Array.from(byStaff.entries()).forEach(([staffId, payoutList]) => {
        if (payoutList.length >= 2) {
          const total = payoutList.reduce((sum: number, p: { amount: string }) => sum + parseFloat(p.amount), 0);
          patterns.push({ staffId, count: payoutList.length, totalAmount: total.toFixed(2), payouts: payoutList });
        }
      });
      return patterns.sort((a, b) => b.count - a.count);
    }),
    // Daily digest: summary of all payouts for today
    dailyPayoutDigest: adminProcedure.query(async () => {
      const allPayouts = await getAllPayouts();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayPayouts = allPayouts.filter(p => new Date(p.date) >= today);
      const totalAmount = todayPayouts.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const flaggedCount = todayPayouts.filter(p => p.flagged).length;
      return {
        date: today.toISOString(),
        count: todayPayouts.length,
        totalAmount: totalAmount.toFixed(2),
        flaggedCount,
        payouts: todayPayouts,
      };
    }),
  }),

  // ============ DAILY BRIEFING ============
  briefing: router({
    latest: publicProcedure.query(() => getLatestBriefing()),
    create: protectedProcedure.input(z.object({
      date: z.date(),
      salesYesterday: z.string().optional(),
      ordersYesterday: z.number().optional(),
      eightySixedItems: z.any().optional(),
      specials: z.any().optional(),
      openIssues: z.any().optional(),
      shoutouts: z.any().optional(),
    })).mutation(({ input }) => createBriefing(input)),
  }),
});

export type AppRouter = typeof appRouter;
