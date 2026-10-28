import {
  tierlistShareIdPattern,
  tierlistShareVersion,
} from '@/app/_lib/tierlist-share-id';
import 'server-only';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { cacheLife, cacheTag, updateTag } from 'next/cache';
import { after, connection } from 'next/server';
import { createTierlistOwner } from '@/app/_data/mutations/tierlist';
import { publishTierlistSnapshot } from '@/app/_data/mutations/tierlist-share';
import { findGoogleAccountByOwner } from '@/app/_data/queries/google-account';
import { findOwnerById } from '@/app/_data/queries/tierlist';
import {
  findOwnerTierlistShare,
  findTierlistShare,
} from '@/app/_data/queries/tierlist-share';
import {
  type TierlistDocument,
  tierlistDocumentSchema,
} from '@/app/_lib/tierlist-sync';
import { env } from '@/env';
import {
  hashTierlistSecret,
  limitSeedAccess,
  requireTierlistOwner,
  TierlistAccessError,
} from './tierlist-identity';
import { getTierlistPng } from './tierlist-png-cache';

const previewFormat = 5;

const previewFingerprint = (revision: number, document: TierlistDocument) => {
  const { updatedAt: _updatedAt, ...content } = document;
  const digest = createHash('sha256')
    .update(JSON.stringify({ previewFormat, document: content }))
    .digest('hex');

  return `v${revision}.${previewFormat}:${digest}`;
};

const findPublishedTierlistPreview = async (
  ownerId: string,
  fingerprint: string,
) => {
  const share = await findOwnerTierlistShare(ownerId);
  if (!share || share.fingerprint !== fingerprint) {
    return null;
  }

  const version = tierlistShareVersion(share.fingerprint);
  const cached = await readCachedPublicTierlist(share.id);
  if (!cached || cached.version !== version) {
    // Repair stale negative/older entries without rebuilding an already valid PNG.
    updateTag(`tierlist-share:${share.id}`);
  }

  return { id: share.id, version };
};

export const readExistingTierlistPreview = async (input: {
  ownerId: string;
  revision: number;
}) => {
  await requireTierlistOwner(input.ownerId);
  const owner = await findOwnerById(input.ownerId);
  if (!owner || owner.revision !== input.revision) {
    return null;
  }

  return findPublishedTierlistPreview(
    owner.id,
    previewFingerprint(
      owner.revision,
      tierlistDocumentSchema.parse(owner.document),
    ),
  );
};

export const readPublicTierlist = async (slug: string) => {
  if (!tierlistShareIdPattern.test(slug)) {
    return null;
  }
  const id = slug.split('.')[0];
  const cached = await readCachedPublicTierlist(id);
  const requestedVersion = slug.slice(id.length + 1);
  if (cached && (!requestedVersion || cached.version === requestedVersion)) {
    return cached;
  }

  // Verify missing/stale URLs at request time before returning a 404 or redirect.
  await connection();

  return publicTierlistSnapshot(await findTierlistShare(id));
};

const publicTierlistSnapshot = (
  share: Awaited<ReturnType<typeof findTierlistShare>>,
) =>
  share
    ? {
        id: share.id,
        version: tierlistShareVersion(share.fingerprint),
        document: tierlistDocumentSchema.parse(share.document),
      }
    : null;

const readCachedPublicTierlist = async (id: string) => {
  'use cache';
  cacheTag(`tierlist-share:${id}`);
  const share = await findTierlistShare(id);
  if (!share) {
    // A missing publication must not become a long-lived cached 404.
    cacheLife({ stale: 0, revalidate: 1, expire: 5 });
    return null;
  }
  cacheLife('max');

  return publicTierlistSnapshot(share);
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
      'Your tierlist changed. Reopen Share to share the latest version.',
    );
  }
  const document = tierlistDocumentSchema.parse(owner.document);
  const fingerprint = previewFingerprint(owner.revision, document);
  const existing = await findPublishedTierlistPreview(
    input.ownerId,
    fingerprint,
  );
  if (existing) {
    return existing;
  }
  const share = await publishTierlistSnapshot({
    id: randomBytes(12).toString('base64url'),
    ownerId: owner.id,
    fingerprint,
    document,
  });

  updateTag(`tierlist-share:${share.id}`);

  if (env.BLOB_READ_WRITE_TOKEN) {
    after(async () => {
      try {
        await getTierlistPng(share.id);
      } catch (error) {
        console.error('Unable to prepare the shared tierlist PNG.', error);
      }
    });
  }

  return { id: share.id, version: tierlistShareVersion(share.fingerprint) };
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
