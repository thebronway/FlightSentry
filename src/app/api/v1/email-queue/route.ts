import { NextRequest } from 'next/server';
import { emailQueueDb } from '@/db/emailQueue';
import { flightDb } from '@/db/flights';
import { settingsDb } from '@/db/settings';
import { parseConfiguredPointsCurrencies } from '@/services/emailScanner/pointsMatcher';
import { requirePublicApiAuth } from '@/services/auth/apiGuard';
import {
  internalServerError,
  publicApiJson,
} from '@/services/publicApi/response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authCheck = await requirePublicApiAuth(req, 'read');
  if (authCheck.response) return authCheck.response;

  try {
    const items = emailQueueDb.listPending();
    const allFlights = flightDb.getAll();
    const settings = settingsDb.get();
    const pointsCurrencies = parseConfiguredPointsCurrencies(
      settings?.pointsCurrencies
    );

    const activeFlights = allFlights
      .filter((f) => f.status !== 'Past')
      .map((f) => ({
        id: f.id,
        airline: f.airline,
        flightNumber: f.flightNumber || null,
        origin: f.origin || null,
        destination: f.destination || null,
        departureDate: f.departureDate,
        pnr: f.pnr || null,
        status: f.status,
      }));

    return authCheck.finish(
      publicApiJson(
        {
          items,
          count: items.length,
          flights: activeFlights,
          pointsCurrencies,
          defaultCurrency: (settings?.currency || 'USD').trim(),
        },
        { rateLimit: authCheck.rateLimit }
      )
    );
  } catch (error) {
    console.error('[PublicAPI] GET /api/v1/email-queue failed:', error);
    return authCheck.finish(
      internalServerError('Failed to load email queue.', authCheck.rateLimit)
    );
  }
}