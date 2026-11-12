import { NextResponse } from 'next/server';
import { getUpdateBannerStatus, syncGitHubMetadata } from '@/services/githubSync';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
};

export async function GET() {
  try {
    const status = await getUpdateBannerStatus({ triggerBackgroundRefresh: true });
    return NextResponse.json(status, { headers: NO_STORE_HEADERS });
  } catch {
    return NextResponse.json({ error: 'Failed to read update status' }, { status: 500 });
  }
}

export async function POST() {
  try {
    await syncGitHubMetadata({ force: true });
    const status = await getUpdateBannerStatus({ triggerBackgroundRefresh: false });
    return NextResponse.json(status, { headers: NO_STORE_HEADERS });
  } catch {
    return NextResponse.json({ error: 'Failed to check for updates' }, { status: 500 });
  }
}