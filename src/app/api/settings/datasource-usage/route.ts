import { NextRequest, NextResponse } from 'next/server';
import { settingsDb } from '@/db/settings';
import { logsDb } from '@/db/logs';
import { checkAndResetQuota } from '@/services/quota';
import { manualUsageSchema } from '@/utils/validation';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = manualUsageSchema.parse(body);

    const currentSettings = settingsDb.get();
    checkAndResetQuota(currentSettings);

    const { previousUsed, newUsed } = settingsDb.adjustProviderUsage(
      parsed.provider,
      parsed.mode,
      parsed.value
    );

    const detailMessage =
      parsed.mode === 'increment'
        ? `Manually logged +${parsed.value} ${parsed.value === 1 ? 'query' : 'queries'} (${previousUsed} → ${newUsed} used)`
        : `Manual usage count set to ${newUsed} (was ${previousUsed})`;

    try {
      logsDb.insert({
        provider: parsed.provider,
        route: 'Manual Quota Adjustment',
        flightNumber: null,
        departureDate: null,
        status: 'Manual',
        statusCode: 200,
        errorMessage: detailMessage,
        durationMs: 0,
      });
    } catch (logErr) {
      console.error('[DataSourceUsage API] Failed to record audit log:', logErr);
    }

    const updatedSettings = settingsDb.get();
    return NextResponse.json(updatedSettings, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Data Source Usage API Error:', error);
    return NextResponse.json(
      { error: error.errors || error.message || 'Invalid usage adjustment request' },
      { status: 400 }
    );
  }
}