import { and, eq, gte, lte, or } from "drizzle-orm";
import { invoices, productMixEntries } from "../../../drizzle/schema";
import { getDb } from "../../db";
import { readAshleyParSheet, type BeverageCategory, type NormalizedParProduct } from "../sheets/parSheet";

export interface BeverageVarianceOptions {
  startDate?: string;
  endDate?: string;
  varianceThresholdPercent?: number;
  minimumDollarImpact?: number;
}

export interface BeverageVarianceInvoiceInput {
  id?: number;
  vendorName?: string;
  date?: Date | string;
  category?: string | null;
  items?: unknown;
}

export interface BeverageVarianceSalesInput {
  id?: number;
  periodStart?: string;
  periodEnd?: string;
  itemName: string;
  category?: string | null;
  totalQty?: number | string | null;
  totalAmount?: number | string | null;
  sourceFile?: string | null;
}

export interface BeverageVarianceFinding {
  category: BeverageCategory;
  productName: string;
  vendor?: string;
  parLevel: number;
  onHandQuantity: number;
  orderedQuantity: number;
  soldQuantity: number;
  expectedRemaining: number;
  actualVariance: number;
  variancePercent: number;
  unitCost?: number;
  dollarImpact: number;
  confidence: "high" | "medium";
  reason: string;
  sourceEvidence: {
    parSheet: {
      sheet: string;
      rowNumber: number;
      mappedFields: string[];
    };
    invoiceMatches: Array<{ invoiceId?: number; vendorName?: string; itemName: string; quantity: number; unitCost?: number; totalCost?: number }>;
    salesMatches: Array<{ productMixId?: number; itemName: string; quantity: number; amount?: number; sourceFile?: string | null }>;
  };
}

export interface BeverageVarianceReport {
  generatedAt: string;
  options: Required<Pick<BeverageVarianceOptions, "varianceThresholdPercent" | "minimumDollarImpact">> & Pick<BeverageVarianceOptions, "startDate" | "endDate">;
  summary: {
    productsEvaluated: number;
    productsSkipped: number;
    findings: number;
    liquorFindings: number;
    beerFindings: number;
    estimatedDollarImpact: number;
  };
  findings: {
    liquor: BeverageVarianceFinding[];
    beer: BeverageVarianceFinding[];
  };
  skipped: Array<{ productName: string; category: BeverageCategory; reason: string }>;
}

interface InvoiceLineEvidence {
  invoiceId?: number;
  vendorName?: string;
  itemName: string;
  quantity: number;
  unitCost?: number;
  totalCost?: number;
}

interface SalesLineEvidence {
  productMixId?: number;
  itemName: string;
  quantity: number;
  amount?: number;
  sourceFile?: string | null;
}

/**
 * Load current par-sheet evidence plus existing CTap invoice/POS rows and generate conservative leak findings.
 *
 * This function intentionally avoids writing alerts. P2 should surface evidence first, then a later reviewed workflow can decide when to persist or notify.
 */
export async function loadBeverageVarianceReport(options: BeverageVarianceOptions = {}): Promise<BeverageVarianceReport> {
  const [parSnapshot, db] = await Promise.all([readAshleyParSheet(), getDb()]);
  if (!db) throw new Error("Database not available");

  const invoiceRows = await db.select().from(invoices).where(buildInvoiceWhere(options));
  const salesRows = await db.select().from(productMixEntries).where(buildSalesWhere(options));

  return calculateBeverageVariance({
    parProducts: parSnapshot.products,
    invoices: invoiceRows,
    salesEntries: salesRows,
    options,
  });
}

export function calculateBeverageVariance(input: {
  parProducts: NormalizedParProduct[];
  invoices: BeverageVarianceInvoiceInput[];
  salesEntries: BeverageVarianceSalesInput[];
  options?: BeverageVarianceOptions;
}): BeverageVarianceReport {
  const varianceThresholdPercent = input.options?.varianceThresholdPercent ?? 0.10;
  const minimumDollarImpact = input.options?.minimumDollarImpact ?? 25;
  const findings: { liquor: BeverageVarianceFinding[]; beer: BeverageVarianceFinding[] } = { liquor: [], beer: [] };
  const skipped: BeverageVarianceReport["skipped"] = [];
  let productsEvaluated = 0;

  for (const product of input.parProducts) {
    if (product.category !== "liquor" && product.category !== "beer") continue;
    const skipReason = getConservativeSkipReason(product);
    if (skipReason) {
      skipped.push({ productName: product.productName || "Unknown product", category: product.category, reason: skipReason });
      continue;
    }

    productsEvaluated++;
    const invoiceMatches = findInvoiceMatches(product, input.invoices);
    const salesMatches = findSalesMatches(product, input.salesEntries);
    if (invoiceMatches.length === 0 && salesMatches.length === 0) {
      skipped.push({ productName: product.productName, category: product.category, reason: "No invoice or POS product-mix match found; not enough evidence for a high-confidence variance." });
      continue;
    }

    const orderedQuantity = round(invoiceMatches.reduce((sum, line) => sum + line.quantity, 0));
    const soldQuantity = round(salesMatches.reduce((sum, line) => sum + line.quantity, 0));
    const parLevel = product.parLevel as number;
    const onHandQuantity = product.onHandQuantity as number;
    const expectedRemaining = round(parLevel + orderedQuantity - soldQuantity);
    const actualVariance = round(onHandQuantity - expectedRemaining);
    const unitCost = chooseUnitCost(product, invoiceMatches);
    const dollarImpact = round(Math.abs(actualVariance) * (unitCost ?? 0));
    const variancePercent = expectedRemaining === 0 ? Math.abs(actualVariance) : Math.abs(actualVariance) / Math.max(Math.abs(expectedRemaining), 1);

    if (variancePercent < varianceThresholdPercent) continue;
    if (dollarImpact < minimumDollarImpact) continue;
    if (!unitCost) {
      skipped.push({ productName: product.productName, category: product.category, reason: "Variance crossed quantity threshold but lacked reliable unit cost for dollar impact." });
      continue;
    }

    const finding: BeverageVarianceFinding = {
      category: product.category,
      productName: product.productName,
      vendor: product.vendor ?? invoiceMatches.find((line) => line.vendorName)?.vendorName,
      parLevel,
      onHandQuantity,
      orderedQuantity,
      soldQuantity,
      expectedRemaining,
      actualVariance,
      variancePercent: round(variancePercent),
      unitCost,
      dollarImpact,
      confidence: product.confidence === "high" && invoiceMatches.length > 0 && salesMatches.length > 0 ? "high" : "medium",
      reason: buildFindingReason(actualVariance, product.category),
      sourceEvidence: {
        parSheet: {
          sheet: product.sourceSheet,
          rowNumber: product.rowNumber,
          mappedFields: product.evidence.mappedFields,
        },
        invoiceMatches,
        salesMatches,
      },
    };

    // Conservative final gate: only emit high-confidence money-shot candidates.
    if (finding.confidence === "high") findings[product.category].push(finding);
    else skipped.push({ productName: product.productName, category: product.category, reason: "Potential variance found, but invoice/POS evidence was incomplete; held for source review." });
  }

  const allFindings = [...findings.liquor, ...findings.beer].sort((a, b) => b.dollarImpact - a.dollarImpact);
  findings.liquor = allFindings.filter((finding) => finding.category === "liquor");
  findings.beer = allFindings.filter((finding) => finding.category === "beer");

  return {
    generatedAt: new Date().toISOString(),
    options: {
      varianceThresholdPercent,
      minimumDollarImpact,
      startDate: input.options?.startDate,
      endDate: input.options?.endDate,
    },
    summary: {
      productsEvaluated,
      productsSkipped: skipped.length,
      findings: allFindings.length,
      liquorFindings: findings.liquor.length,
      beerFindings: findings.beer.length,
      estimatedDollarImpact: round(allFindings.reduce((sum, finding) => sum + finding.dollarImpact, 0)),
    },
    findings,
    skipped,
  };
}

function buildInvoiceWhere(options: BeverageVarianceOptions) {
  const clauses = [or(eq(invoices.category, "liquor"), eq(invoices.category, "beer"))];
  if (options.startDate) clauses.push(gte(invoices.date, new Date(options.startDate)));
  if (options.endDate) clauses.push(lte(invoices.date, new Date(options.endDate)));
  return and(...clauses);
}

function buildSalesWhere(options: BeverageVarianceOptions) {
  const clauses = [or(eq(productMixEntries.category, "liquor"), eq(productMixEntries.category, "beer"))];
  if (options.startDate) clauses.push(gte(productMixEntries.periodEnd, options.startDate));
  if (options.endDate) clauses.push(lte(productMixEntries.periodStart, options.endDate));
  return and(...clauses);
}

function getConservativeSkipReason(product: NormalizedParProduct): string | undefined {
  if (product.confidence !== "high") return "Par row was not normalized with high confidence.";
  if (!product.productName) return "Missing normalized product name.";
  if (product.parLevel === undefined) return "Missing explicit par level.";
  if (product.onHandQuantity === undefined) return "Missing current on-hand count; cannot compare actual to expected remaining.";
  if (product.parLevel < 0 || product.onHandQuantity < 0) return "Negative par/on-hand value is unsafe for automated conclusions.";
  return undefined;
}

function findInvoiceMatches(product: NormalizedParProduct, invoicesInput: BeverageVarianceInvoiceInput[]): InvoiceLineEvidence[] {
  const productKey = normalizeProductKey(product.productName);
  return invoicesInput.flatMap((invoice) => {
    if (invoice.category && invoice.category !== product.category) return [];
    const items = normalizeInvoiceItems(invoice.items);
    return items.filter((item) => isLikelySameProduct(productKey, normalizeProductKey(item.itemName))).map((item) => ({
      invoiceId: invoice.id,
      vendorName: invoice.vendorName ?? product.vendor,
      itemName: item.itemName,
      quantity: item.quantity,
      unitCost: item.unitCost,
      totalCost: item.totalCost,
    }));
  });
}

function findSalesMatches(product: NormalizedParProduct, salesInput: BeverageVarianceSalesInput[]): SalesLineEvidence[] {
  const productKey = normalizeProductKey(product.productName);
  return salesInput
    .filter((entry) => !entry.category || entry.category === product.category)
    .filter((entry) => isLikelySameProduct(productKey, normalizeProductKey(entry.itemName)))
    .map((entry) => ({
      productMixId: entry.id,
      itemName: entry.itemName,
      quantity: toNumber(entry.totalQty) ?? 0,
      amount: toNumber(entry.totalAmount),
      sourceFile: entry.sourceFile,
    }))
    .filter((entry) => entry.quantity > 0);
}

function normalizeInvoiceItems(items: unknown): Array<{ itemName: string; quantity: number; unitCost?: number; totalCost?: number }> {
  if (!Array.isArray(items)) return [];
  return items.flatMap((raw) => {
    if (typeof raw !== "object" || raw === null) return [];
    const row = raw as Record<string, unknown>;
    const itemName = firstString(row, ["item", "itemName", "product", "productName", "description", "name"]);
    if (!itemName) return [];
    const quantity = firstNumber(row, ["quantity", "qty", "caseQty", "orderedQuantity", "received", "count"]) ?? 0;
    const totalCost = firstNumber(row, ["total", "lineTotal", "amount", "extendedCost", "extended"]);
    const unitCost = firstNumber(row, ["unitCost", "price", "unitPrice", "cost"]) ?? (totalCost && quantity > 0 ? totalCost / quantity : undefined);
    if (quantity <= 0) return [];
    return [{ itemName, quantity, unitCost, totalCost }];
  });
}

function chooseUnitCost(product: NormalizedParProduct, invoiceMatches: InvoiceLineEvidence[]): number | undefined {
  if (product.unitCost && product.unitCost > 0) return product.unitCost;
  const costs = invoiceMatches.map((line) => line.unitCost).filter((value): value is number => typeof value === "number" && value > 0);
  if (costs.length === 0) return undefined;
  return round(costs.reduce((sum, value) => sum + value, 0) / costs.length);
}

function buildFindingReason(actualVariance: number, category: BeverageCategory): string {
  const direction = actualVariance < 0 ? "short" : "over";
  return `${category} count is ${direction} versus par + orders - POS sales. Review pour/comp/waste/invoice evidence before acting.`;
}

function normalizeProductKey(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
}

function isLikelySameProduct(left: string[], right: string[]): boolean {
  if (left.length === 0 || right.length === 0) return false;
  const overlap = left.filter((token) => right.includes(token));
  const minTokenCount = Math.min(left.length, right.length);
  return overlap.length >= Math.min(2, minTokenCount) || (minTokenCount === 1 && overlap.length === 1);
}

function firstString(row: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return undefined;
}

function firstNumber(row: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const parsed = toNumber(row[key]);
    if (parsed !== undefined) return parsed;
  }
  return undefined;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace(/[$,]/g, ""));
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

const STOP_WORDS = new Set(["the", "and", "with", "bottle", "case", "pack", "draft", "beer", "liquor", "vodka", "whiskey", "rum", "gin", "tequila"]);
