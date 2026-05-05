import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the LLM module
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: "Test AI response" } }],
  }),
}));

// Mock the db module
vi.mock("./db", () => ({
  searchKnowledge: vi.fn().mockResolvedValue([
    { station: "pizza_line", category: "recipe", question: "How to make dough?", answer: "Mix flour, water, yeast", confidence: "high" },
  ]),
  getRelevantMemories: vi.fn().mockResolvedValue([
    { factType: "event_pattern", fact: "Friday nights are busy" },
  ]),
  createKnowledgeEntry: vi.fn().mockResolvedValue([{ insertId: 1 }]),
  getKnowledgeByStation: vi.fn().mockResolvedValue([]),
  getKnowledgeByCategory: vi.fn().mockResolvedValue([]),
  getAllKnowledge: vi.fn().mockResolvedValue([]),
  updateKnowledgeEntry: vi.fn(),
  createKnowledgeCorrection: vi.fn(),
  getPendingCorrections: vi.fn().mockResolvedValue([]),
  approveCorrection: vi.fn(),
  rejectCorrection: vi.fn(),
  getAllAchievements: vi.fn().mockResolvedValue([]),
  createAchievementDefinition: vi.fn(),
  getStaffAchievementProgress: vi.fn().mockResolvedValue([]),
  upsertAchievementProgress: vi.fn(),
  getUnacknowledgedUnlocks: vi.fn().mockResolvedValue([]),
  createAchievementUnlock: vi.fn(),
  acknowledgeUnlock: vi.fn(),
  getAllRewards: vi.fn().mockResolvedValue([]),
  createReward: vi.fn(),
  createRedemption: vi.fn(),
  getStaffRedemptions: vi.fn().mockResolvedValue([]),
  getPendingRedemptions: vi.fn().mockResolvedValue([]),
  approveRedemption: vi.fn(),
  getActiveMissions: vi.fn().mockResolvedValue([]),
  createPhotoMission: vi.fn(),
  createPhotoSubmission: vi.fn(),
  getPhotoSubmissionsByStaff: vi.fn().mockResolvedValue([]),
  getPhotoSubmissionsByMission: vi.fn().mockResolvedValue([]),
  verifyPhotoSubmission: vi.fn(),
  getVendorProducts: vi.fn().mockResolvedValue([]),
  createVendorProduct: vi.fn(),
  updateVendorProductPrice: vi.fn(),
  upsertVendorProductFromOCR: vi.fn().mockResolvedValue({ action: "updated", id: 1 }),
  getOrderGuides: vi.fn().mockResolvedValue([]),
  createOrderGuide: vi.fn(),
  createBriefingMemory: vi.fn(),
  addGamificationEvent: vi.fn(),
  getStaffById: vi.fn().mockResolvedValue({ id: 1, totalPoints: 500 }),
  updateStaffPoints: vi.fn(),
  // Existing helpers that might be needed
  getAllStaff: vi.fn().mockResolvedValue([]),
  getStaffByDepartment: vi.fn().mockResolvedValue([]),
  getActiveStaff: vi.fn().mockResolvedValue([]),
  createStaff: vi.fn(),
  updateStaffStatus: vi.fn(),
  getStaffByPinInternal: vi.fn(),
  getStaffByIdInternal: vi.fn().mockResolvedValue({ id: 1, firstName: "Tom", lastName: "Smith", jobRole: "line_cook" }),
  getAllPayouts: vi.fn().mockResolvedValue([]),
  createPayout: vi.fn(),
  getFlaggedPayouts: vi.fn().mockResolvedValue([]),
  getPayoutsByStaff: vi.fn().mockResolvedValue([]),
  getAllInvoices: vi.fn().mockResolvedValue([]),
  createInvoice: vi.fn(),
  getInvoicesByVendor: vi.fn().mockResolvedValue([]),
  getAllVoids: vi.fn().mockResolvedValue([]),
  createVoid: vi.fn(),
  getVoidsByStaff: vi.fn().mockResolvedValue([]),
  getWeeklyVoidsByStaff: vi.fn().mockResolvedValue([]),
  getAllChecklists: vi.fn().mockResolvedValue([]),
  getChecklistsByDepartment: vi.fn().mockResolvedValue([]),
  createChecklistCompletion: vi.fn(),
  createDriverReport: vi.fn(),
  getDriverReports: vi.fn().mockResolvedValue([]),
  createFeedback: vi.fn(),
  getAllFeedback: vi.fn().mockResolvedValue([]),
  getLeaderboard: vi.fn().mockResolvedValue([]),
  createIssue: vi.fn(),
  getOpenIssues: vi.fn().mockResolvedValue([]),
  getLatestBriefing: vi.fn().mockResolvedValue(undefined),
  createBriefing: vi.fn(),
  seedStaffData: vi.fn(),
  archiveInactiveStaff: vi.fn(),
  getPayoutTotalsByCategory: vi.fn().mockResolvedValue([]),
  getPayoutTotalsByVendor: vi.fn().mockResolvedValue([]),
  getInvoiceTotalsByVendor: vi.fn().mockResolvedValue([]),
  getUserByOpenId: vi.fn(),
  upsertUser: vi.fn(),
  getDayOfWeekPattern: vi.fn().mockResolvedValue({ avgRevenue: 6500, avgOrders: 85, avgDeliveryPct: 18, topHour: 17, topHourRevenue: 950 }),
  getRecentSalesTrend: vi.fn().mockResolvedValue({ avgRevenue: 6400, trend: "stable", daysAnalyzed: 7 }),
  getParLevelSuggestions: vi.fn().mockResolvedValue([]),
  getDailySales: vi.fn().mockResolvedValue([]),
  getHourlySales: vi.fn().mockResolvedValue([]),
  getProductMixEntries: vi.fn().mockResolvedValue([]),
  getVoidRecords: vi.fn().mockResolvedValue([]),
  getVoidSummaryByEmployee: vi.fn().mockResolvedValue([]),
  getWeatherData: vi.fn().mockResolvedValue([]),
  getAnomalies: vi.fn().mockResolvedValue([]),
  createAnomaly: vi.fn(),
  acknowledgeAnomaly: vi.fn(),
  getLocalEvents: vi.fn().mockResolvedValue([]),
  createLocalEvent: vi.fn(),
  getScheduleIntel: vi.fn().mockResolvedValue(null),
  saveScheduleIntel: vi.fn(),
  getWeatherCorrelation: vi.fn().mockResolvedValue({ dryDays: { count: 120, avg: 6800 }, rainyDays: { count: 40, avg: 6400 }, snowDays: { count: 30, avg: 7200 }, deliveryImpact: { goodWeather: 17.5, badWeather: 20 } }),
  getHourlyHeatmap: vi.fn().mockResolvedValue([]),
}));

// Mock context
vi.mock("./_core/context", () => ({
  signStaffSession: vi.fn().mockReturnValue("mock-token"),
  STAFF_COOKIE: "staff_session_id",
}));

import { appRouter } from "./routers";
import { searchKnowledge, getRelevantMemories, createKnowledgeEntry, createKnowledgeCorrection, addGamificationEvent, createPhotoSubmission, getStaffById, updateStaffPoints, getAllAchievements, getAllRewards, getActiveMissions, getVendorProducts } from "./db";
import { invokeLLM } from "./_core/llm";

// Create caller with mock user context (OAuth admin)
const createCaller = (user?: any) => {
  return appRouter.createCaller({
    user: user || { openId: "test-user", name: "Test", role: "admin" },
    staffId: null,
    setCookie: vi.fn(),
    getCookie: vi.fn(),
    removeCookie: vi.fn(),
  } as any);
};

// Create caller with staff session context
const createStaffCaller = (staffId: number = 1) => {
  return appRouter.createCaller({
    user: null,
    staffId,
    req: { protocol: "https", headers: {}, cookies: {}, socket: { remoteAddress: "127.0.0.1" } },
    res: { clearCookie: () => {}, cookie: () => {} },
  } as any);
};

describe("Knowledge Brain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("knowledge.ask calls LLM with station context and returns answer", async () => {
    const caller = createStaffCaller(1);
    const result = await caller.knowledge.ask({
      question: "How do I make pizza dough?",
      station: "pizza_line",
    });
    expect(result.answer).toBe("Test AI response");
    expect(result.sourcesUsed).toBe(1);
    expect(result.station).toBe("pizza_line");
    expect(searchKnowledge).toHaveBeenCalledWith("How do I make pizza dough?", "pizza_line", 25);
    expect(getRelevantMemories).toHaveBeenCalledWith(10);
    expect(invokeLLM).toHaveBeenCalledTimes(1);
    // Verify system prompt includes station and Community Tap context
    const llmCall = (invokeLLM as any).mock.calls[0][0];
    expect(llmCall.messages[0].content).toContain("pizza_line");
    expect(llmCall.messages[0].content).toContain("Community Tap");
  });

  it("knowledge.ask works without station (defaults to general)", async () => {
    const caller = createStaffCaller(1);
    const result = await caller.knowledge.ask({
      question: "What time do we close?",
    });
    expect(result.station).toBe("general");
    expect(result.answer).toBe("Test AI response");
  });

  it("knowledge.create creates a knowledge entry", async () => {
    const caller = createCaller();
    await caller.knowledge.create({
      station: "pizza_line",
      category: "recipe",
      question: "How much cheese on a large pizza?",
      answer: "12 oz mozzarella blend",
      confidence: "high",
      source: "manual",
    });
    expect(createKnowledgeEntry).toHaveBeenCalledWith(expect.objectContaining({
      station: "pizza_line",
      category: "recipe",
      question: "How much cheese on a large pizza?",
      answer: "12 oz mozzarella blend",
    }));
  });

  it("knowledge.correct awards points for contributing a correction", async () => {
    const caller = createCaller();
    const result = await caller.knowledge.correct({
      entryId: 1,
      correctedByStaffId: 5,
      oldAnswer: "10 oz cheese",
      newAnswer: "12 oz mozzarella blend",
      reason: "Updated based on new recipe card",
    });
    expect(result.success).toBe(true);
    expect(createKnowledgeCorrection).toHaveBeenCalled();
    expect(addGamificationEvent).toHaveBeenCalledWith(expect.objectContaining({
      staffId: 5,
      points: 10,
    }));
  });

  it("knowledge.list returns all knowledge when no filter", async () => {
    const caller = createCaller();
    await caller.knowledge.list();
    expect(vi.mocked(await import("./db")).getAllKnowledge).toHaveBeenCalled();
  });
});

describe("Photo Intelligence Pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("photos.analyze sends photo to LLM vision and stores submission", async () => {
    (invokeLLM as any).mockResolvedValueOnce({
      choices: [{ message: { content: '{"vendor": "Sysco", "items": [{"product": "Mozzarella", "unitPrice": "45.99"}]}' } }],
    });

    const caller = createCaller();
    const result = await caller.photos.analyze({
      photoUrl: "https://example.com/invoice.jpg",
      photoType: "invoice",
      staffId: 1,
    });

    expect(result.photoType).toBe("invoice");
    expect(result.pointsAwarded).toBe(5);
    expect(result.extraction).toHaveProperty("vendor", "Sysco");
    // Verify LLM was called with image_url content
    const llmCall = (invokeLLM as any).mock.calls[0][0];
    expect(llmCall.messages[1].content).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "image_url" }),
    ]));
    // Verify photo submission was saved
    expect(createPhotoSubmission).toHaveBeenCalledWith(expect.objectContaining({
      staffId: 1,
      photoType: "invoice",
      pointsAwarded: 5,
    }));
    // Verify points were awarded
    expect(addGamificationEvent).toHaveBeenCalledWith(expect.objectContaining({
      staffId: 1,
      points: 5,
    }));
  });

  it("photos.analyze handles non-JSON LLM response gracefully", async () => {
    (invokeLLM as any).mockResolvedValueOnce({
      choices: [{ message: { content: "I can see a shelf with various items" } }],
    });

    const caller = createCaller();
    const result = await caller.photos.analyze({
      photoUrl: "https://example.com/shelf.jpg",
      photoType: "shelf",
      staffId: 2,
    });

    expect(result.extraction).toHaveProperty("raw");
    expect(result.pointsAwarded).toBe(5);
  });

  it("photos.analyze creates knowledge entries from invoice items", async () => {
    (invokeLLM as any).mockResolvedValueOnce({
      choices: [{ message: { content: '{"vendor": "PFG", "items": [{"product": "Bacon"}, {"product": "Cheese"}]}' } }],
    });

    const caller = createCaller();
    await caller.photos.analyze({
      photoUrl: "https://example.com/invoice2.jpg",
      photoType: "invoice",
      staffId: 1,
    });

    // Should create knowledge entries for each invoice item
    expect(createKnowledgeEntry).toHaveBeenCalledTimes(2);
    expect(createKnowledgeEntry).toHaveBeenCalledWith(expect.objectContaining({
      station: "store_room",
      category: "vendor",
      source: "photo_extraction",
    }));
  });
});

describe("Achievements System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("achievements.definitions returns all achievement definitions", async () => {
    const caller = createCaller();
    await caller.achievements.definitions();
    expect(getAllAchievements).toHaveBeenCalled();
  });

  it("achievements.myProgress returns progress for a staff member", async () => {
    const caller = createStaffCaller(1);
    await caller.achievements.myProgress();
    expect(vi.mocked(await import("./db")).getStaffAchievementProgress).toHaveBeenCalledWith(1);
  });

  it("achievements.acknowledge marks an unlock as seen", async () => {
    const caller = createStaffCaller(1);
    await caller.achievements.acknowledge({ achievementId: 3 });
    expect(vi.mocked(await import("./db")).acknowledgeUnlock).toHaveBeenCalledWith(1, 3);
  });
});

describe("Rewards System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rewards.list returns active rewards", async () => {
    const caller = createCaller();
    await caller.rewards.list();
    expect(getAllRewards).toHaveBeenCalled();
  });

  it("rewards.redeem deducts points and creates redemption", async () => {
    (getStaffById as any).mockResolvedValueOnce({ id: 1, totalPoints: 500 });

    const caller = createCaller();
    await caller.rewards.redeem({
      staffId: 1,
      rewardId: 1,
      pointsSpent: 100,
    });

    expect(updateStaffPoints).toHaveBeenCalledWith(1, -100);
    expect(vi.mocked(await import("./db")).createRedemption).toHaveBeenCalledWith(expect.objectContaining({
      staffId: 1,
      rewardId: 1,
      pointsSpent: 100,
    }));
  });

  it("rewards.redeem throws when insufficient points", async () => {
    (getStaffById as any).mockResolvedValueOnce({ id: 1, totalPoints: 50 });

    const caller = createCaller();
    await expect(caller.rewards.redeem({
      staffId: 1,
      rewardId: 1,
      pointsSpent: 100,
    })).rejects.toThrow("Not enough points");
  });
});

describe("Photo Missions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("missions.active returns active missions", async () => {
    const caller = createCaller();
    await caller.missions.active();
    expect(getActiveMissions).toHaveBeenCalled();
  });
});

describe("Vendor Products & Order Guides", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("vendorProducts.list returns products optionally filtered by vendor", async () => {
    const caller = createCaller();
    await caller.vendorProducts.list({ vendorName: "PFG" });
    expect(getVendorProducts).toHaveBeenCalledWith("PFG");
  });

  it("vendorProducts.create creates a new vendor product", async () => {
    const caller = createCaller();
    await caller.vendorProducts.create({
      vendorName: "Sysco",
      productName: "Mozzarella Cheese 5lb",
      category: "dairy",
      unit: "case",
      lastPrice: "45.99",
      parLevel: 3,
      orderFrequency: "twice_weekly",
    });
    expect(vi.mocked(await import("./db")).createVendorProduct).toHaveBeenCalledWith(expect.objectContaining({
      vendorName: "Sysco",
      productName: "Mozzarella Cheese 5lb",
      category: "dairy",
    }));
  });
});

describe("Briefing Memory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("briefingMemory.create stores a new memory fact", async () => {
    const caller = createCaller();
    await caller.briefingMemory.create({
      factType: "event_pattern",
      fact: "Friday nights average 40% more revenue than weekdays",
      relevanceScore: 80,
    });
    expect(vi.mocked(await import("./db")).createBriefingMemory).toHaveBeenCalledWith(expect.objectContaining({
      factType: "event_pattern",
      fact: "Friday nights average 40% more revenue than weekdays",
      relevanceScore: 80,
    }));
  });
});

describe("Invoice OCR → Vendor Price Update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("invoices.create with items array calls upsertVendorProductFromOCR for each valid item", async () => {
    const db = await import("./db");
    vi.mocked(db.createInvoice).mockResolvedValueOnce([{ insertId: 1 }] as any);
    vi.mocked(db.upsertVendorProductFromOCR).mockResolvedValue({ action: "updated", id: 1 });

    const caller = createCaller();
    await caller.invoices.create({
      vendorName: "PFG",
      invoiceNumber: "INV-001",
      date: new Date(),
      totalAmount: "2850.00",
      category: "meat",
      items: [
        { product: "Bacon 15lb", unitPrice: "45.99", unit: "case" },
        { product: "Mozzarella 5lb", unitPrice: "32.50", unit: "case" },
        { product: "Mushrooms Sliced", unitPrice: "18.75", unit: "case" },
      ],
    });

    expect(db.createInvoice).toHaveBeenCalledWith(expect.objectContaining({
      vendorName: "PFG",
      totalAmount: "2850.00",
    }));
    // Should call upsertVendorProductFromOCR for each of the 3 items
    expect(db.upsertVendorProductFromOCR).toHaveBeenCalledTimes(3);
    expect(db.upsertVendorProductFromOCR).toHaveBeenCalledWith("PFG", "Bacon 15lb", "45.99", "case", "meat");
    expect(db.upsertVendorProductFromOCR).toHaveBeenCalledWith("PFG", "Mozzarella 5lb", "32.50", "case", "meat");
    expect(db.upsertVendorProductFromOCR).toHaveBeenCalledWith("PFG", "Mushrooms Sliced", "18.75", "case", "meat");
  });

  it("invoices.create without items does not call upsertVendorProductFromOCR", async () => {
    const db = await import("./db");
    vi.mocked(db.createInvoice).mockResolvedValueOnce([{ insertId: 2 }] as any);

    const caller = createCaller();
    await caller.invoices.create({
      vendorName: "Sysco",
      invoiceNumber: "INV-002",
      date: new Date(),
      totalAmount: "1200.00",
      category: "bread",
    });

    expect(db.createInvoice).toHaveBeenCalled();
    expect(db.upsertVendorProductFromOCR).not.toHaveBeenCalled();
  });

  it("invoices.create handles items with missing product/unitPrice gracefully", async () => {
    const db = await import("./db");
    vi.mocked(db.createInvoice).mockResolvedValueOnce([{ insertId: 3 }] as any);
    vi.mocked(db.upsertVendorProductFromOCR).mockResolvedValue({ action: "created", id: 5 });

    const caller = createCaller();
    await caller.invoices.create({
      vendorName: "PFG",
      invoiceNumber: "INV-003",
      date: new Date(),
      totalAmount: "500.00",
      category: "produce",
      items: [
        { product: null, unitPrice: "10.00" },
        { product: "Lettuce", unitPrice: null },
        { product: "Tomatoes", unitPrice: "12.50" },
      ],
    });

    expect(db.createInvoice).toHaveBeenCalled();
    // Only "Tomatoes" has both product AND unitPrice, so only 1 call
    expect(db.upsertVendorProductFromOCR).toHaveBeenCalledTimes(1);
    expect(db.upsertVendorProductFromOCR).toHaveBeenCalledWith("PFG", "Tomatoes", "12.50", undefined, "produce");
  });
});
