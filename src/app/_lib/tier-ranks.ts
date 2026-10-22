import type { TierRank } from '@/app/_types/tierlist.types';

export const tierLetters = ['S', 'A', 'B', 'C', 'D', 'F'] as const;

export const tierRanks: TierRank[] = [
  ...tierLetters.flatMap<TierRank>((letter) => [
    `${letter}+`,
    letter,
    `${letter}−`,
  ]),
  'Dropped',
  'Watching',
];
export const defaultTierRanks = tierRanks.filter(
  (rank) => !rank.endsWith('−') && !['C+', 'D+', 'F+'].includes(rank),
);
