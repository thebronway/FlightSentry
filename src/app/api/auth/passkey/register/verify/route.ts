import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/services/auth/apiGuard';
import { passkeyRegisterVerifySchema } from '@/utils/authValidation';
import { verifyAndSavePasskeyRegistration } from '@/services/auth/webauthn';
import { authDb } from '@/db/auth';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
};

export async function POST(req: NextRequest) {
  const authCheck = await requireApiAuth(req);
  if (authCheck.response) return authCheck.response;

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = passkeyRegisterVerifySchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || 'Invalid passkey registration payload';
      return NextResponse.json({ error: msg }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const passkey = await verifyAndSavePasskeyRegistration(
      req,
      parsed.data.name,
      parsed.data.response
    );

    return NextResponse.json(
      {
        success: true,
        passkey,
        passkeys: authDb.listPasskeysPublic(),
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error: any) {
    console.error('[Auth] Passkey registration verification error:', error);
    return NextResponse.json(
      { error: error?.message || 'Passkey registration verification failed' },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }
}