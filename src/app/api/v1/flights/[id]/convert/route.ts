import { NextRequest } from 'next/server';
import { flightDb } from '@/db/flights';
import { historyDb } from '@/db/history';
import { settingsDb } from '@/db/settings';
import { calculateNextCheck } from '@/utils/queue';
import { isPointsCurrency } from '@/utils/format';
import { requirePublicApiAuth } from '@/services/auth/apiGuard';
import {
  badRequestError,
  internalServerError,
  notFoundError,
  publicApiJson,
} from '@/services/publicApi/response';
import { serializePublicFlightSummary } from '@/services/publicApi/flightSerializer';
import { publicFlightConvertSchema } from '@/utils/validation';

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

    const existing = flightDb.getById(id);
    if (!existing) {
      return authCheck.finish(
        notFoundError('Flight not found.', authCheck.rateLimit)
      );
    }

    if (existing.status === 'Past') {
      return authCheck.finish(
        badRequestError(
          'Past flights cannot be converted to Booked.',
          undefined,
          authCheck.rateLimit
        )
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

    const parsedResult = publicFlightConvertSchema.safeParse(body);
    if (!parsedResult.success) {
      return authCheck.finish(
        badRequestError(
          parsedResult.error.issues[0]?.message ||
            'Invalid flight conversion payload.',
          parsedResult.error.issues,
          authCheck.rateLimit
        )
      );
    }

    const settings = settingsDb.get();
    const defaultCurrency = (settings.currency || 'USD').trim();
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

    const parsed = parsedResult.data;
    const cleanAirline = parsed.airline.trim().toUpperCase();
    const cleanFlightNumber = parsed.flightNumber.trim();
    const cleanPnr = parsed.pnr ? parsed.pnr.trim().toUpperCase() : null;
    const effectiveCurrency = parsed.currency || existing.currency;
    const isPointsBooking = Boolean(
      effectiveCurrency &&
        (isPointsCurrency(effectiveCurrency) || pointsList.includes(effectiveCurrency))
    );
    const effectiveIsManual = isPointsBooking ? 1 : existing.isManual ?? 0;
    const normalizedTaxesAmount =
      isPointsBooking && parsed.taxesAmount && parsed.taxesAmount > 0
        ? parsed.taxesAmount
        : null;
    const normalizedTaxesCurrency = normalizedTaxesAmount
      ? (parsed.taxesCurrency || defaultCurrency || 'USD').trim().toUpperCase()
      : null;

    flightDb.update(id, {
      status:
        effectiveIsManual === 1 || existing.status === 'Paused'
          ? 'Paused'
          : 'Booked',
      isManual: effectiveIsManual,
      disableNotifications:
        effectiveIsManual === 1 ? 1 : existing.disableNotifications,
      purchasePrice: parsed.purchasePrice,
      originalPurchasePrice:
        existing.originalPurchasePrice ?? parsed.purchasePrice,
      priceTrackingDirection: 'drop',
      airline: cleanAirline,
      bookingAirline: existing.bookingAirline || cleanAirline,
      flightNumber: cleanFlightNumber,
      pnr: cleanPnr,
      searchMode: 'FlightNumber',
      currency: effectiveCurrency,
      taxesAmount: normalizedTaxesAmount,
      taxesCurrency: normalizedTaxesCurrency,
      monitorRouteAlternatives:
        effectiveIsManual === 1
          ? 0
          : parsed.monitorRouteAlternatives !== undefined
          ? parsed.monitorRouteAlternatives
          : 1,
      origin: parsed.origin
        ? parsed.origin.trim().toUpperCase()
        : existing.origin,
      destination: parsed.destination
        ? parsed.destination.trim().toUpperCase()
        : existing.destination,
      includedAirlines:
        parsed.includedAirlines !== undefined
          ? parsed.includedAirlines
          : existing.includedAirlines,
      excludedAirlines:
        parsed.excludedAirlines !== undefined
          ? parsed.excludedAirlines
          : existing.excludedAirlines,
      maxStops:
        parsed.maxStops !== undefined ? parsed.maxStops : existing.maxStops,
      earliestDeparture:
        parsed.earliestDeparture !== undefined
          ? parsed.earliestDeparture
          : existing.earliestDeparture,
      latestDeparture:
        parsed.latestDeparture !== undefined
          ? parsed.latestDeparture
          : existing.latestDeparture,
      noRedeye:
        parsed.noRedeye !== undefined ? parsed.noRedeye : existing.noRedeye,
    });

    historyDb.insert(id, parsed.purchasePrice, 'Booked', {
      airline: cleanAirline,
      flightNumber: cleanFlightNumber,
      metadata: JSON.stringify({
        milestone: isPointsBooking ? 'Purchased Flight (Points)' : 'Purchased Flight',
        pnr: cleanPnr,
        taxesAmount: normalizedTaxesAmount,
        taxesCurrency: normalizedTaxesCurrency,
      }),
      sourceUsed: 'Price Paid',
    });
    const updated = flightDb.getById(id)!;
    const nextCheckAt = calculateNextCheck(updated, settings);
    flightDb.updateNextCheckAt(id, nextCheckAt);

    const finalFlight = flightDb.getById(id)!;
    return authCheck.finish(
      publicApiJson(
        {
          converted: true,
          flight: serializePublicFlightSummary(finalFlight, defaultCurrency),
        },
        { rateLimit: authCheck.rateLimit }
      )
    );
  } catch (error) {
    console.error(
      '[PublicAPI] POST /api/v1/flights/[id]/convert failed:',
      error
    );
    return authCheck.finish(
      internalServerError(
        'Failed to convert flight to Booked.',
        authCheck.rateLimit
      )
    );
  }
}