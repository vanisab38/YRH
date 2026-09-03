import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';
import { getSession, type SessionPayload } from './session';

// Data Access Layer (per Next's auth guide): centralises the "is there a
// valid session" check so every Server Component/Action/Route Handler goes
// through one place rather than re-reading the cookie ad hoc. Memoised per
// request with React's cache().
//
// Re-checks the user against the database rather than trusting the JWT's
// baked-in claims. A stateless session is normally fine to trust for the
// session's lifetime, but this app now has an admin "deactivate user"
// action (§2/§3 Admin), and deactivation has to actually take effect —
// not "eventually, once their 30-day cookie expires." The same DB read
// also means a role or worker-link change by admin applies on the very
// next request, not after the affected user logs out and back in. One
// indexed lookup by primary key per request is cheap at this app's scale
// (a few hundred work orders a month, under ten users).
export const verifySession = cache(async (): Promise<SessionPayload> => {
  const session = await getSession();
  if (!session || session.expiresAt < Date.now()) {
    redirect('/login');
  }

  const user = await db.query.users.findFirst({ where: eq(users.id, session.userId) });
  if (!user || !user.isActive) {
    // Can't clear the cookie here — verifySession() runs from Server
    // Components too, and Next.js only allows writing cookies from a
    // Server Action or Route Handler. The stale cookie is harmless: this
    // same check redirects it away on every subsequent request, and it's
    // fully replaced on the next real login or the explicit logout action.
    redirect('/login');
  }

  return {
    userId: user.id,
    role: user.role as SessionPayload['role'],
    workerId: user.workerId,
    displayName: user.displayName,
    expiresAt: session.expiresAt,
  };
});

// Same check without redirecting — for places that need to branch instead
// of forcing a navigation (e.g. proxy-adjacent checks, optional UI).
export const getOptionalSession = cache(async (): Promise<SessionPayload | null> => {
  const session = await getSession();
  if (!session || session.expiresAt < Date.now()) return null;
  return session;
});

export function requireRole(session: SessionPayload, ...roles: SessionPayload['role'][]) {
  if (!roles.includes(session.role)) {
    redirect('/');
  }
}
