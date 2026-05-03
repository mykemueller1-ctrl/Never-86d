import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { ENV } from "./env";
import * as jose from "jose";

const STAFF_COOKIE_NAME = "staff_session";
const STAFF_JWT_SECRET = new TextEncoder().encode(ENV.cookieSecret || "fallback-staff-secret");

/** Sign a staff session JWT after PIN login */
export async function signStaffSession(staffId: number): Promise<string> {
  return new jose.SignJWT({ staffId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(STAFF_JWT_SECRET);
}

/** Verify a staff session JWT and return the staffId */
export async function verifyStaffSession(token: string): Promise<number | null> {
  try {
    const { payload } = await jose.jwtVerify(token, STAFF_JWT_SECRET);
    return (payload as any).staffId ?? null;
  } catch {
    return null;
  }
}

export const STAFF_COOKIE = STAFF_COOKIE_NAME;

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  staffId: number | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let staffId: number | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  // Parse staff session cookie (set after PIN login)
  const staffToken = opts.req.cookies?.[STAFF_COOKIE_NAME];
  if (staffToken) {
    staffId = await verifyStaffSession(staffToken);
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    staffId,
  };
}
