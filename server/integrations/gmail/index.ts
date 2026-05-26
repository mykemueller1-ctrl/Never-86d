import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const execFileAsync = promisify(execFile);

export type GmailAttachment = {
  id?: string;
  filename: string;
  mimeType?: string;
  size?: number;
  path?: string;
  dataBase64?: string;
};

export type GmailMessage = {
  id: string;
  threadId?: string;
  subject?: string;
  from?: string;
  to?: string;
  date?: string;
  snippet?: string;
  bodyText?: string;
  bodyHtml?: string;
  attachments: GmailAttachment[];
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
      "gmail",
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
    // manus-mcp-cli may print helpful status text around a JSON payload. Extract
    // the largest likely JSON object/array defensively rather than failing the job.
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
  for (const key of ["messages", "threads", "items", "results", "data"]) {
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

function normalizeAttachment(value: unknown): GmailAttachment | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const filename = pickString(record, ["filename", "name", "fileName"]);
  if (!filename) return null;
  const size = typeof record.size === "number" ? record.size : undefined;
  return {
    id: pickString(record, ["id", "attachmentId", "attachment_id"]),
    filename,
    mimeType: pickString(record, [
      "mimeType",
      "mime_type",
      "contentType",
      "content_type",
    ]),
    size,
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

function normalizeMessage(value: unknown): GmailMessage | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const id = pickString(record, ["id", "messageId", "message_id"]);
  if (!id) return null;

  const attachments = asArray(record.attachments)
    .map(normalizeAttachment)
    .filter(Boolean) as GmailAttachment[];
  return {
    id,
    threadId: pickString(record, ["threadId", "thread_id"]),
    subject: pickString(record, ["subject"]),
    from: pickString(record, ["from", "sender"]),
    to: pickString(record, ["to", "recipient"]),
    date: pickString(record, [
      "date",
      "receivedAt",
      "received_at",
      "internalDate",
    ]),
    snippet: pickString(record, ["snippet", "preview"]),
    bodyText: pickString(record, [
      "bodyText",
      "body_text",
      "text",
      "body",
      "plainText",
      "plain_text",
    ]),
    bodyHtml: pickString(record, ["bodyHtml", "body_html", "html"]),
    attachments,
    raw: value,
  };
}

export async function searchGmailMessages(
  q: string,
  maxResults = 50
): Promise<GmailMessage[]> {
  const result = await callMcpTool("gmail_search_messages", {
    q,
    max_results: maxResults,
  });
  return asArray(result)
    .map(normalizeMessage)
    .filter(Boolean) as GmailMessage[];
}

export async function readGmailThreads(
  threadIds: string[],
  includeFullMessages = true
): Promise<GmailMessage[]> {
  if (threadIds.length === 0) return [];
  const result = await callMcpTool("gmail_read_threads", {
    thread_ids: Array.from(new Set(threadIds)).slice(0, 100),
    include_full_messages: includeFullMessages,
  });
  const direct = asArray(result)
    .map(normalizeMessage)
    .filter(Boolean) as GmailMessage[];
  if (direct.length > 0) return direct;

  // Some connector responses are nested as threads[].messages[]. Flatten those.
  return asArray(result).flatMap(thread => {
    if (!thread || typeof thread !== "object") return [];
    return asArray((thread as Record<string, unknown>).messages)
      .map(normalizeMessage)
      .filter(Boolean) as GmailMessage[];
  });
}

export async function searchAndReadGmail(
  q: string,
  maxResults = 50
): Promise<GmailMessage[]> {
  const searchResults = await searchGmailMessages(q, maxResults);
  const threadIds = searchResults
    .map(message => message.threadId ?? message.id)
    .filter(Boolean);
  if (threadIds.length === 0) return searchResults;
  try {
    const fullMessages = await readGmailThreads(threadIds);
    return fullMessages.length > 0 ? fullMessages : searchResults;
  } catch (error) {
    console.warn(
      "[GmailIntegration] Full thread read failed; returning search results only",
      error
    );
    return searchResults;
  }
}

export function findPdfAttachments(message: GmailMessage): GmailAttachment[] {
  return message.attachments.filter(attachment => {
    const name = attachment.filename.toLowerCase();
    const mime = (attachment.mimeType ?? "").toLowerCase();
    return name.endsWith(".pdf") || mime.includes("pdf");
  });
}

export async function getAttachmentBuffer(
  attachment: GmailAttachment
): Promise<Buffer> {
  if (attachment.path) return readFile(attachment.path);
  if (attachment.dataBase64)
    return Buffer.from(attachment.dataBase64, "base64");
  throw new Error(
    `Gmail attachment ${attachment.filename} did not include a local path or base64 content`
  );
}

export function hashAttachment(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}
