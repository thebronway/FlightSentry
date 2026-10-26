import { NextRequest, NextResponse } from 'next/server';
import { lookupFlightRoute } from '@/services/flightLookup';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const airline = body.airline?.trim();
    const flightNumber = body.flightNumber?.trim();

    console.log(`[RouteLookup API] Received request for Carrier: "${airline}", Flight#: "${flightNumber}"`);

    if (!airline || !flightNumber) {
      console.warn('[RouteLookup API] Missing carrier code or flight number in request body.');
      return NextResponse.json(
        { success: false, error: 'Carrier code and flight number are required' },
        { status: 400 }
      );
    }

    const result = await lookupFlightRoute(airline, flightNumber);
    console.log(`[RouteLookup API] Result for ${airline} ${flightNumber}:`, JSON.stringify(result));
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[RouteLookup API] Unhandled exception:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Route lookup failed' },
      { status: 500 }
    );
  }
}