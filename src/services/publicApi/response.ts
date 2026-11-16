import { NextRequest, NextResponse } from 'next/server';
import { AuthContext, PublicApiErrorEnvelope } from '@/types';
import { ApiKeyRateLimitResult } from '@/services/auth/apiKeyRateLimit';
import { apiRequestLogsDb } from '@/db/apiRequestLogs';
import { getClientIp } from '@/services/auth/rateLimit';

export const PUBLIC_API_NO_STORE_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
};

export function attachRateLimitHeaders(
  res: NextResponse,
  rateLimit?: ApiKeyRateLimitResult
): NextResponse {
  if (!rateLimit) return res;
  res.headers.set('X-RateLimit-Limit', String(rateLimit.limit));
  res.headers.set('X-RateLimit-Remaining', String(rateLimit.remaining));
  res.headers.set('X-RateLimit-Reset', String(rateLimit.resetAtUnixSec));
  if (rateLimit.retryAfterSeconds > 0) {
    res.headers.set('Retry-After', String(rateLimit.retryAfterSeconds));
  }
  return res;
}

export function publicApiJson<T>(
  data: T,
  options?: {
    status?: number;
    rateLimit?: ApiKeyRateLimitResult;
  }
): NextResponse {
  const res = NextResponse.json(data, {
    status: options?.status ?? 200,
    headers: PUBLIC_API_NO_STORE_HEADERS,
  });
  return attachRateLimitHeaders(res, options?.rateLimit);
}

export function publicApiError(params: {
  status: number;
  code: string;
  message: string;
  details?: unknown;
  rateLimit?: ApiKeyRateLimitResult;
}): NextResponse {
  const body: PublicApiErrorEnvelope = {
    error: {
      code: params.code,
      message: params.message,
      ...(params.details !== undefined ? { details: params.details } : {}),
    },
  };

  const res = NextResponse.json(body, {
    status: params.status,
    headers: PUBLIC_API_NO_STORE_HEADERS,
  });
  return attachRateLimitHeaders(res, params.rateLimit);
}

export function unauthorizedError(
  message = 'Invalid or missing API key.'
): NextResponse {
  return publicApiError({
    status: 401,
    code: 'unauthorized',
    message,
  });
}

export function forbiddenError(
  message = 'Insufficient API key scope for this resource.',
  rateLimit?: ApiKeyRateLimitResult
): NextResponse {
  return publicApiError({
    status: 403,
    code: 'forbidden',
    message,
    rateLimit,
  });
}

export function rateLimitError(rateLimit: ApiKeyRateLimitResult): NextResponse {
  return publicApiError({
    status: 429,
    code: 'rate_limit_exceeded',
    message: `Rate limit exceeded. Retry after ${rateLimit.retryAfterSeconds} second(s).`,
    rateLimit,
  });
}

export function badRequestError(
  message: string,
  details?: unknown,
  rateLimit?: ApiKeyRateLimitResult
): NextResponse {
  return publicApiError({
    status: 400,
    code: 'bad_request',
    message,
    details,
    rateLimit,
  });
}

export function notFoundError(
  message = 'Requested resource was not found.',
  rateLimit?: ApiKeyRateLimitResult
): NextResponse {
  return publicApiError({
    status: 404,
    code: 'not_found',
    message,
    rateLimit,
  });
}

export function internalServerError(
  message = 'An unexpected internal error occurred.',
  rateLimit?: ApiKeyRateLimitResult
): NextResponse {
  return publicApiError({
    status: 500,
    code: 'internal_error',
    message,
    rateLimit,
  });
}

export function withPublicApiAudit(
  req: NextRequest,
  auth: AuthContext,
  rateLimit: ApiKeyRateLimitResult | undefined,
  startTimeMs: number,
  res: NextResponse
): NextResponse {
  attachRateLimitHeaders(res, rateLimit);

  try {
    apiRequestLogsDb.insert({
      apiKeyId: auth.apiKeyId ?? null,
      keyPrefix: auth.apiKeyPrefix ?? null,
      method: req.method,
      path: req.nextUrl.pathname,
      statusCode: res.status,
      ipAddress: getClientIp(req),
      durationMs: Math.max(0, Date.now() - startTimeMs),
    });
  } catch (err) {
    console.error('[PublicAPI] Failed to record request audit log:', err);
  }

  return res;
}