import { NextRequest } from 'next/server';
import { flightDb } from '@/db/flights';
import { settingsDb } from '@/db/settings';
import { historyDb } from '@/db/history';
import { executeSearchStrategy } from '@/services/datasource';
import { evaluatePrice } from '@/services/evaluator';
import { checkAndResetQuota, canMakeApiCall } from '@/services/quota';
import { calculateNextCheck } from '@/utils/queue';
import { isPointsCurrency } from '@/utils/format';
import { getTodayDateString } from '@/utils/date';
import { requirePublicApiAuth } from '@/services/auth/apiGuard';
import {
  badRequestError,
  internalServerError,
  notFoundError,
  publicApiError,
  publicApiJson,
} from '@/services/publicApi/response';
import { serializePublicFlightSummary } from '@/services/publicApi/flightSerializer';

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

    if (flight.isManual === 1 || isPointsCurrency(flight.currency)) {
      return authCheck.finish(
        badRequestError(
          'Automated price checks are disabled for Manual and Points flights. Use POST /api/v1/flights/:id/history instead.',
          undefined,
          authCheck.rateLimit
        )
      );
    }

    let settings = settingsDb.get();
    const todayStr = getTodayDateString(settings.timezone);
    if (flight.status === 'Past' || flight.departureDate < todayStr) {
      return authCheck.finish(
        badRequestError(
          'Live price checks are disabled for past flights.',
          undefined,
          authCheck.rateLimit
        )
      );
    }

    settings = checkAndResetQuota(settings);

    if (!canMakeApiCall(settings)) {
      return authCheck.finish(
        publicApiError({
          status: 429,
          code: 'quota_exceeded_or_paused',
          message:
            'Monthly API quota exceeded, no providers are enabled, or Global Pause is active.',
          rateLimit: authCheck.rateLimit,
        })
      );
    }

    if (
      settings.circuitBreakerUntil &&
      new Date(settings.circuitBreakerUntil) > new Date()
    ) {
      return authCheck.finish(
        publicApiError({
          status: 429,
          code: 'circuit_breaker_active',
          message: `Circuit breaker active until ${settings.circuitBreakerUntil}.`,
          rateLimit: authCheck.rateLimit,
        })
      );
    }

    const previousPrice = flight.currentPrice;
    const result = await executeSearchStrategy(flight, settings);

    if (
      result.status === 'RateLimited' &&
      result.sourceUsed !== 'openfarescraper'
    ) {
      const pauseHours = Math.random() * (8 - 4) + 4;
      const pauseUntil = new Date(
        Date.now() + pauseHours * 3600000
      ).toISOString();
      settingsDb.update({ circuitBreakerUntil: pauseUntil });
      return authCheck.finish(
        publicApiError({
          status: 429,
          code: 'provider_rate_limited',
          message: 'Upstream provider rate limit hit. Circuit breaker triggered.',
          rateLimit: authCheck.rateLimit,
        })
      );
    }

    const shouldIncrementUsage =
      result.status !== 'Error' &&
      result.status !== 'Paused' &&
      !(
        result.sourceUsed === 'openfarescraper' &&
        result.status === 'RateLimited'
      ) &&
      Boolean(result.sourceUsed);

    if (shouldIncrementUsage && result.sourceUsed) {
      settingsDb.incrementApiUsage(result.sourceUsed);
    }

    if (result.status === 'Success' && result.price !== null) {
      await evaluatePrice(flight, result.price, settings, {
        airline: result.leadingAirline,
        flightNumber: result.leadingFlightNumber,
        metadata: result.itineraries
          ? JSON.stringify(result.itineraries)
          : null,
        sourceUsed: result.sourceUsed,
        itineraries: result.itineraries,
      });
    } else {
      historyDb.insert(flight.id, flight.currentPrice, result.status, {
        airline: result.leadingAirline || flight.airline,
        flightNumber: result.leadingFlightNumber || flight.flightNumber,
        metadata: result.itineraries
          ? JSON.stringify(result.itineraries)
          : null,
        sourceUsed: result.sourceUsed,
      });
    }

    const nextCheckAt = calculateNextCheck(flight, settings);
    flightDb.updateNextCheckAt(flight.id, nextCheckAt);

    const updatedFlight = flightDb.getById(flight.id)!;
    const defaultCurrency = (settings.currency || 'USD').trim();

    return authCheck.finish(
      publicApiJson(
        {
          success: result.status === 'Success',
          status: result.status,
          price: result.status === 'Success' ? result.price : null,
          previousPrice,
          providerUsed: result.sourceUsed || null,
          nextCheckAt,
          flight: serializePublicFlightSummary(updatedFlight, defaultCurrency),
        },
        { rateLimit: authCheck.rateLimit }
      )
    );
  } catch (error) {
    console.error('[PublicAPI] POST /api/v1/flights/[id]/check failed:', error);
    return authCheck.finish(
      internalServerError(
        'Failed to execute live price check.',
        authCheck.rateLimit
      )
    );
  }
}