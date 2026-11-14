import { NextRequest, NextResponse } from 'next/server';
import { lookupFlightRoute } from '@/services/flightLookup';
import { logsDb } from '@/db/logs';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let airline: string | undefined;
  let flightNumber: string | undefined;
  let departureDate: string | undefined;

  try {
    const body = await req.json();
    airline = body.airline?.trim();
    flightNumber = body.flightNumber?.trim();
    departureDate = body.departureDate?.trim();

    console.log(`[RouteLookup API] Received request for Carrier: "${airline}", Flight#: "${flightNumber}"`);

    const cleanAirline = airline ? airline.toUpperCase() : '';
    const cleanFlightNumber = flightNumber ? flightNumber.replace(/\D/g, '') : '';

    if (!cleanAirline || !/^[A-Z0-9]{2,3}$/.test(cleanAirline) || !cleanFlightNumber || !/^\d{1,5}$/.test(cleanFlightNumber)) {
      console.warn('[RouteLookup API] Invalid or missing carrier code or flight number in request body.');
      return NextResponse.json(
        { success: false, error: 'Valid carrier code and numeric flight number are required' },
        { status: 400 }
      );
    }

    if (departureDate && !/^\d{4}-\d{2}-\d{2}$/.test(departureDate)) {
      return NextResponse.json(
        { success: false, error: 'Departure date must be YYYY-MM-DD' },
        { status: 400 }
      );
    }

    const result = await lookupFlightRoute(cleanAirline, cleanFlightNumber, departureDate);
    const durationMs = Date.now() - startTime;
    console.log(`[RouteLookup API] Result for ${cleanAirline} ${cleanFlightNumber}:`, JSON.stringify(result));

    const routeSummary =
      result.success && result.routes && result.routes.length > 1
        ? result.routes.map(r => `${r.origin} → ${r.destination}`).join(', ')
        : result.success && result.origin && result.destination
        ? `${result.origin} → ${result.destination}`
        : null;

    const sourceDetail = result.success
      ? `Source: ${result.source || 'aviation-db'}${
          result.routes && result.routes.length > 1 ? ` (${result.routes.length} routes)` : ''
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
      console.error('[RouteLookup API] Failed to record route lookup log:', logErr);
    }

    return NextResponse.json(result);
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    console.error('[RouteLookup API] Unhandled exception:', error);

    try {
      logsDb.insert({
        provider: 'flight-route-lookup',
        route: null,
        flightNumber: airline && flightNumber ? `${airline} ${flightNumber}` : null,
        departureDate: departureDate || null,
        status: 'Error',
        statusCode: 500,
        errorMessage: error.message || 'Route lookup failed',
        durationMs,
      });
    } catch {}

    return NextResponse.json(
      { success: false, error: error.message || 'Route lookup failed' },
      { status: 500 }
    );
  }
}