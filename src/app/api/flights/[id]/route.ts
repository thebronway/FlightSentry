import { NextRequest, NextResponse } from 'next/server';
import { flightDb } from '@/db/flights';
import { historyDb } from '@/db/history';
import { flightStatusSchema } from '@/utils/validation';
import { flightSchema } from '@/utils/validation';
import { FlightStatus } from '@/types';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
    const existing = flightDb.getById(id);
    if (!existing) return NextResponse.json({ error: 'Flight not found' }, { status: 404 });

    const body = await req.json();
    const parsed = flightSchema.parse(body);

    const todayStr = new Date().toISOString().split('T')[0];
    if (parsed.departureDate < todayStr) {
      return NextResponse.json({ error: 'Departure date cannot be in the past.' }, { status: 400 });
    }

    const newPurchasePrice = parsed.purchasePrice !== undefined ? parsed.purchasePrice : existing.purchasePrice;
    const isBooked = (newPurchasePrice !== null && newPurchasePrice !== undefined && newPurchasePrice > 0) || Boolean(parsed.pnr || existing.pnr);

    const updatedStatus: FlightStatus = body.status === 'Paused' 
      ? 'Paused' 
      : body.status === 'Past'
      ? 'Past'
      : body.status === 'Booked'
      ? 'Booked'
      : body.status === 'Watching'
      ? 'Watching'
      : body.status === 'Upcoming'
      ? (isBooked ? 'Booked' : 'Watching')
      : existing.status;
    const isRebooked =
      existing.purchasePrice !== null &&
      existing.purchasePrice !== undefined &&
      newPurchasePrice !== null &&
      newPurchasePrice !== undefined &&
      newPurchasePrice !== existing.purchasePrice;

    // Preserve the very first price paid as baselinePrice
    const originalPaidPrice = existing.baselinePrice > 0 ? existing.baselinePrice : (existing.purchasePrice || newPurchasePrice || 0);

    // If rebooked at a lower or updated price, record milestone in price_history
    if (isRebooked && newPurchasePrice !== null) {
      const creditClaimed = Math.max(0, existing.purchasePrice! - newPurchasePrice);
      historyDb.insert(id, newPurchasePrice, 'Booked', {
        airline: parsed.airline || existing.airline,
        flightNumber: parsed.flightNumber || existing.flightNumber,
        metadata: JSON.stringify({
          milestone: 'Rebooked Flight',
          previousPrice: existing.purchasePrice,
          newPrice: newPurchasePrice,
          creditClaimed,
        }),
        sourceUsed: 'Price Paid',
      });
      flightDb.updatePrice(id, newPurchasePrice);
    }

    flightDb.update(id, {
      ...parsed,
      origin: parsed.origin ?? existing.origin,
      destination: parsed.destination ?? existing.destination,
      airline: parsed.airline ?? '',
      flightNumber: parsed.flightNumber ?? null,
      includedAirlines: parsed.includedAirlines ?? null,
      excludedAirlines: parsed.excludedAirlines ?? null,
      pnr: parsed.pnr ?? null,
      baselinePrice: originalPaidPrice,
      purchasePrice: newPurchasePrice,
      minDropDollar: parsed.minDropDollar !== undefined ? parsed.minDropDollar : existing.minDropDollar,
      minDropPercent: parsed.minDropPercent !== undefined ? parsed.minDropPercent : existing.minDropPercent,
      cabinClass: parsed.cabinClass,
      fareTier: parsed.fareTier,
      currency: parsed.currency !== undefined ? parsed.currency : existing.currency,
      scheduleOverride: parsed.scheduleOverride ?? null,
      notes: parsed.notes ?? null,
      disableNotifications: parsed.disableNotifications ?? 0,
      status: updatedStatus,
      earliestDeparture: parsed.earliestDeparture !== undefined ? parsed.earliestDeparture : existing.earliestDeparture,
      latestDeparture: parsed.latestDeparture !== undefined ? parsed.latestDeparture : existing.latestDeparture,
      noRedeye: parsed.noRedeye !== undefined ? parsed.noRedeye : existing.noRedeye,
      priceTrackingDirection: parsed.priceTrackingDirection ?? existing.priceTrackingDirection ?? 'drop',
      minIncreaseDollar: parsed.minIncreaseDollar !== undefined ? parsed.minIncreaseDollar : existing.minIncreaseDollar,
      minIncreasePercent: parsed.minIncreasePercent !== undefined ? parsed.minIncreasePercent : existing.minIncreasePercent,
      monitorRouteAlternatives: parsed.monitorRouteAlternatives !== undefined ? parsed.monitorRouteAlternatives : (existing.monitorRouteAlternatives ?? 0),
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