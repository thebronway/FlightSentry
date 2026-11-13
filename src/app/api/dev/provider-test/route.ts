import { NextRequest, NextResponse } from 'next/server';
import { isApiTesterEnabled } from '@/utils/devGate';
import { devProviderTestSchema } from '@/utils/validation';
import { runDevProviderComparison } from '@/services/devApiTester';
import { redactScraperSecrets } from '@/services/flightsentryScraper';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
};

export async function GET() {
  if (!isApiTesterEnabled()) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404, headers: NO_STORE_HEADERS });
  }
  return NextResponse.json(
    { error: 'Method Not Allowed. Use POST /api/dev/provider-test.' },
    { status: 405, headers: NO_STORE_HEADERS }
  );
}

export async function POST(req: NextRequest) {
  if (!isApiTesterEnabled()) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404, headers: NO_STORE_HEADERS });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Malformed JSON request body.' },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const parsed = devProviderTestSchema.safeParse(body);
  if (!parsed.success) {
    const primaryIssue = parsed.error.issues[0];
    const fieldPrefix =
      primaryIssue && primaryIssue.path.length > 0 ? `${primaryIssue.path.join('.')}: ` : '';
    const safeMessage = redactScraperSecrets(
      `${fieldPrefix}${primaryIssue?.message || 'Invalid provider test parameters.'}`
    );
    return NextResponse.json(
      {
        error: safeMessage,
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: redactScraperSecrets(issue.message),
        })),
      },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  try {
    const report = await runDevProviderComparison(parsed.data);
    return NextResponse.json(report, {
      status: 200,
      headers: NO_STORE_HEADERS,
    });
  } catch (error: any) {
    const safeError = redactScraperSecrets(
      error?.message || 'Unexpected error executing provider comparison test.'
    );
    console.error('[DevProviderTest API] Execution failed:', safeError);
    return NextResponse.json(
      { error: safeError },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}