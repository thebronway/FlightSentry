import { NextRequest, NextResponse } from 'next/server';
import { flightDb } from '@/db/flights';
import { settingsDb } from '@/db/settings';
import { checkFlightPrice } from '@/services/serpapi';
import { evaluatePrice } from '@/services/evaluator';
import { checkAndResetQuota, canMakeApiCall } from '@/services/quota';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
    const flight = flightDb.getById(id);
    
    if (!flight) return NextResponse.json({ error: 'Flight not found' }, { status: 404 });

    let settings = settingsDb.get();
    settings = checkAndResetQuota(settings);

    if (!canMakeApiCall(settings)) {
      return NextResponse.json({ error: 'Monthly API quota exceeded or Global Pause is active.' }, { status: 429 });
    }

    const result = await checkFlightPrice(
      settings.serpApiKey,
      flight.origin,
      flight.destination,
      flight.departureDate,
      flight.airline,
      flight.flightNumber
    );

    settingsDb.incrementApiUsage();

    if (result.status === 'Success' && result.price !== null) {
      await evaluatePrice(flight, result.price, settings);
      return NextResponse.json({ success: true, price: result.price });
    }

    return NextResponse.json({ success: false, status: result.status });
  } catch (error) {
    console.error('Error in manual check:', error);
    return NextResponse.json({ error: 'Check failed' }, { status: 500 });
  }
}