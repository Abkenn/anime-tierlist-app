import 'server-only';
import { db } from '@/prisma/db';

type QueueInput = {
  id: string;
  ownerKey: string;
  provider: string;
  release?: boolean;
};

export const updateAnimeImportQueue = (input: QueueInput) =>
  db.transaction(async (tx) => {
    // The provider lock makes concurrent joins/polls observe a single FIFO order.
    await tx.query(
      db.raw
        .sql`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${`anime-import:${input.provider}`}))`
        .returnsRow({ locked: 'pg/int4@1' })
        .build(),
    );
    const now = BigInt(Date.now());
    await tx.query(
      db.raw
        .sql`DELETE FROM "AnimeImportQueue" WHERE provider = ${input.provider} AND "expiresAt" <= ${now} RETURNING id`
        .returnsRow({ id: 'pg/text@1' })
        .build(),
    );
    if (input.release) {
      await tx.orm.public.AnimeImportQueue.where({
        id: input.id,
        ownerKey: input.ownerKey,
      }).deleteAll();
      return { position: 0 };
    }
    const existing = await tx.orm.public.AnimeImportQueue.where({
      id: input.id,
    }).first();
    if (
      existing &&
      (existing.ownerKey !== input.ownerKey ||
        existing.provider !== input.provider)
    ) {
      throw new Error('Import queue ticket is invalid.');
    }
    if (existing) {
      await tx.orm.public.AnimeImportQueue.where({ id: input.id }).update({
        expiresAt: now + 180_000n,
      });
    } else {
      const order = await tx.query(
        db.raw
          .sql`SELECT GREATEST(${now}, COALESCE(MAX("createdAt"), ${now - 1n}) + 1) AS "createdAt" FROM "AnimeImportQueue" WHERE provider = ${input.provider}`
          .returnsRow({ createdAt: 'pg/int8@1' })
          .build(),
      );
      await tx.orm.public.AnimeImportQueue.create({
        id: input.id,
        ownerKey: input.ownerKey,
        provider: input.provider,
        createdAt: order[0].createdAt,
        expiresAt: now + 180_000n,
      });
    }
    const queue = await tx.query(
      db.raw
        .sql`SELECT id FROM "AnimeImportQueue" WHERE provider = ${input.provider} ORDER BY "createdAt", id`
        .returnsRow({ id: 'pg/text@1' })
        .build(),
    );
    return { position: queue.findIndex((entry) => entry.id === input.id) + 1 };
  });
