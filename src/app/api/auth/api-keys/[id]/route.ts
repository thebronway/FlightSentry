import { NextRequest, NextResponse } from 'next/server';
import { apiKeysDb } from '@/db/apiKeys';
import { requireApiAuth } from '@/services/auth/apiGuard';
import { hasRequiredScope } from '@/services/auth/apiKeys';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
};

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const authCheck = await requireApiAuth(req);
  if (authCheck.response) return authCheck.response;

  if (
    authCheck.auth.method === 'bearer' &&
    !hasRequiredScope(authCheck.auth.scopes, 'admin')
  ) {
    return NextResponse.json(
      { error: 'Admin scope is required to revoke API keys.' },
      { status: 403, headers: NO_STORE_HEADERS }
    );
  }

  try {
    const id = parseInt(params.id, 10);
    if (Number.isNaN(id) || id <= 0) {
      return NextResponse.json(
        { error: 'Invalid API key ID' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const { searchParams } = new URL(req.url);
    const mode = (searchParams.get('mode') || 'revoke').trim().toLowerCase();

    if (mode === 'permanent') {
      const existing = apiKeysDb.getById(id);
      if (!existing) {
        return NextResponse.json(
          { error: 'API key not found' },
          { status: 404, headers: NO_STORE_HEADERS }
        );
      }
      if (!existing.isRevoked) {
        return NextResponse.json(
          { error: 'Revoke the API key before permanently deleting it.' },
          { status: 400, headers: NO_STORE_HEADERS }
        );
      }

      const deleted = apiKeysDb.deleteRevoked(id);
      if (!deleted) {
        return NextResponse.json(
          { error: 'Failed to delete revoked API key' },
          { status: 500, headers: NO_STORE_HEADERS }
        );
      }

      return NextResponse.json(
        { success: true, deleted: true, keys: apiKeysDb.listAll() },
        { headers: NO_STORE_HEADERS }
      );
    }

    const revoked = apiKeysDb.revoke(id);
    if (!revoked) {
      return NextResponse.json(
        { error: 'API key not found or already revoked' },
        { status: 404, headers: NO_STORE_HEADERS }
      );
    }

    return NextResponse.json(
      { success: true, keys: apiKeysDb.listAll() },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error('[Auth] Failed to revoke API key:', error);
    return NextResponse.json(
      { error: 'Failed to revoke API key' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}