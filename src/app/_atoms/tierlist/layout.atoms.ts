import { atom } from 'jotai';
import type { MotionValue } from 'motion/react';
import type { TierRank } from '@/app/_types/tierlist.types';

export const rankOffsetsAtom = atom(
  () => new Map<TierRank, MotionValue<number>>(),
);
export const draggedRankAtom = atom<TierRank | null>(null);

export type PosterLayout = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};
export const posterLayoutAtom = atom<PosterLayout[]>([]);
