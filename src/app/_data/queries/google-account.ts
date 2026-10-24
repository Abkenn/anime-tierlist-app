import 'server-only';
import { db } from '@/prisma/db';

export const findGoogleAccount = (subject: string) =>
  db.orm.public.TierlistGoogleAccount.where({ subject }).first();
