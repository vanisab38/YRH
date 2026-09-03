// Route protection (§3). Renamed from `middleware.ts` to `proxy.ts` in
// Next.js 16 — see node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md.
// Optimistic check only (cookie, no DB round-trip): proxy runs on every
// request, so real authorization still happens in the DAL (lib/dal.ts) —
// which also re-checks the user against the database (see lib/dal.ts on
// verifySession), not just the cookie.
//
// Deliberately does NOT bounce an authenticated cookie away from /login.
// That rule used to exist for a nicer "already logged in? skip the form"
// UX, but it fought with the DAL's real check: a cryptographically valid
// but deactivated-user cookie would hit verifySession -> redirect('/login'),
// which proxy would immediately bounce back to '/' on the very next
// request, which redirects to /login again — an infinite loop. Found by
// testing the admin "deactivate user" feature against a live session.
import { NextResponse, type NextRequest } from 'next/server';
import { decryptSessionCookie, SESSION_COOKIE } from '@/lib/session';

const PUBLIC_ROUTES = ['/login'];

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  const session = await decryptSessionCookie(request.cookies.get(SESSION_COOKIE)?.value);
  const isAuthenticated = !!session && session.expiresAt > Date.now();

  if (!isPublicRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.svg$).*)'],
};
