import type { InsertDailySales } from "../../../drizzle/schema";

export const PDQ_PARSER_VERSION = "pdq-z-report-v1";

type MoneyString = string;

type ParsedCountAmount = {
  qty?: number;
  amount?: MoneyString;
};

export type ParsedPdqZReport = {
  parserVersion: typeof PDQ_PARSER_VERSION;
  confidence: number;
  needsReview: boolean;
  warnings: string[];
  businessDate?: string;
  grandTotal?: MoneyString;
  subtotal?: MoneyString;
  tax?: MoneyString;
  orderCounts: {
    pickup: ParsedCountAmount;
    delivery: ParsedCountAmount;
    bar: ParsedCountAmount;
    table: ParsedCountAmount;
    total: ParsedCountAmount;
  };
  categorySales: {
    food: ParsedCountAmount;
    pop: ParsedCountAmount;
    liquor: ParsedCountAmount;
    beer: ParsedCountAmount;
    largePizzas: ParsedCountAmount;
  };
  labor: {
    headcount?: number;
    total?: MoneyString;
    pct?: MoneyString;
  };
  voids: ParsedCountAmount;
  discounts: ParsedCountAmount & { pct?: MoneyString };
  cash: {
    expectedCash?: MoneyString;
    creditCards?: MoneyString;
    creditCardTips?: MoneyString;
    payOuts?: MoneyString;
  };
};

function money(value: string | undefined): MoneyString | undefined {
  if (!value) return undefined;
  const normalized = value.replace(/[$,\s]/g, "").replace(/^\((.*)\)$/, "-$1");
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed.toFixed(2);
}

function numberValue(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value.replace(/[,\s]/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function firstMoneyAfter(
  text: string,
  labels: string[]
): MoneyString | undefined {
  for (const label of labels) {
    const pattern = new RegExp(
      `${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^\\n$()\d-]{0,80}(\\(?-?\\$?\\d[\\d,]*\\.\\d{2}\\)?)`,
      "i"
    );
    const match = text.match(pattern);
    const parsed = money(match?.[1]);
    if (parsed) return parsed;
  }
  return undefined;
}

function firstPercentAfter(
  text: string,
  labels: string[]
): MoneyString | undefined {
  for (const label of labels) {
    const pattern = new RegExp(
      `${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^\\n%\\d-]{0,80}(-?\\d+(?:\\.\\d+)?)\\s*%`,
      "i"
    );
    const match = text.match(pattern);
    if (match?.[1]) return Number.parseFloat(match[1]).toFixed(2);
  }
  return undefined;
}

function firstIntegerAfter(text: string, labels: string[]): number | undefined {
  for (const label of labels) {
    const pattern = new RegExp(
      `${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^\\n\\d]{0,80}(\\d[\\d,]*)`,
      "i"
    );
    const match = text.match(pattern);
    const parsed = numberValue(match?.[1]);
    if (parsed !== undefined) return parsed;
  }
  return undefined;
}

function countAndAmount(text: string, labels: string[]): ParsedCountAmount {
  for (const label of labels) {
    // PDQ exports frequently put quantity and dollars on the same row. This
    // pattern captures both when present but still tolerates amount-only rows.
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const linePattern = new RegExp(`^.*${escaped}.*$`, "gim");
    const line = text.match(linePattern)?.[0];
    if (!line) continue;
    const amounts = Array.from(line.matchAll(/\(?-?\$?\d[\d,]*\.\d{2}\)?/g))
      .map(m => money(m[0]))
      .filter(Boolean) as string[];
    const integers = Array.from(line.matchAll(/(?:^|\s)(\d{1,6})(?:\s|$)/g))
      .map(m => numberValue(m[1]))
      .filter((n): n is number => n !== undefined);
    return {
      qty: integers[0],
      amount: amounts.at(-1),
    };
  }
  return {};
}

function extractBusinessDate(text: string): string | undefined {
  const explicit = text.match(
    /(?:business\s*date|z\s*report\s*date|report\s*date|date)\D{0,40}(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/i
  );
  if (!explicit) return undefined;
  const month = explicit[1].padStart(2, "0");
  const day = explicit[2].padStart(2, "0");
  const rawYear = explicit[3];
  const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
  return `${year}-${month}-${day}`;
}

function scoreConfidence(parsed: ParsedPdqZReport): number {
  let score = 0;
  const checks = [
    parsed.businessDate,
    parsed.grandTotal,
    parsed.tax,
    parsed.orderCounts.total.qty,
    parsed.categorySales.food.amount,
    parsed.labor.total,
  ];
  score += checks.filter(Boolean).length / checks.length;
  if (
    parsed.grandTotal &&
    parsed.orderCounts.total.amount &&
    parsed.grandTotal === parsed.orderCounts.total.amount
  )
    score += 0.1;
  return Math.max(0, Math.min(1, Number(score.toFixed(3))));
}

/**
 * Parse a PDQ Z-report text dump into the existing daily_sales shape. PDQ PDF
 * layouts vary across report versions, so each extraction uses multiple labels
 * and produces warnings instead of throwing when a section is missing.
 */
export function parsePdqZReportText(rawText: string): ParsedPdqZReport {
  const text = rawText.replace(/\r\n/g, "\n");
  const parsed: ParsedPdqZReport = {
    parserVersion: PDQ_PARSER_VERSION,
    confidence: 0,
    needsReview: false,
    warnings: [],
    businessDate: extractBusinessDate(text),
    grandTotal: firstMoneyAfter(text, [
      "Grand Total",
      "Net Sales",
      "Total Sales",
    ]),
    subtotal: firstMoneyAfter(text, ["Subtotal", "Sub Total", "Gross Sales"]),
    tax: firstMoneyAfter(text, ["Tax", "Sales Tax", "Taxes"]),
    orderCounts: {
      pickup: countAndAmount(text, [
        "Pickup",
        "Pick Up",
        "Carryout",
        "Carry Out",
      ]),
      delivery: countAndAmount(text, ["Delivery"]),
      bar: countAndAmount(text, ["Bar"]),
      table: countAndAmount(text, ["Table", "Dine In", "Dining"]),
      total: countAndAmount(text, ["Total Orders", "Order Total", "Total"]),
    },
    categorySales: {
      food: countAndAmount(text, ["Food", "Food Sales"]),
      pop: countAndAmount(text, ["Pop", "Soda", "Soft Drinks", "Beverage"]),
      liquor: countAndAmount(text, ["Liquor", "Spirits"]),
      beer: countAndAmount(text, ["Beer"]),
      largePizzas: countAndAmount(text, ["Large Pizza", "Large Pizzas"]),
    },
    labor: {
      headcount: firstIntegerAfter(text, [
        "Labor Headcount",
        "Employees",
        "Labor Count",
      ]),
      total: firstMoneyAfter(text, ["Labor Total", "Labor", "Wages"]),
      pct: firstPercentAfter(text, ["Labor %", "Labor Percent", "Labor"]),
    },
    voids: countAndAmount(text, ["Voids", "Void"]),
    discounts: {
      ...countAndAmount(text, ["Discounts", "Discount"]),
      pct: firstPercentAfter(text, [
        "Discount %",
        "Discount Percent",
        "Discount",
      ]),
    },
    cash: {
      expectedCash: firstMoneyAfter(text, [
        "Expected Cash",
        "Cash Due",
        "Cash",
      ]),
      creditCards: firstMoneyAfter(text, [
        "Credit Cards",
        "Credit Card",
        "Card Total",
      ]),
      creditCardTips: firstMoneyAfter(text, [
        "Credit Card Tips",
        "Card Tips",
        "Tips",
      ]),
      payOuts: firstMoneyAfter(text, ["Pay Outs", "Payouts", "Paid Outs"]),
    },
  };

  if (!parsed.businessDate) parsed.warnings.push("Missing business date");
  if (!parsed.grandTotal) parsed.warnings.push("Missing grand total");
  if (!parsed.tax) parsed.warnings.push("Missing tax");
  if (!parsed.orderCounts.total.qty && !parsed.orderCounts.total.amount)
    parsed.warnings.push("Missing total order count/amount");
  if (!parsed.categorySales.food.amount)
    parsed.warnings.push("Missing food category sales");

  parsed.confidence = scoreConfidence(parsed);
  parsed.needsReview = parsed.confidence < 0.75 || parsed.warnings.length > 2;
  return parsed;
}

export function toDailySalesInsert(
  parsed: ParsedPdqZReport,
  provenance: Pick<
    InsertDailySales,
    | "sourceProvider"
    | "sourceMailbox"
    | "sourceMessageId"
    | "sourceAttachmentHash"
    | "dedupeKey"
    | "rawText"
  >
): InsertDailySales | null {
  if (!parsed.businessDate) return null;
  return {
    businessDate: parsed.businessDate,
    grandTotal: parsed.grandTotal,
    tax: parsed.tax,
    pickupQty: parsed.orderCounts.pickup.qty,
    pickupAmount: parsed.orderCounts.pickup.amount,
    deliveryQty: parsed.orderCounts.delivery.qty,
    deliveryAmount: parsed.orderCounts.delivery.amount,
    barQty: parsed.orderCounts.bar.qty,
    barAmount: parsed.orderCounts.bar.amount,
    tableQty: parsed.orderCounts.table.qty,
    tableAmount: parsed.orderCounts.table.amount,
    totalQty: parsed.orderCounts.total.qty,
    totalAmount: parsed.orderCounts.total.amount ?? parsed.grandTotal,
    catFoodQty: parsed.categorySales.food.qty,
    catFoodAmount: parsed.categorySales.food.amount,
    catBeerQty: parsed.categorySales.beer.qty,
    catBeerAmount: parsed.categorySales.beer.amount,
    catLiquorQty: parsed.categorySales.liquor.qty,
    catLiquorAmount: parsed.categorySales.liquor.amount,
    catPopQty: parsed.categorySales.pop.qty,
    catPopAmount: parsed.categorySales.pop.amount,
    catLargePizzasQty: parsed.categorySales.largePizzas.qty,
    catLargePizzasAmount: parsed.categorySales.largePizzas.amount,
    laborHeadcount: parsed.labor.headcount,
    laborTotal: parsed.labor.total,
    laborPct: parsed.labor.pct,
    voidsCount: parsed.voids.qty,
    voidsAmount: parsed.voids.amount,
    discountCount: parsed.discounts.qty,
    discountTotal: parsed.discounts.amount,
    discountPct: parsed.discounts.pct,
    expectedCash: parsed.cash.expectedCash,
    creditCards: parsed.cash.creditCards,
    creditCardTips: parsed.cash.creditCardTips,
    payOuts: parsed.cash.payOuts,
    parserVersion: parsed.parserVersion,
    parserConfidence: parsed.confidence.toFixed(3),
    needsReview: parsed.needsReview,
    ...provenance,
  };
}
