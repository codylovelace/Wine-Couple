import crypto from 'crypto';
import path from 'path';
import { promisify } from 'util';
import { NextRequest, NextResponse } from 'next/server';
import { DATA_DIR } from './paths';
import { readJson, withWriteLock, writeJsonAtomic } from './json-store';
import { PartnerSlot, PublicUser } from './types';

// Two accounts (one per partner), created on first run from the setup screen.
// Sessions are random tokens in an httpOnly cookie; only their SHA-256 is
// stored, so a copy of sessions.json can't be used to sign in.

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

export const SESSION_COOKIE = 'wc_session';
const SESSION_DAYS = 60;
export const MIN_PASSWORD_LENGTH = 8;
const MAX_NAME_LENGTH = 30;

export interface StoredUser {
  id: string;
  name: string;
  slot: PartnerSlot;
  passwordHash: string;
  createdAt: string;
  passwordChangedAt: string;
}

interface StoredSession {
  userId: string;
  createdAt: string;
  expiresAt: string;
}

type SessionMap = Record<string, StoredSession>;

// ---------- passwords ----------

const scrypt = promisify(crypto.scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: crypto.ScryptOptions
) => Promise<Buffer>;

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

// Format: scrypt$N$r$p$salt$hash (base64). Kept in step with
// scripts/reset-password.mjs, which writes the same format.
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p, maxmem: 64 * 1024 * 1024 });
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64'), key.toString('base64')].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [alg, n, r, p, saltB64, hashB64] = stored.split('$');
  if (alg !== 'scrypt' || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64');
  const key = await scrypt(password, Buffer.from(saltB64, 'base64'), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: 64 * 1024 * 1024,
  });
  return key.length === expected.length && crypto.timingSafeEqual(key, expected);
}

// Used when the name doesn't match anyone, so a wrong name takes as long as a
// wrong password.
let dummyHash: Promise<string> | null = null;

export function passwordProblem(password: unknown): string | null {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return `Passwords need at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password.length > 200) return 'That password is too long.';
  return null;
}

export function cleanName(name: unknown): string {
  return typeof name === 'string' ? name.trim().replace(/\s+/g, ' ').slice(0, MAX_NAME_LENGTH) : '';
}

// ---------- users ----------

export async function getUsers(): Promise<StoredUser[]> {
  const users = await readJson<StoredUser[]>(USERS_FILE, []);
  return users.sort((a, b) => a.slot - b.slot);
}

export function toPublicUser(user: StoredUser): PublicUser {
  return { id: user.id, name: user.name, slot: user.slot };
}

export async function needsSetup(): Promise<boolean> {
  return (await getUsers()).length === 0;
}

// Creates both accounts at once. Fails if accounts already exist, so the
// setup form can't be used to take over a running install.
export async function createInitialUsers(
  people: { name: string; password: string }[]
): Promise<StoredUser[]> {
  const hashes = await Promise.all(people.map((p) => hashPassword(p.password)));
  return withWriteLock(async () => {
    const existing = await readJson<StoredUser[]>(USERS_FILE, []);
    if (existing.length > 0) throw new SetupAlreadyDoneError();
    const now = new Date().toISOString();
    const users: StoredUser[] = people.map((p, i) => ({
      id: `user-${crypto.randomBytes(6).toString('hex')}`,
      name: p.name,
      slot: (i + 1) as PartnerSlot,
      passwordHash: hashes[i],
      createdAt: now,
      passwordChangedAt: now,
    }));
    await writeJsonAtomic(USERS_FILE, users, 0o600);
    return users;
  });
}

export class SetupAlreadyDoneError extends Error {
  constructor() {
    super('Accounts already exist.');
  }
}

async function updateUser(userId: string, fn: (user: StoredUser, all: StoredUser[]) => void): Promise<StoredUser> {
  return withWriteLock(async () => {
    const users = await readJson<StoredUser[]>(USERS_FILE, []);
    const user = users.find((u) => u.id === userId);
    if (!user) throw new Error('User not found');
    fn(user, users);
    await writeJsonAtomic(USERS_FILE, users, 0o600);
    return user;
  });
}

export async function renameUser(userId: string, name: string): Promise<StoredUser> {
  return updateUser(userId, (user, all) => {
    if (all.some((u) => u.id !== userId && u.name.toLowerCase() === name.toLowerCase())) {
      throw new Error('Both of you need different names.');
    }
    user.name = name;
  });
}

export async function setUserPassword(userId: string, password: string): Promise<StoredUser> {
  const hash = await hashPassword(password);
  return updateUser(userId, (user) => {
    user.passwordHash = hash;
    user.passwordChangedAt = new Date().toISOString();
  });
}

// ---------- login throttling ----------
// After 5 wrong passwords in a row an account is locked for a minute,
// doubling with each further miss up to 15 minutes. In memory only: a
// container restart clears it, which is fine for a two-person home app.

const failures = new Map<string, { count: number; lockedUntil: number }>();

export function lockedForSeconds(userId: string): number {
  const f = failures.get(userId);
  if (!f || f.lockedUntil <= Date.now()) return 0;
  return Math.ceil((f.lockedUntil - Date.now()) / 1000);
}

function recordFailure(userId: string) {
  const f = failures.get(userId) ?? { count: 0, lockedUntil: 0 };
  f.count += 1;
  if (f.count >= 5) {
    const minutes = Math.min(15, 2 ** (f.count - 5));
    f.lockedUntil = Date.now() + minutes * 60_000;
  }
  failures.set(userId, f);
}

export type LoginResult =
  | { ok: true; user: StoredUser }
  | { ok: false; reason: 'bad-credentials' }
  | { ok: false; reason: 'locked'; seconds: number };

export async function checkLogin(name: string, password: string): Promise<LoginResult> {
  const users = await getUsers();
  const user = users.find((u) => u.name.toLowerCase() === name.trim().toLowerCase());
  if (!user) {
    dummyHash ??= hashPassword('not-a-real-password');
    await verifyPassword(password, await dummyHash);
    return { ok: false, reason: 'bad-credentials' };
  }
  const seconds = lockedForSeconds(user.id);
  if (seconds > 0) return { ok: false, reason: 'locked', seconds };
  if (!(await verifyPassword(password, user.passwordHash))) {
    recordFailure(user.id);
    return { ok: false, reason: 'bad-credentials' };
  }
  failures.delete(user.id);
  return { ok: true, user };
}

// ---------- sessions ----------

function tokenHash(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function pruneExpired(sessions: SessionMap) {
  const now = Date.now();
  for (const [key, s] of Object.entries(sessions)) {
    if (Date.parse(s.expiresAt) <= now) delete sessions[key];
  }
}

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await withWriteLock(async () => {
    const sessions = await readJson<SessionMap>(SESSIONS_FILE, {});
    pruneExpired(sessions);
    sessions[tokenHash(token)] = {
      userId,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
    await writeJsonAtomic(SESSIONS_FILE, sessions, 0o600);
  });
  return { token, expiresAt };
}

export async function deleteSession(token: string): Promise<void> {
  await withWriteLock(async () => {
    const sessions = await readJson<SessionMap>(SESSIONS_FILE, {});
    delete sessions[tokenHash(token)];
    await writeJsonAtomic(SESSIONS_FILE, sessions, 0o600);
  });
}

// Signs a user out everywhere except (optionally) the session making the change.
export async function deleteUserSessions(userId: string, keepToken?: string): Promise<void> {
  const keep = keepToken ? tokenHash(keepToken) : null;
  await withWriteLock(async () => {
    const sessions = await readJson<SessionMap>(SESSIONS_FILE, {});
    for (const [key, s] of Object.entries(sessions)) {
      if (s.userId === userId && key !== keep) delete sessions[key];
    }
    await writeJsonAtomic(SESSIONS_FILE, sessions, 0o600);
  });
}

export async function userForToken(token: string | undefined): Promise<StoredUser | null> {
  if (!token) return null;
  const sessions = await readJson<SessionMap>(SESSIONS_FILE, {});
  const session = sessions[tokenHash(token)];
  if (!session || Date.parse(session.expiresAt) <= Date.now()) return null;
  const users = await getUsers();
  return users.find((u) => u.id === session.userId) ?? null;
}

// ---------- request helpers ----------

export function sessionToken(request: NextRequest): string | undefined {
  return request.cookies.get(SESSION_COOKIE)?.value;
}

export async function userFromRequest(request: NextRequest): Promise<StoredUser | null> {
  return userForToken(sessionToken(request));
}

export function unauthorized() {
  return NextResponse.json({ success: false, error: 'Please sign in again.' }, { status: 401 });
}

// Secure cookies only work over HTTPS, so set the flag when the request came
// in that way (directly or via a proxy such as nginx that sets
// X-Forwarded-Proto). Plain-HTTP LAN access keeps working.
function isHttps(request: NextRequest): boolean {
  const forwarded = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  return forwarded ? forwarded === 'https' : request.nextUrl.protocol === 'https:';
}

export function setSessionCookie(res: NextResponse, request: NextRequest, token: string, expiresAt: Date) {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isHttps(request),
    path: '/',
    expires: expiresAt,
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
}

// Wraps a route handler so it only runs for a signed-in user.
export function withUser<Ctx>(
  handler: (request: NextRequest, user: StoredUser, ctx: Ctx) => Promise<Response>
) {
  return async (request: NextRequest, ctx: Ctx): Promise<Response> => {
    const user = await userFromRequest(request);
    if (!user) return unauthorized();
    return handler(request, user, ctx);
  };
}
