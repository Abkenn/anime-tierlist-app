import 'server-only';
import { db } from '@/prisma/db';

export const findOwnerBySeedHash = (seedHash: string) =>
  db.orm.public.TierlistOwner.where({ seedHash }).first();
export const findOwnerById = (id: string) =>
  db.orm.public.TierlistOwner.where({ id }).first();
export const findTierlistSession = (tokenHash: string) =>
  db.orm.public.TierlistSession.where({ tokenHash }).first();
