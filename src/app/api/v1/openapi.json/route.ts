import { NextRequest } from 'next/server';
import { requirePublicApiAuth } from '@/services/auth/apiGuard';
import { publicApiJson } from '@/services/publicApi/response';
import { buildOpenApiSpec } from '@/services/publicApi/openApiSpec';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authCheck = await requirePublicApiAuth(req, 'read');
  if (authCheck.response) return authCheck.response;

  const forwardedProto = (req.headers.get('x-forwarded-proto') || '')
    .split(',')[0]
    .trim();
  const forwardedHost = (
    req.headers.get('x-forwarded-host') ||
    req.headers.get('host') ||
    ''
  )
    .split(',')[0]
    .trim();

  const baseUrl = forwardedHost
    ? `${forwardedProto || 'http'}://${forwardedHost}`
    : req.nextUrl.origin;

  const spec = buildOpenApiSpec(baseUrl);
  return authCheck.finish(
    publicApiJson(spec, { rateLimit: authCheck.rateLimit })
  );
}