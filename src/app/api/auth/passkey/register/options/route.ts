import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/services/auth/apiGuard';
import { createPasskeyRegistrationOptions } from '@/services/auth/webauthn';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
};

export async function POST(req: NextRequest) {
  const authCheck = await requireApiAuth(req);
  if (authCheck.response) return authCheck.response;

  try {
    const options = await createPasskeyRegistrationOptions(req);
    return NextResponse.json(options, { headers: NO_STORE_HEADERS });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Unable to generate passkey registration options' },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }
}