import { NextRequest, NextResponse } from 'next/server';
import { flightDb } from '@/db/flights';
import { flightSchema } from '@/utils/validation';
import { historyDb } from '@/db/history';
import { settingsDb } from '@/db/settings';
import { executeSearchStrategy } from '@/services/datasource';
import { checkAndResetQuota } from '@/services/quota';
import { calculateNextCheck } from '@/utils/queue';
import { Flight } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
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

    // If initial price is not provided, trigger a live search immediately
    if (!baselinePrice || baselinePrice <= 0) {
      let settings = settingsDb.get();
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
        currentPrice: 0,
        status: 'Active' as const,
        nextCheckAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        disableNotifications: parsed.disableNotifications ?? 0
      };

      const searchResult = await executeSearchStrategy(probeFlight as Flight, settings);
      if (searchResult.status === 'Success' && searchResult.price !== null) {
        baselinePrice = searchResult.price;
        if (searchResult.sourceUsed) {
          settingsDb.incrementApiUsage(searchResult.sourceUsed);
        }
      } else {
        return NextResponse.json({ 
          error: `Live search could not locate a fare (${searchResult.status}). Please enter an initial price manually or verify airport codes and date.` 
        }, { status: 400 });
      }
    }

    const settings = settingsDb.get();
    const nextCheckAt = calculateNextCheck({
      ...parsed,
      id: 0,
      baselinePrice,
      currentPrice: baselinePrice,
      airline: parsed.airline || '',
      status: 'Active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nextCheckAt: new Date().toISOString(),
      disableNotifications: parsed.disableNotifications ?? 0
    } as Flight, settings);

    const newFlightId = flightDb.create({ 
      ...parsed, 
      airline: parsed.airline || '',
      cabinClass: parsed.cabinClass,
      fareTier: parsed.fareTier,
      baselinePrice,
      currentPrice: baselinePrice,
      status: 'Active', 
      nextCheckAt 
    });

    // Record initial price check in history
    historyDb.insert(newFlightId, baselinePrice, 'Success');

    const newFlight = flightDb.getById(newFlightId);
    return NextResponse.json(newFlight, { status: 201 });
  } catch (error: any) {
    console.error('Error creating flight:', error);
    return NextResponse.json({ error: error.errors || error.message || 'Invalid input' }, { status: 400 });
  }
}