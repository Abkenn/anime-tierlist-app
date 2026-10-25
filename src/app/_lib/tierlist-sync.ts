import { z } from 'zod';
import { type LocalTierlist, localTierlistSchema } from './local-tierlist';

export const userSeedSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-f0-9]{64}$/u);
export const tierlistDocumentSchema = localTierlistSchema
  .pick({
    version: true,
    items: true,
    ranks: true,
    rankDetails: true,
    imageMode: true,
    posterSize: true,
    updatedAt: true,
  })
  .refine(
    (document) =>
      new TextEncoder().encode(JSON.stringify(document)).byteLength <=
      3_000_000,
    'This tierlist is too large to sync.',
  );
export type TierlistDocument = z.infer<typeof tierlistDocumentSchema>;
export type RemoteTierlist = {
  ownerId: string;
  revision: number;
  document: TierlistDocument;
};
export type TierlistFailureCode =
  | 'invalid'
  | 'unavailable'
  | 'rate_limit'
  | 'unauthorized'
  | 'not_found';
export type SyncResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: TierlistFailureCode; message: string };

export const getTierlistDocument = (
  snapshot: LocalTierlist,
): TierlistDocument => ({
  version: snapshot.version,
  items: snapshot.items,
  ranks: snapshot.ranks,
  rankDetails: snapshot.rankDetails,
  imageMode: snapshot.imageMode,
  posterSize: snapshot.posterSize,
  updatedAt: snapshot.updatedAt,
});

const sameJsonValue = (first: unknown, second: unknown): boolean => {
  if (first === second) {
    return true;
  }

  if (Array.isArray(first) || Array.isArray(second)) {
    return (
      Array.isArray(first) &&
      Array.isArray(second) &&
      first.length === second.length &&
      first.every((value: unknown, index) =>
        sameJsonValue(value, second[index]),
      )
    );
  }

  if (
    !first ||
    !second ||
    typeof first !== 'object' ||
    typeof second !== 'object'
  ) {
    return false;
  }

  const entries = Object.entries(first).filter(
    ([, value]) => value !== undefined,
  );
  const other = second as Record<string, unknown>;

  return (
    entries.length ===
      Object.values(other).filter((value) => value !== undefined).length &&
    entries.every(
      ([key, value]) =>
        Object.hasOwn(other, key) && sameJsonValue(value, other[key]),
    )
  );
};

export const sameTierlistDocument = (
  first: TierlistDocument,
  second: TierlistDocument,
) => {
  // Save timestamps describe versions; they are not edits to the tierlist content.
  const { updatedAt: _firstUpdatedAt, ...firstContent } = first;
  const { updatedAt: _secondUpdatedAt, ...secondContent } = second;

  return sameJsonValue(firstContent, secondContent);
};

export const getSyncDecision = (
  local: LocalTierlist,
  remote: RemoteTierlist,
) => {
  if (sameTierlistDocument(getTierlistDocument(local), remote.document)) {
    return 'equal';
  }

  if (
    local.sync?.serverRevision === remote.revision &&
    local.sync.ownerId === remote.ownerId
  ) {
    return 'upload';
  }

  return local.sync?.syncedLocalRevision === local.revision
    ? 'download'
    : 'conflict';
};
