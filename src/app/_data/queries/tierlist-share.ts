import 'server-only';
import { db } from '@/prisma/db';

export const findTierlistShare = (id: string) =>
  db.orm.public.TierlistShare.where({ id: id.split('.')[0] }).first();

export const findOwnerTierlistShare = (ownerId: string) =>
  db.orm.public.TierlistShare.where({ ownerId }).first();

export const findStoredTierlistPng = (shareId: string) =>
  db.orm.public.TierlistPng.where({ shareId }).first();
