import { NextRequest } from 'next/server';
import { flightDb } from '@/db/flights';
import { historyDb } from '@/db/history';
import { settingsDb } from '@/db/settings';
import { requirePublicApiAuth } from '@/services/auth/apiGuard';
import {
  badRequestError,
  internalServerError,
  publicApiJson,
} from '@/services/publicApi/response';
import { serializePublicFlightSummary } from '@/services/publicApi/flightSerializer';
import { publicFlightCreateSchema } from '@/utils/validation';
import { executeSearchStrategy } from '@/services/datasource';
import { getDataSourceStatus } from '@/utils/airline';
import { isPointsCurrency } from '@/utils/format';
import { checkAndResetQuota } from '@/services/quota';
import { calculateNextCheck } from '@/utils/queue';
import { expireOldFlights } from '@/services/scheduler';
import { getTodayDateString } from '@/utils/date';
import { serializeFlightLegs } from '@/utils/flightLegs';
import { Flight, FlightStatus } from '@/types';

export const dynamic = 'force-dynamic';

const VALID_STATUS_FILTERS = new Set(['watching', 'booked', 'paused', 'past']);
const VALID_MODE_FILTERS = new Set(['route', 'flightnumber']);

export async function GET(req: NextRequest) {
  const authCheck = await requirePublicApiAuth(req, 'read');
  if (authCheck.response) return authCheck.response;

  try {
    const settings = settingsDb.get();
    expireOldFlights(settings.timezone);

    const { searchParams } = new URL(req.url);
    const statusParam = (searchParams.get('status') || '').trim().toLowerCase();
    const searchModeParam = (searchParams.get('searchMode') || '')
      .trim()
      .toLowerCase();
    const airlineParam = (searchParams.get('airline') || '')
      .trim()
      .toUpperCase();
    const originParam = (searchParams.get('origin') || '').trim().toUpperCase();
    const destinationParam = (searchParams.get('destination') || '')
      .trim()
      .toUpperCase();
    const isManualParam = (searchParams.get('isManual') || '')
      .trim()
      .toLowerCase();
    const currencyParam = (searchParams.get('currency') || '')
      .trim()
      .toLowerCase();

    if (statusParam && !VALID_STATUS_FILTERS.has(statusParam)) {
      return authCheck.finish(
        badRequestError(
          'Invalid status filter. Allowed values: Watching, Booked, Paused, Past.',
          undefined,
          authCheck.rateLimit
        )
      );
    }

    if (searchModeParam && !VALID_MODE_FILTERS.has(searchModeParam)) {
      return authCheck.finish(
        badRequestError(
          'Invalid searchMode filter. Allowed values: Route, FlightNumber.',
          undefined,
          authCheck.rateLimit
        )
      );
    }

    let isManualFilter: boolean | null = null;
    if (isManualParam !== '') {
      if (isManualParam === 'true' || isManualParam === '1') {
        isManualFilter = true;
      } else if (isManualParam === 'false' || isManualParam === '0') {
        isManualFilter = false;
      } else {
        return authCheck.finish(
          badRequestError(
            'Invalid isManual filter. Allowed values: true, false, 1, 0.',
            undefined,
            authCheck.rateLimit
          )
        );
      }
    }

    const defaultCurrency = (settings.currency || 'USD').trim();
    let flights = flightDb.getAll();

    if (statusParam) {
      flights = flights.filter((f) => f.status.toLowerCase() === statusParam);
    }
    if (searchModeParam) {
      flights = flights.filter(
        (f) => f.searchMode.toLowerCase() === searchModeParam
      );
    }
    if (airlineParam) {
      flights = flights.filter((f) => {
        const primary = (f.airline || '').toUpperCase();
        const booking = (f.bookingAirline || '').toUpperCase();
        return primary === airlineParam || booking === airlineParam;
      });
    }
    if (originParam) {
      flights = flights.filter((f) => {
        const tokens = (f.origin || '')
          .split(',')
          .map((t) => t.trim().toUpperCase())
          .filter(Boolean);
        return tokens.includes(originParam);
      });
    }
    if (destinationParam) {
      flights = flights.filter((f) => {
        const tokens = (f.destination || '')
          .split(',')
          .map((t) => t.trim().toUpperCase())
          .filter(Boolean);
        return tokens.includes(destinationParam);
      });
    }
    if (isManualFilter !== null) {
      flights = flights.filter((f) => (f.isManual === 1) === isManualFilter);
    }
    if (currencyParam) {
      flights = flights.filter((f) => {
        const effectiveCurrency = (f.currency || defaultCurrency).toLowerCase();
        return effectiveCurrency === currencyParam;
      });
    }

    const serialized = flights.map((f) =>
      serializePublicFlightSummary(f, defaultCurrency)
    );

    return authCheck.finish(
      publicApiJson(
        {
          flights: serialized,
          count: serialized.length,
          defaultCurrency,
        },
        { rateLimit: authCheck.rateLimit }
      )
    );
  } catch (error) {
    console.error('[PublicAPI] GET /api/v1/flights failed:', error);
    return authCheck.finish(
      internalServerError('Failed to fetch flights.', authCheck.rateLimit)
    );
  }
}

export async function POST(req: NextRequest) {
  const authCheck = await requirePublicApiAuth(req, 'write');
  if (authCheck.response) return authCheck.response;

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

    const parsedResult = publicFlightCreateSchema.safeParse(body);
    if (!parsedResult.success) {
      return authCheck.finish(
        badRequestError(
          parsedResult.error.issues[0]?.message || 'Invalid flight payload.',
          parsedResult.error.issues,
          authCheck.rateLimit
        )
      );
    }

    const parsed = parsedResult.data;
    const runInitialCheck = parsed.runInitialCheck !== false;
    const normalizedLegs = Array.isArray(parsed.legs) && parsed.legs.length >= 2 ? parsed.legs : null;
    const serializedLegs = serializeFlightLegs(normalizedLegs);
    const effectiveOrigin = normalizedLegs ? normalizedLegs[0].origin : parsed.origin;
    const effectiveDestination = normalizedLegs ? normalizedLegs[normalizedLegs.length - 1].destination : parsed.destination;
    const effectiveAirline = normalizedLegs ? normalizedLegs[0].airline : parsed.airline;
    const effectiveFlightNumber = normalizedLegs ? normalizedLegs[0].flightNumber : parsed.flightNumber;

    let baselinePrice = parsed.baselinePrice;
    if (
      (!baselinePrice || baselinePrice <= 0) &&
      parsed.purchasePrice &&
      parsed.purchasePrice > 0
    ) {
      baselinePrice = parsed.purchasePrice;
    }

    let settings = settingsDb.get();
    const defaultCurrency = (settings.currency || 'USD').trim();
    const todayStr = getTodayDateString(settings.timezone);
    if (parsed.departureDate < todayStr) {
      return authCheck.finish(
        badRequestError(
          'Departure date cannot be in the past.',
          undefined,
          authCheck.rateLimit
        )
      );
    }

    const isBooked = Boolean(
      (parsed.purchasePrice && parsed.purchasePrice > 0) || parsed.pnr
    );
    const initialStatus: FlightStatus =
      parsed.status === 'Paused'
        ? 'Paused'
        : parsed.status === 'Booked'
        ? 'Booked'
        : parsed.status === 'Watching'
        ? 'Watching'
        : isBooked
        ? 'Booked'
        : 'Watching';

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

    const isPointsFlight = Boolean(
      parsed.currency &&
        (isPointsCurrency(parsed.currency) ||
          pointsList.includes(parsed.currency))
    );

    // Manual or Points flights bypass automated searches
    if (isPointsFlight || parsed.isManual === 1) {
      if (
        parsed.searchMode === 'Route' ||
        !effectiveAirline ||
        !effectiveFlightNumber
      ) {
        return authCheck.finish(
          badRequestError(
            'Manual and Points tracking require a specific flight (Carrier and Flight Number).',
            undefined,
            authCheck.rateLimit
          )
        );
      }

      const initialAmount = isBooked
        ? parsed.purchasePrice || 0
        : baselinePrice || 0;
      const manualNextCheckAt = new Date(
        Date.now() + 365 * 24 * 3600 * 1000
      ).toISOString();
      const normalizedTaxesAmount =
        isPointsFlight && isBooked && parsed.taxesAmount && parsed.taxesAmount > 0
          ? parsed.taxesAmount
          : null;
      const normalizedTaxesCurrency = normalizedTaxesAmount
        ? (parsed.taxesCurrency || defaultCurrency || 'USD').trim().toUpperCase()
        : null;

      const newFlightId = flightDb.create({
        ...parsed,
        origin: effectiveOrigin,
        destination: effectiveDestination,
        airline: effectiveAirline,
        bookingAirline: parsed.bookingAirline || effectiveAirline || null,
        flightNumber: effectiveFlightNumber,
        legs: serializedLegs,
        cabinClass: parsed.cabinClass,
        fareTier: parsed.fareTier,
        baselinePrice: initialAmount,
        purchasePrice: parsed.purchasePrice ?? null,
        minDropDollar: parsed.minDropDollar ?? null,
        minDropPercent: parsed.minDropPercent ?? null,
        maxStops: parsed.maxStops ?? null,
        currentPrice: initialAmount,
        currency: parsed.currency,
        taxesAmount: normalizedTaxesAmount,
        taxesCurrency: normalizedTaxesCurrency,
        status: 'Paused',
        isManual: 1,
        monitorRouteAlternatives: 0,
        nextCheckAt: manualNextCheckAt,
      });

      if (isBooked && parsed.purchasePrice && parsed.purchasePrice > 0) {
        historyDb.insert(newFlightId, parsed.purchasePrice, 'Booked', {
          airline: parsed.airline || null,
          flightNumber: parsed.flightNumber || null,
          metadata: JSON.stringify({
            milestone: isPointsFlight
              ? 'Purchased Flight (Points)'
              : 'Purchased Flight (Manual)',
            pnr: parsed.pnr || null,
            taxesAmount: normalizedTaxesAmount,
            taxesCurrency: normalizedTaxesCurrency,
          }),
          sourceUsed: 'Price Paid',
        });
      } else {
        historyDb.insert(newFlightId, initialAmount, 'Success', {
          airline: parsed.airline || null,
          flightNumber: parsed.flightNumber || null,
          metadata: JSON.stringify({
            milestone: isPointsFlight
              ? 'Initial Baseline (Points)'
              : 'Initial Baseline (Manual)',
          }),
          sourceUsed: 'manual',
        });
      }

      const created = flightDb.getById(newFlightId)!;
      return authCheck.finish(
        publicApiJson(
          {
            flight: serializePublicFlightSummary(created, defaultCurrency),
            initialCheckExecuted: false,
          },
          { status: 201, rateLimit: authCheck.rateLimit }
        )
      );
    }

    // Automated flight with runInitialCheck === false
    if (!runInitialCheck) {
      if (!baselinePrice || baselinePrice <= 0) {
        return authCheck.finish(
          badRequestError(
            'baselinePrice or purchasePrice is required when runInitialCheck is false.',
            undefined,
            authCheck.rateLimit
          )
        );
      }

      const isRouteMode = parsed.searchMode === 'Route';
      const finalAirline = isRouteMode
        ? effectiveAirline || ''
        : effectiveAirline || '';
      const finalBookingAirline = parsed.bookingAirline || finalAirline || null;
      const finalFlightNumber = isRouteMode
        ? null
        : effectiveFlightNumber || null;

      const newFlightId = flightDb.create({
        ...parsed,
        origin: effectiveOrigin,
        destination: effectiveDestination,
        airline: finalAirline,
        bookingAirline: finalBookingAirline,
        flightNumber: finalFlightNumber,
        legs: serializedLegs,
        cabinClass: parsed.cabinClass,
        fareTier: parsed.fareTier,
        baselinePrice,
        purchasePrice: parsed.purchasePrice ?? null,
        minDropDollar: parsed.minDropDollar ?? null,
        minDropPercent: parsed.minDropPercent ?? null,
        maxStops: parsed.maxStops ?? null,
        taxesAmount: null,
        taxesCurrency: null,
        monitorRouteAlternatives: parsed.monitorRouteAlternatives ?? 0,
        maxLayoverMinutes: parsed.maxLayoverMinutes ?? null,
        excludedConnectingAirports: parsed.excludedConnectingAirports ?? null,
        maxTotalDurationMinutes: parsed.maxTotalDurationMinutes ?? null,
        includedAlliances: parsed.includedAlliances ?? null,
        excludedAlliances: parsed.excludedAlliances ?? null,
        currentPrice: baselinePrice,
        status: initialStatus,
        nextCheckAt: new Date().toISOString(),
      });

      if (isBooked && parsed.purchasePrice && parsed.purchasePrice > 0) {
        historyDb.insert(newFlightId, parsed.purchasePrice, 'Booked', {
          airline: finalAirline || null,
          flightNumber: finalFlightNumber,
          metadata: JSON.stringify({
            milestone: 'Purchased Flight',
            pnr: parsed.pnr || null,
          }),
          sourceUsed: 'Price Paid',
        });
      }

      const created = flightDb.getById(newFlightId)!;
      return authCheck.finish(
        publicApiJson(
          {
            flight: serializePublicFlightSummary(created, defaultCurrency),
            initialCheckExecuted: false,
          },
          { status: 201, rateLimit: authCheck.rateLimit }
        )
      );
    }

    // Automated flight with immediate live price discovery
    settings = checkAndResetQuota(settings);
    const dsStatus = getDataSourceStatus(settings);
    if (!dsStatus.available) {
      return authCheck.finish(
        badRequestError(
          dsStatus.reason ||
            'No active data sources available. Enable Manual Mode, pass runInitialCheck: false, or configure an active data source in Settings.',
          undefined,
          authCheck.rateLimit
        )
      );
    }

    let initialAirline = effectiveAirline || null;
    let initialFlightNumber = effectiveFlightNumber || null;
    let initialMetadata: string | null = null;
    let initialSourceUsed: string | null = null;
    let liveSearchResultPrice: number | null = null;

    const probeFlight = {
      id: 0,
      searchMode: parsed.searchMode,
      origin: effectiveOrigin,
      destination: effectiveDestination,
      departureDate: parsed.departureDate,
      airline: effectiveAirline || '',
      flightNumber: effectiveFlightNumber || null,
      legs: serializedLegs,
      includedAirlines: parsed.includedAirlines || null,
      excludedAirlines: parsed.excludedAirlines || null,
      fareTier: parsed.fareTier,
      cabinClass: parsed.cabinClass,
      baselinePrice: 0,
      purchasePrice: parsed.purchasePrice ?? null,
      targetPrice: parsed.targetPrice ?? null,
      currentPrice: 0,
      minDropDollar: parsed.minDropDollar ?? null,
      minDropPercent: parsed.minDropPercent ?? null,
      status: initialStatus,
      earliestDeparture: parsed.earliestDeparture || null,
      latestDeparture: parsed.latestDeparture || null,
      noRedeye: parsed.noRedeye ?? 0,
      priceTrackingDirection: parsed.priceTrackingDirection || 'drop',
      minIncreaseDollar: parsed.minIncreaseDollar ?? null,
      minIncreasePercent: parsed.minIncreasePercent ?? null,
      maxStops: parsed.maxStops ?? null,
      monitorRouteAlternatives: parsed.monitorRouteAlternatives ?? 0,
      bookingDate: parsed.bookingDate ?? null,
      isManual: parsed.isManual ?? 0,
      maxLayoverMinutes: parsed.maxLayoverMinutes ?? null,
      excludedConnectingAirports: parsed.excludedConnectingAirports ?? null,
      maxTotalDurationMinutes: parsed.maxTotalDurationMinutes ?? null,
      includedAlliances: parsed.includedAlliances ?? null,
      excludedAlliances: parsed.excludedAlliances ?? null,
      nextCheckAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      disableNotifications: parsed.disableNotifications ?? 0,
    };

    const searchResult = await executeSearchStrategy(
      probeFlight as Flight,
      settings
    );

    if (searchResult.status === 'Success' && searchResult.price !== null) {
      liveSearchResultPrice = searchResult.price;
      if (!baselinePrice || baselinePrice <= 0) {
        baselinePrice = isBooked ? parsed.purchasePrice! : searchResult.price;
      }
      initialAirline = searchResult.leadingAirline || initialAirline;
      initialFlightNumber =
        searchResult.leadingFlightNumber || initialFlightNumber;
      initialMetadata = searchResult.itineraries
        ? JSON.stringify(searchResult.itineraries)
        : null;
      initialSourceUsed = searchResult.sourceUsed || null;

      if (searchResult.sourceUsed) {
        settingsDb.incrementApiUsage(searchResult.sourceUsed);
      }
    } else if (!isBooked) {
      const errorMsg =
        searchResult.status === 'SoldOut'
          ? 'No flights found for this route and date across active data sources.'
          : searchResult.status === 'RateLimited'
          ? 'Active data sources are currently rate-limited.'
          : `Live fare lookup failed across active data sources (${searchResult.status}).`;

      return authCheck.finish(
        badRequestError(errorMsg, undefined, authCheck.rateLimit)
      );
    } else if (!baselinePrice || baselinePrice <= 0) {
      baselinePrice = parsed.purchasePrice!;
    }

    const currentPrice = liveSearchResultPrice ?? baselinePrice;
    const isRouteMode = parsed.searchMode === 'Route';
    const finalAirline = isRouteMode
      ? effectiveAirline || ''
      : effectiveAirline || initialAirline || '';
    const finalBookingAirline = parsed.bookingAirline || finalAirline || null;
    const finalFlightNumber = isRouteMode
      ? null
      : effectiveFlightNumber || initialFlightNumber;

    settings = settingsDb.get();
    const nextCheckAt = calculateNextCheck(
      {
        ...parsed,
        origin: effectiveOrigin,
        destination: effectiveDestination,
        id: 0,
        baselinePrice,
        purchasePrice: parsed.purchasePrice ?? null,
        targetPrice: parsed.targetPrice ?? null,
        currentPrice,
        airline: finalAirline,
        flightNumber: finalFlightNumber,
        legs: serializedLegs,
        status: initialStatus,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        nextCheckAt: new Date().toISOString(),
        disableNotifications: parsed.disableNotifications ?? 0,
      } as Flight,
      settings
    );

    const newFlightId = flightDb.create({
      ...parsed,
      origin: effectiveOrigin,
      destination: effectiveDestination,
      airline: finalAirline,
      bookingAirline: finalBookingAirline,
      flightNumber: finalFlightNumber,
      legs: serializedLegs,
      cabinClass: parsed.cabinClass,
      fareTier: parsed.fareTier,
      baselinePrice,
      purchasePrice: parsed.purchasePrice ?? null,
      minDropDollar: parsed.minDropDollar ?? null,
      minDropPercent: parsed.minDropPercent ?? null,
      maxStops: parsed.maxStops ?? null,
      taxesAmount: null,
      taxesCurrency: null,
      monitorRouteAlternatives: parsed.monitorRouteAlternatives ?? 0,
      maxLayoverMinutes: parsed.maxLayoverMinutes ?? null,
      excludedConnectingAirports: parsed.excludedConnectingAirports ?? null,
      maxTotalDurationMinutes: parsed.maxTotalDurationMinutes ?? null,
      includedAlliances: parsed.includedAlliances ?? null,
      excludedAlliances: parsed.excludedAlliances ?? null,
      currentPrice,
      status: initialStatus,
      nextCheckAt,
    });

    if (isBooked && parsed.purchasePrice && parsed.purchasePrice > 0) {
      historyDb.insert(newFlightId, parsed.purchasePrice, 'Booked', {
        airline: parsed.airline || initialAirline,
        flightNumber: parsed.flightNumber || initialFlightNumber,
        metadata: JSON.stringify({
          milestone: 'Purchased Flight',
          pnr: parsed.pnr || null,
        }),
        sourceUsed: 'Price Paid',
      });
    }

    if (liveSearchResultPrice !== null) {
      historyDb.insert(newFlightId, liveSearchResultPrice, 'Success', {
        airline: initialAirline,
        flightNumber: initialFlightNumber,
        metadata: initialMetadata,
        sourceUsed: initialSourceUsed,
      });
    } else if (!isBooked) {
      historyDb.insert(newFlightId, baselinePrice, 'Success', {
        airline: initialAirline,
        flightNumber: initialFlightNumber,
        metadata: initialMetadata,
        sourceUsed: initialSourceUsed,
      });
    }

    const created = flightDb.getById(newFlightId)!;
    return authCheck.finish(
      publicApiJson(
        {
          flight: serializePublicFlightSummary(created, defaultCurrency),
          initialCheckExecuted: true,
          providerUsed: initialSourceUsed,
        },
        { status: 201, rateLimit: authCheck.rateLimit }
      )
    );
  } catch (error) {
    console.error('[PublicAPI] POST /api/v1/flights failed:', error);
    return authCheck.finish(
      internalServerError('Failed to create flight.', authCheck.rateLimit)
    );
  }
}