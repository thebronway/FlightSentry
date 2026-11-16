import { NextRequest, NextResponse } from 'next/server';
import { authDb } from '@/db/auth';
import { AuthStatusResponse } from '@/types';
import { authenticateApiRequest } from '@/services/auth/apiGuard';
import { bootstrapAuthFromEnv, isEnvAuthManaged } from '@/services/auth/bootstrap';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
};

export async function GET(req: NextRequest) {
  try {
    await bootstrapAuthFromEnv();
    const config = authDb.getConfig();
    const auth = await authenticateApiRequest(req);
    const passkeyCount = authDb.countPasskeys();

    const payload: AuthStatusResponse = {
      authEnabled: config.enabled === 1,
      authenticated: auth.authenticated,
      username: config.username,
      envManaged: isEnvAuthManaged(),
      hasPassword: Boolean(config.passwordHash && config.passwordSalt),
      hasPasskeys: passkeyCount > 0,
      passkeyCount,
      currentSessionId: auth.sessionId || null,
      sessionDurationDays: config.sessionDurationDays || 30,
    };

    return NextResponse.json(payload, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('[Auth] Failed to inspect session status:', error);
    return NextResponse.json(
      { error: 'Failed to check authentication status' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}