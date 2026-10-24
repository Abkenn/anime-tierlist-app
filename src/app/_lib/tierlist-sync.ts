import { z } from 'zod';
import { type LocalTierlist, localTierlistSchema } from './local-tierlist';

export const userSeedSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-f0-9]{64}$/u);
export const tierlistDocumentSchema = localTierlistSchema
  .pick({ version: true, items: true, ranks: true, imageMode: true })
  .refine(
    (document) =>
      new TextEncoder().encode(JSON.stringify(document)).byteLength <= 700_000,
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
  imageMode: snapshot.imageMode,
});

export const sameTierlistDocument = (
  first: TierlistDocument,
  second: TierlistDocument,
) => JSON.stringify(first) === JSON.stringify(second);

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
