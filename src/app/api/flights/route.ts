import { NextRequest, NextResponse } from 'next/server';
import { flightDb } from '@/db/flights';
import { flightSchema } from '@/utils/validation';

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
    
    // Default status is 'Active' and schedule immediate first check
    const nextCheckAt = new Date().toISOString();
    const newFlightId = flightDb.create({ 
      ...parsed, 
      airline: parsed.airline || '', // Fallback to empty string for Route mode to satisfy DB constraint
      status: 'Active', 
      nextCheckAt 
    });
    const newFlight = flightDb.getById(newFlightId);
    
    return NextResponse.json(newFlight, { status: 201 });
  } catch (error: any) {
    console.error('Error creating flight:', error);
    return NextResponse.json({ error: error.errors || 'Invalid input' }, { status: 400 });
  }
}