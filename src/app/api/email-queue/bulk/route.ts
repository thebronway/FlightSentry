import { NextRequest, NextResponse } from 'next/server';
import { emailQueueBulkSchema } from '@/utils/validation';
import { applyBulkEmailQueueItems } from '@/services/emailScanner';
import { emailQueueDb } from '@/db/emailQueue';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = emailQueueBulkSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || 'Invalid bulk queue request';
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { action, ids } = parsed.data;
    const uniqueIds = Array.from(new Set(ids));

    if (action === 'deny') {
      for (const id of uniqueIds) {
        emailQueueDb.markDenied(id);
      }
      return NextResponse.json({
        success: true,
        deniedCount: uniqueIds.length,
        pendingCount: emailQueueDb.countPending(),
      });
    }

    const result = applyBulkEmailQueueItems(uniqueIds);
    return NextResponse.json({
      success: true,
      appliedCount: result.applied.length,
      applied: result.applied,
      failed: result.failed,
      pendingCount: emailQueueDb.countPending(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Bulk email queue operation failed' },
      { status: 400 }
    );
  }
}