import 'server-only';
import { db } from '@/prisma/db';

export const findTierlistShare = (id: string) =>
  db.orm.public.TierlistShare.where({ id }).first();
