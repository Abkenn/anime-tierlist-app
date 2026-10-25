import 'server-only';
import type { TierlistDocument } from '@/app/_lib/tierlist-sync';
import { db } from '@/prisma/db';
import { findGoogleAccount } from '../queries/google-account';

type CreateGoogleAccountInput = {
  subject: string;
  ownerId: string;
  seedHash: string;
  document: TierlistDocument;
  displayName: string | null;
};
export const createGoogleAccount = async ({
  subject,
  ownerId,
  seedHash,
  document,
  displayName,
}: CreateGoogleAccountInput) => {
  try {
    return await db.transaction(async (tx) => {
      await tx.orm.public.TierlistOwner.create({
        id: ownerId,
        seedHash,
        document: { ...document, updatedAt: Date.now() },
        revision: 0,
      });

      return tx.orm.public.TierlistGoogleAccount.create({
        subject,
        ownerId,
        displayName,
      });
    });
  } catch (error) {
    const existing = await findGoogleAccount(subject);
    if (existing) {
      return existing;
    }

    throw error;
  }
};
