import {
  GoogleSheetsClient,
  type SheetCellValue,
  cellToNumber,
  cellToString,
  normalizeHeader,
  quoteSheetName,
} from "./index";

export const ASHLEY_PAR_SHEET_ID = "1_gAesi5ufLOHsQ_uan3PEfzcOaVg4gxP8P7F_YHMHbU";
export const ASHLEY_PAR_TABS = { liquor: "Liquor", beer: "Beer" } as const;

export type BeverageCategory = "liquor" | "beer";
export type NormalizationConfidence = "high" | "medium" | "low";

export interface NormalizedParProduct {
  sourceSpreadsheetId: string;
  sourceSheet: string;
  sourceRange: string;
  rowNumber: number;
  category: BeverageCategory;
  productName: string;
  vendor?: string;
  sku?: string;
  unit?: string;
  parLevel?: number;
  onHandQuantity?: number;
  orderQuantity?: number;
  orderedQuantity?: number;
  unitCost?: number;
  extendedCost?: number;
  notes?: string;
  confidence: NormalizationConfidence;
  evidence: {
    headers: string[];
    rawRow: SheetCellValue[];
    mappedFields: string[];
  };
}

export interface ParNormalizationIssue {
  sourceSheet: string;
  rowNumber: number;
  productName?: string;
  issue: string;
  evidence: SheetCellValue[];
}

export interface ParNormalizationReport {
  generatedAt: string;
  spreadsheetId: string;
  totalProducts: number;
  liquorProducts: number;
  beerProducts: number;
  beerRowsNeedingParNormalization: number;
  issues: ParNormalizationIssue[];
  nextAction: string;
}

export interface AshleyParSheetSnapshot {
  spreadsheetId: string;
  fetchedAt: string;
  products: NormalizedParProduct[];
  report: ParNormalizationReport;
}

interface HeaderMatch {
  headerRowIndex: number;
  headers: string[];
  indexByCanonicalField: Partial<Record<CanonicalParField, number>>;
}

type CanonicalParField =
  | "productName"
  | "vendor"
  | "sku"
  | "unit"
  | "parLevel"
  | "onHandQuantity"
  | "orderQuantity"
  | "orderedQuantity"
  | "unitCost"
  | "extendedCost"
  | "notes";

const FIELD_ALIASES: Record<CanonicalParField, string[]> = {
  productName: ["product", "product_name", "item", "item_name", "name", "description", "brand", "liquor", "beer"],
  vendor: ["vendor", "distributor", "supplier"],
  sku: ["sku", "item_number", "item_#", "vendor_sku", "code"],
  unit: ["unit", "uom", "size", "pack", "case", "bottle_size"],
  parLevel: ["par", "par_level", "target_par", "target", "keep", "stock", "stock_level"],
  onHandQuantity: ["on_hand", "count", "inventory", "qty_on_hand", "quantity_on_hand", "current", "current_count"],
  orderQuantity: ["to_order", "order", "order_qty", "qty_to_order", "need", "needed"],
  orderedQuantity: ["ordered", "ordered_qty", "order_quantity", "qty_ordered", "received", "case_qty"],
  unitCost: ["cost", "unit_cost", "price", "unit_price", "last_cost", "case_cost"],
  extendedCost: ["total", "extended", "extended_cost", "line_total", "amount"],
  notes: ["notes", "note", "comments", "comment", "status"],
};

/**
 * Reads Ashley's canonical par workbook and returns a normalized beverage product list.
 * Liquor rows can be used directly when product + par evidence is present.
 * Beer rows are deliberately treated as review-first when par evidence is missing because the source tab mixes order/cost data and notes.
 */
export async function readAshleyParSheet(
  client = GoogleSheetsClient.fromEnv(),
  spreadsheetId = ASHLEY_PAR_SHEET_ID,
): Promise<AshleyParSheetSnapshot> {
  const [liquorRange, beerRange] = await client.readRanges(spreadsheetId, [
    `${quoteSheetName(ASHLEY_PAR_TABS.liquor)}!A1:Z1000`,
    `${quoteSheetName(ASHLEY_PAR_TABS.beer)}!A1:Z1000`,
  ]);

  const liquorProducts = parseParTab({
    spreadsheetId,
    sheetName: ASHLEY_PAR_TABS.liquor,
    category: "liquor",
    rows: liquorRange?.values ?? [],
    sourceRange: liquorRange?.range ?? `${ASHLEY_PAR_TABS.liquor}!A1:Z1000`,
  });
  const beerProducts = parseParTab({
    spreadsheetId,
    sheetName: ASHLEY_PAR_TABS.beer,
    category: "beer",
    rows: beerRange?.values ?? [],
    sourceRange: beerRange?.range ?? `${ASHLEY_PAR_TABS.beer}!A1:Z1000`,
  });
  const products = [...liquorProducts, ...beerProducts];
  const report = buildParNormalizationReport(spreadsheetId, products);

  return {
    spreadsheetId,
    fetchedAt: new Date().toISOString(),
    products,
    report,
  };
}

export function parseParTab(input: {
  spreadsheetId: string;
  sheetName: string;
  category: BeverageCategory;
  rows: SheetCellValue[][];
  sourceRange: string;
}): NormalizedParProduct[] {
  const headerMatch = findHeaderRow(input.rows);
  const dataRows = input.rows.slice(headerMatch.headerRowIndex + 1);

  return dataRows.flatMap((row, index) => {
    const rowNumber = headerMatch.headerRowIndex + index + 2;
    if (isBlankRow(row)) return [];
    const product = normalizeParRow({ ...input, row, rowNumber, headerMatch });
    return product ? [product] : [];
  });
}

export function buildParNormalizationReport(
  spreadsheetId: string,
  products: NormalizedParProduct[],
): ParNormalizationReport {
  const issues: ParNormalizationIssue[] = [];

  for (const product of products) {
    if (!product.productName) {
      issues.push({
        sourceSheet: product.sourceSheet,
        rowNumber: product.rowNumber,
        issue: "Missing product name after normalization.",
        evidence: product.evidence.rawRow,
      });
    }
    if (product.category === "beer" && product.parLevel === undefined) {
      issues.push({
        sourceSheet: product.sourceSheet,
        rowNumber: product.rowNumber,
        productName: product.productName,
        issue: "Beer row has order/cost evidence but no explicit par field. Keep this as review-only until Ashley confirms par values.",
        evidence: product.evidence.rawRow,
      });
    }
    if (product.parLevel !== undefined && product.parLevel < 0) {
      issues.push({
        sourceSheet: product.sourceSheet,
        rowNumber: product.rowNumber,
        productName: product.productName,
        issue: "Par level is negative, which is unsafe for automated conclusions.",
        evidence: product.evidence.rawRow,
      });
    }
  }

  const beerRowsNeedingParNormalization = issues.filter((issue) => issue.sourceSheet === ASHLEY_PAR_TABS.beer).length;
  return {
    generatedAt: new Date().toISOString(),
    spreadsheetId,
    totalProducts: products.length,
    liquorProducts: products.filter((product) => product.category === "liquor").length,
    beerProducts: products.filter((product) => product.category === "beer").length,
    beerRowsNeedingParNormalization,
    issues,
    nextAction:
      beerRowsNeedingParNormalization > 0
        ? "Review Beer tab rows and add/confirm explicit product-level par values before automated beer variance conclusions."
        : "Beer tab has explicit par evidence for all parsed rows; automated variance can use high-confidence rows only.",
  };
}

function normalizeParRow(input: {
  spreadsheetId: string;
  sheetName: string;
  sourceRange: string;
  category: BeverageCategory;
  row: SheetCellValue[];
  rowNumber: number;
  headerMatch: HeaderMatch;
}): NormalizedParProduct | null {
  const get = (field: CanonicalParField): SheetCellValue | undefined => {
    const index = input.headerMatch.indexByCanonicalField[field];
    return index === undefined ? undefined : input.row[index];
  };

  const productName = cellToString(get("productName")) || inferProductName(input.row);
  if (!productName || looksLikeSectionLabel(productName)) return null;

  const parLevel = cellToNumber(get("parLevel"));
  const onHandQuantity = cellToNumber(get("onHandQuantity"));
  const orderQuantity = cellToNumber(get("orderQuantity"));
  const orderedQuantity = cellToNumber(get("orderedQuantity"));
  const unitCost = cellToNumber(get("unitCost"));
  const extendedCost = cellToNumber(get("extendedCost"));
  const mappedFields = Object.entries(input.headerMatch.indexByCanonicalField)
    .filter(([, columnIndex]) => columnIndex !== undefined && !isEmptyCell(input.row[columnIndex]))
    .map(([field]) => field);

  const hasParEvidence = parLevel !== undefined;
  const hasOrderOrCostEvidence = [orderQuantity, orderedQuantity, unitCost, extendedCost].some((value) => value !== undefined);
  const confidence: NormalizationConfidence =
    productName && hasParEvidence
      ? "high"
      : productName && (input.category === "beer" ? hasOrderOrCostEvidence : onHandQuantity !== undefined)
        ? "medium"
        : "low";

  return {
    sourceSpreadsheetId: input.spreadsheetId,
    sourceSheet: input.sheetName,
    sourceRange: input.sourceRange,
    rowNumber: input.rowNumber,
    category: input.category,
    productName,
    vendor: nonEmptyString(get("vendor")),
    sku: nonEmptyString(get("sku")),
    unit: nonEmptyString(get("unit")),
    parLevel,
    onHandQuantity,
    orderQuantity,
    orderedQuantity,
    unitCost,
    extendedCost,
    notes: nonEmptyString(get("notes")) ?? inferNotes(input.row, input.headerMatch),
    confidence,
    evidence: {
      headers: input.headerMatch.headers,
      rawRow: input.row,
      mappedFields,
    },
  };
}

function findHeaderRow(rows: SheetCellValue[][]): HeaderMatch {
  let best: HeaderMatch = { headerRowIndex: 0, headers: [], indexByCanonicalField: {} };
  let bestScore = -1;
  const searchRows = rows.slice(0, Math.min(15, rows.length));

  searchRows.forEach((row, rowIndex) => {
    const headers = row.map((cell) => normalizeHeader(cellToString(cell)));
    const indexByCanonicalField: Partial<Record<CanonicalParField, number>> = {};
    let score = 0;

    for (const field of Object.keys(FIELD_ALIASES) as CanonicalParField[]) {
      const columnIndex = headers.findIndex((header) => FIELD_ALIASES[field].includes(header));
      if (columnIndex >= 0) {
        indexByCanonicalField[field] = columnIndex;
        score += field === "productName" || field === "parLevel" ? 3 : 1;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      best = { headerRowIndex: rowIndex, headers, indexByCanonicalField };
    }
  });

  if (bestScore < 3) {
    const firstNonBlank = rows.findIndex((row) => !isBlankRow(row));
    const headerRowIndex = firstNonBlank >= 0 ? firstNonBlank : 0;
    const headers = (rows[headerRowIndex] ?? []).map((cell, index) => normalizeHeader(cellToString(cell)) || `column_${index + 1}`);
    return {
      headerRowIndex,
      headers,
      indexByCanonicalField: {
        productName: 0,
        parLevel: findFirstNumericColumn(rows.slice(headerRowIndex + 1)),
      },
    };
  }

  return best;
}

function inferProductName(row: SheetCellValue[]): string {
  for (const cell of row) {
    const value = cellToString(cell);
    if (value && Number.isNaN(Number(value.replace(/[$,]/g, ""))) && !looksLikeSectionLabel(value)) return value;
  }
  return "";
}

function inferNotes(row: SheetCellValue[], headerMatch: HeaderMatch): string | undefined {
  const mappedIndexes = new Set(Object.values(headerMatch.indexByCanonicalField).filter((value): value is number => value !== undefined));
  const noteParts = row
    .map((cell, index) => ({ cell, index }))
    .filter(({ cell, index }) => !mappedIndexes.has(index) && cellToString(cell).length > 0 && cellToNumber(cell) === undefined)
    .map(({ cell }) => cellToString(cell));
  return noteParts.length > 0 ? noteParts.join(" | ") : undefined;
}

function findFirstNumericColumn(rows: SheetCellValue[][]): number | undefined {
  const counts = new Map<number, number>();
  rows.slice(0, 25).forEach((row) => {
    row.forEach((cell, index) => {
      if (cellToNumber(cell) !== undefined) counts.set(index, (counts.get(index) ?? 0) + 1);
    });
  });
  const sorted = Array.from(counts.entries()).filter(([index]) => index > 0).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0];
}

function isBlankRow(row: SheetCellValue[]): boolean {
  return row.every((cell) => isEmptyCell(cell));
}

function isEmptyCell(cell: SheetCellValue | undefined): boolean {
  return cell === undefined || cell === null || cellToString(cell) === "";
}

function nonEmptyString(cell: SheetCellValue | undefined): string | undefined {
  const value = cellToString(cell);
  return value.length > 0 ? value : undefined;
}

function looksLikeSectionLabel(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return ["liquor", "beer", "total", "totals", "vendor", "order", "orders", "inventory"].includes(normalized);
}
