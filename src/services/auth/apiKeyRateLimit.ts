const WINDOW_MS = 60_000;
const DEFAULT_MAX_REQUESTS_PER_WINDOW = 120;
const CLEANUP_INTERVAL_MS = 5 * 60_000;

export interface ApiKeyRateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAtUnixSec: number;
  retryAfterSeconds: number;
}

const requestBuckets = new Map<number, number[]>();
let lastCleanupMs = Date.now();

function getMaxRequestsPerWindow(): number {
  const raw = process.env.API_RATE_LIMIT_PER_MIN;
  if (!raw) return DEFAULT_MAX_REQUESTS_PER_WINDOW;
  const parsed = parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed < 10 || parsed > 6000) {
    return DEFAULT_MAX_REQUESTS_PER_WINDOW;
  }
  return parsed;
}

function pruneIdleBuckets(nowMs: number): void {
  if (nowMs - lastCleanupMs < CLEANUP_INTERVAL_MS) return;
  lastCleanupMs = nowMs;
  const cutoff = nowMs - WINDOW_MS;
  requestBuckets.forEach((timestamps, keyId) => {
    const active = timestamps.filter((ts) => ts > cutoff);
    if (active.length === 0) {
      requestBuckets.delete(keyId);
    } else {
      requestBuckets.set(keyId, active);
    }
  });
}

export function checkApiKeyRateLimit(apiKeyId: number): ApiKeyRateLimitResult {
  const nowMs = Date.now();
  pruneIdleBuckets(nowMs);

  const limit = getMaxRequestsPerWindow();
  const windowStart = nowMs - WINDOW_MS;
  const existing = requestBuckets.get(apiKeyId) ?? [];
  const active = existing.filter((ts) => ts > windowStart);

  if (active.length >= limit) {
    const oldestInWindow = active[0] ?? nowMs;
    const resetAtMs = oldestInWindow + WINDOW_MS;
    const retryAfterSeconds = Math.max(1, Math.ceil((resetAtMs - nowMs) / 1000));
    requestBuckets.set(apiKeyId, active);
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetAtUnixSec: Math.ceil(resetAtMs / 1000),
      retryAfterSeconds,
    };
  }

  active.push(nowMs);
  requestBuckets.set(apiKeyId, active);

  const oldestInWindow = active[0] ?? nowMs;
  const resetAtMs = oldestInWindow + WINDOW_MS;

  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - active.length),
    resetAtUnixSec: Math.ceil(resetAtMs / 1000),
    retryAfterSeconds: 0,
  };
}