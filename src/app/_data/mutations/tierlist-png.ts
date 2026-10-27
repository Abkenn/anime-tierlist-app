import 'server-only';
import { del, list, put } from '@vercel/blob';
import { db } from '@/prisma/db';

export const retainedPngLimit = 300;
const maxStoredPngBytes = 2_500_000;

type ExportIdentity = { shareId: string; fingerprint: string; token: string };

export const claimTierlistPng = async (input: ExportIdentity) =>
  db.transaction(async (tx) => {
    await tx.query(
      db.raw
        .sql`SELECT id FROM "TierlistShare" WHERE id = ${input.shareId} FOR UPDATE`
        .returnsRow({ id: 'pg/text@1' })
        .build(),
    );
    const existing = await tx.orm.public.TierlistPng.where({
      shareId: input.shareId,
    }).first();
    const now = BigInt(Date.now());
    if (existing?.url && existing.fingerprint === input.fingerprint) {
      await tx.orm.public.TierlistPng.where({ shareId: input.shareId }).update({
        lastUsedAt: now,
      });
      return { status: 'ready' as const, url: existing.url };
    }
    if (existing?.leaseUntil && existing.leaseUntil > now) {
      return { status: 'busy' as const };
    }
    await tx.orm.public.TierlistPng.upsert({
      create: {
        shareId: input.shareId,
        lastUsedAt: now,
        leaseToken: input.token,
        leaseUntil: now + 180_000n,
      },
      update: { leaseToken: input.token, leaseUntil: now + 180_000n },
      conflictOn: { shareId: input.shareId },
    });
    return { status: 'claimed' as const };
  });

export const releaseTierlistPng = (input: ExportIdentity) =>
  db.orm.public.TierlistPng.where({
    shareId: input.shareId,
    leaseToken: input.token,
  }).update({ leaseToken: null, leaseUntil: null });

export const storeTierlistPng = async (
  input: ExportIdentity & { png: Buffer },
) => {
  if (input.png.length > maxStoredPngBytes) {
    throw new Error('PNG exceeds the storage limit.');
  }

  let uploadedUrl: string | undefined;
  let removedUrls: string[] = [];

  try {
    return await db.transaction(async (tx) => {
      // Cross-instance serialization keeps concurrent uploads within the same 300-file budget.
      await tx.query(
        db.raw.sql`SELECT 1 AS locked FROM pg_advisory_xact_lock(728419301)`
          .returnsRow({ locked: 'pg/int4@1' })
          .build(),
      );
      await tx.query(
        db.raw
          .sql`SELECT id FROM "TierlistShare" WHERE id = ${input.shareId} FOR SHARE`
          .returnsRow({ id: 'pg/text@1' })
          .build(),
      );
      const current = await tx.orm.public.TierlistPng.where({
        shareId: input.shareId,
        leaseToken: input.token,
      }).first();
      const share = await tx.orm.public.TierlistShare.where({
        id: input.shareId,
      }).first();
      if (!current || share?.fingerprint !== input.fingerprint) {
        throw new Error('The published tierlist changed during export.');
      }
      const references = await tx.query(
        db.raw.sql`SELECT url FROM "TierlistPng" WHERE url IS NOT NULL`
          .returnsRow({ url: 'pg/text@1' })
          .build(),
      );
      const referenced = new Set(references.map((row) => row.url));
      let cursor: string | undefined;
      do {
        const page = await list({
          prefix: 'tierlist-exports/',
          limit: 1000,
          cursor,
        });
        const orphans = page.blobs.filter((blob) => !referenced.has(blob.url));
        if (orphans.length) {
          await del(orphans.map((blob) => blob.url));
        }
        cursor = page.hasMore ? page.cursor : undefined;
      } while (cursor);
      const table = tx.sql.public.TierlistPng;
      const victims = await tx.query(
        db.raw.sql`
      SELECT "shareId", url FROM "TierlistPng"
      WHERE url IS NOT NULL AND "shareId" <> ${input.shareId}
      ORDER BY "lastUsedAt" DESC, "shareId" ASC OFFSET ${retainedPngLimit - 1}
    `
          .returnsRow({
            shareId: table.columns.shareId,
            url: table.columns.url,
          })
          .build(),
      );
      const remove = [...victims, ...(current.url ? [current] : [])];
      if (remove.length) {
        const urls = remove.flatMap((entry) => (entry.url ? [entry.url] : []));
        await del(urls);
        removedUrls = urls;
        for (const entry of remove) {
          await tx.orm.public.TierlistPng.where({
            shareId: entry.shareId,
          }).update({ url: null, fingerprint: null });
        }
      }
      const uploaded = await put(
        `tierlist-exports/${input.shareId}/${input.fingerprint}.png`,
        input.png,
        {
          access: 'public',
          addRandomSuffix: false,
          allowOverwrite: true,
          contentType: 'image/png',
          cacheControlMaxAge: 60,
        },
      );
      uploadedUrl = uploaded.url;
      await tx.orm.public.TierlistPng.where({ shareId: input.shareId }).update({
        url: uploaded.url,
        fingerprint: input.fingerprint,
        lastUsedAt: BigInt(Date.now()),
        leaseToken: null,
        leaseUntil: null,
      });

      return uploaded.url;
    });
  } catch (error) {
    // Blob writes cannot roll back with SQL. Clear only the exact removed references.
    for (const url of removedUrls) {
      await db
        .runtime()
        .query(
          db.raw
            .sql`UPDATE "TierlistPng" SET url = NULL, fingerprint = NULL WHERE url = ${url} RETURNING "shareId"`
            .returnsRow({ shareId: 'pg/text@1' })
            .build(),
        );
    }
    if (uploadedUrl) {
      await del(uploadedUrl);
    }
    throw error;
  }
};

export const touchTierlistPng = async (shareId: string) => {
  const now = BigInt(Date.now());
  await db
    .runtime()
    .query(
      db.raw
        .sql`UPDATE "TierlistPng" SET "lastUsedAt" = ${now} WHERE "shareId" = ${shareId} AND "lastUsedAt" < ${now - 300_000n} RETURNING "shareId"`
        .returnsRow({ shareId: 'pg/text@1' })
        .build(),
    );
};
