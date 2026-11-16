import { NextRequest } from 'next/server';
import { flightDb } from '@/db/flights';
import { historyDb } from '@/db/history';
import { settingsDb } from '@/db/settings';
import { requirePublicApiAuth } from '@/services/auth/apiGuard';
import {
  badRequestError,
  internalServerError,
  notFoundError,
  publicApiJson,
} from '@/services/publicApi/response';
import { serializePublicFlightSummary } from '@/services/publicApi/flightSerializer';
import { publicFlightHistoryEntrySchema } from '@/utils/validation';
import { expandAlliancesToAirlines } from '@/utils/airlineThemes';

export const dynamic = 'force-dynamic';

function parseFlightId(rawId: string): number | null {
  if (!/^\d+$/.test(rawId)) return null;
  const parsed = parseInt(rawId, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authCheck = await requirePublicApiAuth(req, 'write');
  if (authCheck.response) return authCheck.response;

  try {
    const id = parseFlightId(params.id);
    if (!id) {
      return authCheck.finish(
        badRequestError('Invalid flight ID.', undefined, authCheck.rateLimit)
      );
    }

    const flight = flightDb.getById(id);
    if (!flight) {
      return authCheck.finish(
        notFoundError('Flight not found.', authCheck.rateLimit)
      );
    }

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

    const parsedResult = publicFlightHistoryEntrySchema.safeParse(body);
    if (!parsedResult.success) {
      return authCheck.finish(
        badRequestError(
          parsedResult.error.issues[0]?.message ||
            'Invalid price history entry payload.',
          parsedResult.error.issues,
          authCheck.rateLimit
        )
      );
    }

    const parsed = parsedResult.data;
    let checkedAt: string;
    if (parsed.date) {
      const parsedDate = new Date(parsed.date);
      checkedAt = Number.isNaN(parsedDate.getTime())
        ? new Date().toISOString()
        : parsedDate.toISOString();
    } else {
      checkedAt = new Date().toISOString();
    }

    const cleanAirline = parsed.airline.trim().toUpperCase();
    const cleanFlightNumber = parsed.flightNumber
      ? parsed.flightNumber.trim()
      : null;

    const flightAirline = (flight.airline || '').trim().toUpperCase();
    const flightNum = (flight.flightNumber || '').trim();
    const allowedCarriers = expandAlliancesToAirlines(flight.includedAirlines);
    const excludedCarriers = expandAlliancesToAirlines(flight.excludedAirlines);

    const isRouteCarrierMatch = flightAirline
      ? cleanAirline === flightAirline
      : allowedCarriers.length > 0
      ? allowedCarriers.includes(cleanAirline)
      : !excludedCarriers.includes(cleanAirline);

    const isSameCarrier = cleanAirline === flightAirline;
    const isSameFlightNumber = (cleanFlightNumber || '') === flightNum;
    const isDirectMatch =
      flight.searchMode === 'Route'
        ? isRouteCarrierMatch
        : isSameCarrier && isSameFlightNumber;

    const itineraryPayload = [
      {
        airline: cleanAirline,
        flightNumber: cleanFlightNumber || undefined,
        origin: parsed.origin
          ? parsed.origin.trim().toUpperCase()
          : flight.origin || undefined,
        destination: parsed.destination
          ? parsed.destination.trim().toUpperCase()
          : flight.destination || undefined,
        price: parsed.price,
      },
    ];

    if (isDirectMatch) {
      historyDb.insert(id, parsed.price, 'Success', {
        airline: cleanAirline,
        flightNumber: cleanFlightNumber || flight.flightNumber,
        metadata:
          flight.searchMode === 'Route'
            ? JSON.stringify(itineraryPayload)
            : null,
        sourceUsed: 'manual',
        checkedAt,
      });

      const currentLatestTime = flight.updatedAt
        ? new Date(flight.updatedAt).getTime()
        : 0;
      if (new Date(checkedAt).getTime() >= currentLatestTime) {
        flightDb.updatePrice(id, parsed.price);
      }
    } else {
      historyDb.insert(id, parsed.price, 'Success', {
        airline: cleanAirline,
        flightNumber: cleanFlightNumber,
        metadata: JSON.stringify(itineraryPayload),
        sourceUsed: 'manual',
        checkedAt,
      });
    }

    const settings = settingsDb.get();
    const defaultCurrency = (settings.currency || 'USD').trim();
    const updatedFlight = flightDb.getById(id)!;
    const history = historyDb.getByFlightId(id);

    return authCheck.finish(
      publicApiJson(
        {
          recorded: true,
          directMatch: isDirectMatch,
          flight: serializePublicFlightSummary(updatedFlight, defaultCurrency),
          latestEntry: history[0] || null,
          totalHistoryCount: history.length,
        },
        { status: 201, rateLimit: authCheck.rateLimit }
      )
    );
  } catch (error) {
    console.error(
      '[PublicAPI] POST /api/v1/flights/[id]/history failed:',
      error
    );
    return authCheck.finish(
      internalServerError(
        'Failed to record price history entry.',
        authCheck.rateLimit
      )
    );
  }
}