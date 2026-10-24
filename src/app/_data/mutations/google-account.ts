import 'server-only';
import { db } from '@/prisma/db';

type CreateGoogleAccountInput = {
  subject: string;
  ownerId: string;
  encryptedSeed: string;
  displayName: string | null;
};

export const createGoogleAccount = (input: CreateGoogleAccountInput) =>
  db.orm.public.TierlistGoogleAccount.create(input);

type UpdateGoogleNameInput = { subject: string; displayName: string };

export const updateGoogleAccountName = ({
  subject,
  displayName,
}: UpdateGoogleNameInput) =>
  db.orm.public.TierlistGoogleAccount.where({ subject }).update({
    displayName,
  });
