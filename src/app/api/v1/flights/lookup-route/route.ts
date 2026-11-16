import { NextRequest } from 'next/server';
import { lookupFlightRoute } from '@/services/flightLookup';
import { logsDb } from '@/db/logs';
import { requirePublicApiAuth } from '@/services/auth/apiGuard';
import {
  badRequestError,
  internalServerError,
  notFoundError,
  publicApiJson,
} from '@/services/publicApi/response';
import { publicRouteLookupSchema } from '@/utils/validation';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const authCheck = await requirePublicApiAuth(req, 'read');
  if (authCheck.response) return authCheck.response;

  const startTime = Date.now();
  let cleanAirline = '';
  let cleanFlightNumber = '';
  let departureDate: string | undefined;

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return authCheck.finish(
        badRequestError(
          'Request body must be a valid JSON object.',
          undefined,
          authCheck.rateLimit
        )
      );
    }

    const parsedResult = publicRouteLookupSchema.safeParse(body);
    if (!parsedResult.success) {
      return authCheck.finish(
        badRequestError(
          parsedResult.error.issues[0]?.message ||
            'Valid carrier code and flight number are required.',
          parsedResult.error.issues,
          authCheck.rateLimit
        )
      );
    }

    cleanAirline = parsedResult.data.airline.trim().toUpperCase();
    cleanFlightNumber = parsedResult.data.flightNumber.replace(/\D/g, '');
    departureDate = parsedResult.data.departureDate?.trim() || undefined;

    if (!cleanFlightNumber || !/^\d{1,5}$/.test(cleanFlightNumber)) {
      return authCheck.finish(
        badRequestError(
          'Flight number must contain 1 to 5 numeric digits.',
          undefined,
          authCheck.rateLimit
        )
      );
    }

    const result = await lookupFlightRoute(
      cleanAirline,
      cleanFlightNumber,
      departureDate
    );
    const durationMs = Date.now() - startTime;

    const routeSummary =
      result.success && result.routes && result.routes.length > 1
        ? result.routes.map((r) => `${r.origin} → ${r.destination}`).join(', ')
        : result.success && result.origin && result.destination
        ? `${result.origin} → ${result.destination}`
        : null;

    const sourceDetail = result.success
      ? `Source: ${result.source || 'aviation-db'}${
          result.routes && result.routes.length > 1
            ? ` (${result.routes.length} routes)`
            : ''
        }`
      : 'Route not found';

    try {
      logsDb.insert({
        provider: 'flight-route-lookup',
        route: routeSummary,
        flightNumber: `${cleanAirline} ${cleanFlightNumber}`,
        departureDate: departureDate || null,
        status: result.success ? 'Success' : 'Error',
        statusCode: result.success ? 200 : 404,
        errorMessage: result.error || sourceDetail,
        durationMs,
      });
    } catch (logErr) {
      console.error(
        '[PublicAPI] Failed to record route lookup log:',
        logErr
      );
    }

    if (!result.success) {
      return authCheck.finish(
        notFoundError(
          result.error ||
            `No route found for ${cleanAirline} ${cleanFlightNumber}.`,
          authCheck.rateLimit
        )
      );
    }

    return authCheck.finish(
      publicApiJson(
        {
          airline: cleanAirline,
          flightNumber: cleanFlightNumber,
          departureDate: departureDate || null,
          origin: result.origin || null,
          destination: result.destination || null,
          routes: result.routes || [],
          source: result.source || 'aviation-db',
        },
        { rateLimit: authCheck.rateLimit }
      )
    );
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error(
      '[PublicAPI] POST /api/v1/flights/lookup-route failed:',
      error
    );

    try {
      logsDb.insert({
        provider: 'flight-route-lookup',
        route: null,
        flightNumber:
          cleanAirline && cleanFlightNumber
            ? `${cleanAirline} ${cleanFlightNumber}`
            : null,
        departureDate: departureDate || null,
        status: 'Error',
        statusCode: 500,
        errorMessage:
          error instanceof Error ? error.message : 'Route lookup failed',
        durationMs,
      });
    } catch {}

    return authCheck.finish(
      internalServerError('Route lookup failed.', authCheck.rateLimit)
    );
  }
}