import {
  findPdfAttachments,
  getAttachmentBuffer,
  hashAttachment,
  searchAndReadGmail,
  type GmailAttachment,
  type GmailMessage,
} from "../gmail";
import { extractPdfTextFromBuffer } from "../pdf";

export const PDQ_SENDER = "pdqreports@pdqpos.com";
export const PDQ_MAILBOX = "communitypizza2026@gmail.com";

export type PdqZReportCandidate = {
  sourceProvider: "gmail";
  sourceMailbox: typeof PDQ_MAILBOX;
  messageId: string;
  threadId?: string;
  subject?: string;
  from?: string;
  date?: string;
  attachment: GmailAttachment;
  attachmentHash: string;
  rawText: string;
  extractionWarnings: string[];
  message: GmailMessage;
};

export function buildPdqSearchQuery(daysBack = 14): string {
  return `from:${PDQ_SENDER} to:${PDQ_MAILBOX} has:attachment newer_than:${daysBack}d`;
}

/**
 * Finds PDQ Z-report PDFs in Gmail and extracts raw PDF text. Failures for one
 * attachment are returned as warnings on that candidate search pass rather than
 * throwing the whole scheduled detector route.
 */
export async function detectPdqZReports(
  options: { daysBack?: number; maxResults?: number } = {}
): Promise<PdqZReportCandidate[]> {
  const messages = await searchAndReadGmail(
    buildPdqSearchQuery(options.daysBack ?? 14),
    options.maxResults ?? 50
  );
  const candidates: PdqZReportCandidate[] = [];

  for (const message of messages) {
    const attachments = findPdfAttachments(message);
    for (const attachment of attachments) {
      const buffer = await getAttachmentBuffer(attachment);
      const attachmentHash = hashAttachment(buffer);
      const extracted = await extractPdfTextFromBuffer(
        buffer,
        attachment.filename
      );
      candidates.push({
        sourceProvider: "gmail",
        sourceMailbox: PDQ_MAILBOX,
        messageId: message.id,
        threadId: message.threadId,
        subject: message.subject,
        from: message.from,
        date: message.date,
        attachment,
        attachmentHash,
        rawText: extracted.text,
        extractionWarnings: extracted.warnings,
        message,
      });
    }
  }

  return candidates;
}
