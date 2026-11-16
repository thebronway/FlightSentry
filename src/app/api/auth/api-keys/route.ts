import { NextRequest, NextResponse } from 'next/server';
import { apiKeysDb } from '@/db/apiKeys';
import { requireApiAuth } from '@/services/auth/apiGuard';
import { generateApiKeyMaterial, hasRequiredScope } from '@/services/auth/apiKeys';
import { createApiKeySchema } from '@/utils/validation';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
};

export async function GET(req: NextRequest) {
  const authCheck = await requireApiAuth(req);
  if (authCheck.response) return authCheck.response;

  if (
    authCheck.auth.method === 'bearer' &&
    !hasRequiredScope(authCheck.auth.scopes, 'admin')
  ) {
    return NextResponse.json(
      { error: 'Admin scope is required to manage API keys.' },
      { status: 403, headers: NO_STORE_HEADERS }
    );
  }

  try {
    const keys = apiKeysDb.listAll();
    return NextResponse.json({ keys }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('[Auth] Failed to list API keys:', error);
    return NextResponse.json(
      { error: 'Failed to load API keys' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function POST(req: NextRequest) {
  const authCheck = await requireApiAuth(req);
  if (authCheck.response) return authCheck.response;

  if (
    authCheck.auth.method === 'bearer' &&
    !hasRequiredScope(authCheck.auth.scopes, 'admin')
  ) {
    return NextResponse.json(
      { error: 'Admin scope is required to create API keys.' },
      { status: 403, headers: NO_STORE_HEADERS }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = createApiKeySchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || 'Invalid API key configuration';
      return NextResponse.json({ error: msg }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const { rawKey, keyPrefix, keyHash } = generateApiKeyMaterial();
    const expiresAt =
      parsed.data.expiresInDays && parsed.data.expiresInDays > 0
        ? new Date(Date.now() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

    const created = apiKeysDb.create({
      name: parsed.data.name,
      keyPrefix,
      keyHash,
      scopes: [parsed.data.scope],
      expiresAt,
    });

    return NextResponse.json(
      {
        key: created,
        rawKey,
      },
      { status: 201, headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error('[Auth] Failed to create API key:', error);
    return NextResponse.json(
      { error: 'Failed to generate API key' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}