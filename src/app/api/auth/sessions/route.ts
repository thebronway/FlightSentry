import { NextRequest, NextResponse } from 'next/server';
import { authDb } from '@/db/auth';
import { requireApiAuth } from '@/services/auth/apiGuard';
import { sessionRevokeBulkSchema } from '@/utils/authValidation';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
};

export async function GET(req: NextRequest) {
  const authCheck = await requireApiAuth(req);
  if (authCheck.response) return authCheck.response;

  try {
    const sessions = authDb.listActiveSessions(authCheck.auth.sessionId || null);
    return NextResponse.json({ sessions }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('[Auth] Failed to list active sessions:', error);
    return NextResponse.json(
      { error: 'Failed to load active sessions' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const authCheck = await requireApiAuth(req);
  if (authCheck.response) return authCheck.response;

  try {
    const body = await req.json().catch(() => ({ scope: 'others' }));
    const parsed = sessionRevokeBulkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid session revocation request' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const revokedCount = authDb.revokeAllSessions(authCheck.auth.sessionId || null);
    return NextResponse.json(
      { success: true, revokedCount },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error('[Auth] Failed to revoke other sessions:', error);
    return NextResponse.json(
      { error: 'Failed to revoke sessions' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}