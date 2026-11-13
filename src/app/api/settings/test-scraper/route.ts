import { NextRequest, NextResponse } from 'next/server';
import { settingsDb } from '@/db/settings';
import { testScraperSchema } from '@/utils/validation';
import { checkScraperHealth, redactScraperSecrets } from '@/services/flightsentryScraper';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = testScraperSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || 'Invalid FlightSentry-Scraper configuration.';
      return NextResponse.json({ error: redactScraperSecrets(msg) }, { status: 400 });
    }

    const stored = settingsDb.get();
    const candidateUrl = (parsed.data.flightsentryScraperUrl ?? stored.flightsentryScraperUrl ?? '').trim();
    const candidateKey = (parsed.data.flightsentryScraperApiKey ?? stored.flightsentryScraperApiKey ?? '').trim();

    if (!candidateUrl) {
      return NextResponse.json({ error: 'Scraper Base URL is required.' }, { status: 400 });
    }
    if (!candidateKey) {
      return NextResponse.json({ error: 'Scraper API Key is required.' }, { status: 400 });
    }

    const validated = testScraperSchema.safeParse({
      flightsentryScraperUrl: candidateUrl,
      flightsentryScraperApiKey: candidateKey,
    });
    if (!validated.success) {
      const msg = validated.error.issues[0]?.message || 'Invalid FlightSentry-Scraper URL or API key.';
      return NextResponse.json({ error: redactScraperSecrets(msg) }, { status: 400 });
    }

    const health = await checkScraperHealth(
      validated.data.flightsentryScraperUrl as string,
      validated.data.flightsentryScraperApiKey as string
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
      error?.message || 'Failed to connect to FlightSentry-Scraper'
    );
    return NextResponse.json({ error: safeError }, { status: statusCode });
  }
}