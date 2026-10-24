import { NextRequest, NextResponse } from 'next/server';
import { flightDb } from '@/db/flights';
import { historyDb } from '@/db/history';
import { flightStatusSchema } from '@/utils/validation';

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