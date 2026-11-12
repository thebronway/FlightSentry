import { NextRequest, NextResponse } from 'next/server';
import { releaseSyncDb } from '@/db/releaseSync';
import { getUpdateBannerStatus } from '@/services/githubSync';
import { bannerDismissSchema } from '@/utils/validation';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = bannerDismissSchema.parse(body);

    if (parsed.type === 'update') {
      releaseSyncDb.dismissUpdate(parsed.version, parsed.mode);
    } else {
      releaseSyncDb.dismissAnnouncement(parsed.id);
    }

    const status = await getUpdateBannerStatus({ triggerBackgroundRefresh: false });
    return NextResponse.json(status, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.errors || error?.message || 'Invalid dismissal payload' },
      { status: 400 }
    );
  }
}