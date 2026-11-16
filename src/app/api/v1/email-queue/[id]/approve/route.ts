import { NextRequest } from 'next/server';
import { emailQueueItemEditSchema } from '@/utils/validation';
import { applyEmailQueueItem } from '@/services/emailScanner';
import { emailQueueDb } from '@/db/emailQueue';
import { flightDb } from '@/db/flights';
import { settingsDb } from '@/db/settings';
import { requirePublicApiAuth } from '@/services/auth/apiGuard';
import {
  badRequestError,
  notFoundError,
  publicApiJson,
} from '@/services/publicApi/response';
import { serializePublicFlightSummary } from '@/services/publicApi/flightSerializer';

export const dynamic = 'force-dynamic';

function parseQueueId(rawId: string): number | null {
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
    const id = parseQueueId(params.id);
    if (!id) {
      return authCheck.finish(
        badRequestError(
          'Invalid email queue item ID.',
          undefined,
          authCheck.rateLimit
        )
      );
    }

    const existing = emailQueueDb.getById(id);
    if (!existing) {
      return authCheck.finish(
        notFoundError('Queued email item not found.', authCheck.rateLimit)
      );
    }

    if (existing.status !== 'pending') {
      return authCheck.finish(
        badRequestError(
          `Queued email item has already been ${existing.status}.`,
          undefined,
          authCheck.rateLimit
        )
      );
    }

    const body = await req.json().catch(() => ({}));
    const hasOverrides =
      body && typeof body === 'object' && Object.keys(body).length > 0;

    let sanitizedOverrides: Record<string, unknown> | undefined;
    if (hasOverrides) {
      const parsed = emailQueueItemEditSchema.safeParse(body);
      if (!parsed.success) {
        return authCheck.finish(
          badRequestError(
            parsed.error.issues[0]?.message || 'Invalid flight details.',
            parsed.error.issues,
            authCheck.rateLimit
          )
        );
      }
      sanitizedOverrides = Object.fromEntries(
        Object.entries(parsed.data).map(([k, v]) => [k, v === '' ? null : v])
      );
    }

    const result = applyEmailQueueItem(id, sanitizedOverrides);
    const settings = settingsDb.get();
    const defaultCurrency = (settings.currency || 'USD').trim();
    const affectedFlight = flightDb.getById(result.flightId);

    return authCheck.finish(
      publicApiJson(
        {
          approved: true,
          result,
          flight: affectedFlight
            ? serializePublicFlightSummary(affectedFlight, defaultCurrency)
            : null,
          pendingCount: emailQueueDb.countPending(),
        },
        { rateLimit: authCheck.rateLimit }
      )
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to approve email queue item.';
    console.error(
      '[PublicAPI] POST /api/v1/email-queue/[id]/approve failed:',
      error
    );
    return authCheck.finish(
      badRequestError(message, undefined, authCheck.rateLimit)
    );
  }
}