import { NextRequest, NextResponse } from 'next/server';
import { searchTelemetryDb } from '@/db/searchTelemetry';
import { requireApiAuth } from '@/services/auth/apiGuard';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authCheck = await requireApiAuth(req);
  if (authCheck.response) return authCheck.response;

  try {
    const searches = searchTelemetryDb.getActiveAndRecent(8000);
    return NextResponse.json(
      {
        searches,
        serverTime: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error: any) {
    console.error('Error fetching search telemetry:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch search telemetry' },
      { status: 500 }
    );
  }
}