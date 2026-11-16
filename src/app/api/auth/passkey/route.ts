import { NextRequest, NextResponse } from 'next/server';
import { authDb } from '@/db/auth';
import { requireApiAuth } from '@/services/auth/apiGuard';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
};

export async function GET(req: NextRequest) {
  const authCheck = await requireApiAuth(req);
  if (authCheck.response) return authCheck.response;

  try {
    const passkeys = authDb.listPasskeysPublic();
    return NextResponse.json({ passkeys }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('[Auth] Failed to list passkeys:', error);
    return NextResponse.json(
      { error: 'Failed to load registered passkeys' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}