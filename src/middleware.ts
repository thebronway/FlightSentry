import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_API_PREFIXES = [
  '/api/auth/session',
  '/api/auth/login',
  '/api/auth/passkey/authenticate/options',
  '/api/auth/passkey/authenticate/verify',
];

function isPublicApiPath(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function isStaticAssetPath(pathname: string): boolean {
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon/') ||
    pathname === '/favicon.ico'
  ) {
    return true;
  }
  return /\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map|woff|woff2|ttf|webmanifest)$/i.test(
    pathname
  );
}

interface InternalSessionState {
  authEnabled: boolean;
  authenticated: boolean;
}

async function resolveSessionState(req: NextRequest): Promise<InternalSessionState | null> {
  const cookieHeader = req.headers.get('cookie') || '';
  const port = process.env.PORT || '4000';
  const candidates = [
    `http://127.0.0.1:${port}/api/auth/session`,
    new URL('/api/auth/session', req.url).toString(),
  ];

  for (const targetUrl of candidates) {
    try {
      const res = await fetch(targetUrl, {
        method: 'GET',
        headers: cookieHeader ? { cookie: cookieHeader } : {},
        cache: 'no-store',
      });
      if (res.ok) {
        const data = (await res.json()) as Partial<InternalSessionState>;
        return {
          authEnabled: Boolean(data.authEnabled),
          authenticated: Boolean(data.authenticated),
        };
      }
    } catch {
      // Try fallback candidate URL
    }
  }

  return null;
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (isStaticAssetPath(pathname)) {
    return NextResponse.next();
  }

  // API routes: public auth endpoints pass through; all other /api/* routes are
  // validated against SQLite auth_sessions (and future Bearer API keys) in Node.
  if (pathname.startsWith('/api/')) {
    if (isPublicApiPath(pathname)) {
      return NextResponse.next();
    }
    return NextResponse.next();
  }

  const sessionState = await resolveSessionState(req);
  if (!sessionState) {
    return NextResponse.next();
  }

  if (pathname === '/login') {
    if (!sessionState.authEnabled || sessionState.authenticated) {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }

  if (sessionState.authEnabled && !sessionState.authenticated) {
    const loginUrl = new URL('/login', req.url);
    const requestedPath = `${pathname}${search}`;
    if (requestedPath && requestedPath !== '/') {
      loginUrl.searchParams.set('next', requestedPath);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon/|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map|woff|woff2|ttf|webmanifest)$).*)',
  ],
};