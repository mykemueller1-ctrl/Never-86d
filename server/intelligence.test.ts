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
}));

// Mock context
vi.mock("./_core/context", () => ({
  signStaffSession: vi.fn().mockReturnValue("mock-token"),
  STAFF_COOKIE: "staff_session_id",
}));

import { appRouter } from "./routers";
import { searchKnowledge, getRelevantMemories, createKnowledgeEntry, createKnowledgeCorrection, addGamificationEvent, createPhotoSubmission, getStaffById, updateStaffPoints, getAllAchievements, getAllRewards, getActiveMissions, getVendorProducts } from "./db";
import { invokeLLM } from "./_core/llm";

// Create caller with mock user context
const createCaller = (user?: any) => {
  return appRouter.createCaller({
    user: user || { openId: "test-user", name: "Test", role: "admin" },
    setCookie: vi.fn(),
    getCookie: vi.fn(),
    removeCookie: vi.fn(),
  } as any);
};

describe("Knowledge Brain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("knowledge.ask calls LLM with station context and returns answer", async () => {
    const caller = createCaller();
    const result = await caller.knowledge.ask({
      question: "How do I make pizza dough?",
      station: "pizza_line",
      staffName: "Tom",
    });
    expect(result.answer).toBe("Test AI response");
    expect(result.sourcesUsed).toBe(1);
    expect(result.station).toBe("pizza_line");
    expect(searchKnowledge).toHaveBeenCalledWith("How do I make pizza dough?", "pizza_line", 15);
    expect(getRelevantMemories).toHaveBeenCalledWith(10);
    expect(invokeLLM).toHaveBeenCalledTimes(1);
    // Verify system prompt includes station and time context
    const llmCall = (invokeLLM as any).mock.calls[0][0];
    expect(llmCall.messages[0].content).toContain("pizza_line");
    expect(llmCall.messages[0].content).toContain("Tom");
    expect(llmCall.messages[0].content).toContain("Community Tap");
  });

  it("knowledge.ask works without station (defaults to general)", async () => {
    const caller = createCaller();
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
    const caller = createCaller();
    await caller.achievements.myProgress({ staffId: 1 });
    expect(vi.mocked(await import("./db")).getStaffAchievementProgress).toHaveBeenCalledWith(1);
  });

  it("achievements.acknowledge marks an unlock as seen", async () => {
    const caller = createCaller();
    await caller.achievements.acknowledge({ staffId: 1, achievementId: 3 });
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
