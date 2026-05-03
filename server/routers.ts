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
  // AI-Native Intelligence Layer
  createKnowledgeEntry, getKnowledgeByStation, getKnowledgeByCategory, searchKnowledge, updateKnowledgeEntry, getAllKnowledge,
  createKnowledgeCorrection, getPendingCorrections, approveCorrection, rejectCorrection,
  getAllAchievements, createAchievementDefinition, getStaffAchievementProgress, upsertAchievementProgress, getUnacknowledgedUnlocks, createAchievementUnlock, acknowledgeUnlock,
  getAllRewards, createReward, createRedemption, getStaffRedemptions, getPendingRedemptions, approveRedemption,
  getActiveMissions, createPhotoMission, createPhotoSubmission, getPhotoSubmissionsByStaff, getPhotoSubmissionsByMission, verifyPhotoSubmission,
  getVendorProducts, createVendorProduct, updateVendorProductPrice,
  getOrderGuides, createOrderGuide,
  getRelevantMemories, createBriefingMemory,
  // Worker Profile
  getTrainingModules, createTrainingModule, getTrainingCompletions, createTrainingCompletion,
  getSkillCertifications, createSkillCertification,
  getEvaluations, createEvaluation,
  getWriteUps, getActiveWriteUps, createWriteUp, acknowledgeWriteUp,
  getCareerTrack, upsertCareerTrack,
  // Sales Intelligence
  getDailySales, upsertDailySales, getHourlySales, insertHourlySales,
  // Historical Pattern Intelligence
  getDayOfWeekPattern, getYesterdaySales, getRecentSalesTrend,
  getParLevelSuggestions,
  // Intelligence Engine
  getVoidRecords, getVoidSummaryByEmployee, getProductMix,
  getWeatherData, getWeatherSalesCorrelation,
  getAnomalies, acknowledgeAnomaly,
  getUpcomingEvents, addLocalEvent,
  getScheduleIntelligence, saveScheduleIntelligence,
  getHourlySalesHeatmap,
  // Price Comparison & Event Briefing
  getPriceComparisons,
  getEventAwareBriefingContext,
  // Management Briefings
  saveManagementBriefing, getManagementBriefings, markBriefingRead, markBriefingNotified, getBriefingDataSnapshot,
} from "./db";
import { invokeLLM } from "./_core/llm";
import { notifyOwner } from "./_core/notification";
import { processAchievementEvent } from "./achievementEngine";

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
      // Auto-progress achievements on shift login
      processAchievementEvent(found.id, "shift_login").catch(() => {});
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
    })).mutation(async ({ input }) => {
      const invoice = await createInvoice(input);
      // Auto-update vendor product prices from OCR-extracted line items
      if (input.items && Array.isArray(input.items)) {
        const { upsertVendorProductFromOCR } = await import("./db");
        for (const item of input.items) {
          if (item.product && item.unitPrice) {
            try {
              await upsertVendorProductFromOCR(
                input.vendorName,
                item.product,
                String(item.unitPrice),
                item.unit,
                input.category
              );
            } catch {
              // Silently continue — price update is best-effort
            }
          }
        }
      }
      return invoice;
    }),
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
      // Auto-reset "Clean Hands" achievement (void breaks the window)
      processAchievementEvent(input.staffId, "void_created").catch(() => {});
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
    })).mutation(async ({ input }) => {
      const result = await createChecklistCompletion(input);
      // Auto-progress "Machine" achievement
      processAchievementEvent(input.staffId, "checklist_complete").catch(() => {});
      return result;
    }),
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
    })).mutation(async ({ input }) => {
      const result = await createFeedback(input);
      // Auto-progress "Voice" achievement
      processAchievementEvent(input.staffId, "feedback_submitted").catch(() => {});
      return result;
    }),
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

  // ============ KNOWLEDGE BRAIN ============
  knowledge: router({
    list: protectedProcedure.input(z.object({ station: z.string().optional(), category: z.string().optional() }).optional()).query(({ input }) => {
      if (input?.station) return getKnowledgeByStation(input.station);
      if (input?.category) return getKnowledgeByCategory(input.category);
      return getAllKnowledge();
    }),
    search: publicProcedure.input(z.object({ query: z.string(), station: z.string().optional() })).query(({ input }) => searchKnowledge(input.query, input.station)),
    create: protectedProcedure.input(z.object({
      station: z.enum(["pizza_line", "fry_line", "bar", "waitstaff", "bbq_room", "store_room", "bathroom", "dish_pit", "general"]),
      category: z.enum(["recipe", "location", "process", "equipment", "vendor", "allergen", "prep", "cleaning", "safety", "menu_info"]),
      question: z.string(),
      answer: z.string(),
      confidence: z.enum(["high", "medium", "low"]).optional(),
      source: z.enum(["manual", "photo_extraction", "correction", "ai_inferred", "imported"]).optional(),
      tags: z.array(z.string()).optional(),
      photoUrl: z.string().optional(),
    })).mutation(({ input }) => createKnowledgeEntry(input)),
    // AI-powered station Q&A — contextual, station-aware, time-aware
    ask: publicProcedure.input(z.object({
      question: z.string(),
      station: z.string().optional(),
      staffName: z.string().optional(),
    })).mutation(async ({ input }) => {
      // Fetch relevant knowledge entries for context injection
      const relevantKnowledge = await searchKnowledge(input.question, input.station, 15);
      const memories = await getRelevantMemories(10);
      const now = new Date();
      const hour = now.getHours();
      const dayOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][now.getDay()];
      const timeContext = hour < 11 ? "morning prep" : hour < 14 ? "lunch rush" : hour < 17 ? "afternoon lull" : hour < 21 ? "dinner rush" : "closing";

      // Historical sales pattern for today's day of week
      const dayPattern = await getDayOfWeekPattern(now.getDay());
      const recentTrend = await getRecentSalesTrend(7);
      let salesContext = "";
      if (dayPattern && dayPattern.sampleSize >= 3) {
        salesContext = `\nHistorical ${dayOfWeek} pattern (based on ${dayPattern.sampleSize} ${dayOfWeek}s):\n- Average revenue: $${dayPattern.avgRevenue.toLocaleString()}\n- Range: $${dayPattern.minRevenue.toLocaleString()} to $${dayPattern.maxRevenue.toLocaleString()}\n- Last ${dayOfWeek}: $${dayPattern.lastSameDayRevenue.toLocaleString()} (${dayPattern.lastSameDayDate})`;
      }
      if (recentTrend.length > 0) {
        const trendSummary = recentTrend.slice(0, 5).map(d => `${d.businessDate}: $${parseFloat(d.grandTotal || "0").toLocaleString()}`).join(", ");
        salesContext += `\nRecent trend: ${trendSummary}`;
      }

      const knowledgeContext = relevantKnowledge.map(k =>
        `[${k.station}/${k.category}] Q: ${k.question}\nA: ${k.answer} (confidence: ${k.confidence})`
      ).join("\n\n");

      const memoryContext = memories.map(m => `[${m.factType}] ${m.fact}`).join("\n");

      const systemPrompt = `You are the Community Tap & Pizzeria knowledge assistant. You help restaurant staff with questions about recipes, processes, locations, equipment, and operations.

Current context:
- Time: ${now.toLocaleTimeString()} (${timeContext})
- Day: ${dayOfWeek}
- Station: ${input.station || "general"}
- Staff member: ${input.staffName || "team member"}

Relevant knowledge from the restaurant brain:
${knowledgeContext || "No specific knowledge entries found for this query."}

Recent restaurant memories:
${memoryContext || "No recent memories."}

${salesContext ? `Sales intelligence:\n${salesContext}` : ""}

Rules:
1. Answer based on the knowledge entries above when available
2. If you're not confident, say so and suggest asking a manager
3. Keep answers concise and actionable — this person is working a shift
4. If the question is about a recipe, include exact measurements
5. If about a location, be specific ("second shelf, left side of walk-in")
6. Never make up food safety information — defer to management
7. Reference the time of day when relevant (prep vs rush vs closing)`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: input.question },
        ],
      });

      const answer = response.choices?.[0]?.message?.content || "I couldn't find an answer. Please ask a manager.";
      return { answer, sourcesUsed: relevantKnowledge.length, station: input.station || "general" };
    }),
    // Submit a correction to a knowledge entry
    correct: protectedProcedure.input(z.object({
      entryId: z.number(),
      correctedByStaffId: z.number(),
      oldAnswer: z.string(),
      newAnswer: z.string(),
      reason: z.string().optional(),
    })).mutation(async ({ input }) => {
      await createKnowledgeCorrection(input);
      // Award points for contributing
      await addGamificationEvent({
        staffId: input.correctedByStaffId,
        date: new Date(),
        eventType: "feedback_submitted",
        points: 10,
        description: "Knowledge correction submitted",
      });
      return { success: true };
    }),
    corrections: router({
      pending: protectedProcedure.query(() => getPendingCorrections()),
      approve: protectedProcedure.input(z.object({ id: z.number(), approvedByStaffId: z.number() })).mutation(({ input }) => approveCorrection(input.id, input.approvedByStaffId)),
      reject: protectedProcedure.input(z.object({ id: z.number(), approvedByStaffId: z.number() })).mutation(({ input }) => rejectCorrection(input.id, input.approvedByStaffId)),
    }),
  }),

  // ============ PHOTO INTELLIGENCE ============
  photos: router({
    // Analyze a photo with LLM vision and extract structured data
    analyze: protectedProcedure.input(z.object({
      photoUrl: z.string(),
      photoType: z.enum(["invoice", "shelf", "station", "equipment", "plate", "delivery", "prep", "other"]),
      staffId: z.number(),
      missionId: z.number().optional(),
    })).mutation(async ({ input }) => {
      const typePrompts: Record<string, string> = {
        invoice: `Analyze this restaurant invoice/receipt photo. Extract ALL line items with: product name, quantity, unit (case/lb/each), unit price, extended price. Also extract: vendor name, invoice number, date, total amount. Return as JSON with fields: { vendor, invoiceNumber, date, total, items: [{ product, quantity, unit, unitPrice, extendedPrice }] }`,
        shelf: `Analyze this restaurant storage/walk-in shelf photo. Identify all visible products, estimate quantity levels (full/half/low/empty), note any organization issues or expired items. Return as JSON: { location, items: [{ product, estimatedQuantity, level, notes }] }`,
        station: `Analyze this restaurant station/workspace photo. Identify the station type, note setup completeness, cleanliness, any missing items or issues. Return as JSON: { station, setupComplete, cleanliness, items: [{ item, status, notes }] }`,
        equipment: `Analyze this restaurant equipment photo. Identify the equipment, note its condition, any visible damage or maintenance needs. Return as JSON: { equipment, condition, issues: [{ issue, severity, recommendation }] }`,
        plate: `Analyze this plated dish photo. Identify the menu item, note presentation quality, portion accuracy, any issues. Return as JSON: { menuItem, presentationScore, portionAccuracy, notes }`,
        delivery: `Analyze this delivery/receiving photo. Identify products received, check for damage, temperature concerns, quantity verification. Return as JSON: { vendor, items: [{ product, quantity, condition, notes }] }`,
        prep: `Analyze this food prep photo. Identify what's being prepped, note technique, portioning, food safety compliance. Return as JSON: { prepItem, technique, portionConsistency, foodSafety, notes }`,
        other: `Analyze this restaurant photo. Describe what you see and extract any useful operational information. Return as JSON: { description, category, actionItems: [] }`,
      };

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are a restaurant operations AI that analyzes photos to extract structured data. Always respond with valid JSON." },
          { role: "user", content: [
            { type: "text", text: typePrompts[input.photoType] || typePrompts.other },
            { type: "image_url", image_url: { url: input.photoUrl, detail: "high" } },
          ]},
        ],
      });

      const rawContent = response.choices?.[0]?.message?.content;
      const aiContent: string = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent) || "{}";
      let extraction: any = {};
      try {
        // Try to parse JSON from the response (may be wrapped in markdown code blocks)
        const jsonMatch = aiContent.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, aiContent];
        extraction = JSON.parse(jsonMatch[1]?.trim() || "{}");
      } catch {
        extraction = { raw: aiContent };
      }

      // Save the photo submission
      await createPhotoSubmission({
        staffId: input.staffId,
        missionId: input.missionId || null,
        photoUrl: input.photoUrl,
        photoType: input.photoType,
        aiExtraction: extraction,
        aiSummary: typeof extraction === "object" ? JSON.stringify(extraction).slice(0, 500) : aiContent.slice(0, 500),
        pointsAwarded: 5,
      });

      // Award points for photo submission
      await addGamificationEvent({
        staffId: input.staffId,
        date: new Date(),
        eventType: "feedback_submitted",
        points: 5,
        description: `Photo submitted: ${input.photoType}`,
      });

      // If invoice, auto-create knowledge entries from extracted items
      const knowledgeEntryIds: number[] = [];
      if (input.photoType === "invoice" && extraction.items && Array.isArray(extraction.items)) {
        for (const item of extraction.items.slice(0, 30)) {
          if (item.product) {
            const entry = await createKnowledgeEntry({
              station: "store_room",
              category: "vendor",
              question: `What is the current price for ${item.product}?`,
              answer: `${item.product}: ${item.unitPrice ? '$' + item.unitPrice + '/' + (item.unit || 'each') : 'price not extracted'} from ${extraction.vendor || 'unknown vendor'}. Last ordered: ${extraction.date || 'today'}.`,
              confidence: "medium",
              source: "photo_extraction",
              tags: [extraction.vendor || "unknown", item.product, "price"],
            });
            // knowledgeEntryIds.push(entry[0]?.insertId); // MySQL returns insertId
          }
        }
      }

      return { extraction, photoType: input.photoType, pointsAwarded: 5, knowledgeEntriesCreated: knowledgeEntryIds.length };
    }),
    mySubmissions: publicProcedure.input(z.object({ staffId: z.number() })).query(({ input }) => getPhotoSubmissionsByStaff(input.staffId)),
    byMission: protectedProcedure.input(z.object({ missionId: z.number() })).query(({ input }) => getPhotoSubmissionsByMission(input.missionId)),
    verify: protectedProcedure.input(z.object({ id: z.number(), verifiedByStaffId: z.number() })).mutation(({ input }) => verifyPhotoSubmission(input.id, input.verifiedByStaffId)),
  }),

  // ============ ACHIEVEMENTS ============
  achievements: router({
    definitions: publicProcedure.query(() => getAllAchievements()),
    myProgress: publicProcedure.input(z.object({ staffId: z.number() })).query(({ input }) => getStaffAchievementProgress(input.staffId)),
    myUnlocks: publicProcedure.input(z.object({ staffId: z.number() })).query(({ input }) => getUnacknowledgedUnlocks(input.staffId)),
    acknowledge: publicProcedure.input(z.object({ staffId: z.number(), achievementId: z.number() })).mutation(({ input }) => acknowledgeUnlock(input.staffId, input.achievementId)),
    // Admin: seed achievement definitions
    seed: adminProcedure.mutation(async () => {
      const defs = [
        { slug: "rookie", name: "Rookie", description: "Complete 5 shifts", badge: "🟢", category: "onboarding" as const, thresholdType: "cumulative" as const, thresholdValue: 5, bonusPoints: 25, difficulty: "easy" as const },
        { slug: "iron_streak", name: "Iron Streak", description: "14-day consecutive on-time streak", badge: "🔥", category: "reliability" as const, thresholdType: "consecutive" as const, thresholdValue: 14, resetEvent: "late_clock_in", bonusPoints: 50, difficulty: "medium" as const },
        { slug: "clean_hands", name: "Clean Hands", description: "Zero voids in 30 days", badge: "💎", category: "quality" as const, thresholdType: "window" as const, thresholdValue: 30, windowDays: 30, resetEvent: "void_created", bonusPoints: 75, difficulty: "hard" as const },
        { slug: "machine", name: "Machine", description: "Complete 100 checklists", badge: "⚙️", category: "reliability" as const, thresholdType: "cumulative" as const, thresholdValue: 100, bonusPoints: 50, difficulty: "medium" as const },
        { slug: "voice", name: "Voice", description: "Submit 50 feedback entries", badge: "🎤", category: "engagement" as const, thresholdType: "cumulative" as const, thresholdValue: 50, bonusPoints: 50, difficulty: "medium" as const },
        { slug: "mentor", name: "Mentor", description: "Train 3 new employees", badge: "🎓", category: "leadership" as const, thresholdType: "cumulative" as const, thresholdValue: 3, bonusPoints: 75, difficulty: "hard" as const },
        { slug: "ambassador", name: "Ambassador", description: "10 social media posts", badge: "📱", category: "engagement" as const, thresholdType: "cumulative" as const, thresholdValue: 10, bonusPoints: 50, difficulty: "medium" as const },
        { slug: "night_owl", name: "Night Owl", description: "Work 50 closing shifts", badge: "🦉", category: "longevity" as const, thresholdType: "cumulative" as const, thresholdValue: 50, bonusPoints: 50, difficulty: "medium" as const },
        { slug: "early_bird", name: "Early Bird", description: "Work 50 opening shifts", badge: "🐦", category: "longevity" as const, thresholdType: "cumulative" as const, thresholdValue: 50, bonusPoints: 50, difficulty: "medium" as const },
        { slug: "key_holder", name: "Key Holder", description: "Promoted to key employee", badge: "🔑", category: "leadership" as const, thresholdType: "milestone" as const, thresholdValue: 1, bonusPoints: 100, difficulty: "hard" as const },
        { slug: "centurion", name: "Centurion", description: "Work 100 shifts", badge: "💯", category: "longevity" as const, thresholdType: "cumulative" as const, thresholdValue: 100, bonusPoints: 75, difficulty: "medium" as const },
        { slug: "veteran", name: "Veteran", description: "1 year of active employment", badge: "⭐", category: "longevity" as const, thresholdType: "cumulative" as const, thresholdValue: 365, bonusPoints: 150, difficulty: "legendary" as const },
      ];
      for (const def of defs) {
        await createAchievementDefinition(def);
      }
      return { message: `Seeded ${defs.length} achievement definitions` };
    }),
  }),

  // ============ REWARDS ============
  rewards: router({
    list: publicProcedure.query(() => getAllRewards()),
    myRedemptions: publicProcedure.input(z.object({ staffId: z.number() })).query(({ input }) => getStaffRedemptions(input.staffId)),
    redeem: protectedProcedure.input(z.object({
      staffId: z.number(),
      rewardId: z.number(),
      pointsSpent: z.number(),
    })).mutation(async ({ input }) => {
      // Verify staff has enough points
      const staffMember = await getStaffById(input.staffId);
      if (!staffMember || staffMember.totalPoints < input.pointsSpent) {
        throw new Error("Not enough points to redeem this reward");
      }
      // Deduct points
      await updateStaffPoints(input.staffId, -input.pointsSpent);
      // Create redemption
      return createRedemption(input);
    }),
    pendingApprovals: protectedProcedure.query(() => getPendingRedemptions()),
    approve: protectedProcedure.input(z.object({ id: z.number(), approvedByStaffId: z.number() })).mutation(({ input }) => approveRedemption(input.id, input.approvedByStaffId)),
    // Admin: seed rewards
    seed: adminProcedure.mutation(async () => {
      const rewardDefs = [
        { tier: "bronze" as const, name: "Shift Meal", description: "Free meal on your next shift", pointsCost: 100, type: "meal" as const },
        { tier: "bronze" as const, name: "Free Appetizer", description: "Any appetizer on the house", pointsCost: 75, type: "meal" as const },
        { tier: "silver" as const, name: "N86 T-Shirt", description: "Never 86'd branded t-shirt", pointsCost: 250, type: "merch" as const },
        { tier: "silver" as const, name: "Priority Shift Pick", description: "First pick on next week's schedule", pointsCost: 300, type: "schedule" as const },
        { tier: "gold" as const, name: "N86 Hat + Shift Pick", description: "Branded hat plus priority scheduling", pointsCost: 500, type: "merch" as const },
        { tier: "platinum" as const, name: "$25 Gift Card", description: "$25 gift card of your choice", pointsCost: 1000, type: "gift_card" as const },
        { tier: "diamond" as const, name: "Half-Day Paid", description: "4 hours paid time off", pointsCost: 2500, type: "time_off" as const },
        { tier: "legend" as const, name: "$100 Cash Bonus", description: "Cash bonus for legendary performance", pointsCost: 5000, type: "cash" as const },
      ];
      for (const r of rewardDefs) {
        await createReward(r);
      }
      return { message: `Seeded ${rewardDefs.length} rewards` };
    }),
  }),

  // ============ PHOTO MISSIONS ============
  missions: router({
    active: publicProcedure.query(() => getActiveMissions()),
    create: adminProcedure.input(z.object({
      name: z.string(),
      description: z.string().optional(),
      category: z.enum(["walk_in", "station_setup", "invoice", "equipment", "prep", "plate", "delivery", "general"]),
      pointsPerPhoto: z.number().default(5),
      bonusPoints: z.number().default(0),
      targetPhotoCount: z.number().default(10),
    })).mutation(({ input }) => createPhotoMission(input)),
  }),

  // ============ VENDOR PRODUCTS & ORDER GUIDES ============
  vendorProducts: router({
    list: protectedProcedure.input(z.object({ vendorName: z.string().optional() }).optional()).query(({ input }) => getVendorProducts(input?.vendorName)),
    create: protectedProcedure.input(z.object({
      vendorName: z.string(),
      sku: z.string().optional(),
      productName: z.string(),
      category: z.enum(["meat", "dairy", "produce", "bread", "frozen", "dry_goods", "paper", "chemicals", "liquor", "beer", "wine", "soda", "other"]),
      unit: z.string().optional(),
      lastPrice: z.string().optional(),
      parLevel: z.number().optional(),
      orderFrequency: z.enum(["daily", "twice_weekly", "weekly", "biweekly", "monthly", "as_needed"]).optional(),
      notes: z.string().optional(),
    })).mutation(({ input }) => createVendorProduct(input)),
    updatePrice: protectedProcedure.input(z.object({ id: z.number(), newPrice: z.string() })).mutation(({ input }) => updateVendorProductPrice(input.id, input.newPrice)),
    parSuggestions: protectedProcedure.query(() => getParLevelSuggestions()),
  }),
  orderGuides: router({
    list: protectedProcedure.input(z.object({ staffId: z.number().optional() }).optional()).query(({ input }) => getOrderGuides(input?.staffId)),
    create: protectedProcedure.input(z.object({
      name: z.string(),
      assignedToStaffId: z.number().optional(),
      vendorName: z.string(),
      products: z.any().optional(),
    })).mutation(({ input }) => createOrderGuide(input)),
  }),

  // ============ BRIEFING MEMORY ============
  briefingMemory: router({
    relevant: protectedProcedure.query(() => getRelevantMemories()),
    create: protectedProcedure.input(z.object({
      factType: z.enum(["event_pattern", "shortage", "equipment_issue", "staff_pattern", "vendor_change", "menu_change", "seasonal", "custom"]),
      fact: z.string(),
      relevanceScore: z.number().default(50),
      expiresAt: z.date().optional(),
      sourceType: z.string().optional(),
      sourceId: z.number().optional(),
    })).mutation(({ input }) => createBriefingMemory(input)),
   }),

  // ============ WORKER TRAINING ============
  training: router({
    modules: publicProcedure.input(z.object({ track: z.string().optional() }).optional()).query(({ input }) => getTrainingModules(input?.track)),
    createModule: adminProcedure.input(z.object({
      name: z.string(),
      description: z.string().optional(),
      category: z.enum(["equipment", "food_prep", "service", "management", "safety"]),
      requiredForTrack: z.enum(["kitchen", "pizza", "foh", "driver", "all"]),
      requiredForLevel: z.number().default(1),
      estimatedMinutes: z.number().optional(),
      assessmentType: z.enum(["trainer_signoff", "written_test", "weight_check", "checklist_completion", "manager_observation", "practical_demo"]),
      passingScore: z.number().optional(),
      sourceDocument: z.string().optional(),
    })).mutation(({ input }) => createTrainingModule(input)),
    completions: publicProcedure.input(z.object({ staffId: z.number() })).query(({ input }) => getTrainingCompletions(input.staffId)),
    complete: protectedProcedure.input(z.object({
      staffId: z.number(),
      moduleId: z.number(),
      completedAt: z.date(),
      trainerId: z.number().optional(),
      assessmentScore: z.number().optional(),
      passed: z.boolean(),
      notes: z.string().optional(),
      verifiedByManagerId: z.number().optional(),
    })).mutation(({ input }) => createTrainingCompletion(input)),
  }),

  // ============ WORKER SKILLS ============
  skills: router({
    list: publicProcedure.input(z.object({ staffId: z.number() })).query(({ input }) => getSkillCertifications(input.staffId)),
    certify: protectedProcedure.input(z.object({
      staffId: z.number(),
      skillName: z.string(),
      skillCategory: z.enum(["equipment", "food_prep", "service", "management", "safety"]),
      certifiedAt: z.date(),
      certifiedById: z.number().optional(),
      expiresAt: z.date().optional(),
      notes: z.string().optional(),
    })).mutation(({ input }) => createSkillCertification(input)),
  }),

  // ============ WORKER EVALUATIONS ============
  evaluations: router({
    list: publicProcedure.input(z.object({ staffId: z.number() })).query(({ input }) => getEvaluations(input.staffId)),
    create: protectedProcedure.input(z.object({
      staffId: z.number(),
      evaluatorId: z.number(),
      evaluatedAt: z.date(),
      workQuality: z.number().min(1).max(5),
      attendance: z.number().min(1).max(5),
      jobKnowledge: z.number().min(1).max(5),
      teamwork: z.number().min(1).max(5),
      finishingTasks: z.number().min(1).max(5),
      overallAttitude: z.number().min(1).max(5),
      customerInteraction: z.number().min(1).max(5),
      multitasking: z.number().min(1).max(5),
      computerSkills: z.number().min(1).max(5),
      overallSuccession: z.string().optional(),
      needsImprovement: z.string().optional(),
      employeeConcerns: z.string().optional(),
    })).mutation(({ input }) => createEvaluation(input)),
  }),

  // ============ WORKER WRITE-UPS ============
  writeUps: router({
    list: publicProcedure.input(z.object({ staffId: z.number() })).query(({ input }) => getWriteUps(input.staffId)),
    active: publicProcedure.input(z.object({ staffId: z.number() })).query(({ input }) => getActiveWriteUps(input.staffId)),
    create: protectedProcedure.input(z.object({
      staffId: z.number(),
      issuedById: z.number(),
      issuedAt: z.date(),
      severity: z.enum(["verbal", "written", "final", "termination"]),
      category: z.enum(["attendance", "performance", "conduct", "safety", "policy"]),
      description: z.string(),
      employeeResponse: z.string().optional(),
      followUpDate: z.date().optional(),
      expiresAt: z.date().optional(),
    })).mutation(({ input }) => createWriteUp(input)),
    acknowledge: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => acknowledgeWriteUp(input.id)),
  }),

  // ============ WORKER CAREER TRACK ============
  career: router({
    track: publicProcedure.input(z.object({ staffId: z.number() })).query(({ input }) => getCareerTrack(input.staffId)),
    upsert: protectedProcedure.input(z.object({
      staffId: z.number(),
      track: z.enum(["kitchen", "pizza", "foh", "driver"]),
      currentLevel: z.number().default(1),
      advancementReadinessScore: z.number().default(0),
      nextLevelRequirements: z.any().optional(),
      promotedAt: z.date().optional(),
      promotedById: z.number().optional(),
    })).mutation(({ input }) => upsertCareerTrack(input)),
  }),

  // ============ SALES INTELLIGENCE ============
  sales: router({
    daily: publicProcedure.input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      limit: z.number().default(90),
    }).optional()).query(({ input }) => getDailySales(input?.startDate, input?.endDate, input?.limit)),
    hourly: publicProcedure.input(z.object({ businessDate: z.string() })).query(({ input }) => getHourlySales(input.businessDate)),
    importDaily: adminProcedure.input(z.object({
      businessDate: z.string(),
      grandTotal: z.string().optional(),
      tax: z.string().optional(),
      pickupQty: z.number().optional(),
      pickupAmount: z.string().optional(),
      deliveryQty: z.number().optional(),
      deliveryAmount: z.string().optional(),
      barQty: z.number().optional(),
      barAmount: z.string().optional(),
      tableQty: z.number().optional(),
      tableAmount: z.string().optional(),
      totalQty: z.number().optional(),
      totalAmount: z.string().optional(),
      catFoodQty: z.number().optional(),
      catFoodAmount: z.string().optional(),
      catBeerQty: z.number().optional(),
      catBeerAmount: z.string().optional(),
      catLiquorQty: z.number().optional(),
      catLiquorAmount: z.string().optional(),
      catPopQty: z.number().optional(),
      catPopAmount: z.string().optional(),
      catLargePizzasQty: z.number().optional(),
      catLargePizzasAmount: z.string().optional(),
      laborHeadcount: z.number().optional(),
      laborTotal: z.string().optional(),
      laborPct: z.string().optional(),
      voidsCount: z.number().optional(),
      voidsAmount: z.string().optional(),
      discountCount: z.number().optional(),
      discountTotal: z.string().optional(),
      discountPct: z.string().optional(),
      expectedCash: z.string().optional(),
      creditCards: z.string().optional(),
      creditCardTips: z.string().optional(),
      payOuts: z.string().optional(),
      tableOrders: z.number().optional(),
      tableGuests: z.number().optional(),
      avgGuestPerOrder: z.string().optional(),
      avgPerGuest: z.string().optional(),
      totalLastYear: z.string().optional(),
    })).mutation(({ input }) => upsertDailySales(input)),
  }),

  // ============ PRICE COMPARISON ============
  priceComparison: router({
    list: protectedProcedure.query(() => getPriceComparisons()),
  }),

  // ============ EVENT-AWARE BRIEFING ============
  eventBriefing: router({
    context: protectedProcedure.query(() => getEventAwareBriefingContext()),
  }),

  // ============ INTELLIGENCE ENGINE ============
  intelligence: router({
    // Void Analysis
    voidRecords: protectedProcedure.input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      employeeName: z.string().optional(),
    }).optional()).query(({ input }) => getVoidRecords(input)),
    voidSummary: protectedProcedure.query(() => getVoidSummaryByEmployee()),

    // Product Mix
    productMix: protectedProcedure.input(z.object({ category: z.string().optional() }).optional()).query(({ input }) => getProductMix(input?.category)),

    // Weather
    weather: protectedProcedure.query(() => getWeatherData()),
    weatherCorrelation: protectedProcedure.query(() => getWeatherSalesCorrelation()),

    // Hourly Heatmap
    hourlyHeatmap: protectedProcedure.query(() => getHourlySalesHeatmap()),

    // Anomalies
    anomalies: protectedProcedure.input(z.object({ severity: z.string().optional() }).optional()).query(({ input }) => getAnomalies(input?.severity)),
    acknowledgeAnomaly: protectedProcedure.input(z.object({ id: z.number(), acknowledgedBy: z.string() })).mutation(({ input }) => acknowledgeAnomaly(input.id, input.acknowledgedBy)),

    // Events
    upcomingEvents: protectedProcedure.query(() => getUpcomingEvents()),
    addEvent: protectedProcedure.input(z.object({
      eventName: z.string(),
      eventDate: z.string(),
      eventTime: z.string().optional(),
      venue: z.string().optional(),
      city: z.string().optional(),
      distance: z.number().optional(),
      category: z.string().optional(),
      estimatedImpact: z.string().optional(),
      attendanceEstimate: z.number().optional(),
      notes: z.string().optional(),
      source: z.string().optional(),
    })).mutation(({ input }) => addLocalEvent(input)),

    // Schedule Intelligence
    scheduleIntel: protectedProcedure.input(z.object({ weekStart: z.string() })).query(({ input }) => getScheduleIntelligence(input.weekStart)),

    // Generate schedule intelligence using LLM
    generateScheduleIntel: protectedProcedure.input(z.object({ weekStart: z.string(), weekEnd: z.string() })).mutation(async ({ input }) => {
      const [dowPattern, weatherData, events, anomalies, voidSummary] = await Promise.all([
        getDayOfWeekPattern(new Date().getDay()),
        getWeatherData(true),
        getUpcomingEvents(),
        getAnomalies('high'),
        getVoidSummaryByEmployee(),
      ]);

      const prompt = `You are a restaurant scheduling intelligence AI for Community Tap & Pizza in Fort Dodge, Iowa.

Analyze the following data and generate staffing recommendations for the week of ${input.weekStart} to ${input.weekEnd}.

Historical Revenue by Day of Week:\n${JSON.stringify(dowPattern, null, 2)}

Upcoming Weather:\n${JSON.stringify(weatherData?.slice(0, 7), null, 2)}

Upcoming Events:\n${JSON.stringify(events, null, 2)}

High-Severity Anomalies:\n${JSON.stringify(anomalies?.slice(0, 5), null, 2)}

Void Summary (top 5):\n${JSON.stringify(voidSummary?.slice(0, 5), null, 2)}

For each day of the week, provide:
1. Expected revenue range
2. Recommended staffing level (light/normal/heavy)
3. Key reasoning (weather, events, historical patterns)
4. Any alerts or special considerations

Respond in JSON format: { "days": [{ "date": "YYYY-MM-DD", "dayOfWeek": "Monday", "expectedRevenue": { "low": 3000, "high": 5000 }, "staffingLevel": "normal", "reasoning": "...", "alerts": ["..."] }] }`;

      const response = await invokeLLM({
        messages: [{ role: 'system', content: 'You are a restaurant operations intelligence AI.' }, { role: 'user', content: prompt }],
        response_format: { type: 'json_schema', json_schema: { name: 'schedule_intel', strict: true, schema: { type: 'object', properties: { days: { type: 'array', items: { type: 'object', properties: { date: { type: 'string' }, dayOfWeek: { type: 'string' }, expectedRevenue: { type: 'object', properties: { low: { type: 'number' }, high: { type: 'number' } }, required: ['low', 'high'], additionalProperties: false }, staffingLevel: { type: 'string' }, reasoning: { type: 'string' }, alerts: { type: 'array', items: { type: 'string' } } }, required: ['date', 'dayOfWeek', 'expectedRevenue', 'staffingLevel', 'reasoning', 'alerts'], additionalProperties: false } } }, required: ['days'], additionalProperties: false } } },
      });

      const rawContent = response.choices?.[0]?.message?.content;
      const content = typeof rawContent === 'string' ? rawContent : '';
      const recommendations = content ? JSON.parse(content) : { days: [] };
      await saveScheduleIntelligence({ weekStart: input.weekStart, weekEnd: input.weekEnd, recommendations });
      return recommendations;
    }),
  }),

  // ============ MANAGEMENT BRIEFINGS ============
  briefings: router({
    list: protectedProcedure.input(z.object({ role: z.string().optional() }).optional()).query(({ input }) => getManagementBriefings(input?.role)),
    markRead: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => markBriefingRead(input.id)),

    // Generate a comprehensive briefing for all roles using LLM
    generate: protectedProcedure.mutation(async () => {
      const snapshot = await getBriefingDataSnapshot();
      if (!snapshot) return { error: 'No data available' };

      const briefingIds: number[] = [];

      // Generate role-specific briefings
      const roles = [
        { role: 'michael', label: 'Mychael (Scheduler)', focus: 'Full schedule picture — staffing levels, revenue forecasts, event impacts, weather, all category trends, comp/promo/void patterns, and theories about anomalies. What days need extra staff? What days might be slow? Any upcoming events that could spike or kill traffic?' },
        { role: 'ashley', label: 'Ashley (Bar)', focus: 'Bar-specific intelligence — beer and liquor sales trends, which drinks are moving, which are dying, bar hourly patterns (when is the rush?), any bar-related voids or comps, weather impact on bar traffic, events that drive bar business (game nights, concerts), and theories about what\'s changing in beverage sales.' },
        { role: 'tom', label: 'Tom (BOH/Kitchen)', focus: 'Back-of-house intelligence — food sales trends, pizza volume, prep level recommendations, kitchen void patterns (remakes, wrong orders), food cost indicators, hourly kitchen volume patterns, weather impact on food orders vs delivery, and theories about what\'s weird in the kitchen numbers.' },
      ];

      for (const { role, label, focus } of roles) {
        const prompt = `You are the intelligence engine for Community Tap & Pizza in Fort Dodge, Iowa.
Generate a briefing for ${label}.

FOCUS: ${focus}

DATA SNAPSHOT:

Recent Daily Sales (last 14 days):
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

Weather (current + forecast):
${JSON.stringify(snapshot.weather, null, 2)}

Upcoming Events (within 30 miles):
${JSON.stringify(snapshot.events, null, 2)}

Void Summary by Employee:
${JSON.stringify(snapshot.voidSummary, null, 2)}

Recent Voids (last 7 days sample):
${JSON.stringify(snapshot.recentVoids.slice(0, 10), null, 2)}

Unacknowledged Anomalies:
${JSON.stringify(snapshot.anomalies, null, 2)}

Weather-Sales Correlation:
${JSON.stringify(snapshot.weatherCorrelation, null, 2)}

Respond in JSON with this exact structure:
{
  "title": "Brief headline for this briefing",
  "summary": "2-3 sentence executive summary",
  "sections": [
    { "heading": "Section Title", "content": "Detailed analysis in markdown" }
  ],
  "theories": ["Theory about something unusual in the data"],
  "actionItems": ["Specific action to take"],
  "alerts": ["Urgent items needing immediate attention"]
}`;

        try {
          const response = await invokeLLM({
            messages: [
              { role: 'system', content: 'You are a restaurant operations intelligence AI. Be specific with numbers. Call out what\'s weird. Give theories about WHY things are happening, not just what. Use plain language — these are busy restaurant managers, not data scientists.' },
              { role: 'user', content: prompt },
            ],
            response_format: {
              type: 'json_schema',
              json_schema: {
                name: 'management_briefing',
                strict: true,
                schema: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    summary: { type: 'string' },
                    sections: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          heading: { type: 'string' },
                          content: { type: 'string' },
                        },
                        required: ['heading', 'content'],
                        additionalProperties: false,
                      },
                    },
                    theories: { type: 'array', items: { type: 'string' } },
                    actionItems: { type: 'array', items: { type: 'string' } },
                    alerts: { type: 'array', items: { type: 'string' } },
                  },
                  required: ['title', 'summary', 'sections', 'theories', 'actionItems', 'alerts'],
                  additionalProperties: false,
                },
              },
            },
          });

          const rawContent = response.choices?.[0]?.message?.content;
          const parsed = typeof rawContent === 'string' ? JSON.parse(rawContent) : { title: 'Briefing', summary: 'No data', sections: [], theories: [], actionItems: [], alerts: [] };

          // Build full markdown content from sections
          const fullContent = parsed.sections.map((s: any) => `## ${s.heading}\n\n${s.content}`).join('\n\n');

          const id = await saveManagementBriefing({
            targetRole: role,
            briefingType: 'daily',
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
        } catch (err) {
          console.error(`Failed to generate briefing for ${role}:`, err);
        }
      }

      // Send notification to owner (Mychael) with the scheduler briefing summary
      if (briefingIds.length > 0) {
        const michaelBriefings = await getManagementBriefings('michael', 1);
        if (michaelBriefings.length > 0) {
          const latest = michaelBriefings[0];
          await notifyOwner({
            title: `Schedule Intel: ${latest.title}`,
            content: `${latest.summary}\n\n${(latest.theories as string[] || []).map((t: string) => `Theory: ${t}`).join('\n')}\n\n${(latest.actionItems as string[] || []).map((a: string) => `Action: ${a}`).join('\n')}`,
          });
          await markBriefingNotified(latest.id);
        }
      }

      return { generated: briefingIds.length, ids: briefingIds };
    }),
  }),
});
export type AppRouter = typeof appRouter;
