import { NextRequest, NextResponse } from 'next/server';
import { bootstrapAuthFromEnv } from '@/services/auth/bootstrap';
import {
  checkLoginRateLimit,
  getClientIp,
  recordFailedLogin,
  resetLoginRateLimit,
} from '@/services/auth/rateLimit';
import { verifyPasskeyAuthentication } from '@/services/auth/webauthn';
import { issueSessionAndAttachCookie } from '@/services/auth/session';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
};

export async function POST(req: NextRequest) {
  try {
    await bootstrapAuthFromEnv();

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
    if (!body || typeof body !== 'object' || !('response' in body)) {
      return NextResponse.json(
        { error: 'Invalid passkey assertion payload' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    try {
      const verified = await verifyPasskeyAuthentication(req, (body as { response: unknown }).response);
      resetLoginRateLimit(ipAddress);

      const response = NextResponse.json(
        {
          success: true,
          username: verified.username,
        },
        { headers: NO_STORE_HEADERS }
      );

      issueSessionAndAttachCookie(req, response, verified.username, ipAddress);
      return response;
    } catch (verifyErr: any) {
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
        { error: verifyErr?.message || 'Passkey verification failed' },
        { status: 401, headers: NO_STORE_HEADERS }
      );
    }
  } catch (error) {
    console.error('[Auth] Passkey authentication verify error:', error);
    return NextResponse.json(
      { error: 'Unexpected passkey authentication error' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}