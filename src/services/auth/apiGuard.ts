import { NextRequest, NextResponse } from 'next/server';
import { authDb } from '@/db/auth';
import { apiKeysDb } from '@/db/apiKeys';
import { ApiKeyScope, AuthContext } from '@/types';
import {
  SESSION_COOKIE_NAME,
  ensureAuthRuntimeEnv,
  verifySignedSessionToken,
} from './session';
import {
  hasRequiredScope,
  hashApiKey,
  isValidApiKeyFormat,
  parseApiKeyScopes,
} from './apiKeys';
import { ApiKeyRateLimitResult, checkApiKeyRateLimit } from './apiKeyRateLimit';
import {
  forbiddenError,
  rateLimitError,
  unauthorizedError,
  withPublicApiAudit,
} from '@/services/publicApi/response';

function extractRawApiKey(req: NextRequest): string | null {
  const authHeader = (req.headers.get('authorization') || '').trim();
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }

  const xApiKey = (req.headers.get('x-api-key') || '').trim();
  if (xApiKey) return xApiKey;

  return null;
}

async function resolveBearerApiKey(req: NextRequest): Promise<AuthContext | null> {
  const rawKey = extractRawApiKey(req);
  if (!rawKey || !isValidApiKeyFormat(rawKey)) {
    return null;
  }

  const keyHash = hashApiKey(rawKey);
  const record = apiKeysDb.findByHash(keyHash);
  if (!record) {
    return null;
  }

  if (record.revokedAt) {
    return null;
  }

  if (record.expiresAt) {
    const expiresMs = Date.parse(record.expiresAt);
    if (!Number.isNaN(expiresMs) && expiresMs <= Date.now()) {
      return null;
    }
  }

  const scopes = parseApiKeyScopes(record.scopes);
  apiKeysDb.touchLastUsed(record.id, record.lastUsedAt);

  return {
    authenticated: true,
    method: 'bearer',
    username: `api-key:${record.name}`,
    apiKeyId: record.id,
    apiKeyPrefix: record.keyPrefix,
    scopes,
  };
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

export interface PublicApiAuthSuccess {
  auth: AuthContext;
  rateLimit: ApiKeyRateLimitResult;
  startTimeMs: number;
  finish: (res: NextResponse) => NextResponse;
  response?: never;
}

export interface PublicApiAuthFailure {
  auth?: never;
  response: NextResponse;
}

/**
 * Enforces API key authentication (`Authorization: Bearer fss_live_...` or `X-API-Key`),
 * per-key sliding-window rate limits, scope authorization (`read` / `write` / `admin`),
 * and audit logging ahead of the web-login-disabled check.
 */
export async function requirePublicApiAuth(
  req: NextRequest,
  requiredScope: ApiKeyScope
): Promise<PublicApiAuthSuccess | PublicApiAuthFailure> {
  const startTimeMs = Date.now();
  const rawKey = extractRawApiKey(req);
  const unauthContext: AuthContext = {
    authenticated: false,
    method: 'bearer',
  };

  if (!rawKey) {
    const res = unauthorizedError(
      'API key required. Supply an Authorization: Bearer <key> or X-API-Key header.'
    );
    return {
      response: withPublicApiAudit(req, unauthContext, undefined, startTimeMs, res),
    };
  }

  const bearerAuth = await resolveBearerApiKey(req);
  if (!bearerAuth || !bearerAuth.authenticated || !bearerAuth.apiKeyId) {
    const res = unauthorizedError('Invalid, expired, or revoked API key.');
    return {
      response: withPublicApiAudit(req, unauthContext, undefined, startTimeMs, res),
    };
  }

  const rateLimit = checkApiKeyRateLimit(bearerAuth.apiKeyId);
  if (!rateLimit.allowed) {
    const res = rateLimitError(rateLimit);
    return {
      response: withPublicApiAudit(req, bearerAuth, rateLimit, startTimeMs, res),
    };
  }

  if (!hasRequiredScope(bearerAuth.scopes, requiredScope)) {
    const res = forbiddenError(
      `This endpoint requires the '${requiredScope}' scope.`,
      rateLimit
    );
    return {
      response: withPublicApiAudit(req, bearerAuth, rateLimit, startTimeMs, res),
    };
  }

  return {
    auth: bearerAuth,
    rateLimit,
    startTimeMs,
    finish: (res: NextResponse) =>
      withPublicApiAudit(req, bearerAuth, rateLimit, startTimeMs, res),
  };
}