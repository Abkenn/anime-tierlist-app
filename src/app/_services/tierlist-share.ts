import 'server-only';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { cacheLife, cacheTag, revalidateTag } from 'next/cache';
import { createTierlistOwner } from '@/app/_data/mutations/tierlist';
import { publishTierlistSnapshot } from '@/app/_data/mutations/tierlist-share';
import { findGoogleAccountByOwner } from '@/app/_data/queries/google-account';
import { findOwnerById } from '@/app/_data/queries/tierlist';
import { findTierlistShare } from '@/app/_data/queries/tierlist-share';
import { tierlistDocumentSchema } from '@/app/_lib/tierlist-sync';
import {
  hashTierlistSecret,
  limitSeedAccess,
  requireTierlistOwner,
  TierlistAccessError,
} from './tierlist-identity';

export const readPublicTierlist = async (id: string) => {
  'use cache';
  cacheLife('max');
  cacheTag(`tierlist-share:${id.split('.')[0]}`);
  if (!/^[A-Za-z0-9_-]{16}(?:\.[a-f0-9]{16})?$/u.test(id)) {
    return null;
  }
  const share = await findTierlistShare(id);

  return share
    ? {
        id: share.id,
        version: share.fingerprint.slice(0, 16),
        document: tierlistDocumentSchema.parse(share.document),
      }
    : null;
};

export const prepareTierlistShare = async (input: {
  ownerId: string;
  revision: number;
  seed?: string;
}) => {
  await limitSeedAccess();
  await requireTierlistOwner(input.ownerId);
  const owner = await findOwnerById(input.ownerId);
  if (!owner || owner.revision !== input.revision) {
    throw new TierlistAccessError(
      'invalid',
      'Your tierlist changed. Wait for it to save and try again.',
    );
  }
  const document = tierlistDocumentSchema.parse(owner.document);
  const account = await findGoogleAccountByOwner(owner.id);
  if (
    !account &&
    (!input.seed || hashTierlistSecret(input.seed) !== owner.seedHash)
  ) {
    throw new TierlistAccessError(
      'unauthorized',
      'Reconnect your tierlist before sharing.',
    );
  }
  const seed = account ? randomBytes(32).toString('hex') : input.seed;
  if (!seed) {
    throw new TierlistAccessError('invalid', 'A seed is required.');
  }
  if (account) {
    await createTierlistOwner({
      id: randomUUID(),
      seedHash: hashTierlistSecret(seed),
      document,
    });
  }

  return { seed };
};

export const publishTierlist = async (input: {
  ownerId: string;
  revision: number;
}) => {
  await limitSeedAccess();
  await requireTierlistOwner(input.ownerId);
  const owner = await findOwnerById(input.ownerId);
  if (!owner || owner.revision !== input.revision) {
    throw new TierlistAccessError(
      'invalid',
      'Your tierlist changed. Reopen Save & Share to share the latest version.',
    );
  }
  const document = tierlistDocumentSchema.parse(owner.document);
  const { updatedAt: _updatedAt, ...content } = document;
  const fingerprint = createHash('sha256')
    .update(JSON.stringify(content))
    .digest('hex');
  const share = await publishTierlistSnapshot({
    id: randomBytes(12).toString('base64url'),
    ownerId: owner.id,
    fingerprint,
    document,
  });

  revalidateTag(`tierlist-share:${share.id}`, { expire: 0 });

  return { id: share.id, version: fingerprint.slice(0, 16) };
};

export const copyPublicTierlistSeed = async (id: string) => {
  await limitSeedAccess();
  const share = await readPublicTierlist(id);
  if (!share) {
    throw new TierlistAccessError(
      'not_found',
      'This shared tierlist is unavailable.',
    );
  }
  const seed = randomBytes(32).toString('hex');
  await createTierlistOwner({
    id: randomUUID(),
    seedHash: hashTierlistSecret(seed),
    document: share.document,
  });

  return seed;
};
