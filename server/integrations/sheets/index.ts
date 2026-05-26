import { createSign } from "crypto";

const SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";
const DEFAULT_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";

export type SheetCellValue = string | number | boolean | null;

export interface SheetRangeResult {
  spreadsheetId: string;
  range: string;
  majorDimension: "ROWS" | "COLUMNS";
  values: SheetCellValue[][];
}

export interface SheetMetadata {
  spreadsheetId: string;
  title?: string;
  sheets: Array<{
    title: string;
    sheetId: number;
    rowCount?: number;
    columnCount?: number;
  }>;
}

export interface GoogleSheetsClientOptions {
  apiKey?: string;
  serviceAccountEmail?: string;
  serviceAccountPrivateKey?: string;
  serviceAccountJson?: string;
  scopes?: string[];
  fetchImpl?: typeof fetch;
}

interface ServiceAccountJson {
  client_email?: string;
  private_key?: string;
}

interface CachedToken {
  accessToken: string;
  expiresAtMs: number;
}

/**
 * Thin Google Sheets REST client used by scheduled jobs.
 *
 * The helper intentionally avoids a large Google SDK dependency. It supports either:
 * 1. GOOGLE_SHEETS_API_KEY for public/read-shared sheets; or
 * 2. GOOGLE_SERVICE_ACCOUNT_JSON / GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
 *    for private spreadsheets shared with a service-account email.
 */
export class GoogleSheetsClient {
  private readonly apiKey?: string;
  private readonly serviceAccountEmail?: string;
  private readonly serviceAccountPrivateKey?: string;
  private readonly scopes: string[];
  private readonly fetchImpl: typeof fetch;
  private cachedToken: CachedToken | null = null;

  constructor(options: GoogleSheetsClientOptions = {}) {
    const parsedServiceAccount = parseServiceAccountJson(options.serviceAccountJson ?? process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    this.apiKey = options.apiKey ?? process.env.GOOGLE_SHEETS_API_KEY ?? process.env.GOOGLE_API_KEY;
    this.serviceAccountEmail =
      options.serviceAccountEmail ??
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ??
      parsedServiceAccount?.client_email;
    this.serviceAccountPrivateKey = normalizePrivateKey(
      options.serviceAccountPrivateKey ??
        process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ??
        parsedServiceAccount?.private_key,
    );
    this.scopes = options.scopes ?? [DEFAULT_SCOPE];
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  static fromEnv(): GoogleSheetsClient {
    return new GoogleSheetsClient();
  }

  async getMetadata(spreadsheetId: string): Promise<SheetMetadata> {
    const response = await this.request<Record<string, unknown>>(
      `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}?fields=spreadsheetId,properties.title,sheets.properties`,
    );

    const sheets = Array.isArray(response.sheets) ? response.sheets : [];
    return {
      spreadsheetId: String(response.spreadsheetId ?? spreadsheetId),
      title: getNestedString(response, ["properties", "title"]),
      sheets: sheets.map((sheet) => {
        const properties = isRecord(sheet) && isRecord(sheet.properties) ? sheet.properties : {};
        const grid = isRecord(properties.gridProperties) ? properties.gridProperties : {};
        return {
          title: String(properties.title ?? ""),
          sheetId: Number(properties.sheetId ?? 0),
          rowCount: toOptionalNumber(grid.rowCount),
          columnCount: toOptionalNumber(grid.columnCount),
        };
      }).filter((sheet) => sheet.title.length > 0),
    };
  }

  async readRange(
    spreadsheetId: string,
    range: string,
    options: { majorDimension?: "ROWS" | "COLUMNS"; valueRenderOption?: "FORMATTED_VALUE" | "UNFORMATTED_VALUE" | "FORMULA" } = {},
  ): Promise<SheetRangeResult> {
    const params = new URLSearchParams({
      majorDimension: options.majorDimension ?? "ROWS",
      valueRenderOption: options.valueRenderOption ?? "UNFORMATTED_VALUE",
    });
    const response = await this.request<Record<string, unknown>>(
      `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}?${params.toString()}`,
    );

    return {
      spreadsheetId,
      range: String(response.range ?? range),
      majorDimension: response.majorDimension === "COLUMNS" ? "COLUMNS" : "ROWS",
      values: normalizeValues(response.values),
    };
  }

  async readRanges(
    spreadsheetId: string,
    ranges: string[],
    options: { valueRenderOption?: "FORMATTED_VALUE" | "UNFORMATTED_VALUE" | "FORMULA" } = {},
  ): Promise<SheetRangeResult[]> {
    if (ranges.length === 0) return [];
    const params = new URLSearchParams({ valueRenderOption: options.valueRenderOption ?? "UNFORMATTED_VALUE" });
    ranges.forEach((range) => params.append("ranges", range));
    const response = await this.request<Record<string, unknown>>(
      `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}/values:batchGet?${params.toString()}`,
    );
    const valueRanges = Array.isArray(response.valueRanges) ? response.valueRanges : [];
    return valueRanges.map((valueRange, index) => {
      const record = isRecord(valueRange) ? valueRange : {};
      return {
        spreadsheetId,
        range: String(record.range ?? ranges[index] ?? ""),
        majorDimension: record.majorDimension === "COLUMNS" ? "COLUMNS" : "ROWS",
        values: normalizeValues(record.values),
      };
    });
  }

  private async request<T>(url: string): Promise<T> {
    const requestUrl = await this.withAuthentication(url);
    const headers: Record<string, string> = { Accept: "application/json" };
    const token = await this.getAccessTokenIfConfigured();
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await this.fetchImpl(requestUrl, { headers });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Google Sheets request failed (${response.status} ${response.statusText}): ${body.slice(0, 1000)}`);
    }
    return (await response.json()) as T;
  }

  private async withAuthentication(url: string): Promise<string> {
    if (!this.apiKey || this.hasServiceAccountCredentials()) return url;
    const parsed = new URL(url);
    parsed.searchParams.set("key", this.apiKey);
    return parsed.toString();
  }

  private hasServiceAccountCredentials(): boolean {
    return Boolean(this.serviceAccountEmail && this.serviceAccountPrivateKey);
  }

  private async getAccessTokenIfConfigured(): Promise<string | null> {
    if (!this.hasServiceAccountCredentials()) return null;
    const now = Date.now();
    if (this.cachedToken && this.cachedToken.expiresAtMs - 60_000 > now) return this.cachedToken.accessToken;

    const iat = Math.floor(now / 1000);
    const exp = iat + 3600;
    const assertionHeader = base64UrlJson({ alg: "RS256", typ: "JWT" });
    const assertionClaim = base64UrlJson({
      iss: this.serviceAccountEmail,
      scope: this.scopes.join(" "),
      aud: "https://oauth2.googleapis.com/token",
      iat,
      exp,
    });
    const unsignedJwt = `${assertionHeader}.${assertionClaim}`;
    const signer = createSign("RSA-SHA256");
    signer.update(unsignedJwt);
    signer.end();
    const signature = signer.sign(this.serviceAccountPrivateKey as string).toString("base64url");
    const assertion = `${unsignedJwt}.${signature}`;

    const tokenResponse = await this.fetchImpl("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const body = await tokenResponse.text().catch(() => "");
      throw new Error(`Google service account auth failed (${tokenResponse.status}): ${body.slice(0, 1000)}`);
    }

    const tokenJson = (await tokenResponse.json()) as { access_token?: string; expires_in?: number };
    if (!tokenJson.access_token) throw new Error("Google service account auth did not return an access token");
    this.cachedToken = {
      accessToken: tokenJson.access_token,
      expiresAtMs: now + Math.max(1, tokenJson.expires_in ?? 3600) * 1000,
    };
    return this.cachedToken.accessToken;
  }
}

export function quoteSheetName(title: string): string {
  return `'${title.replace(/'/g, "''")}'`;
}

export function rowsToObjects(rows: SheetCellValue[][], headerRowIndex = 0): Array<Record<string, SheetCellValue>> {
  const headers = (rows[headerRowIndex] ?? []).map((value, index) => normalizeHeader(String(value ?? `column_${index + 1}`)) || `column_${index + 1}`);
  return rows.slice(headerRowIndex + 1).map((row) => {
    const record: Record<string, SheetCellValue> = {};
    headers.forEach((header, index) => {
      record[header] = row[index] ?? null;
    });
    return record;
  });
}

export function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function cellToString(value: SheetCellValue | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export function cellToNumber(value: SheetCellValue | undefined): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "boolean" || value === null || value === undefined) return undefined;
  const cleaned = String(value).replace(/[$,%]/g, "").replace(/,/g, "").trim();
  if (!cleaned) return undefined;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseServiceAccountJson(raw: string | undefined): ServiceAccountJson | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ServiceAccountJson;
    return parsed;
  } catch {
    return null;
  }
}

function normalizePrivateKey(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  return raw.replace(/\\n/g, "\n");
}

function base64UrlJson(payload: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function normalizeValues(value: unknown): SheetCellValue[][] {
  if (!Array.isArray(value)) return [];
  return value.map((row) => {
    if (!Array.isArray(row)) return [];
    return row.map((cell) => {
      if (typeof cell === "string" || typeof cell === "number" || typeof cell === "boolean") return cell;
      if (cell === null || cell === undefined) return null;
      return String(cell);
    });
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getNestedString(record: Record<string, unknown>, path: string[]): string | undefined {
  let current: unknown = record;
  for (const key of path) {
    if (!isRecord(current)) return undefined;
    current = current[key];
  }
  return typeof current === "string" ? current : undefined;
}

function toOptionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return undefined;
}
