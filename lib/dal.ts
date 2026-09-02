import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { getSession, type SessionPayload } from './session';

// Data Access Layer (per Next's auth guide): centralises the "is there a
// valid session" check so every Server Component/Action/Route Handler goes
// through one place rather than re-reading the cookie ad hoc. Memoised per
// request with React's cache().
export const verifySession = cache(async (): Promise<SessionPayload> => {
  const session = await getSession();
  if (!session || session.expiresAt < Date.now()) {
    redirect('/login');
  }
  return session;
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
