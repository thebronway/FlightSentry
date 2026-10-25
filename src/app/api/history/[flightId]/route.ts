import { NextRequest, NextResponse } from 'next/server';
import { historyDb } from '@/db/history';

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