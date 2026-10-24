import 'server-only';
import { db } from '@/prisma/db';

type CreateOwnerInput = { id: string; seedHash: string; document: string };
type SaveOwnerInput = { id: string; revision: number; document: string };
type CreateSessionInput = {
  tokenHash: string;
  ownerId: string;
  expiresAt: bigint;
};

export const createTierlistOwner = ({
  id,
  seedHash,
  document,
}: CreateOwnerInput) =>
  db.orm.public.TierlistOwner.upsert({
    create: { id, seedHash, document, revision: 0 },
    update: { seedHash },
    conflictOn: { seedHash },
  });

export const saveTierlistOwner = async ({
  id,
  revision,
  document,
}: SaveOwnerInput) => {
  const table = db.sql.public.TierlistOwner;
  const plan = db.raw.sql`
    UPDATE "TierlistOwner" SET document = ${document}, revision = revision + 1
    WHERE id = ${id} AND revision = ${revision}
    RETURNING id, "seedHash", revision, document
  `
    .returnsRow({
      id: table.columns.id,
      seedHash: table.columns.seedHash,
      revision: table.columns.revision,
      document: table.columns.document,
    })
    .build();

  return (await db.runtime().query(plan))[0] ?? null;
};

export const createTierlistSession = (input: CreateSessionInput) =>
  db.orm.public.TierlistSession.create(input);
export const deleteTierlistSession = (tokenHash: string) =>
  db.orm.public.TierlistSession.where({ tokenHash }).delete();

export const pruneTierlistAccessRecords = async () => {
  const cutoff = BigInt(Date.now() - 86_400_000);
  await db.orm.public.TierlistSession.where((session) =>
    session.expiresAt.lt(cutoff),
  ).deleteAll();
  await db.orm.public.TierlistRateLimit.where((limit) =>
    limit.expiresAt.lt(cutoff),
  ).deleteAll();
};

export const consumeTierlistRateLimit = async ({
  id,
  limit,
  windowMs,
}: {
  id: string;
  limit: number;
  windowMs: number;
}) => {
  const now = BigInt(Date.now());
  const expiresAt = now + BigInt(windowMs);
  const plan = db.raw.sql`
    INSERT INTO "TierlistRateLimit" (id, attempts, "expiresAt") VALUES (${id}, 1, ${expiresAt})
    ON CONFLICT (id) DO UPDATE SET
      attempts = CASE WHEN "TierlistRateLimit"."expiresAt" <= ${now} THEN 1 ELSE "TierlistRateLimit".attempts + 1 END,
      "expiresAt" = CASE WHEN "TierlistRateLimit"."expiresAt" <= ${now} THEN ${expiresAt} ELSE "TierlistRateLimit"."expiresAt" END
    WHERE "TierlistRateLimit"."expiresAt" <= ${now} OR "TierlistRateLimit".attempts < ${limit}
    RETURNING attempts
  `
    .returnsRow({ attempts: 'pg/int4@1' })
    .build();

  return (await db.runtime().query(plan)).length > 0;
};
