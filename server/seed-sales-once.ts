import { createDailySalesIfNew } from "./db";
import type { InsertDailySales } from "../drizzle/schema";

const SALES_SEED_RECORDS: Array<InsertDailySales & { dedupeKey: string }> = [
  {
    businessDate: "2026-05-25",
    grandTotal: "5605.75",
    tax: "247.97",
    pickupQty: 25,
    pickupAmount: "680.04",
    deliveryQty: 21,
    deliveryAmount: "852.40",
    barQty: 73,
    barAmount: "1118.44",
    tableQty: 67,
    tableAmount: "2954.87",
    totalQty: 186,
    totalAmount: "5605.75",
    catFoodQty: 717,
    catFoodAmount: "3300.71",
    catBeerQty: 227,
    catBeerAmount: "832.75",
    catLiquorQty: 195,
    catLiquorAmount: "825.25",
    catPopQty: 142,
    catPopAmount: "255.43",
    catLargePizzasQty: 13,
    catLargePizzasAmount: "277.95",
    laborTotal: "1429.72",
    voidsCount: 0,
    voidsAmount: "0.00",
    discountCount: 28,
    discountTotal: "214.79",
    expectedCash: "1337.73",
    sourceProvider: "manual",
    sourceMailbox: "uploaded task attachment",
    sourceMessageId: "z_report_summary.json",
    parserVersion: "ctap-sales-seed-2026-05-28-v1",
    parserConfidence: "1.000",
    dedupeKey: "pdq-zreport:manual:2026-05-25:z_report_summary_json",
    needsReview: false,
    rawText: "One-time owner-authorized live seed from z_report_summary.json. Business date 2026-05-25; grand total 5605.75; labor total 1429.72; 186 transactions.",
  },
  {
    businessDate: "2026-05-04",
    grandTotal: "4769.92",
    tax: "192.53",
    pickupQty: 17,
    pickupAmount: "516.80",
    deliveryQty: 15,
    deliveryAmount: "772.76",
    barQty: 63,
    barAmount: "914.84",
    tableQty: 35,
    tableAmount: "2565.52",
    totalQty: 130,
    totalAmount: "4769.92",
    expectedCash: "876.60",
    creditCards: "2889.29",
    creditCardTips: "340.79",
    payOuts: "147.40",
    sourceProvider: "manual",
    sourceMailbox: "uploaded task attachment",
    sourceMessageId: "z-report-5-4-2026.md",
    parserVersion: "ctap-sales-seed-2026-05-28-v1",
    parserConfidence: "1.000",
    dedupeKey: "pdq-zreport:manual:2026-05-04:z_report_5_4_2026_md",
    needsReview: false,
    rawText: "One-time owner-authorized live seed from z-report-5-4-2026.md. Business date 2026-05-04; grand total 4769.92; 130 transactions.",
  },
];

let seedPromise: Promise<void> | null = null;

export async function seedSalesOnce(): Promise<void> {
  if (seedPromise) return seedPromise;

  seedPromise = (async () => {
    const results: Array<{ businessDate: string; action: string }> = [];
    for (const record of SALES_SEED_RECORDS) {
      const result = await createDailySalesIfNew(record);
      results.push({ businessDate: record.businessDate, action: result.action });
    }
    console.log("[seed-sales-once] completed", JSON.stringify(results));
  })().catch(error => {
    console.error("[seed-sales-once] failed", error);
    throw error;
  });

  return seedPromise;
}
