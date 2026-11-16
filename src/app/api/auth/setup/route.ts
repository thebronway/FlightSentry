import { NextRequest, NextResponse } from 'next/server';
import { authDb } from '@/db/auth';
import { authSetupSchema } from '@/utils/authValidation';
import { requireApiAuth } from '@/services/auth/apiGuard';
import { isEnvAuthManaged } from '@/services/auth/bootstrap';
import { hashPassword, verifyPassword } from '@/services/auth/password';
import { issueSessionAndAttachCookie } from '@/services/auth/session';
import { getClientIp } from '@/services/auth/rateLimit';

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
            'Authentication credentials are managed by AUTH_USERNAME and AUTH_PASSWORD environment variables.',
        },
        { status: 403, headers: NO_STORE_HEADERS }
      );
    }

    const authCheck = await requireApiAuth(req);
    if (authCheck.response) return authCheck.response;

    const body = await req.json().catch(() => ({}));
    const parsed = authSetupSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || 'Invalid credentials';
      return NextResponse.json({ error: msg }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const currentConfig = authDb.getConfig();
    if (currentConfig.enabled === 1) {
      const currentPassword = (parsed.data.currentPassword || '').trim();
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Current password is required to update credentials.' },
          { status: 400, headers: NO_STORE_HEADERS }
        );
      }

      const validCurrent = await verifyPassword(
        parsed.data.currentPassword!,
        currentConfig.passwordHash,
        currentConfig.passwordSalt
      );
      if (!validCurrent) {
        return NextResponse.json(
          { error: 'Current password is incorrect.' },
          { status: 401, headers: NO_STORE_HEADERS }
        );
      }
    }

    const { hash, salt } = await hashPassword(parsed.data.newPassword);
    const updated = authDb.enableOrUpdateCredentials({
      username: parsed.data.username,
      passwordHash: hash,
      passwordSalt: salt,
    });

    // Immediately revoke all prior sessions on password creation/change and issue a fresh session
    authDb.revokeAllSessions();

    const response = NextResponse.json(
      {
        success: true,
        authEnabled: updated.enabled === 1,
        username: updated.username,
      },
      { headers: NO_STORE_HEADERS }
    );

    issueSessionAndAttachCookie(req, response, updated.username, getClientIp(req));
    return response;
  } catch (error) {
    console.error('[Auth] Failed to configure credentials:', error);
    return NextResponse.json(
      { error: 'Failed to save authentication credentials' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}