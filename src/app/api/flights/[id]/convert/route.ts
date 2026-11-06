import { NextRequest, NextResponse } from 'next/server';
import { flightDb } from '@/db/flights';
import { historyDb } from '@/db/history';
import { settingsDb } from '@/db/settings';
import { calculateNextCheck } from '@/utils/queue';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const convertSchema = z.object({
  purchasePrice: z.number().positive('Purchase price must be greater than zero'),
  airline: z.string().min(2, 'Airline carrier code is required').max(3),
  flightNumber: z.string().regex(/^\d+$/, 'Flight number must be numbers only').optional().nullable().or(z.literal('')),
  pnr: z.string().max(10).optional().nullable().or(z.literal('')),
  currency: z.string().max(50).optional().nullable().or(z.literal('')),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
    const existing = flightDb.getById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Flight not found' }, { status: 404 });
    }

    const body = await req.json();
    const parsed = convertSchema.parse(body);

    const cleanAirline = parsed.airline.trim().toUpperCase();
    const cleanFlightNumber = parsed.flightNumber ? parsed.flightNumber.trim() : null;
    const cleanPnr = parsed.pnr ? parsed.pnr.trim().toUpperCase() : null;
    const searchMode = cleanFlightNumber ? 'FlightNumber' : existing.searchMode;

    // Update flight record in place
    flightDb.update(id, {
      status: existing.status === 'Paused' ? 'Paused' : 'Booked',
      purchasePrice: parsed.purchasePrice,
      priceTrackingDirection: 'drop',
      airline: cleanAirline,
      flightNumber: cleanFlightNumber,
      pnr: cleanPnr,
      searchMode,
      currency: parsed.currency || existing.currency,
    });

    // Record milestone entry in price_history
    historyDb.insert(id, parsed.purchasePrice, 'Booked', {
      airline: cleanAirline,
      flightNumber: cleanFlightNumber,
      metadata: JSON.stringify({ milestone: 'Purchased Flight', pnr: cleanPnr }),
      sourceUsed: 'Price Paid',
    });

    // Recalculate schedule queue
    const updated = flightDb.getById(id);
    if (updated) {
      const settings = settingsDb.get();
      const nextCheckAt = calculateNextCheck(updated, settings);
      flightDb.updateNextCheckAt(id, nextCheckAt);
    }

    return NextResponse.json(flightDb.getById(id));
  } catch (error: any) {
    console.error('Error converting flight to booked:', error);
    return NextResponse.json(
      { error: error.errors?.[0]?.message || error.message || 'Invalid input' },
      { status: 400 }
    );
  }
}