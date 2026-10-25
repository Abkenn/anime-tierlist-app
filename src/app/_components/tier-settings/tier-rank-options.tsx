'use client';

import { useSetAtom } from 'jotai';
import { addRankAtom } from '@/app/_atoms/tierlist/ranks.atoms';
import { tierRanks } from '@/app/_lib/tier-ranks';
import type { TierRank } from '@/app/_types/tierlist.types';

type TierRankOptionsProps = {
  id: string;
  open: boolean;
  enabledRanks: TierRank[];
  onToggle: (rank: TierRank) => void;
};

export const TierRankOptions = ({
  id,
  open,
  enabledRanks,
  onToggle,
}: TierRankOptionsProps) => {
  const add = useSetAtom(addRankAtom);

  return (
    <div
      id={id}
      hidden={!open}
      className="mb-4 border-y border-divider py-3 text-xs"
    >
      <p className="mb-3 text-muted-foreground">
        Click a tier name to rename it. Clear its name to delete.
      </p>

      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {tierRanks.map((rank) => (
          <label
            key={rank}
            className="flex min-h-9 cursor-pointer items-center gap-2"
          >
            <input
              type="checkbox"
              checked={enabledRanks.includes(rank)}
              disabled={
                enabledRanks.length === 1 && enabledRanks.includes(rank)
              }
              onChange={() => onToggle(rank)}
            />
            {rank}
          </label>
        ))}
      </div>

      <button
        type="button"
        onClick={() => add()}
        className="mt-2 min-h-9 cursor-pointer underline underline-offset-4"
      >
        Add tier
      </button>
    </div>
  );
};
