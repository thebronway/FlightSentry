import { NextResponse } from 'next/server';
import { emailQueueDb } from '@/db/emailQueue';
import { flightDb } from '@/db/flights';
import { settingsDb } from '@/db/settings';
import { parseConfiguredPointsCurrencies } from '@/services/emailScanner/pointsMatcher';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const items = emailQueueDb.listPending();
    const allFlights = flightDb.getAll();
    const settings = settingsDb.get();
    const pointsCurrencies = parseConfiguredPointsCurrencies(settings?.pointsCurrencies);

    const activeFlights = allFlights
      .filter((f) => f.status !== 'Past')
      .map((f) => ({
        id: f.id,
        airline: f.airline,
        flightNumber: f.flightNumber || null,
        origin: f.origin || null,
        destination: f.destination || null,
        departureDate: f.departureDate,
        pnr: f.pnr || null,
        status: f.status,
      }));

    return NextResponse.json(
      {
        items,
        count: items.length,
        flights: activeFlights,
        pointsCurrencies,
        defaultCurrency: settings?.currency || 'USD',
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching email queue:', error);
    return NextResponse.json({ error: 'Failed to load email queue' }, { status: 500 });
  }
}