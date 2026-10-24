import 'server-only';
import { randomBytes, randomUUID } from 'node:crypto';
import {
  createTierlistOwner,
  saveTierlistOwner,
} from '@/app/_data/mutations/tierlist';
import { findGoogleAccountByOwner } from '@/app/_data/queries/google-account';
import {
  findOwnerById,
  findOwnerBySeedHash,
} from '@/app/_data/queries/tierlist';
import {
  type RemoteTierlist,
  type TierlistDocument,
  tierlistDocumentSchema,
} from '@/app/_lib/tierlist-sync';
import { getGoogleIdentity } from './google-session';
import {
  hashTierlistSecret,
  issueTierlistSession,
  limitSeedAccess,
  requireTierlistOwner,
  TierlistAccessError,
} from './tierlist-identity';

const toRemote = (owner: {
  id: string;
  revision: number;
  document: unknown;
}): RemoteTierlist => ({
  ownerId: owner.id,
  revision: owner.revision,
  document: tierlistDocumentSchema.parse(owner.document),
});

export const connectSeedTierlist = async (
  seed: string,
  document?: TierlistDocument,
) => {
  await limitSeedAccess();
  const seedHash = hashTierlistSecret(seed);
  const existing = await findOwnerBySeedHash(seedHash);
  const owner =
    existing ??
    (document &&
      (await createTierlistOwner({
        id: randomUUID(),
        seedHash,
        document,
      })));

  if (!owner) {
    throw new TierlistAccessError(
      'not_found',
      'No saved tierlist was found for this seed.',
    );
  }

  if (await findGoogleAccountByOwner(owner.id)) {
    throw new TierlistAccessError(
      'unauthorized',
      'This tierlist requires Google sign-in.',
    );
  }

  await issueTierlistSession(owner.id);

  return toRemote(owner);
};

export const connectAccountTierlist = async () => {
  const account = await getGoogleIdentity();
  const owner = account && (await findOwnerById(account.ownerId));
  if (!owner) {
    throw new TierlistAccessError(
      'unauthorized',
      'Sign in with Google to open your tierlist.',
    );
  }

  await issueTierlistSession(owner.id);

  return toRemote(owner);
};

export const shareAccountTierlist = async () => {
  await limitSeedAccess();
  const source = await connectAccountTierlist();
  const seed = randomBytes(32).toString('hex');
  await createTierlistOwner({
    id: randomUUID(),
    seedHash: hashTierlistSecret(seed),
    document: source.document,
  });

  return seed;
};

type ReplaceAccountInput = { seed: string; ownerId: string; revision: number };

export const replaceAccountTierlist = async (input: ReplaceAccountInput) => {
  await limitSeedAccess();
  const account = await connectAccountTierlist();
  if (account.ownerId !== input.ownerId) {
    throw new TierlistAccessError(
      'unauthorized',
      'Your account changed. Reopen the tierlist before replacing it.',
    );
  }

  const source = await findOwnerBySeedHash(hashTierlistSecret(input.seed));
  if (!source || (await findGoogleAccountByOwner(source.id))) {
    throw new TierlistAccessError(
      'not_found',
      'No shared or anonymous tierlist was found for this seed.',
    );
  }

  const saved = await saveSeedTierlist({
    ownerId: account.ownerId,
    revision: input.revision,
    document: tierlistDocumentSchema.parse(source.document),
  });
  if (saved.status === 'conflict') {
    throw new TierlistAccessError(
      'invalid',
      'Your account tierlist changed. Refresh and review it before replacing.',
    );
  }

  return saved.tierlist;
};

export const saveSeedTierlist = async (input: {
  ownerId: string;
  revision: number;
  document: TierlistDocument;
}) => {
  await requireTierlistOwner(input.ownerId);
  const owner = await saveTierlistOwner({
    id: input.ownerId,
    revision: input.revision,
    document: input.document,
  });

  if (owner) {
    return { status: 'saved' as const, tierlist: toRemote(owner) };
  }

  const latest = await findOwnerById(input.ownerId);

  if (!latest) {
    throw new TierlistAccessError(
      'not_found',
      'This tierlist is no longer available.',
    );
  }

  return { status: 'conflict' as const, tierlist: toRemote(latest) };
};
