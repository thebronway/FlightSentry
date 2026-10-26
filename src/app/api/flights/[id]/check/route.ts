import { NextRequest, NextResponse } from 'next/server';
import { flightDb } from '@/db/flights';
import { settingsDb } from '@/db/settings';
import { executeSearchStrategy } from '@/services/datasource';
import { evaluatePrice } from '@/services/evaluator';
import { checkAndResetQuota, canMakeApiCall } from '@/services/quota';
import { historyDb } from '@/db/history';
import { calculateNextCheck } from '@/utils/queue';

export const dynamic = 'force-dynamic';

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

    if (settings.circuitBreakerUntil && new Date(settings.circuitBreakerUntil) > new Date()) {
      return NextResponse.json({ error: `Circuit breaker active until ${settings.circuitBreakerUntil}` }, { status: 429 });
    }

    const result = await executeSearchStrategy(flight, settings);

    if (result.status === 'RateLimited') {
      const pauseHours = Math.random() * (8 - 4) + 4;
      const pauseUntil = new Date(Date.now() + pauseHours * 3600000).toISOString();
      settingsDb.update({ circuitBreakerUntil: pauseUntil });
      return NextResponse.json({ error: 'Rate limit hit. Circuit breaker triggered.' }, { status: 429 });
    }

    if (result.status !== 'Error' && result.sourceUsed) {
      settingsDb.incrementApiUsage(result.sourceUsed);
    }

    if (result.status === 'Success' && result.price !== null) {
      await evaluatePrice(flight, result.price, settings);
    } else {
       historyDb.insert(flight.id, flight.currentPrice, result.status);
    }

    // Reschedule next automatic check timestamp to prevent immediate re-polling
    const nextCheckAt = calculateNextCheck(flight, settings);
    flightDb.updateNextCheckAt(flight.id, nextCheckAt);

    if (result.status === 'Success') {
      return NextResponse.json({ success: true, price: result.price, nextCheckAt });
    }

    return NextResponse.json({ success: false, status: result.status });
  } catch (error) {
    
    console.error('Error in manual check:', error);
    return NextResponse.json({ error: 'Check failed' }, { status: 500 });
  }
}