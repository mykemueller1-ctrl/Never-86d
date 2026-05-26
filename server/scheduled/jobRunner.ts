import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { scheduledJobRuns } from "../../drizzle/schema";

export type ScheduledJobStatus = "success" | "failed" | "skipped";
export type ScheduledJobTrigger = "scheduled" | "manual" | "api";

export interface ScheduledJobContext {
  jobName: string;
  runId?: number;
  idempotencyKey: string;
  startedAt: Date;
}

export interface ScheduledJobResult<TSummary extends Record<string, unknown> = Record<string, unknown>> {
  status?: ScheduledJobStatus;
  summary: TSummary;
}

export interface RunScheduledJobOptions<TSummary extends Record<string, unknown>> {
  jobName: string;
  trigger?: ScheduledJobTrigger;
  idempotencyKey?: string;
  handler: (context: ScheduledJobContext) => Promise<ScheduledJobResult<TSummary> | TSummary>;
}

/**
 * Wraps scheduled work in a durable audit record.
 *
 * Every P2 scheduled endpoint uses this helper so a failed or repeated request still leaves evidence in scheduled_job_runs.
 * The helper does not swallow errors; callers still return the correct HTTP failure while the database record is marked failed.
 */
export async function runScheduledJob<TSummary extends Record<string, unknown>>(
  options: RunScheduledJobOptions<TSummary>,
): Promise<{ runId?: number; status: ScheduledJobStatus; summary: TSummary; idempotencyKey: string }> {
  const startedAt = new Date();
  const idempotencyKey = options.idempotencyKey ?? buildDailyIdempotencyKey(options.jobName, startedAt);
  const db = await getDb();
  let runId: number | undefined;

  if (db) {
    try {
      const insertResult = await db.insert(scheduledJobRuns).values({
        jobName: options.jobName,
        idempotencyKey,
        status: "running",
        trigger: options.trigger ?? "scheduled",
        startedAt,
      });
      runId = extractInsertId(insertResult);
    } catch (error) {
      console.error(`[ScheduledJobRunner] Failed to create run log for ${options.jobName}:`, error);
    }
  } else {
    console.warn(`[ScheduledJobRunner] Database unavailable; ${options.jobName} will run without persistent audit logging`);
  }

  try {
    const result = await options.handler({ jobName: options.jobName, runId, idempotencyKey, startedAt });
    const normalized = normalizeJobResult(result);
    await finishRun(runId, normalized.status, startedAt, normalized.summary);
    return { runId, status: normalized.status, summary: normalized.summary, idempotencyKey };
  } catch (error) {
    await finishRun(runId, "failed", startedAt, { error: getErrorMessage(error) } as unknown as TSummary, getErrorMessage(error));
    throw error;
  }
}

export function buildDailyIdempotencyKey(jobName: string, date = new Date()): string {
  return `${jobName}:${date.toISOString().slice(0, 10)}`;
}

export function buildHourlyIdempotencyKey(jobName: string, date = new Date()): string {
  return `${jobName}:${date.toISOString().slice(0, 13)}`;
}

async function finishRun(
  runId: number | undefined,
  status: ScheduledJobStatus,
  startedAt: Date,
  summary: Record<string, unknown>,
  error?: string,
): Promise<void> {
  if (!runId) return;
  const db = await getDb();
  if (!db) return;
  const completedAt = new Date();
  try {
    await db.update(scheduledJobRuns).set({
      status,
      completedAt,
      durationMs: completedAt.getTime() - startedAt.getTime(),
      summary,
      error,
    }).where(eq(scheduledJobRuns.id, runId));
  } catch (finishError) {
    console.error(`[ScheduledJobRunner] Failed to finish run ${runId}:`, finishError);
  }
}

function normalizeJobResult<TSummary extends Record<string, unknown>>(
  result: ScheduledJobResult<TSummary> | TSummary,
): { status: ScheduledJobStatus; summary: TSummary } {
  if (isScheduledJobResult<TSummary>(result)) {
    return { status: result.status ?? "success", summary: result.summary };
  }
  return { status: "success", summary: result };
}

function isScheduledJobResult<TSummary extends Record<string, unknown>>(
  result: ScheduledJobResult<TSummary> | TSummary,
): result is ScheduledJobResult<TSummary> {
  return typeof result === "object" && result !== null && "summary" in result;
}

function extractInsertId(result: unknown): number | undefined {
  if (Array.isArray(result) && result.length > 0 && typeof result[0] === "object" && result[0] !== null) {
    const first = result[0] as { insertId?: unknown };
    return typeof first.insertId === "number" ? first.insertId : undefined;
  }
  if (typeof result === "object" && result !== null && "insertId" in result) {
    const maybeInsertId = (result as { insertId?: unknown }).insertId;
    return typeof maybeInsertId === "number" ? maybeInsertId : undefined;
  }
  return undefined;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
