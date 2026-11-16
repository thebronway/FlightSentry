import { NextRequest, NextResponse } from 'next/server';
import { authDb } from '@/db/auth';
import { requireApiAuth } from '@/services/auth/apiGuard';
import { clearSessionCookie } from '@/services/auth/session';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
};

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const authCheck = await requireApiAuth(req);
  if (authCheck.response) return authCheck.response;

  try {
    const targetId = (params.id || '').trim();
    if (!/^[a-f0-9-]{36}$/i.test(targetId)) {
      return NextResponse.json(
        { error: 'Invalid session ID' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const revoked = authDb.revokeSession(targetId);
    if (!revoked) {
      return NextResponse.json(
        { error: 'Session not found or already revoked' },
        { status: 404, headers: NO_STORE_HEADERS }
      );
    }

    const isCurrent = authCheck.auth.sessionId === targetId;
    const response = NextResponse.json(
      { success: true, revokedCurrent: isCurrent },
      { headers: NO_STORE_HEADERS }
    );

    if (isCurrent) {
      clearSessionCookie(req, response);
    }

    return response;
  } catch (error) {
    console.error('[Auth] Failed to revoke session:', error);
    return NextResponse.json(
      { error: 'Failed to revoke session' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}