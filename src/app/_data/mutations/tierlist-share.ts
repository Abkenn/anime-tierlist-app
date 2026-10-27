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
  db.orm.public.TierlistShare.upsert({
    create: input,
    update: { fingerprint: input.fingerprint },
    conflictOn: { ownerId: input.ownerId, fingerprint: input.fingerprint },
  });
