import 'server-only';
import { randomUUID } from 'node:crypto';
import {
  createTierlistOwner,
  saveTierlistOwner,
} from '@/app/_data/mutations/tierlist';
import {
  findOwnerById,
  findOwnerBySeedHash,
} from '@/app/_data/queries/tierlist';
import {
  type RemoteTierlist,
  type TierlistDocument,
  tierlistDocumentSchema,
} from '@/app/_lib/tierlist-sync';
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
  document: string;
}): RemoteTierlist => ({
  ownerId: owner.id,
  revision: owner.revision,
  document: tierlistDocumentSchema.parse(JSON.parse(owner.document)),
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
        document: JSON.stringify(document),
      })));

  if (!owner) {
    throw new TierlistAccessError(
      'not_found',
      'No saved tierlist was found for this seed.',
    );
  }

  await issueTierlistSession(owner.id);

  return toRemote(owner);
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
    document: JSON.stringify(input.document),
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
