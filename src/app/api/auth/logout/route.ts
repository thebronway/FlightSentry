import { NextRequest, NextResponse } from 'next/server';
import { authDb } from '@/db/auth';
import {
  SESSION_COOKIE_NAME,
  clearSessionCookie,
  verifySignedSessionToken,
} from '@/services/auth/session';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
};

export async function POST(req: NextRequest) {
  try {
    const cookieToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const verified = verifySignedSessionToken(cookieToken);
    if (verified) {
      authDb.revokeSession(verified.sessionId);
    }

    const response = NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS });
    clearSessionCookie(req, response);
    return response;
  } catch (error) {
    console.error('[Auth] Logout error:', error);
    const response = NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS });
    clearSessionCookie(req, response);
    return response;
  }
}