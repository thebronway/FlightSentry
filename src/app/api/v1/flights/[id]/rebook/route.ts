import { NextRequest } from 'next/server';
import { flightDb } from '@/db/flights';
import { settingsDb } from '@/db/settings';
import { requirePublicApiAuth } from '@/services/auth/apiGuard';
import {
  badRequestError,
  internalServerError,
  notFoundError,
  publicApiJson,
} from '@/services/publicApi/response';
import { serializePublicFlightSummary } from '@/services/publicApi/flightSerializer';
import { publicFlightRebookSchema } from '@/utils/validation';

export const dynamic = 'force-dynamic';

function parseFlightId(rawId: string): number | null {
  if (!/^\d+$/.test(rawId)) return null;
  const parsed = parseInt(rawId, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authCheck = await requirePublicApiAuth(req, 'write');
  if (authCheck.response) return authCheck.response;

  try {
    const id = parseFlightId(params.id);
    if (!id) {
      return authCheck.finish(
        badRequestError('Invalid flight ID.', undefined, authCheck.rateLimit)
      );
    }

    const existing = flightDb.getById(id);
    if (!existing) {
      return authCheck.finish(
        notFoundError('Flight not found.', authCheck.rateLimit)
      );
    }

    if (
      existing.status !== 'Booked' &&
      !(existing.purchasePrice && existing.purchasePrice > 0)
    ) {
      return authCheck.finish(
        badRequestError(
          'Rebooking adjustments can only be logged on Booked flights. Convert the flight to Booked first.',
          undefined,
          authCheck.rateLimit
        )
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return authCheck.finish(
        badRequestError(
          'Request body must be a valid JSON object.',
          undefined,
          authCheck.rateLimit
        )
      );
    }

    const parsedResult = publicFlightRebookSchema.safeParse(body);
    if (!parsedResult.success) {
      return authCheck.finish(
        badRequestError(
          parsedResult.error.issues[0]?.message || 'Invalid rebook payload.',
          parsedResult.error.issues,
          authCheck.rateLimit
        )
      );
    }

    const parsed = parsedResult.data;
    const previousPurchasePrice =
      existing.purchasePrice || existing.baselinePrice;
    const creditClaimed = Math.max(0, previousPurchasePrice - parsed.newPrice);

    let checkedAt: string | null = null;
    if (parsed.checkedAt) {
      const dt = new Date(parsed.checkedAt);
      checkedAt = Number.isNaN(dt.getTime())
        ? new Date().toISOString()
        : dt.toISOString();
    }

    const updated = flightDb.rebook(id, parsed.newPrice, {
      airline: parsed.airline || undefined,
      flightNumber: parsed.flightNumber || undefined,
      origin: parsed.origin || undefined,
      destination: parsed.destination || undefined,
      pnr: parsed.pnr || undefined,
      notes: parsed.notes !== undefined ? parsed.notes : undefined,
      checkedAt,
    });

    if (!updated) {
      return authCheck.finish(
        notFoundError('Flight not found.', authCheck.rateLimit)
      );
    }

    const settings = settingsDb.get();
    const defaultCurrency = (settings.currency || 'USD').trim();

    return authCheck.finish(
      publicApiJson(
        {
          rebooked: true,
          previousPurchasePrice,
          newPurchasePrice: parsed.newPrice,
          creditClaimed: Math.round(creditClaimed * 100) / 100,
          flight: serializePublicFlightSummary(updated, defaultCurrency),
        },
        { rateLimit: authCheck.rateLimit }
      )
    );
  } catch (error) {
    console.error(
      '[PublicAPI] POST /api/v1/flights/[id]/rebook failed:',
      error
    );
    return authCheck.finish(
      internalServerError(
        'Failed to record flight rebook adjustment.',
        authCheck.rateLimit
      )
    );
  }
}