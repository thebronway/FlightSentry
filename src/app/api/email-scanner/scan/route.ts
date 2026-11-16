import { NextRequest, NextResponse } from 'next/server';
import { scanAllEnabledAccounts } from '@/services/emailScanner';
import { emailQueueDb } from '@/db/emailQueue';
import { settingsDb } from '@/db/settings';
import { sendEmailQueueAlert } from '@/services/notifications';
import { requireApiAuth } from '@/services/auth/apiGuard';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const authCheck = await requireApiAuth(req);
  if (authCheck.response) return authCheck.response;

  try {
    const result = await scanAllEnabledAccounts();
    if (result.queuedItems.length > 0) {
      const settings = settingsDb.get();
      await sendEmailQueueAlert(settings, result.queuedItems);
    }
    return NextResponse.json(
      {
        ...result,
        pendingQueueCount: emailQueueDb.countPending(),
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (error: any) {
    console.error('Manual IMAP scan error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to execute IMAP email scan' },
      { status: 500 }
    );
  }
}