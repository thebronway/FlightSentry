import { NextRequest, NextResponse } from 'next/server';
import { flightDb } from '@/db/flights';
import { historyDb } from '@/db/history';
import { flightStatusSchema } from '@/utils/validation';
import { flightSchema } from '@/utils/validation';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
    const existing = flightDb.getById(id);
    if (!existing) return NextResponse.json({ error: 'Flight not found' }, { status: 404 });

    const body = await req.json();
    const parsed = flightSchema.parse(body);

    flightDb.update(id, {
      ...parsed,
      origin: parsed.origin ?? existing.origin,
      destination: parsed.destination ?? existing.destination,
      airline: parsed.airline ?? '',
      flightNumber: parsed.flightNumber ?? null,
      includedAirlines: parsed.includedAirlines ?? null,
      excludedAirlines: parsed.excludedAirlines ?? null,
      pnr: parsed.pnr ?? null,
      baselinePrice: parsed.baselinePrice ?? existing.baselinePrice,
      cabinClass: parsed.cabinClass,
      fareTier: parsed.fareTier,
      scheduleOverride: parsed.scheduleOverride ?? null,
      notes: parsed.notes ?? null,
      disableNotifications: parsed.disableNotifications ?? 0,
    });

    const updated = flightDb.getById(id);
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating flight:', error);
    return NextResponse.json({ error: error.errors || error.message || 'Invalid input' }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
    const body = await req.json();
    const parsed = flightStatusSchema.parse(body);

    const flight = flightDb.getById(id);
    if (!flight) return NextResponse.json({ error: 'Flight not found' }, { status: 404 });

    flightDb.updateStatus(id, parsed.status);
    return NextResponse.json({ success: true, status: parsed.status });
  } catch (error: any) {
    return NextResponse.json({ error: error.errors || 'Invalid input' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
    // Because of ON DELETE CASCADE, history deletes automatically, but we can be explicit
    historyDb.deleteByFlightId(id);
    flightDb.delete(id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting flight:', error);
    return NextResponse.json({ error: 'Failed to delete flight' }, { status: 500 });
  }
}