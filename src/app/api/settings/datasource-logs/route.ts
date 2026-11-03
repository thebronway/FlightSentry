import { NextRequest, NextResponse } from 'next/server';
import { logsDb } from '@/db/logs';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const provider = searchParams.get('provider');

    if (!provider) {
      return NextResponse.json({ error: 'Provider parameter is required' }, { status: 400 });
    }

    const logs = logsDb.getByProvider(provider, 30);
    return NextResponse.json(logs, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Error fetching data source logs:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch logs' }, { status: 500 });
  }
}