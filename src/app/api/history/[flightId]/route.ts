import { NextRequest, NextResponse } from 'next/server';
import { historyDb } from '@/db/history';
import { flightDb } from '@/db/flights';
import { manualPriceEntrySchema } from '@/utils/validation';
import { expandAlliancesToAirlines } from '@/utils/airlineThemes';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { flightId: string } }) {
  try {
    const flightId = parseInt(params.flightId, 10);
    const history = historyDb.getByFlightId(flightId);
    return NextResponse.json(history);
  } catch (error) {
    console.error('Error fetching history:', error);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { flightId: string } }) {
  try {
    const flightId = parseInt(params.flightId, 10);
    const flight = flightDb.getById(flightId);
    if (!flight) {
      return NextResponse.json({ error: 'Flight not found' }, { status: 404 });
    }

    const body = await req.json();
    const parsed = manualPriceEntrySchema.parse(body);

    let checkedAt: string;
    try {
      const parsedDate = new Date(parsed.date);
      if (isNaN(parsedDate.getTime())) {
        checkedAt = new Date().toISOString();
      } else {
        checkedAt = parsedDate.toISOString();
      }
    } catch {
      checkedAt = new Date().toISOString();
    }

    const cleanAirline = parsed.airline.trim().toUpperCase();
    const cleanFlightNumber = parsed.flightNumber ? parsed.flightNumber.trim() : null;

    // 1. Rebook Flow
    if (parsed.isRebook) {
      const updatedFlight = flightDb.rebook(flightId, parsed.price, {
        airline: cleanAirline,
        flightNumber: cleanFlightNumber,
        origin: parsed.origin ? parsed.origin.trim().toUpperCase() : null,
        destination: parsed.destination ? parsed.destination.trim().toUpperCase() : null,
        pnr: parsed.pnr || flight.pnr,
        notes: parsed.notes !== undefined ? parsed.notes : flight.notes,
        checkedAt,
      });

      return NextResponse.json({
        success: true,
        type: 'rebook',
        flight: updatedFlight,
        history: historyDb.getByFlightId(flightId),
      }, { status: 201 });
    }

    // 2. Flight & Route Association Logic
    const flightAirline = (flight.airline || '').trim().toUpperCase();
    const flightNum = (flight.flightNumber || '').trim();
    const allowedCarriers = expandAlliancesToAirlines(flight.includedAirlines);
    const excludedCarriers = expandAlliancesToAirlines(flight.excludedAirlines);

    const isRouteCarrierMatch = flightAirline
      ? cleanAirline === flightAirline
      : allowedCarriers.length > 0
      ? allowedCarriers.includes(cleanAirline)
      : !excludedCarriers.includes(cleanAirline);

    const isSameCarrier = cleanAirline === flightAirline;
    const isSameFlightNumber = (cleanFlightNumber || '') === flightNum;
    const isDirectMatch = flight.searchMode === 'Route'
      ? isRouteCarrierMatch
      : isSameCarrier && isSameFlightNumber;

    const itineraryPayload = [{
      airline: cleanAirline,
      flightNumber: cleanFlightNumber || undefined,
      origin: parsed.origin ? parsed.origin.trim().toUpperCase() : flight.origin || undefined,
      destination: parsed.destination ? parsed.destination.trim().toUpperCase() : flight.destination || undefined,
      price: parsed.price,
    }];

    if (isDirectMatch) {
      historyDb.insert(flightId, parsed.price, 'Success', {
        airline: cleanAirline,
        flightNumber: cleanFlightNumber || flight.flightNumber,
        metadata: flight.searchMode === 'Route' ? JSON.stringify(itineraryPayload) : null,
        sourceUsed: 'manual',
        checkedAt,
      });

      const currentLatestTime = flight.updatedAt ? new Date(flight.updatedAt).getTime() : 0;
      if (new Date(checkedAt).getTime() >= currentLatestTime) {
        flightDb.updatePrice(flightId, parsed.price);
      }
    } else {
      historyDb.insert(flightId, parsed.price, 'Success', {
        airline: cleanAirline,
        flightNumber: cleanFlightNumber,
        metadata: JSON.stringify(itineraryPayload),
        sourceUsed: 'manual',
        checkedAt,
      });
    }

    const updatedFlight = flightDb.getById(flightId);
    return NextResponse.json({
      success: true,
      flight: updatedFlight,
      history: historyDb.getByFlightId(flightId),
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error adding manual price entry:', error);
    return NextResponse.json(
      { error: error.errors?.[0]?.message || error.message || 'Invalid manual price input' },
      { status: 400 }
    );
  }
}