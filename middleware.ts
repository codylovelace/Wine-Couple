import { NextRequest, NextResponse } from 'next/server';

// First gate: anything without a session cookie goes to the sign-in page
// (or gets a 401 for API calls). The cookie itself is checked against the
// session store by each route (withUser) and by the home page, so this only
// has to catch requests that aren't signed in at all.
const SESSION_COOKIE = 'wc_session';

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/setup', '/api/auth/logout', '/api/health'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.includes(pathname) || request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.next();
  }
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ success: false, error: 'Please sign in again.' }, { status: 401 });
  }
  return NextResponse.redirect(new URL('/login', request.url));
}

export const config = {
  // Static build files and the icons/manifest the sign-in page and home
  // screen shortcut need stay public.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon|apple-touch-icon|manifest.json).*)'],
};
