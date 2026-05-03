import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
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
    loginByPin: publicProcedure.input(z.object({ pin: z.string() })).mutation(async ({ input }) => {
      const found = await getStaffByPinInternal(input.pin);
      if (!found) return { success: false as const, staff: null };
      // Strip sensitive fields before returning to client
      const { pin, phone, email, ...safeStaff } = found;
      return { success: true as const, staff: safeStaff };
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
      const flagged = !input.authorizedById || (discrepancy && Math.abs(parseFloat(discrepancy)) > 1);
      const flagReason = !input.authorizedById
        ? "No key employee authorization"
        : discrepancy && Math.abs(parseFloat(discrepancy)) > 1
          ? `POS/receipt discrepancy: $${discrepancy}`
          : undefined;
      return createPayout({
        ...input,
        discrepancy: discrepancy || undefined,
        flagged: !!flagged,
        flagReason: flagReason || undefined,
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
    weeklyByStaff: protectedProcedure.input(z.object({ staffId: z.number() })).query(({ input }) => getWeeklyVoidsByStaff(input.staffId)),
    create: protectedProcedure.input(z.object({
      staffId: z.number(),
      date: z.date(),
      orderNumber: z.string().optional(),
      type: z.enum(["void", "comp", "promo", "discount", "credit"]),
      amount: z.string(),
      reason: z.string(),
    })).mutation(({ input }) => createVoid(input)),
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
    })).mutation(({ input }) => createDriverReport(input)),
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
