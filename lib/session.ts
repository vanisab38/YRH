import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SESSION_COOKIE = 'session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // §3: "30-day sessions"

const secretKey = process.env.SESSION_SECRET;
if (!secretKey) {
  throw new Error('SESSION_SECRET is not set');
}
const encodedKey = new TextEncoder().encode(secretKey);

export type Role = 'admin' | 'office' | 'worker';

export type SessionPayload = {
  userId: string;
  role: Role;
  workerId: string | null;
  displayName: string;
  expiresAt: number;
};

async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor((payload.expiresAt) / 1000))
    .sign(encodedKey);
}

async function decrypt(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, encodedKey, { algorithms: ['HS256'] });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSession(user: Omit<SessionPayload, 'expiresAt'>): Promise<void> {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const token = await encrypt({ ...user, expiresAt });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: new Date(expiresAt),
    path: '/',
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  return decrypt(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

// Optimistic (cookie-only) check for proxy.ts — no database round-trip, since
// proxy runs on every request. Real authorization still goes through the DAL.
export async function decryptSessionCookie(token: string | undefined) {
  return decrypt(token);
}

export { SESSION_COOKIE };
