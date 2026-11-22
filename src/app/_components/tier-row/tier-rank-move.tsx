'use client';

import { GripVertical } from 'lucide-react';
import { motion } from 'motion/react';
import { useTierRankDrag } from '@/app/_hooks/use-tier-rank-drag';
import type { TierRank } from '@/app/_types/tierlist.types';

export const TierRankMove = ({ rank, label }: { rank: TierRank; label: string }) => {
  const { handle, gestureProps, locked } = useTierRankDrag(rank);

  return (
    <motion.button
      ref={handle}
      type="button"
      aria-label={`Move ${label}`}
      title="Drag to move tier · Arrow keys to move"
      {...gestureProps}
      style={{ touchAction: locked ? 'pan-y' : 'none', cursor: locked ? 'default' : undefined }}
      className="absolute left-0 top-1/2 z-40 flex size-[min(1.5rem,calc(var(--tier-size,6rem)*0.3))] -translate-y-1/2 touch-none cursor-grab items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 active:cursor-grabbing max-lg:opacity-60"
    >
      <GripVertical
        aria-hidden="true"
        className="size-[clamp(0.625rem,calc(var(--tier-size)*0.1),0.875rem)]"
      />
    </motion.button>
  );
};
