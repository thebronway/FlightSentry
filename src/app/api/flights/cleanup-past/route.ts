import { NextRequest, NextResponse } from 'next/server';
import { flightDb } from '@/db/flights';
import { settingsDb } from '@/db/settings';
import { expireOldFlights } from '@/services/scheduler';
import { cleanupPastFlightsSchema } from '@/utils/validation';
import { getTodayDateString, subtractDaysFromDateString } from '@/utils/date';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
};

export async function GET(req: NextRequest) {
  try {
    const settings = settingsDb.get();
    expireOldFlights(settings.timezone);

    const { searchParams } = new URL(req.url);
    const retentionParam = searchParams.get('retentionDays');

    let cutoffDate: string | null = null;
    if (retentionParam !== null && retentionParam.trim() !== '') {
      const parsedDays = Number(retentionParam);
      if (!Number.isInteger(parsedDays) || parsedDays < 1 || parsedDays > 3650) {
        return NextResponse.json(
          { error: 'retentionDays must be an integer between 1 and 3650' },
          { status: 400, headers: NO_STORE_HEADERS }
        );
      }
      const todayStr = getTodayDateString(settings.timezone);
      cutoffDate = subtractDaysFromDateString(todayStr, parsedDays);
    }

    const totalPastCount = flightDb.countPastFlights(null);
    const eligibleCount = cutoffDate
      ? flightDb.countPastFlights(cutoffDate)
      : totalPastCount;

    return NextResponse.json(
      {
        totalPastCount,
        eligibleCount,
        cutoffDate,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error('[CleanupPast API] GET failed:', error);
    return NextResponse.json(
      { error: 'Failed to inspect past flights count' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = cleanupPastFlightsSchema.parse(body);

    const settings = settingsDb.get();
    expireOldFlights(settings.timezone);

    let cutoffDate: string | null = null;
    if (parsed.scope === 'retention') {
      const todayStr = getTodayDateString(settings.timezone);
      cutoffDate = subtractDaysFromDateString(todayStr, parsed.retentionDays);
    }

    const deletedCount = flightDb.purgePastFlights(cutoffDate);
    const remainingPastCount = flightDb.countPastFlights(null);

    return NextResponse.json(
      {
        deletedCount,
        remainingPastCount,
        cutoffDate,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error: any) {
    console.error('[CleanupPast API] POST failed:', error);
    return NextResponse.json(
      { error: error?.errors || error?.message || 'Invalid cleanup request' },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }
}