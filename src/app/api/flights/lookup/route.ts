import { NextRequest, NextResponse } from 'next/server';
import { executeSearchStrategy } from '@/services/datasource';
import { settingsDb } from '@/db/settings';
import { checkAndResetQuota, canMakeApiCall } from '@/services/quota';
import { Flight } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let settings = settingsDb.get();
    settings = checkAndResetQuota(settings);

    if (!canMakeApiCall(settings)) {
      return NextResponse.json({ error: 'Monthly API quota exceeded or automation is paused.' }, { status: 429 });
    }

    const tempFlight = {
      id: 0,
      searchMode: body.searchMode || 'Route',
      origin: body.origin ? body.origin.trim().toUpperCase() : '',
      destination: body.destination ? body.destination.trim().toUpperCase() : '',
      departureDate: body.departureDate,
      airline: body.airline ? body.airline.trim().toUpperCase() : '',
      flightNumber: body.flightNumber ? body.flightNumber.trim() : null,
      includedAirlines: body.includedAirlines ? body.includedAirlines.trim().toUpperCase() : null,
      excludedAirlines: body.excludedAirlines ? body.excludedAirlines.trim().toUpperCase() : null,
      fareTier: body.fareTier || 'Standard',
      cabinClass: body.cabinClass || 'economy',
      baselinePrice: 0,
      currentPrice: 0,
      status: 'Active' as const,
      nextCheckAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      disableNotifications: 0
    };

    const result = await executeSearchStrategy(tempFlight as Flight, settings);

    if (result.status === 'Success' && result.price !== null) {
      if (result.sourceUsed) {
        settingsDb.incrementApiUsage(result.sourceUsed);
      }
      return NextResponse.json({ success: true, price: result.price, source: result.sourceUsed });
    }

    return NextResponse.json({ 
      success: false, 
      status: result.status, 
      error: `Could not fetch price (${result.status}). Verify airport codes and date.` 
    }, { status: 400 });
  } catch (error: any) {
    console.error('Price lookup error:', error);
    return NextResponse.json({ error: error.message || 'Lookup failed' }, { status: 500 });
  }
}