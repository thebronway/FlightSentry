import { NextRequest, NextResponse } from 'next/server';
import { emailQueueItemEditSchema } from '@/utils/validation';
import { applyEmailQueueItem } from '@/services/emailScanner';
import { emailQueueDb } from '@/db/emailQueue';
import { requireApiAuth } from '@/services/auth/apiGuard';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const authCheck = await requireApiAuth(req);
  if (authCheck.response) return authCheck.response;

  try {
    const id = parseInt(params.id, 10);
    if (Number.isNaN(id) || id <= 0) {
      return NextResponse.json({ error: 'Invalid queue item ID' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const hasOverrides = body && typeof body === 'object' && Object.keys(body).length > 0;

    let sanitizedOverrides: Record<string, any> | undefined;
    if (hasOverrides) {
      const parsed = emailQueueItemEditSchema.safeParse(body);
      if (!parsed.success) {
        const msg = parsed.error.issues[0]?.message || 'Invalid flight details';
        return NextResponse.json({ error: msg }, { status: 400 });
      }
      sanitizedOverrides = Object.fromEntries(
        Object.entries(parsed.data).map(([k, v]) => [k, v === '' ? null : v])
      );
    }

    const result = applyEmailQueueItem(id, sanitizedOverrides);
    return NextResponse.json({
      success: true,
      result,
      pendingCount: emailQueueDb.countPending(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to apply email queue item' },
      { status: 400 }
    );
  }
}