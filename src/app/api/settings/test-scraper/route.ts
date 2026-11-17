import { NextRequest, NextResponse } from 'next/server';
import { settingsDb } from '@/db/settings';
import { testScraperSchema } from '@/utils/validation';
import { checkScraperHealth, redactScraperSecrets } from '@/services/openFareScraper';
import { requireApiAuth } from '@/services/auth/apiGuard';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const authCheck = await requireApiAuth(req);
  if (authCheck.response) return authCheck.response;

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = testScraperSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || 'Invalid OpenFareScraper configuration.';
      return NextResponse.json({ error: redactScraperSecrets(msg) }, { status: 400 });
    }

    const stored = settingsDb.get();
    const candidateUrl = (parsed.data.openfareScraperUrl ?? stored.openfareScraperUrl ?? '').trim();
    const candidateKey = (parsed.data.openfareScraperApiKey ?? stored.openfareScraperApiKey ?? '').trim();

    if (!candidateUrl) {
      return NextResponse.json({ error: 'Scraper Base URL is required.' }, { status: 400 });
    }
    if (!candidateKey) {
      return NextResponse.json({ error: 'Scraper API Key is required.' }, { status: 400 });
    }

    const validated = testScraperSchema.safeParse({
      openfareScraperUrl: candidateUrl,
      openfareScraperApiKey: candidateKey,
    });
    if (!validated.success) {
      const msg = validated.error.issues[0]?.message || 'Invalid OpenFareScraper URL or API key.';
      return NextResponse.json({ error: redactScraperSecrets(msg) }, { status: 400 });
    }

    const health = await checkScraperHealth(
      validated.data.openfareScraperUrl as string,
      validated.data.openfareScraperApiKey as string
    );

    return NextResponse.json(
      {
        success: true,
        health,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (error: any) {
    const statusCode = error?.statusCode === 401 ? 401 : 400;
    const safeError = redactScraperSecrets(
      error?.message || 'Failed to connect to OpenFareScraper'
    );
    return NextResponse.json({ error: safeError }, { status: statusCode });
  }
}