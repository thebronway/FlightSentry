import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { authDb } from '@/db/auth';
import { settingsDb } from '@/db/settings';

export const SESSION_COOKIE_NAME = 'flightsentry_session';
export const DEFAULT_SESSION_DURATION_DAYS = 30;

let cachedSecret: string | null = null;

function getSecretFilePath(): string {
  return process.env.NODE_ENV === 'production'
    ? '/app/data/.auth_secret'
    : path.join(process.cwd(), 'data', '.auth_secret');
}

export function getAuthSigningSecret(): string {
  if (cachedSecret) {
    process.env['__FLIGHTSENTRY_AUTH_SECRET'] = cachedSecret;
    return cachedSecret;
  }

  const explicitSecret = (process.env.AUTH_SESSION_SECRET || process.env.ENCRYPTION_SECRET || '').trim();
  if (explicitSecret.length >= 16) {
    cachedSecret = crypto.createHash('sha256').update(`flightsentry-auth-session:${explicitSecret}`).digest('hex');
    process.env['__FLIGHTSENTRY_AUTH_SECRET'] = cachedSecret;
    return cachedSecret;
  }

  const secretPath = getSecretFilePath();
  const dir = path.dirname(secretPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (fs.existsSync(secretPath)) {
    const existing = fs.readFileSync(secretPath, 'utf8').trim();
    if (/^[a-f0-9]{64}$/i.test(existing)) {
      cachedSecret = existing;
      process.env['__FLIGHTSENTRY_AUTH_SECRET'] = cachedSecret;
      return cachedSecret;
    }
  }

  const generated = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(secretPath, generated, { mode: 0o600 });
  try {
    fs.chmodSync(secretPath, 0o600);
  } catch {
    // Ignore chmod failures on non-POSIX volumes
  }

  cachedSecret = generated;
  process.env['__FLIGHTSENTRY_AUTH_SECRET'] = cachedSecret;
  return cachedSecret;
}

export function ensureAuthRuntimeEnv(): void {
  getAuthSigningSecret();
  const config = authDb.getConfig();
  process.env['__FLIGHTSENTRY_AUTH_ENABLED'] = config.enabled === 1 ? '1' : '0';
}

function signPayload(payload: string): string {
  const secret = getAuthSigningSecret();
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

export function createSignedSessionToken(sessionId: string, expiresAtUnixSec: number): string {
  const payload = `${sessionId}.${expiresAtUnixSec}`;
  const sig = signPayload(payload);
  return `${payload}.${sig}`;
}

export function verifySignedSessionToken(
  token: string | undefined | null
): { sessionId: string; expiresAtUnixSec: number } | null {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [sessionId, expStr, providedSig] = parts;
  if (!sessionId || !expStr || !providedSig) return null;
  if (!/^[a-f0-9-]{36}$/i.test(sessionId)) return null;
  if (!/^\d+$/.test(expStr)) return null;

  const expiresAtUnixSec = parseInt(expStr, 10);
  const nowSec = Math.floor(Date.now() / 1000);
  if (Number.isNaN(expiresAtUnixSec) || expiresAtUnixSec <= nowSec) {
    return null;
  }

  const expectedSig = signPayload(`${sessionId}.${expStr}`);
  const a = Buffer.from(providedSig, 'utf8');
  const b = Buffer.from(expectedSig, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return null;
  }

  return { sessionId, expiresAtUnixSec };
}

export function isSecureRequest(req: NextRequest): boolean {
  const forwardedProto = (req.headers.get('x-forwarded-proto') || '').split(',')[0].trim().toLowerCase();
  if (forwardedProto === 'https') return true;
  if (forwardedProto === 'http') return false;

  if (req.nextUrl.protocol === 'https:') return true;

  try {
    const settings = settingsDb.get();
    if (settings?.appBaseUrl && settings.appBaseUrl.toLowerCase().startsWith('https://')) {
      return true;
    }
  } catch {
    // Ignore DB errors when inspecting optional appBaseUrl
  }

  return false;
}

export function issueSessionAndAttachCookie(
  req: NextRequest,
  res: NextResponse,
  username: string,
  ipAddress: string | null
): string {
  const config = authDb.getConfig();
  const durationDays =
    config.sessionDurationDays && config.sessionDurationDays > 0
      ? config.sessionDurationDays
      : DEFAULT_SESSION_DURATION_DAYS;
  const ttlSeconds = durationDays * 24 * 60 * 60;

  const sessionId = crypto.randomUUID();
  const expiresAtUnixSec = Math.floor(Date.now() / 1000) + ttlSeconds;
  const expiresAtIso = new Date(expiresAtUnixSec * 1000).toISOString();
  const userAgent = (req.headers.get('user-agent') || '').slice(0, 256) || null;

  authDb.createSession({
    id: sessionId,
    username,
    userAgent,
    ipAddress,
    expiresAt: expiresAtIso,
  });

  const token = createSignedSessionToken(sessionId, expiresAtUnixSec);
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecureRequest(req),
    path: '/',
    maxAge: ttlSeconds,
  });

  return sessionId;
}

export function clearSessionCookie(req: NextRequest, res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecureRequest(req),
    path: '/',
    maxAge: 0,
  });
}