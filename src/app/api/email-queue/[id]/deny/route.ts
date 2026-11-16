import { NextRequest, NextResponse } from 'next/server';
import { emailQueueDb } from '@/db/emailQueue';

export const dynamic = 'force-dynamic';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
    if (Number.isNaN(id) || id <= 0) {
      return NextResponse.json({ error: 'Invalid queue item ID' }, { status: 400 });
    }

    const existing = emailQueueDb.getById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Queued email item not found' }, { status: 404 });
    }

    emailQueueDb.markDenied(id);
    return NextResponse.json({
      success: true,
      pendingCount: emailQueueDb.countPending(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to dismiss email queue item' },
      { status: 400 }
    );
  }
}