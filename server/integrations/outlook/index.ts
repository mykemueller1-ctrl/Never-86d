import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const execFileAsync = promisify(execFile);

export type OutlookAttachment = {
  id?: string;
  filename: string;
  mimeType?: string;
  size?: number;
  path?: string;
  dataBase64?: string;
};

export type OutlookMessage = {
  id: string;
  subject?: string;
  from?: string;
  to?: string;
  date?: string;
  bodyText?: string;
  bodyHtml?: string;
  attachments: OutlookAttachment[];
  raw?: unknown;
};

type McpResult = Record<string, unknown> | unknown[] | string | null;

async function callMcpTool(
  toolName: string,
  input: Record<string, unknown>
): Promise<McpResult> {
  const { stdout } = await execFileAsync(
    "manus-mcp-cli",
    [
      "tool",
      "call",
      toolName,
      "--server",
      "outlook-mail",
      "--input",
      JSON.stringify(input),
    ],
    { maxBuffer: 25 * 1024 * 1024 }
  );
  return parseMcpStdout(stdout);
}

function parseMcpStdout(stdout: string): McpResult {
  const trimmed = stdout.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    const objectStart = trimmed.indexOf("{");
    const arrayStart = trimmed.indexOf("[");
    const starts = [objectStart, arrayStart].filter(idx => idx >= 0);
    if (starts.length === 0) return trimmed;
    const start = Math.min(...starts);
    const end = Math.max(trimmed.lastIndexOf("}"), trimmed.lastIndexOf("]"));
    if (end <= start) return trimmed;
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return trimmed;
    }
  }
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  for (const key of ["messages", "items", "results", "data"]) {
    if (Array.isArray(record[key])) return record[key] as unknown[];
  }
  return [];
}

function pickString(
  record: Record<string, unknown>,
  keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}

function normalizeAttachment(value: unknown): OutlookAttachment | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const filename = pickString(record, ["filename", "name", "fileName"]);
  if (!filename) return null;
  return {
    id: pickString(record, ["id", "attachmentId", "attachment_id"]),
    filename,
    mimeType: pickString(record, [
      "mimeType",
      "mime_type",
      "contentType",
      "content_type",
    ]),
    size: typeof record.size === "number" ? record.size : undefined,
    path: pickString(record, [
      "path",
      "filePath",
      "file_path",
      "localPath",
      "local_path",
    ]),
    dataBase64: pickString(record, [
      "data",
      "dataBase64",
      "base64",
      "contentBytes",
    ]),
  };
}

function normalizeMessage(value: unknown): OutlookMessage | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const id = pickString(record, ["id", "messageId", "message_id"]);
  if (!id) return null;
  return {
    id,
    subject: pickString(record, ["subject"]),
    from: pickString(record, ["from", "sender"]),
    to: pickString(record, ["to", "recipient"]),
    date: pickString(record, ["date", "receivedAt", "received_at"]),
    bodyText: pickString(record, [
      "bodyText",
      "body_text",
      "text",
      "body",
      "plainText",
      "plain_text",
    ]),
    bodyHtml: pickString(record, ["bodyHtml", "body_html", "html"]),
    attachments: asArray(record.attachments)
      .map(normalizeAttachment)
      .filter(Boolean) as OutlookAttachment[],
    raw: value,
  };
}

export async function searchOutlookMessages(
  search: string,
  maxResults = 50
): Promise<OutlookMessage[]> {
  const result = await callMcpTool("outlook_search_messages", {
    search,
    max_results: maxResults,
  });
  return asArray(result)
    .map(normalizeMessage)
    .filter(Boolean) as OutlookMessage[];
}

export async function readOutlookMessages(
  messageIds: string[]
): Promise<OutlookMessage[]> {
  if (messageIds.length === 0) return [];
  const result = await callMcpTool("outlook_read_messages", {
    message_ids: Array.from(new Set(messageIds)).slice(0, 100),
  });
  return asArray(result)
    .map(normalizeMessage)
    .filter(Boolean) as OutlookMessage[];
}

export async function searchAndReadOutlook(
  search: string,
  maxResults = 50
): Promise<OutlookMessage[]> {
  const searchResults = await searchOutlookMessages(search, maxResults);
  const ids = searchResults.map(message => message.id).filter(Boolean);
  if (ids.length === 0) return searchResults;
  try {
    const fullMessages = await readOutlookMessages(ids);
    return fullMessages.length > 0 ? fullMessages : searchResults;
  } catch (error) {
    console.warn(
      "[OutlookIntegration] Full message read failed; returning search results only",
      error
    );
    return searchResults;
  }
}

export function findPdfAttachments(
  message: OutlookMessage
): OutlookAttachment[] {
  return message.attachments.filter(attachment => {
    const name = attachment.filename.toLowerCase();
    const mime = (attachment.mimeType ?? "").toLowerCase();
    return name.endsWith(".pdf") || mime.includes("pdf");
  });
}

export async function getAttachmentBuffer(
  attachment: OutlookAttachment
): Promise<Buffer> {
  if (attachment.path) return readFile(attachment.path);
  if (attachment.dataBase64)
    return Buffer.from(attachment.dataBase64, "base64");
  throw new Error(
    `Outlook attachment ${attachment.filename} did not include a local path or base64 content`
  );
}

export function hashAttachment(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}
