import { NextRequest } from 'next/server';
import { authDb } from '@/db/auth';

const FREE_ATTEMPTS = 4;
const BASE_LOCKOUT_SECONDS = 30;
const MAX_LOCKOUT_SECONDS = 15 * 60; // 15 minutes

export function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0].trim();
    if (first) return first.slice(0, 64);
  }
  const realIp = (req.headers.get('x-real-ip') || '').trim();
  if (realIp) return realIp.slice(0, 64);
  return 'unknown';
}

export function checkLoginRateLimit(ipAddress: string): {
  allowed: boolean;
  retryAfterSeconds: number;
} {
  const record = authDb.getLoginAttempt(ipAddress);
  if (!record || !record.lockedUntil) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const lockedUntilMs = Date.parse(record.lockedUntil);
  const nowMs = Date.now();
  if (!Number.isNaN(lockedUntilMs) && lockedUntilMs > nowMs) {
    const retryAfterSeconds = Math.max(1, Math.ceil((lockedUntilMs - nowMs) / 1000));
    return { allowed: false, retryAfterSeconds };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

export function recordFailedLogin(ipAddress: string): {
  locked: boolean;
  retryAfterSeconds: number;
  failedCount: number;
} {
  const existing = authDb.getLoginAttempt(ipAddress);
  const nextCount = (existing?.failedCount ?? 0) + 1;

  if (nextCount > FREE_ATTEMPTS) {
    const exponent = Math.min(nextCount - FREE_ATTEMPTS - 1, 8);
    const lockoutSeconds = Math.min(BASE_LOCKOUT_SECONDS * Math.pow(2, exponent), MAX_LOCKOUT_SECONDS);
    const lockedUntil = new Date(Date.now() + lockoutSeconds * 1000).toISOString();
    authDb.recordLoginAttempt(ipAddress, nextCount, lockedUntil);
    return {
      locked: true,
      retryAfterSeconds: lockoutSeconds,
      failedCount: nextCount,
    };
  }

  authDb.recordLoginAttempt(ipAddress, nextCount, null);
  return {
    locked: false,
    retryAfterSeconds: 0,
    failedCount: nextCount,
  };
}

export function resetLoginRateLimit(ipAddress: string): void {
  authDb.clearLoginAttempt(ipAddress);
}