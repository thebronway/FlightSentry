import { NextRequest } from 'next/server';
import { emailQueueDb } from '@/db/emailQueue';
import { requirePublicApiAuth } from '@/services/auth/apiGuard';
import {
  badRequestError,
  internalServerError,
  notFoundError,
  publicApiJson,
} from '@/services/publicApi/response';

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

    emailQueueDb.markDenied(id);

    return authCheck.finish(
      publicApiJson(
        {
          denied: true,
          id,
          pendingCount: emailQueueDb.countPending(),
        },
        { rateLimit: authCheck.rateLimit }
      )
    );
  } catch (error) {
    console.error(
      '[PublicAPI] POST /api/v1/email-queue/[id]/deny failed:',
      error
    );
    return authCheck.finish(
      internalServerError(
        'Failed to deny email queue item.',
        authCheck.rateLimit
      )
    );
  }
}