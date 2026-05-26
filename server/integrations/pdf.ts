import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type PdfExtractionResult = {
  text: string;
  method: "pdftotext" | "utf8-fallback";
  warnings: string[];
};

/**
 * Extract text from a PDF buffer using the system pdftotext utility. The parser
 * never throws on an empty result; it returns warnings so scheduled jobs can
 * dead-letter the source record instead of crashing the whole run.
 */
export async function extractPdfTextFromBuffer(
  buffer: Buffer,
  filename = "source.pdf"
): Promise<PdfExtractionResult> {
  const tempDir = await mkdtemp(join(tmpdir(), "ctap-pdf-"));
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_") || "source.pdf";
  const pdfPath = join(
    tempDir,
    safeName.endsWith(".pdf") ? safeName : `${safeName}.pdf`
  );
  const textPath = join(tempDir, "extracted.txt");

  try {
    await writeFile(pdfPath, buffer);
    await execFileAsync("pdftotext", ["-layout", pdfPath, textPath], {
      maxBuffer: 10 * 1024 * 1024,
    });
    const text = normalizePdfText(await readFile(textPath, "utf8"));
    return {
      text,
      method: "pdftotext",
      warnings: text ? [] : ["pdftotext completed but returned no text"],
    };
  } catch (error) {
    const fallback = normalizePdfText(buffer.toString("utf8"));
    return {
      text: fallback,
      method: "utf8-fallback",
      warnings: [
        `pdftotext failed: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

export async function extractPdfTextFromFile(
  path: string
): Promise<PdfExtractionResult> {
  const buffer = await readFile(path);
  return extractPdfTextFromBuffer(
    buffer,
    path.split("/").pop() ?? "source.pdf"
  );
}

export function normalizePdfText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[\t ]+$/gm, "")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}
