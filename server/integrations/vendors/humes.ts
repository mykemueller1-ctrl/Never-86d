import type { ParsedVendorLineItem } from "./pfs";

export const HUMES_PARSER_VERSION = "humes-invoice-v1";
export const HUMES_VENDOR_NAME = "Humes Distributing";
export const HUMES_SENDER = "accountspayable@humesdist.com";
export const HUMES_MAILBOX = "myke@n86.app";

export type ParsedHumesInvoice = {
  vendorName: typeof HUMES_VENDOR_NAME;
  parserVersion: typeof HUMES_PARSER_VERSION;
  confidence: number;
  needsReview: boolean;
  warnings: string[];
  invoiceNumber?: string;
  date?: Date;
  totalAmount?: string;
  category: "beer" | "liquor" | "supplies" | "misc";
  items: ParsedVendorLineItem[];
  rawText: string;
};

function money(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const parsed = Number.parseFloat(value.replace(/[$,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed.toFixed(2) : undefined;
}

function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function first(patterns: RegExp[], text: string): string | undefined {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]?.trim()) return match[1].trim();
  }
  return undefined;
}

function inferCategory(
  items: ParsedVendorLineItem[]
): ParsedHumesInvoice["category"] {
  const haystack = items.map(item => item.product.toLowerCase()).join(" ");
  if (/beer|lager|ale|ipa|stout|seltzer|cider|keg/.test(haystack))
    return "beer";
  if (
    /vodka|whiskey|whisky|bourbon|tequila|rum|gin|liqueur|liquor|spirit/.test(
      haystack
    )
  )
    return "liquor";
  if (/suppl|deposit|tap|co2/.test(haystack)) return "supplies";
  return "misc";
}

function parseLineItems(text: string): ParsedVendorLineItem[] {
  const items: ParsedVendorLineItem[] = [];
  for (const rawLine of text.split(/\n+/)) {
    const line = rawLine.trim().replace(/\s{2,}/g, " ");
    const match = line.match(
      /^(?:(\d{3,})\s+)?(.{4,}?)\s+(\d+(?:\.\d+)?)\s*(CASE|CS|EA|BTL|BOTTLE|KEG|PK|CAN|BBL)?\s+(?:\$?([\d,]+\.\d{2})\s+)?\$?([\d,]+\.\d{2})$/i
    );
    if (!match) continue;
    const product = match[2].trim();
    if (/invoice|subtotal|total|tax|balance|amount|payment/i.test(product))
      continue;
    items.push({
      sku: match[1],
      product,
      quantity: Number.parseFloat(match[3]),
      unit: match[4]?.toUpperCase(),
      unitPrice: money(match[5]),
      total: money(match[6]),
    });
  }
  return items;
}

/**
 * Parse Humes invoice text sourced from Outlook attachments. Humes usually sends
 * twice weekly invoices, so invoice number + source message/attachment hash are
 * used upstream as the dedupe boundary.
 */
export function parseHumesInvoice(rawText: string): ParsedHumesInvoice {
  const text = rawText.replace(/\r\n/g, "\n").trim();
  const invoiceNumber = first(
    [
      /invoice\s*(?:number|no\.?|#)\s*[:#]?\s*([A-Z0-9-]+)/i,
      /inv\s*#\s*([A-Z0-9-]+)/i,
    ],
    text
  );
  const dateText = first(
    [
      /invoice\s*date\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
      /date\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
    ],
    text
  );
  const totalAmount = money(
    first(
      [
        /(?:invoice|grand|amount due)\s*total\s*:?\s*\$?([\d,]+\.\d{2})/i,
        /balance\s*due\s*:?\s*\$?([\d,]+\.\d{2})/i,
        /total\s*:?\s*\$?([\d,]+\.\d{2})/i,
      ],
      text
    )
  );
  const items = parseLineItems(text);
  const warnings: string[] = [];
  if (!invoiceNumber) warnings.push("Missing Humes invoice number");
  if (!dateText) warnings.push("Missing Humes invoice date");
  if (!totalAmount) warnings.push("Missing Humes total amount");
  if (items.length === 0) warnings.push("No Humes line items parsed");

  const checks = [
    invoiceNumber,
    dateText,
    totalAmount,
    items.length > 0 ? "items" : undefined,
  ];
  const confidence = Number(
    (checks.filter(Boolean).length / checks.length).toFixed(3)
  );

  return {
    vendorName: HUMES_VENDOR_NAME,
    parserVersion: HUMES_PARSER_VERSION,
    confidence,
    needsReview: confidence < 0.75 || warnings.length > 1,
    warnings,
    invoiceNumber,
    date: parseDate(dateText),
    totalAmount,
    category: inferCategory(items),
    items,
    rawText: text,
  };
}
