import 'server-only';
import type { TierlistDocument } from '@/app/_lib/tierlist-sync';
import { db } from '@/prisma/db';

type PublishInput = {
  id: string;
  ownerId: string;
  fingerprint: string;
  document: TierlistDocument;
};

export const publishTierlistSnapshot = (input: PublishInput) =>
  db.transaction(async (tx) => {
    await tx.query(
      db.raw
        .sql`SELECT id FROM "TierlistOwner" WHERE id = ${input.ownerId} FOR UPDATE`
        .returnsRow({ id: 'pg/text@1' })
        .build(),
    );
    const existing = await tx.orm.public.TierlistShare.where({
      ownerId: input.ownerId,
    }).first();
    if (existing) {
      if (existing.fingerprint === input.fingerprint) {
        return existing;
      }
      const updated = await tx.orm.public.TierlistShare.where({
        id: existing.id,
      }).update({
        fingerprint: input.fingerprint,
        document: input.document,
      });
      if (!updated) {
        throw new Error('Published tierlist is unavailable.');
      }
      return updated;
    }

    return tx.orm.public.TierlistShare.create(input);
  });
