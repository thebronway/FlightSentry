import { NextRequest, NextResponse } from 'next/server';
import { bootstrapAuthFromEnv } from '@/services/auth/bootstrap';
import { checkLoginRateLimit, getClientIp } from '@/services/auth/rateLimit';
import { createPasskeyAuthenticationOptions } from '@/services/auth/webauthn';

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

    const options = await createPasskeyAuthenticationOptions(req);
    return NextResponse.json(options, { headers: NO_STORE_HEADERS });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Unable to start passkey authentication' },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }
}