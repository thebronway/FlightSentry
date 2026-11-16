import { NextRequest, NextResponse } from 'next/server';
import { authDb } from '@/db/auth';
import { requireApiAuth } from '@/services/auth/apiGuard';
import { sessionDurationSchema } from '@/utils/authValidation';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
};

export async function PATCH(req: NextRequest) {
  const authCheck = await requireApiAuth(req);
  if (authCheck.response) return authCheck.response;

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = sessionDurationSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || 'Invalid session duration';
      return NextResponse.json({ error: msg }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const updated = authDb.updateSessionDuration(parsed.data.sessionDurationDays);
    return NextResponse.json(
      {
        success: true,
        sessionDurationDays: updated.sessionDurationDays,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error('[Auth] Failed to update session duration:', error);
    return NextResponse.json(
      { error: 'Failed to update session duration' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}