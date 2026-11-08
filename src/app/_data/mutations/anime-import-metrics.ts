import 'server-only';
import { db } from '@/prisma/db';

type ImportMetricInput = {
  id: string;
  ownerKey: string;
  provider: string;
  release?: boolean;
  event?: 'generated' | 'applied' | 'cancelled' | 'failed';
  queue?: {
    position: number;
    depth: number;
    joined: boolean;
    observedAt: bigint;
  };
};

export const recordAnimeImportMetric = async (input: ImportMetricInput) => {
  const { id, ownerKey, provider, queue, event } = input;
  const now = queue?.observedAt ?? BigInt(Date.now());

  if (queue && !input.release) {
    await db.runtime().query(
      db.raw.sql`
        INSERT INTO "AnimeImportAttempt"
          (id, "ownerKey", provider, "startedAt", "lastSeenAt", "admittedAt", "maxQueueDepth")
        VALUES (${id}, ${ownerKey}, ${provider}, ${now}, ${now},
          CASE WHEN ${queue.position} = 1 THEN ${now}::bigint ELSE NULL END, ${queue.depth})
        ON CONFLICT (id) DO UPDATE SET
          "lastSeenAt" = GREATEST("AnimeImportAttempt"."lastSeenAt", EXCLUDED."lastSeenAt"),
          "admittedAt" = COALESCE("AnimeImportAttempt"."admittedAt", EXCLUDED."admittedAt"),
          "maxQueueDepth" = GREATEST("AnimeImportAttempt"."maxQueueDepth", EXCLUDED."maxQueueDepth")
        WHERE "AnimeImportAttempt"."ownerKey" = ${ownerKey}
          AND "AnimeImportAttempt".provider = ${provider}
          AND "AnimeImportAttempt"."endedAt" IS NULL
        RETURNING id
      `
        .returnsRow({ id: 'pg/text@1' })
        .build(),
    );

    if (queue.joined) {
      await db.orm.public.AnimeImportQueueSample.create({
        id: crypto.randomUUID(),
        provider,
        observedAt: now,
        depth: queue.depth,
      });
    }
  }

  if (input.release || event) {
    await db.runtime().query(
      db.raw.sql`
        UPDATE "AnimeImportAttempt" SET
          "lastSeenAt" = GREATEST("lastSeenAt", ${now}),
          "releasedAt" = CASE WHEN ${input.release ?? false}
            THEN COALESCE("releasedAt", ${now}) ELSE "releasedAt" END,
          "generatedAt" = CASE WHEN ${event === 'generated' || event === 'applied'}
            THEN COALESCE("generatedAt", ${now}) ELSE "generatedAt" END,
          "appliedAt" = CASE WHEN ${event === 'applied'}
            THEN COALESCE("appliedAt", ${now}) ELSE "appliedAt" END,
          "endedAt" = CASE WHEN ${event === 'applied' || event === 'cancelled' || event === 'failed'}
            THEN COALESCE("endedAt", ${now}) ELSE "endedAt" END,
          outcome = CASE
            WHEN ${event === 'applied'} THEN 'applied'
            WHEN outcome IS NULL THEN NULLIF(${event ?? ''}, '')
            WHEN outcome = 'generated' AND ${event === 'cancelled' || event === 'failed'} THEN ${event ?? ''}
            ELSE outcome END
        WHERE id = ${id} AND "ownerKey" = ${ownerKey} AND provider = ${provider}
        RETURNING id
      `
        .returnsRow({ id: 'pg/text@1' })
        .build(),
    );
  }
};
