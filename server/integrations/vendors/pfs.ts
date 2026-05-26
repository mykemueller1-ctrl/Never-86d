export const PFS_PARSER_VERSION = "pfs-order-confirmation-v1";
export const PFS_VENDOR_NAME = "Performance Foodservice";
export const PFS_SENDER = "NoReply@pfgc.com";

export type ParsedVendorLineItem = {
  sku?: string;
  product: string;
  quantity?: number;
  unit?: string;
  unitPrice?: string;
  total?: string;
};

export type ParsedPfsOrderConfirmation = {
  vendorName: typeof PFS_VENDOR_NAME;
  parserVersion: typeof PFS_PARSER_VERSION;
  confidence: number;
  needsReview: boolean;
  warnings: string[];
  invoiceNumber?: string;
  orderNumber?: string;
  date?: Date;
  totalAmount?: string;
  category:
    | "meat"
    | "bread"
    | "produce"
    | "liquor"
    | "beer"
    | "supplies"
    | "misc";
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
): ParsedPfsOrderConfirmation["category"] {
  const haystack = items.map(item => item.product.toLowerCase()).join(" ");
  if (/beef|pork|chicken|sausage|pepperoni|bacon|meat/.test(haystack))
    return "meat";
  if (/bun|bread|roll|dough|flour/.test(haystack)) return "bread";
  if (/lettuce|tomato|onion|pepper|produce|vegetable|fruit/.test(haystack))
    return "produce";
  if (/cleaner|glove|napkin|box|container|suppl/.test(haystack))
    return "supplies";
  return "misc";
}

function parseLineItems(text: string): ParsedVendorLineItem[] {
  const lines = text
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean);
  const items: ParsedVendorLineItem[] = [];

  for (const line of lines) {
    // PFS confirmations usually contain SKU, product, quantity, unit, price, and
    // extended total on a single row. This regex intentionally accepts missing
    // SKU/unit-price so layout changes route to review rather than crashing.
    const match = line.match(
      /^(?:(\d{4,})\s+)?(.{4,}?)\s+(\d+(?:\.\d+)?)\s*(CS|EA|LB|CA|BX|PK|GAL|OZ|CT)?\s+(?:\$?([\d,]+\.\d{2})\s+)?\$?([\d,]+\.\d{2})$/i
    );
    if (!match) continue;
    const product = match[2].replace(/\s{2,}/g, " ").trim();
    if (/subtotal|total|tax|amount/i.test(product)) continue;
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

export function parsePfsOrderConfirmation(
  rawText: string
): ParsedPfsOrderConfirmation {
  const text = rawText.replace(/\r\n/g, "\n");
  const orderNumber = first(
    [
      /order\s*(?:number|#)\s*[:#]?\s*([A-Z0-9-]+)/i,
      /confirmation\s*(?:number|#)\s*[:#]?\s*([A-Z0-9-]+)/i,
    ],
    text
  );
  const invoiceNumber =
    first([/invoice\s*(?:number|#)\s*[:#]?\s*([A-Z0-9-]+)/i], text) ??
    orderNumber;
  const dateText = first(
    [
      /(?:order|delivery|invoice)\s*date\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
      /date\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
    ],
    text
  );
  const totalAmount = money(
    first(
      [
        /(?:order|invoice|grand)\s*total\s*:?\s*\$?([\d,]+\.\d{2})/i,
        /total\s*:?\s*\$?([\d,]+\.\d{2})/i,
      ],
      text
    )
  );
  const items = parseLineItems(text);
  const warnings: string[] = [];
  if (!invoiceNumber) warnings.push("Missing PFS order/invoice number");
  if (!dateText) warnings.push("Missing PFS order date");
  if (!totalAmount) warnings.push("Missing PFS total amount");
  if (items.length === 0) warnings.push("No PFS line items parsed");

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
    vendorName: PFS_VENDOR_NAME,
    parserVersion: PFS_PARSER_VERSION,
    confidence,
    needsReview: confidence < 0.75 || warnings.length > 1,
    warnings,
    invoiceNumber,
    orderNumber,
    date: parseDate(dateText),
    totalAmount,
    category: inferCategory(items),
    items,
    rawText: text.trim(),
  };
}
