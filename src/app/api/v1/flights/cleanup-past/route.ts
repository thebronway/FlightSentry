import { NextRequest } from 'next/server';
import { flightDb } from '@/db/flights';
import { settingsDb } from '@/db/settings';
import { expireOldFlights } from '@/services/scheduler';
import { cleanupPastFlightsSchema } from '@/utils/validation';
import { getTodayDateString, subtractDaysFromDateString } from '@/utils/date';
import { requirePublicApiAuth } from '@/services/auth/apiGuard';
import {
  badRequestError,
  internalServerError,
  publicApiJson,
} from '@/services/publicApi/response';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const authCheck = await requirePublicApiAuth(req, 'admin');
  if (authCheck.response) return authCheck.response;

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return authCheck.finish(
        badRequestError(
          'Request body must be a valid JSON object (e.g. {"scope":"all"} or {"scope":"retention","retentionDays":30}).',
          undefined,
          authCheck.rateLimit
        )
      );
    }

    const parsedResult = cleanupPastFlightsSchema.safeParse(body);
    if (!parsedResult.success) {
      return authCheck.finish(
        badRequestError(
          parsedResult.error.issues[0]?.message ||
            'Invalid cleanup-past payload.',
          parsedResult.error.issues,
          authCheck.rateLimit
        )
      );
    }

    const parsed = parsedResult.data;
    const settings = settingsDb.get();
    expireOldFlights(settings.timezone);

    let cutoffDate: string | null = null;
    if (parsed.scope === 'retention') {
      const todayStr = getTodayDateString(settings.timezone);
      cutoffDate = subtractDaysFromDateString(todayStr, parsed.retentionDays);
    }

    const deletedCount = flightDb.purgePastFlights(cutoffDate);
    const remainingPastCount = flightDb.countPastFlights(null);

    return authCheck.finish(
      publicApiJson(
        {
          deletedCount,
          remainingPastCount,
          cutoffDate,
        },
        { rateLimit: authCheck.rateLimit }
      )
    );
  } catch (error) {
    console.error(
      '[PublicAPI] POST /api/v1/flights/cleanup-past failed:',
      error
    );
    return authCheck.finish(
      internalServerError(
        'Failed to purge past flights.',
        authCheck.rateLimit
      )
    );
  }
}