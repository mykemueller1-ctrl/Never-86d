import {
  GoogleSheetsClient,
  type SheetCellValue,
  cellToNumber,
  cellToString,
  normalizeHeader,
  quoteSheetName,
  rowsToObjects,
} from "./index";

export const SALES_HUB_SHEET_ID = "1cfOh5clTKNlwWZwTSOrUbZyWO92BDTSD1_qzNvvNNKs";

export interface SalesHubRow {
  sourceSpreadsheetId: string;
  sourceSheet: string;
  rowNumber: number;
  businessDate?: string;
  vendorName?: string;
  invoiceNumber?: string;
  productName?: string;
  category?: string;
  quantity?: number;
  amount?: number;
  status?: string;
  raw: Record<string, SheetCellValue>;
}

export interface SalesHubSheetSnapshot {
  title: string;
  range: string;
  rowCount: number;
  headers: string[];
  records: SalesHubRow[];
}

export interface SalesHubReconciliationSnapshot {
  spreadsheetId: string;
  fetchedAt: string;
  sheets: SalesHubSheetSnapshot[];
  totals: {
    sheetCount: number;
    rowCount: number;
    invoiceLikeRows: number;
    salesLikeRows: number;
  };
}

export interface SalesHubReadOptions {
  spreadsheetId?: string;
  sheetTitles?: string[];
  maxRowsPerSheet?: number;
  client?: GoogleSheetsClient;
}

/**
 * Reads the CTAP Daily Sales & Invoice Hub as a source-control workbook.
 * This function does not write back to the app database; scheduled jobs compare these rows against DB facts and report discrepancies.
 */
export async function readSalesHubReconciliationData(
  options: SalesHubReadOptions = {},
): Promise<SalesHubReconciliationSnapshot> {
  const client = options.client ?? GoogleSheetsClient.fromEnv();
  const spreadsheetId = options.spreadsheetId ?? SALES_HUB_SHEET_ID;
  const metadata = await client.getMetadata(spreadsheetId);
  const sheetTitles = (options.sheetTitles?.length ? options.sheetTitles : metadata.sheets.map((sheet) => sheet.title))
    .filter((title) => !title.toLowerCase().includes("archive"));
  const maxRows = options.maxRowsPerSheet ?? 1000;
  const ranges = sheetTitles.map((title) => `${quoteSheetName(title)}!A1:Z${maxRows}`);
  const rangeResults = await client.readRanges(spreadsheetId, ranges);

  const sheets = rangeResults.map((result, index) => {
    const title = sheetTitles[index] ?? result.range.split("!")[0]?.replace(/^'|'$/g, "") ?? `Sheet ${index + 1}`;
    const headerRowIndex = findHeaderRow(result.values);
    const headers = (result.values[headerRowIndex] ?? []).map((cell, cellIndex) => normalizeHeader(cellToString(cell)) || `column_${cellIndex + 1}`);
    const objects = rowsToObjects(result.values, headerRowIndex);
    const records = objects.flatMap((record, rowIndex) => {
      const rowNumber = headerRowIndex + rowIndex + 2;
      if (Object.values(record).every((value) => cellToString(value).length === 0)) return [];
      return [normalizeHubRecord(spreadsheetId, title, rowNumber, record)];
    });

    return {
      title,
      range: result.range,
      rowCount: records.length,
      headers,
      records,
    };
  });

  const allRows = sheets.flatMap((sheet) => sheet.records);
  return {
    spreadsheetId,
    fetchedAt: new Date().toISOString(),
    sheets,
    totals: {
      sheetCount: sheets.length,
      rowCount: allRows.length,
      invoiceLikeRows: allRows.filter((row) => row.vendorName || row.invoiceNumber).length,
      salesLikeRows: allRows.filter((row) => row.businessDate && row.amount !== undefined && !row.vendorName).length,
    },
  };
}

function normalizeHubRecord(
  spreadsheetId: string,
  sourceSheet: string,
  rowNumber: number,
  raw: Record<string, SheetCellValue>,
): SalesHubRow {
  return {
    sourceSpreadsheetId: spreadsheetId,
    sourceSheet,
    rowNumber,
    businessDate: pickDate(raw),
    vendorName: pickString(raw, ["vendor", "vendor_name", "supplier", "distributor"]),
    invoiceNumber: pickString(raw, ["invoice", "invoice_number", "invoice_#", "inv", "inv_#"]),
    productName: pickString(raw, ["product", "product_name", "item", "item_name", "description"]),
    category: pickString(raw, ["category", "cat", "department", "type"]),
    quantity: pickNumber(raw, ["qty", "quantity", "ordered", "count", "case_qty"]),
    amount: pickNumber(raw, ["amount", "total", "line_total", "grand_total", "sales", "cost"]),
    status: pickString(raw, ["status", "review_status", "validation", "notes"]),
    raw,
  };
}

function findHeaderRow(rows: SheetCellValue[][]): number {
  let bestIndex = 0;
  let bestScore = -1;
  rows.slice(0, Math.min(rows.length, 12)).forEach((row, index) => {
    const headers = row.map((cell) => normalizeHeader(cellToString(cell)));
    const score = headers.filter((header) =>
      ["date", "business_date", "vendor", "vendor_name", "invoice", "invoice_number", "total", "amount", "product", "item"].includes(header),
    ).length;
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });
  return bestIndex;
}

function pickString(record: Record<string, SheetCellValue>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = cellToString(record[key]);
    if (value) return value;
  }
  return undefined;
}

function pickNumber(record: Record<string, SheetCellValue>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = cellToNumber(record[key]);
    if (value !== undefined) return value;
  }
  return undefined;
}

function pickDate(record: Record<string, SheetCellValue>): string | undefined {
  const raw = pickString(record, ["business_date", "date", "invoice_date", "report_date", "day"]);
  if (!raw) return undefined;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toISOString().slice(0, 10);
}
