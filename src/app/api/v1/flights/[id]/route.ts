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
import {
  serializePublicFlightDetail,
  serializePublicFlightSummary,
} from '@/services/publicApi/flightSerializer';
import { publicFlightPatchSchema } from '@/utils/validation';
import { isPointsCurrency } from '@/utils/format';
import { isValidAirlineCode } from '@/utils/airline';
import { isMetroCode } from '@/utils/coLocations';
import { getTodayDateString } from '@/utils/date';
import { FlightStatus } from '@/types';

export const dynamic = 'force-dynamic';

function parseFlightId(rawId: string): number | null {
  if (!/^\d+$/.test(rawId)) return null;
  const parsed = parseInt(rawId, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authCheck = await requirePublicApiAuth(req, 'read');
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

    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    let limit = 50;
    if (limitParam !== null && limitParam.trim() !== '') {
      const parsedLimit = Number(limitParam);
      if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 200) {
        return authCheck.finish(
          badRequestError(
            'limit must be an integer between 1 and 200.',
            undefined,
            authCheck.rateLimit
          )
        );
      }
      limit = parsedLimit;
    }

    let offset = 0;
    if (offsetParam !== null && offsetParam.trim() !== '') {
      const parsedOffset = Number(offsetParam);
      if (!Number.isInteger(parsedOffset) || parsedOffset < 0) {
        return authCheck.finish(
          badRequestError(
            'offset must be a non-negative integer.',
            undefined,
            authCheck.rateLimit
          )
        );
      }
      offset = parsedOffset;
    }

    const settings = settingsDb.get();
    const allHistory = historyDb.getByFlightId(id);
    const pagedItems = allHistory.slice(offset, offset + limit);

    const detail = serializePublicFlightDetail(flight, allHistory, settings);

    return authCheck.finish(
      publicApiJson(
        {
          flight: detail,
          priceHistory: {
            items: pagedItems,
            total: allHistory.length,
            limit,
            offset,
            hasMore: offset + pagedItems.length < allHistory.length,
          },
        },
        { rateLimit: authCheck.rateLimit }
      )
    );
  } catch (error) {
    console.error('[PublicAPI] GET /api/v1/flights/[id] failed:', error);
    return authCheck.finish(
      internalServerError(
        'Failed to load flight details.',
        authCheck.rateLimit
      )
    );
  }
}

export async function PATCH(
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

    const existing = flightDb.getById(id);
    if (!existing) {
      return authCheck.finish(
        notFoundError('Flight not found.', authCheck.rateLimit)
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object' || Object.keys(body).length === 0) {
      return authCheck.finish(
        badRequestError(
          'Request body must contain at least one updatable field.',
          undefined,
          authCheck.rateLimit
        )
      );
    }

    const parsedResult = publicFlightPatchSchema.safeParse(body);
    if (!parsedResult.success) {
      return authCheck.finish(
        badRequestError(
          parsedResult.error.issues[0]?.message || 'Invalid flight update payload.',
          parsedResult.error.issues,
          authCheck.rateLimit
        )
      );
    }

    const patch = parsedResult.data;
    const settings = settingsDb.get();
    const defaultCurrency = (settings.currency || 'USD').trim();

    if (patch.departureDate !== undefined) {
      const todayStr = getTodayDateString(settings.timezone);
      if (patch.departureDate < todayStr) {
        return authCheck.finish(
          badRequestError(
            'Departure date cannot be in the past.',
            undefined,
            authCheck.rateLimit
          )
        );
      }
    }

    const effectiveSearchMode = patch.searchMode ?? existing.searchMode;
    const effectiveAirline =
      patch.airline !== undefined ? patch.airline : existing.airline;
    const effectiveFlightNumber =
      patch.flightNumber !== undefined
        ? patch.flightNumber
        : existing.flightNumber;
    const effectiveOrigin =
      patch.origin !== undefined ? patch.origin : existing.origin;
    const effectiveDestination =
      patch.destination !== undefined
        ? patch.destination
        : existing.destination;
    const effectiveMonitorRouteAlt =
      patch.monitorRouteAlternatives !== undefined
        ? patch.monitorRouteAlternatives
        : existing.monitorRouteAlternatives ?? 0;

    if (effectiveSearchMode === 'FlightNumber') {
      const cleanCarrier = (effectiveAirline || '').trim().toUpperCase();
      if (!isValidAirlineCode(cleanCarrier)) {
        return authCheck.finish(
          badRequestError(
            'Valid 2-character IATA carrier code is required when searchMode is FlightNumber.',
            undefined,
            authCheck.rateLimit
          )
        );
      }
      if (!effectiveFlightNumber || !effectiveFlightNumber.trim()) {
        return authCheck.finish(
          badRequestError(
            'flightNumber is required when searchMode is FlightNumber.',
            undefined,
            authCheck.rateLimit
          )
        );
      }
      if (effectiveMonitorRouteAlt !== 1) {
        if (
          effectiveOrigin &&
          (!/^[A-Z]{3}$/.test(effectiveOrigin) || isMetroCode(effectiveOrigin))
        ) {
          return authCheck.finish(
            badRequestError(
              'origin must be a single 3-letter IATA airport code unless monitorRouteAlternatives is 1.',
              undefined,
              authCheck.rateLimit
            )
          );
        }
        if (
          effectiveDestination &&
          (!/^[A-Z]{3}$/.test(effectiveDestination) ||
            isMetroCode(effectiveDestination))
        ) {
          return authCheck.finish(
            badRequestError(
              'destination must be a single 3-letter IATA airport code unless monitorRouteAlternatives is 1.',
              undefined,
              authCheck.rateLimit
            )
          );
        }
      }
    }

    let pointsList: string[] = [];
    if (settings.pointsCurrencies) {
      try {
        const p =
          typeof settings.pointsCurrencies === 'string'
            ? JSON.parse(settings.pointsCurrencies)
            : settings.pointsCurrencies;
        if (Array.isArray(p)) pointsList = p;
      } catch {}
    }

    const effectiveCurrency =
      patch.currency !== undefined ? patch.currency : existing.currency;
    const isPointsFlight = Boolean(
      effectiveCurrency &&
        (isPointsCurrency(effectiveCurrency) || pointsList.includes(effectiveCurrency))
    );
    const effectiveIsManual = isPointsFlight
      ? 1
      : patch.isManual !== undefined
      ? patch.isManual
      : existing.isManual ?? 0;

    let normalizedTaxesAmount: number | null = null;
    let normalizedTaxesCurrency: string | null = null;
    if (isPointsFlight) {
      if (patch.taxesAmount !== undefined) {
        if (patch.taxesAmount !== null && patch.taxesAmount > 0) {
          normalizedTaxesAmount = patch.taxesAmount;
          normalizedTaxesCurrency = (
            patch.taxesCurrency ||
            existing.taxesCurrency ||
            defaultCurrency ||
            'USD'
          )
            .trim()
            .toUpperCase();
        }
      } else if (
        existing.taxesAmount !== null &&
        existing.taxesAmount !== undefined &&
        existing.taxesAmount > 0
      ) {
        normalizedTaxesAmount = existing.taxesAmount;
        normalizedTaxesCurrency = (
          patch.taxesCurrency ||
          existing.taxesCurrency ||
          defaultCurrency ||
          'USD'
        )
          .trim()
          .toUpperCase();
      }
    }

    // Enforce manual/points pause guard when caller attempts to resume automated checks
    if (
      effectiveIsManual === 1 &&
      patch.status !== undefined &&
      patch.status !== 'Paused' &&
      patch.status !== 'Past'
    ) {
      return authCheck.finish(
        badRequestError(
          'Automated tracking cannot be enabled or resumed for Manual or Points flights.',
          undefined,
          authCheck.rateLimit
        )
      );
    }

    const nextStatus: FlightStatus =
      isPointsFlight || effectiveIsManual === 1
        ? patch.status === 'Past'
          ? 'Past'
          : 'Paused'
        : patch.status ?? existing.status;

    flightDb.update(id, {
      ...patch,
      baselinePrice: patch.baselinePrice ?? existing.baselinePrice,
      origin: effectiveOrigin ?? null,
      destination: effectiveDestination ?? null,
      airline: effectiveAirline ?? '',
      bookingAirline:
        patch.bookingAirline !== undefined
          ? patch.bookingAirline || effectiveAirline || null
          : existing.bookingAirline || effectiveAirline || null,
      flightNumber: effectiveFlightNumber ?? null,
      currency: effectiveCurrency ?? null,
      taxesAmount: normalizedTaxesAmount,
      taxesCurrency: normalizedTaxesCurrency,
      isManual: effectiveIsManual,
      status: nextStatus,
      monitorRouteAlternatives:
        effectiveIsManual === 1 || nextStatus === 'Paused'
          ? 0
          : effectiveMonitorRouteAlt,
    });

    const updated = flightDb.getById(id)!;
    return authCheck.finish(
      publicApiJson(
        {
          flight: serializePublicFlightSummary(updated, defaultCurrency),
        },
        { rateLimit: authCheck.rateLimit }
      )
    );
  } catch (error) {
    console.error('[PublicAPI] PATCH /api/v1/flights/[id] failed:', error);
    return authCheck.finish(
      internalServerError('Failed to update flight.', authCheck.rateLimit)
    );
  }
}

export async function DELETE(
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

    const existing = flightDb.getById(id);
    if (!existing) {
      return authCheck.finish(
        notFoundError('Flight not found.', authCheck.rateLimit)
      );
    }

    historyDb.deleteByFlightId(id);
    flightDb.delete(id);

    return authCheck.finish(
      publicApiJson(
        {
          deleted: true,
          id,
        },
        { rateLimit: authCheck.rateLimit }
      )
    );
  } catch (error) {
    console.error('[PublicAPI] DELETE /api/v1/flights/[id] failed:', error);
    return authCheck.finish(
      internalServerError('Failed to delete flight.', authCheck.rateLimit)
    );
  }
}