import {
  GoogleSheetsClient,
  type SheetCellValue,
  cellToString,
  normalizeHeader,
  quoteSheetName,
  rowsToObjects,
} from "./index";

export type ScheduleDepartment = "bar" | "dining_room" | "kitchen_line" | "pizza_side" | "driver" | "dishwasher" | "management";

export interface ParsedScheduleShift {
  staffName: string;
  staffId?: number;
  date: string;
  startTime: string;
  endTime: string;
  position?: string;
  department?: ScheduleDepartment;
  notes?: string;
  confidence: "high" | "medium" | "low";
  conflictReasons: string[];
  sourceEvidence: {
    spreadsheetId: string;
    sheetName: string;
    rowNumber: number;
    raw: Record<string, SheetCellValue> | SheetCellValue[];
  };
}

export interface ScheduleSyncSnapshot {
  spreadsheetId: string;
  fetchedAt: string;
  shifts: ParsedScheduleShift[];
  rejectedRows: Array<{
    sheetName: string;
    rowNumber: number;
    reason: string;
    evidence: Record<string, SheetCellValue> | SheetCellValue[];
  }>;
  summary: {
    parsed: number;
    rejected: number;
    highConfidence: number;
    conflicts: number;
  };
}

export interface ScheduleSyncOptions {
  spreadsheetId?: string;
  sheetTitle?: string;
  range?: string;
  client?: GoogleSheetsClient;
  staffDirectory?: Array<{ id: number; firstName: string; lastName: string }>;
}

/**
 * Reads a staff schedule workbook and parses rows into shift objects.
 * The parser is conservative: rows without a staff name, date, start time, or end time are rejected instead of guessed.
 */
export async function readStaffScheduleFromSheets(options: ScheduleSyncOptions = {}): Promise<ScheduleSyncSnapshot> {
  const spreadsheetId = options.spreadsheetId ?? process.env.CTAP_SCHEDULE_SHEET_ID;
  if (!spreadsheetId) {
    throw new Error("CTAP_SCHEDULE_SHEET_ID or spreadsheetId is required for schedule sync");
  }

  const client = options.client ?? GoogleSheetsClient.fromEnv();
  const metadata = options.sheetTitle ? null : await client.getMetadata(spreadsheetId);
  const sheetName = options.sheetTitle ?? metadata?.sheets[0]?.title;
  if (!sheetName) throw new Error("No schedule sheet tab found");

  const range = options.range ?? `${quoteSheetName(sheetName)}!A1:Z1000`;
  const result = await client.readRange(spreadsheetId, range);
  const parsed = parseScheduleRows({
    spreadsheetId,
    sheetName,
    rows: result.values,
    staffDirectory: options.staffDirectory ?? [],
  });

  return {
    spreadsheetId,
    fetchedAt: new Date().toISOString(),
    shifts: parsed.shifts,
    rejectedRows: parsed.rejectedRows,
    summary: {
      parsed: parsed.shifts.length,
      rejected: parsed.rejectedRows.length,
      highConfidence: parsed.shifts.filter((shift) => shift.confidence === "high").length,
      conflicts: parsed.shifts.filter((shift) => shift.conflictReasons.length > 0).length,
    },
  };
}

export function parseScheduleRows(input: {
  spreadsheetId: string;
  sheetName: string;
  rows: SheetCellValue[][];
  staffDirectory?: Array<{ id: number; firstName: string; lastName: string }>;
}): Pick<ScheduleSyncSnapshot, "shifts" | "rejectedRows"> {
  const headerRowIndex = findHeaderRow(input.rows);
  const headers = (input.rows[headerRowIndex] ?? []).map((cell, index) => normalizeHeader(cellToString(cell)) || `column_${index + 1}`);
  const objects = rowsToObjects(input.rows, headerRowIndex);
  const shifts: ParsedScheduleShift[] = [];
  const rejectedRows: ScheduleSyncSnapshot["rejectedRows"] = [];

  objects.forEach((record, index) => {
    const rowNumber = headerRowIndex + index + 2;
    if (Object.values(record).every((value) => cellToString(value).length === 0)) return;
    const shift = normalizeScheduleRecord({ ...input, record, rowNumber, headers });
    if (shift) shifts.push(shift);
    else {
      rejectedRows.push({
        sheetName: input.sheetName,
        rowNumber,
        reason: "Could not safely identify required staff/date/start/end fields.",
        evidence: record,
      });
    }
  });

  return { shifts, rejectedRows };
}

function normalizeScheduleRecord(input: {
  spreadsheetId: string;
  sheetName: string;
  record: Record<string, SheetCellValue>;
  rowNumber: number;
  headers: string[];
  staffDirectory?: Array<{ id: number; firstName: string; lastName: string }>;
}): ParsedScheduleShift | null {
  const staffName = pickString(input.record, ["staff", "staff_name", "employee", "employee_name", "name", "team_member"]);
  const rawDate = pickString(input.record, ["date", "shift_date", "business_date", "day"]);
  const rawStart = pickString(input.record, ["start", "start_time", "in", "clock_in", "from"]);
  const rawEnd = pickString(input.record, ["end", "end_time", "out", "clock_out", "to"]);
  const date = normalizeDate(rawDate);
  const startTime = normalizeTime(rawStart);
  const endTime = normalizeTime(rawEnd);

  if (!staffName || !date || !startTime || !endTime) return null;

  const department = normalizeDepartment(pickString(input.record, ["department", "dept", "station", "area"]));
  const position = pickString(input.record, ["position", "role", "station", "job", "shift"]);
  const matchedStaff = matchStaff(staffName, input.staffDirectory ?? []);
  const conflictReasons = detectShiftConflicts({ staffName, date, startTime, endTime });

  return {
    staffName,
    staffId: matchedStaff?.id,
    date,
    startTime,
    endTime,
    position,
    department,
    notes: pickString(input.record, ["notes", "note", "comments", "comment"]),
    confidence: matchedStaff ? "high" : "medium",
    conflictReasons,
    sourceEvidence: {
      spreadsheetId: input.spreadsheetId,
      sheetName: input.sheetName,
      rowNumber: input.rowNumber,
      raw: input.record,
    },
  };
}

function findHeaderRow(rows: SheetCellValue[][]): number {
  let bestIndex = 0;
  let bestScore = -1;
  rows.slice(0, Math.min(rows.length, 12)).forEach((row, index) => {
    const headers = row.map((cell) => normalizeHeader(cellToString(cell)));
    const score = headers.filter((header) =>
      ["date", "shift_date", "staff", "staff_name", "employee", "name", "start", "start_time", "end", "end_time", "position", "department"].includes(header),
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

function normalizeDate(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const asNumber = Number(trimmed);
  if (Number.isFinite(asNumber) && asNumber > 20000) {
    // Google Sheets serial date: days since 1899-12-30.
    const millis = Math.round((asNumber - 25569) * 86400 * 1000);
    return new Date(millis).toISOString().slice(0, 10);
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().slice(0, 10);
}

function normalizeTime(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim().toLowerCase();
  const serial = Number(trimmed);
  if (Number.isFinite(serial) && serial > 0 && serial < 1) {
    const minutes = Math.round(serial * 24 * 60);
    return minutesToTime(minutes);
  }
  const match = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!match) return undefined;
  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? 0);
  const meridian = match[3];
  if (meridian === "pm" && hours < 12) hours += 12;
  if (meridian === "am" && hours === 12) hours = 0;
  if (hours > 23 || minutes > 59) return undefined;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function minutesToTime(totalMinutes: number): string {
  const minutesInDay = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(minutesInDay / 60);
  const minutes = minutesInDay % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function normalizeDepartment(value: string | undefined): ScheduleDepartment | undefined {
  const normalized = (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "_");
  if (normalized.includes("bar")) return "bar";
  if (normalized.includes("dining") || normalized.includes("server") || normalized.includes("wait")) return "dining_room";
  if (normalized.includes("kitchen") || normalized.includes("line")) return "kitchen_line";
  if (normalized.includes("pizza")) return "pizza_side";
  if (normalized.includes("driver") || normalized.includes("delivery")) return "driver";
  if (normalized.includes("dish")) return "dishwasher";
  if (normalized.includes("manager") || normalized.includes("owner")) return "management";
  return undefined;
}

function matchStaff(staffName: string, directory: Array<{ id: number; firstName: string; lastName: string }>) {
  const normalized = normalizeName(staffName);
  return directory.find((staff) => normalizeName(`${staff.firstName} ${staff.lastName}`) === normalized);
}

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function detectShiftConflicts(shift: { staffName: string; date: string; startTime: string; endTime: string }): string[] {
  const reasons: string[] = [];
  const startMinutes = timeToMinutes(shift.startTime);
  const endMinutes = timeToMinutes(shift.endTime);
  if (startMinutes === endMinutes) reasons.push("Start time equals end time.");
  if (endMinutes < startMinutes) reasons.push("End time is before start time; overnight shift needs explicit review.");
  if (endMinutes - startMinutes > 14 * 60) reasons.push("Shift exceeds 14 hours and needs manager review.");
  return reasons;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}
