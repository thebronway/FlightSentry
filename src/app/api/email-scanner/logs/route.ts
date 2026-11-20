import { NextRequest, NextResponse } from 'next/server';
import { emailScanLogsDb } from '@/db/emailScanLogs';
import { requireApiAuth } from '@/services/auth/apiGuard';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authCheck = await requireApiAuth(req);
  if (authCheck.response) return authCheck.response;

  try {
    const url = new URL(req.url);
    const limitParam = parseInt(url.searchParams.get('limit') || '50', 10);
    const limit = Number.isNaN(limitParam) ? 50 : Math.max(1, Math.min(200, limitParam));
    const logs = emailScanLogsDb.listRecent(limit);

    return NextResponse.json(
      { logs },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load email scan logs' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const authCheck = await requireApiAuth(req);
  if (authCheck.response) return authCheck.response;

  try {
    emailScanLogsDb.clear();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to clear email scan logs' },
      { status: 500 }
    );
  }
}