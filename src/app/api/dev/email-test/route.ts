import { NextRequest, NextResponse } from 'next/server';
import { isApiTesterEnabled } from '@/utils/devGate';
import { emlPayloadSchema } from '@/utils/validation';
import { inspectEmailBuffer } from '@/services/emailScanner';
import { requireApiAuth } from '@/services/auth/apiGuard';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
};

export async function GET(req: NextRequest) {
  const authCheck = await requireApiAuth(req);
  if (authCheck.response) return authCheck.response;

  if (!isApiTesterEnabled()) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404, headers: NO_STORE_HEADERS });
  }
  return NextResponse.json(
    { error: 'Method Not Allowed. Use POST /api/dev/email-test.' },
    { status: 405, headers: NO_STORE_HEADERS }
  );
}

export async function POST(req: NextRequest) {
  const authCheck = await requireApiAuth(req);
  if (authCheck.response) return authCheck.response;

  if (!isApiTesterEnabled()) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404, headers: NO_STORE_HEADERS });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Malformed JSON request body.' },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const parsed = emlPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid email payload.' },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  try {
    const diagnostic = await inspectEmailBuffer(Buffer.from(parsed.data.rawSource, 'utf8'));
    return NextResponse.json(
      {
        fileName: parsed.data.fileName || null,
        diagnostic,
      },
      { status: 200, headers: NO_STORE_HEADERS }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to parse email source.' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}