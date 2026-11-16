import { NextRequest, NextResponse } from 'next/server';
import { authDb } from '@/db/auth';
import { loginSchema } from '@/utils/authValidation';
import { verifyPassword } from '@/services/auth/password';
import { issueSessionAndAttachCookie } from '@/services/auth/session';
import {
  checkLoginRateLimit,
  getClientIp,
  recordFailedLogin,
  resetLoginRateLimit,
} from '@/services/auth/rateLimit';
import { bootstrapAuthFromEnv } from '@/services/auth/bootstrap';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
};

export async function POST(req: NextRequest) {
  try {
    await bootstrapAuthFromEnv();
    const config = authDb.getConfig();

    if (config.enabled !== 1) {
      return NextResponse.json(
        { error: 'Authentication is currently disabled on this instance.' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const ipAddress = getClientIp(req);
    const rateLimit = checkLoginRateLimit(ipAddress);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Too many failed sign-in attempts. Try again in ${rateLimit.retryAfterSeconds}s.`,
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            ...NO_STORE_HEADERS,
            'Retry-After': String(rateLimit.retryAfterSeconds),
          },
        }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || 'Invalid credentials';
      return NextResponse.json({ error: msg }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const submittedUsername = parsed.data.username.trim();
    const usernameMatches = submittedUsername === config.username;
    const passwordMatches = await verifyPassword(
      parsed.data.password,
      config.passwordHash,
      config.passwordSalt
    );

    if (!usernameMatches || !passwordMatches) {
      const failure = recordFailedLogin(ipAddress);
      if (failure.locked) {
        return NextResponse.json(
          {
            error: `Too many failed sign-in attempts. Locked for ${failure.retryAfterSeconds}s.`,
            retryAfterSeconds: failure.retryAfterSeconds,
          },
          {
            status: 429,
            headers: {
              ...NO_STORE_HEADERS,
              'Retry-After': String(failure.retryAfterSeconds),
            },
          }
        );
      }

      return NextResponse.json(
        { error: 'Invalid username or password.' },
        { status: 401, headers: NO_STORE_HEADERS }
      );
    }

    resetLoginRateLimit(ipAddress);

    const response = NextResponse.json(
      {
        success: true,
        username: config.username,
      },
      { headers: NO_STORE_HEADERS }
    );

    issueSessionAndAttachCookie(req, response, config.username, ipAddress);
    return response;
  } catch (error) {
    console.error('[Auth] Login error:', error);
    return NextResponse.json(
      { error: 'Unexpected authentication error' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}