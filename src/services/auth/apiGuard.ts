import { NextRequest, NextResponse } from 'next/server';
import { authDb } from '@/db/auth';
import { AuthContext } from '@/types';
import {
  SESSION_COOKIE_NAME,
  ensureAuthRuntimeEnv,
  verifySignedSessionToken,
} from './session';

/**
 * Extension hook for v0.9.1 Public API keys (`Authorization: Bearer fss_live_...`
 * or `X-API-Key`). Returns null in v0.9.0 until api_keys table is introduced.
 */
async function resolveBearerApiKey(_req: NextRequest): Promise<AuthContext | null> {
  return null;
}

export async function authenticateApiRequest(req: NextRequest): Promise<AuthContext> {
  ensureAuthRuntimeEnv();
  const config = authDb.getConfig();

  if (config.enabled !== 1) {
    return {
      authenticated: true,
      method: 'disabled',
      username: config.username,
    };
  }

  const bearerAuth = await resolveBearerApiKey(req);
  if (bearerAuth && bearerAuth.authenticated) {
    return bearerAuth;
  }

  const cookieToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const verified = verifySignedSessionToken(cookieToken);
  if (!verified) {
    return {
      authenticated: false,
      method: 'session',
    };
  }

  const session = authDb.getValidSession(verified.sessionId);
  if (!session) {
    return {
      authenticated: false,
      method: 'session',
    };
  }

  authDb.touchSession(session.id, session.lastActiveAt);

  return {
    authenticated: true,
    method: 'session',
    username: session.username,
    sessionId: session.id,
  };
}

export async function requireApiAuth(
  req: NextRequest
): Promise<{ auth: AuthContext; response?: never } | { auth?: never; response: NextResponse }> {
  const auth = await authenticateApiRequest(req);
  if (!auth.authenticated) {
    return {
      response: NextResponse.json(
        { error: 'Authentication required' },
        {
          status: 401,
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      ),
    };
  }
  return { auth };
}