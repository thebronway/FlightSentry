import { NextRequest, NextResponse } from 'next/server';
import { authDb } from '@/db/auth';
import { authDisableSchema } from '@/utils/authValidation';
import { requireApiAuth } from '@/services/auth/apiGuard';
import { isEnvAuthManaged } from '@/services/auth/bootstrap';
import { verifyPassword } from '@/services/auth/password';
import { clearSessionCookie } from '@/services/auth/session';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
};

export async function POST(req: NextRequest) {
  try {
    if (isEnvAuthManaged()) {
      return NextResponse.json(
        {
          error:
            'Authentication is enforced by AUTH_USERNAME and AUTH_PASSWORD environment variables. Unset those variables in your container config to disable authentication.',
        },
        { status: 403, headers: NO_STORE_HEADERS }
      );
    }

    const authCheck = await requireApiAuth(req);
    if (authCheck.response) return authCheck.response;

    const currentConfig = authDb.getConfig();
    if (currentConfig.enabled !== 1) {
      return NextResponse.json(
        { success: true, authEnabled: false },
        { headers: NO_STORE_HEADERS }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = authDisableSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || 'Current password is required';
      return NextResponse.json({ error: msg }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const validPassword = await verifyPassword(
      parsed.data.currentPassword,
      currentConfig.passwordHash,
      currentConfig.passwordSalt
    );
    if (!validPassword) {
      return NextResponse.json(
        { error: 'Current password is incorrect.' },
        { status: 401, headers: NO_STORE_HEADERS }
      );
    }

    authDb.disableAuth();

    const response = NextResponse.json(
      { success: true, authEnabled: false },
      { headers: NO_STORE_HEADERS }
    );
    clearSessionCookie(req, response);
    return response;
  } catch (error) {
    console.error('[Auth] Failed to disable authentication:', error);
    return NextResponse.json(
      { error: 'Failed to disable authentication' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}