import { NextRequest, NextResponse } from 'next/server';
import { lookupFlightRoute } from '@/services/flightLookup';
import { logsDb } from '@/db/logs';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let airline: string | undefined;
  let flightNumber: string | undefined;

  try {
    const body = await req.json();
    airline = body.airline?.trim();
    flightNumber = body.flightNumber?.trim();

    console.log(`[RouteLookup API] Received request for Carrier: "${airline}", Flight#: "${flightNumber}"`);

    if (!airline || !flightNumber) {
      console.warn('[RouteLookup API] Missing carrier code or flight number in request body.');
      return NextResponse.json(
        { success: false, error: 'Carrier code and flight number are required' },
        { status: 400 }
      );
    }

    const result = await lookupFlightRoute(airline, flightNumber);
    const durationMs = Date.now() - startTime;
    console.log(`[RouteLookup API] Result for ${airline} ${flightNumber}:`, JSON.stringify(result));

    try {
      logsDb.insert({
        provider: 'flight-route-lookup',
        route: result.success && result.origin && result.destination ? `${result.origin} → ${result.destination}` : null,
        flightNumber: `${airline} ${flightNumber}`,
        departureDate: null,
        status: result.success ? 'Success' : 'Error',
        statusCode: result.success ? 200 : 404,
        errorMessage: result.error || (result.success ? `Source: ${result.source || 'aviation-db'}` : 'Route not found'),
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
        departureDate: null,
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