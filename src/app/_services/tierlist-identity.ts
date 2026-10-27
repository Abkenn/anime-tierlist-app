import { env } from '@/env';
import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import {
  consumeTierlistRateLimit,
  createTierlistSession,
  deleteTierlistSession,
  pruneTierlistAccessRecords,
} from '@/app/_data/mutations/tierlist';
import { findGoogleAccountByOwner } from '@/app/_data/queries/google-account';
import {
  findOwnerById,
  findTierlistSession,
} from '@/app/_data/queries/tierlist';
import type { TierlistFailureCode } from '@/app/_lib/tierlist-sync';
import { getGoogleIdentity } from './google-session';

const cookieName = 'tierlist-session';
const sessionSeconds = 60 * 60 * 24 * 30;

export const readAnonymousTierlistOwner = async () => {
  const token = (await cookies()).get(cookieName)?.value;
  const session =
    token && (await findTierlistSession(hashTierlistSecret(token)));
  if (
    !session ||
    session.expiresAt <= BigInt(Date.now()) ||
    (await findGoogleAccountByOwner(session.ownerId))
  ) {
    return null;
  }

  return findOwnerById(session.ownerId);
};

export class TierlistAccessError extends Error {
  constructor(
    public readonly code: TierlistFailureCode,
    message: string,
  ) {
    super(message);
  }
}

export const hashTierlistSecret = (secret: string) =>
  createHash('sha256').update(secret).digest('hex');

export const limitSeedAccess = async () => {
  const requestHeaders = await headers();
  const address = env.VERCEL
    ? (requestHeaders.get('x-vercel-forwarded-for') ?? 'unknown')
    : 'local';
  const allowed = await consumeTierlistRateLimit({
    id: `seed:${hashTierlistSecret(address)}`,
    limit: 20,
    windowMs: 60_000,
  });

  if (!allowed) {
    throw new TierlistAccessError(
      'rate_limit',
      'Too many seed requests. Try again in a minute.',
    );
  }

  await pruneTierlistAccessRecords();
};

export const issueTierlistSession = async (ownerId: string) => {
  const jar = await cookies();
  const existingToken = jar.get(cookieName)?.value;
  const existing =
    existingToken &&
    (await findTierlistSession(hashTierlistSecret(existingToken)));

  if (
    existing &&
    existing.ownerId === ownerId &&
    existing.expiresAt > BigInt(Date.now() + 86_400_000)
  ) {
    return;
  }

  const token = randomBytes(32).toString('hex');
  await createTierlistSession({
    tokenHash: hashTierlistSecret(token),
    ownerId,
    expiresAt: BigInt(Date.now() + sessionSeconds * 1000),
  });
  jar.set(cookieName, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: sessionSeconds,
  });
};

export const requireTierlistOwner = async (ownerId: string) => {
  const googleOwner = await findGoogleAccountByOwner(ownerId);
  if (googleOwner && (await getGoogleIdentity())?.ownerId !== ownerId) {
    throw new TierlistAccessError(
      'unauthorized',
      'Sign in with Google to access this tierlist.',
    );
  }

  const token = (await cookies()).get(cookieName)?.value;
  const session =
    token && (await findTierlistSession(hashTierlistSecret(token)));

  if (
    !session ||
    session.ownerId !== ownerId ||
    session.expiresAt <= BigInt(Date.now())
  ) {
    throw new TierlistAccessError(
      'unauthorized',
      'Reconnect this tierlist before saving online.',
    );
  }

  if (
    !(await consumeTierlistRateLimit({
      id: `save:${session.tokenHash}`,
      limit: 120,
      windowMs: 60_000,
    }))
  ) {
    throw new TierlistAccessError(
      'rate_limit',
      'Saving paused briefly. Your changes are saved on this device.',
    );
  }
};

export const endTierlistSession = async () => {
  const jar = await cookies();
  const token = jar.get(cookieName)?.value;

  if (token) {
    await deleteTierlistSession(hashTierlistSecret(token));
  }

  jar.delete(cookieName);
};
