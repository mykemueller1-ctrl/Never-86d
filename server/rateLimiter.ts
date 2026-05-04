/**
 * In-memory rate limiter for PIN login brute-force protection.
 * 
 * Rules:
 * - Max 5 failed attempts per IP per 15-minute window
 * - After 5 fails: 15-minute lockout from that IP
 * - Successful login resets the counter for that IP
 * - Also tracks per-PIN attempts to prevent distributed attacks
 * 
 * In production with multiple instances, replace with Redis.
 * For a single-restaurant app, in-memory is fine.
 */

interface AttemptRecord {
  count: number;
  firstAttempt: number;
  lockedUntil: number | null;
}

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes lockout

// Track by IP address
const ipAttempts = new Map<string, AttemptRecord>();
// Track by PIN (to prevent distributed brute-force across IPs)
const pinAttempts = new Map<string, AttemptRecord>();

function getOrCreate(map: Map<string, AttemptRecord>, key: string): AttemptRecord {
  const existing = map.get(key);
  const now = Date.now();

  if (!existing) {
    const record: AttemptRecord = { count: 0, firstAttempt: now, lockedUntil: null };
    map.set(key, record);
    return record;
  }

  // If window has expired and not locked, reset
  if (now - existing.firstAttempt > WINDOW_MS && (!existing.lockedUntil || now > existing.lockedUntil)) {
    const record: AttemptRecord = { count: 0, firstAttempt: now, lockedUntil: null };
    map.set(key, record);
    return record;
  }

  return existing;
}

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  lockedUntil: number | null;
  message: string;
}

/**
 * Check if a PIN login attempt is allowed.
 * Call BEFORE checking the PIN.
 */
export function checkPinRateLimit(ip: string, pin: string): RateLimitResult {
  const now = Date.now();

  // Check IP lockout
  const ipRecord = getOrCreate(ipAttempts, ip);
  if (ipRecord.lockedUntil && now < ipRecord.lockedUntil) {
    const remainingSec = Math.ceil((ipRecord.lockedUntil - now) / 1000);
    return {
      allowed: false,
      remainingAttempts: 0,
      lockedUntil: ipRecord.lockedUntil,
      message: `Too many failed attempts. Try again in ${remainingSec} seconds.`,
    };
  }

  // Check PIN lockout (distributed attack protection)
  const pinRecord = getOrCreate(pinAttempts, pin);
  if (pinRecord.lockedUntil && now < pinRecord.lockedUntil) {
    const remainingSec = Math.ceil((pinRecord.lockedUntil - now) / 1000);
    return {
      allowed: false,
      remainingAttempts: 0,
      lockedUntil: pinRecord.lockedUntil,
      message: `This PIN is temporarily locked. Try again in ${remainingSec} seconds.`,
    };
  }

  return {
    allowed: true,
    remainingAttempts: MAX_ATTEMPTS - ipRecord.count,
    lockedUntil: null,
    message: "OK",
  };
}

/**
 * Record a failed PIN attempt. Call AFTER a failed PIN check.
 */
export function recordFailedAttempt(ip: string, pin: string): void {
  const now = Date.now();

  // Increment IP counter
  const ipRecord = getOrCreate(ipAttempts, ip);
  ipRecord.count++;
  if (ipRecord.count >= MAX_ATTEMPTS) {
    ipRecord.lockedUntil = now + LOCKOUT_MS;
  }

  // Increment PIN counter
  const pinRecord = getOrCreate(pinAttempts, pin);
  pinRecord.count++;
  if (pinRecord.count >= MAX_ATTEMPTS) {
    pinRecord.lockedUntil = now + LOCKOUT_MS;
  }
}

/**
 * Reset counters on successful login. Call AFTER a successful PIN check.
 */
export function recordSuccessfulLogin(ip: string): void {
  ipAttempts.delete(ip);
}

/**
 * Get the client IP from the request (handles proxies).
 */
export function getClientIp(req: any): string {
  return (
    req.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers?.["x-real-ip"] ||
    req.socket?.remoteAddress ||
    req.ip ||
    "unknown"
  );
}

/**
 * Cleanup stale entries (call periodically to prevent memory leaks).
 */
export function cleanupStaleEntries(): void {
  const now = Date.now();
  const ipKeys = Array.from(ipAttempts.keys());
  for (const key of ipKeys) {
    const record = ipAttempts.get(key)!;
    if (now - record.firstAttempt > WINDOW_MS * 2 && (!record.lockedUntil || now > record.lockedUntil)) {
      ipAttempts.delete(key);
    }
  }
  const pinKeys = Array.from(pinAttempts.keys());
  for (const key of pinKeys) {
    const record = pinAttempts.get(key)!;
    if (now - record.firstAttempt > WINDOW_MS * 2 && (!record.lockedUntil || now > record.lockedUntil)) {
      pinAttempts.delete(key);
    }
  }
}

// Auto-cleanup every 30 minutes
setInterval(cleanupStaleEntries, 30 * 60 * 1000);

// Export for testing
export const _testing = {
  ipAttempts,
  pinAttempts,
  reset() {
    ipAttempts.clear();
    pinAttempts.clear();
  },
};
