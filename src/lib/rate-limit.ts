import "server-only";

// Lightweight in-process fixed-window rate limiter with lockout. No external deps.
// NOTE: state is per Node process — fine for the current single-PM2-process deploy;
// move to Redis (already on the target stack) when running multiple workers.

type Bucket = { count: number; resetAt: number; lockedUntil: number };
const buckets = new Map<string, Bucket>();

let lastSweep = 0;
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, b] of buckets) {
    if (b.lockedUntil < now && b.resetAt < now) buckets.delete(k);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSec: number;
}

/**
 * Record an attempt against `key`. Allows up to `max` per `windowMs`; exceeding it
 * locks the key for `lockoutMs` (default = windowMs). Call `resetRateLimit(key)` on
 * a successful auth so a legitimate user isn't penalised for earlier typos.
 */
export function rateLimit(
  key: string,
  opts: { max: number; windowMs: number; lockoutMs?: number },
): RateLimitResult {
  const now = Date.now();
  sweep(now);
  const b = buckets.get(key);

  if (b && b.lockedUntil > now) {
    return { allowed: false, retryAfterSec: Math.ceil((b.lockedUntil - now) / 1000) };
  }
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs, lockedUntil: 0 });
    return { allowed: true, retryAfterSec: 0 };
  }
  b.count += 1;
  if (b.count > opts.max) {
    b.lockedUntil = now + (opts.lockoutMs ?? opts.windowMs);
    return { allowed: false, retryAfterSec: Math.ceil((b.lockedUntil - now) / 1000) };
  }
  return { allowed: true, retryAfterSec: 0 };
}

export function resetRateLimit(key: string): void {
  buckets.delete(key);
}
