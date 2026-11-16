import { NextRequest, NextResponse } from 'next/server';
import { authDb } from '@/db/auth';
import { requireApiAuth } from '@/services/auth/apiGuard';
import { passkeyRenameSchema } from '@/utils/authValidation';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
};

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const authCheck = await requireApiAuth(req);
  if (authCheck.response) return authCheck.response;

  try {
    const id = parseInt(params.id, 10);
    if (Number.isNaN(id) || id <= 0) {
      return NextResponse.json({ error: 'Invalid passkey ID' }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = passkeyRenameSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || 'Invalid passkey name';
      return NextResponse.json({ error: msg }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const updated = authDb.renamePasskey(id, parsed.data.name);
    if (!updated) {
      return NextResponse.json({ error: 'Passkey not found' }, { status: 404, headers: NO_STORE_HEADERS });
    }

    return NextResponse.json(
      { success: true, passkeys: authDb.listPasskeysPublic() },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error('[Auth] Failed to rename passkey:', error);
    return NextResponse.json(
      { error: 'Failed to rename passkey' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const authCheck = await requireApiAuth(req);
  if (authCheck.response) return authCheck.response;

  try {
    const id = parseInt(params.id, 10);
    if (Number.isNaN(id) || id <= 0) {
      return NextResponse.json({ error: 'Invalid passkey ID' }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const deleted = authDb.deletePasskey(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Passkey not found' }, { status: 404, headers: NO_STORE_HEADERS });
    }

    return NextResponse.json(
      { success: true, passkeys: authDb.listPasskeysPublic() },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error('[Auth] Failed to delete passkey:', error);
    return NextResponse.json(
      { error: 'Failed to remove passkey' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}