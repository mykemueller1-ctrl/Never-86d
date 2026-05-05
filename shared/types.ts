/**
 * Unified type exports
 * Import shared types from this single entry point.
 */

export type * from "../drizzle/schema";
export * from "./_core/errors";

// Safe staff type — no pin, phone, email, or auth credentials
import type { Staff } from "../drizzle/schema";
export type SafeStaff = Omit<Staff, "pin" | "phone" | "email" | "passwordHash" | "facebookAccessToken" | "facebookId">;
