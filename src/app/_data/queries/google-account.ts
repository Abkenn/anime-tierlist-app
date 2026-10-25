import 'server-only';
import { db } from '@/prisma/db';

export const findGoogleAccount = (subject: string) =>
  db.orm.public.TierlistGoogleAccount.where({ subject }).first();

export const findGoogleAccountByOwner = (ownerId: string) =>
  db.orm.public.TierlistGoogleAccount.where({ ownerId }).first();

export const findAuthGoogleAccount = (userId: string) =>
  db.orm.public.AuthAccount.where({ userId, providerId: 'google' }).first();
