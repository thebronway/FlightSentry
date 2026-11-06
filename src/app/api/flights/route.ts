import { NextRequest, NextResponse } from 'next/server';
import { flightDb } from '@/db/flights';
import { flightSchema } from '@/utils/validation';
import { historyDb } from '@/db/history';
import { settingsDb } from '@/db/settings';
import { executeSearchStrategy } from '@/services/datasource';
import { checkAndResetQuota } from '@/services/quota';
import { calculateNextCheck } from '@/utils/queue';
import { Flight, FlightStatus } from '@/types';
import { expireOldFlights } from '@/services/scheduler';
import { getTodayDateString } from '@/utils/date';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = settingsDb.get();
    expireOldFlights(settings.timezone);
    const flights = flightDb.getAll();
    return NextResponse.json(flights);
  } catch (error) {
    console.error('Error fetching flights:', error);
    return NextResponse.json({ error: 'Failed to fetch flights' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = flightSchema.parse(body);
    
    let baselinePrice = parsed.baselinePrice;

    // If purchase price is provided for a booked flight, use it as baseline if no baseline entered
    if ((!baselinePrice || baselinePrice <= 0) && parsed.purchasePrice && parsed.purchasePrice > 0) {
      baselinePrice = parsed.purchasePrice;
    }

    let settings = settingsDb.get();
    const todayStr = getTodayDateString(settings.timezone);
    if (parsed.departureDate < todayStr) {
      return NextResponse.json({ error: 'Departure date cannot be in the past.' }, { status: 400 });
    }

    const isBooked = Boolean((parsed.purchasePrice && parsed.purchasePrice > 0) || parsed.pnr);
    const initialStatus: FlightStatus = body.status === 'Paused'
      ? 'Paused'
      : body.status === 'Booked'
      ? 'Booked'
      : body.status === 'Watching'
      ? 'Watching'
      : isBooked
      ? 'Booked'
      : 'Watching';

    let initialAirline = parsed.airline || null;
    let initialFlightNumber = parsed.flightNumber || null;
    let initialMetadata: string | null = null;
    let initialSourceUsed: string | null = null;
    let liveSearchResultPrice: number | null = null;

    // Check if flight is tracking award points currency
    let pointsList: string[] = [];
    if (settings.pointsCurrencies) {
      try {
        const p = typeof settings.pointsCurrencies === 'string'
          ? JSON.parse(settings.pointsCurrencies)
          : settings.pointsCurrencies;
        if (Array.isArray(p)) pointsList = p;
      } catch {}
    }
    const isPointsFlight = Boolean(parsed.currency && pointsList.includes(parsed.currency));

    // For points flights, automated searches are bypassed
    if (isPointsFlight) {
      const pointsAmount = isBooked ? (parsed.purchasePrice || 0) : (baselinePrice || 0);
      const pointsNextCheckAt = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();

      const newFlightId = flightDb.create({
        ...parsed,
        airline: parsed.airline || 'POINTS',
        flightNumber: parsed.flightNumber || null,
        cabinClass: parsed.cabinClass,
        fareTier: parsed.fareTier,
        baselinePrice: pointsAmount,
        purchasePrice: parsed.purchasePrice ?? null,
        minDropDollar: parsed.minDropDollar ?? null,
        minDropPercent: parsed.minDropPercent ?? null,
        maxStops: parsed.maxStops ?? null,
        currentPrice: pointsAmount,
        currency: parsed.currency,
        status: 'Paused',
        nextCheckAt: pointsNextCheckAt,
      });

      if (isBooked && parsed.purchasePrice && parsed.purchasePrice > 0) {
        historyDb.insert(newFlightId, parsed.purchasePrice, 'Booked', {
          airline: parsed.airline || null,
          flightNumber: parsed.flightNumber || null,
          metadata: JSON.stringify({ milestone: 'Purchased Flight (Points)', pnr: parsed.pnr || null }),
          sourceUsed: 'Price Paid',
        });
      } else {
        historyDb.insert(newFlightId, pointsAmount, 'Success', {
          airline: parsed.airline || null,
          flightNumber: parsed.flightNumber || null,
          metadata: JSON.stringify({ milestone: 'Initial Baseline (Points)' }),
          sourceUsed: 'manual',
        });
      }

      const newFlight = flightDb.getById(newFlightId);
      return NextResponse.json(newFlight, { status: 201 });
    }

    // Trigger a live search on add for all flights to discover current market fare
    settings = checkAndResetQuota(settings);

    const probeFlight = {
      id: 0,
      searchMode: parsed.searchMode,
      origin: parsed.origin,
      destination: parsed.destination,
      departureDate: parsed.departureDate,
      airline: parsed.airline || '',
      flightNumber: parsed.flightNumber || null,
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
      nextCheckAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      disableNotifications: parsed.disableNotifications ?? 0,
    };

    const searchResult = await executeSearchStrategy(probeFlight as Flight, settings);

    if (searchResult.status === 'Success' && searchResult.price !== null) {
      liveSearchResultPrice = searchResult.price;
      if (!baselinePrice || baselinePrice <= 0) {
        baselinePrice = isBooked ? parsed.purchasePrice! : searchResult.price;
      }
      initialAirline = searchResult.leadingAirline || initialAirline;
      initialFlightNumber = searchResult.leadingFlightNumber || initialFlightNumber;
      initialMetadata = searchResult.itineraries ? JSON.stringify(searchResult.itineraries) : null;
      initialSourceUsed = searchResult.sourceUsed || null;

      if (searchResult.sourceUsed) {
        settingsDb.incrementApiUsage(searchResult.sourceUsed);
      }
    } else if (!isBooked) {
      // For unbooked flights, require a successful fare lookup to establish baseline
      const errorMsg = searchResult.status === 'SoldOut'
        ? 'No flights found for this route and date across active data sources. Please verify airport codes or try another date.'
        : searchResult.status === 'RateLimited'
        ? 'Active data sources are currently rate-limited. Please wait a few moments or configure an alternative provider in Settings.'
        : `Live fare lookup failed across all active data sources (${searchResult.status}). Please verify the route, carrier, and date, or check provider credentials in Settings.`;

      return NextResponse.json({ error: errorMsg }, { status: 400 });
    } else {
      // For booked flights, fallback to purchasePrice if initial search fails or rate limits
      if (!baselinePrice || baselinePrice <= 0) {
        baselinePrice = parsed.purchasePrice!;
      }
    }

    const currentPrice = liveSearchResultPrice ?? baselinePrice;

    settings = settingsDb.get();
    const nextCheckAt = calculateNextCheck({
      ...parsed,
      id: 0,
      baselinePrice,
      purchasePrice: parsed.purchasePrice ?? null,
      targetPrice: parsed.targetPrice ?? null,
      currentPrice,
      airline: parsed.airline || initialAirline || '',
      status: initialStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nextCheckAt: new Date().toISOString(),
      disableNotifications: parsed.disableNotifications ?? 0
    } as Flight, settings);

    const newFlightId = flightDb.create({ 
      ...parsed, 
      airline: parsed.airline || initialAirline || '',
      flightNumber: parsed.flightNumber || initialFlightNumber,
      cabinClass: parsed.cabinClass,
      fareTier: parsed.fareTier,
      baselinePrice,
      purchasePrice: parsed.purchasePrice ?? null,
      minDropDollar: parsed.minDropDollar ?? null,
      minDropPercent: parsed.minDropPercent ?? null,
      maxStops: parsed.maxStops ?? null,
      monitorRouteAlternatives: parsed.monitorRouteAlternatives ?? 0,
      currentPrice,
      status: initialStatus, 
      nextCheckAt 
    });

    // 1. For booked flights, log the purchase milestone with 'Price Paid' source
    if (isBooked && parsed.purchasePrice && parsed.purchasePrice > 0) {
      historyDb.insert(newFlightId, parsed.purchasePrice, 'Booked', {
        airline: parsed.airline || initialAirline,
        flightNumber: parsed.flightNumber || initialFlightNumber,
        metadata: JSON.stringify({ milestone: 'Purchased Flight', pnr: parsed.pnr || null }),
        sourceUsed: 'Price Paid',
      });
    }

    // 2. Log the live fare check result if search succeeded
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

    const newFlight = flightDb.getById(newFlightId);
    return NextResponse.json(newFlight, { status: 201 });
  } catch (error: any) {
    console.error('Error creating flight:', error);
    return NextResponse.json({ error: error.errors || error.message || 'Invalid input' }, { status: 400 });
  }
}