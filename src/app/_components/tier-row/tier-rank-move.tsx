'use client';

import { useAtomValue, useSetAtom } from 'jotai';
import { GripVertical } from 'lucide-react';
import { cancelFrame, frame, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import {
  moveRankAtom,
  rankDropTargetAtom,
} from '@/app/_atoms/tierlist/ranks.atoms';
import { enabledTierRanksAtom } from '@/app/_atoms/tierlist/settings.atoms';
import { scrollTierDrag } from '@/app/_lib/scroll-tier-drag';
import type { TierRank } from '@/app/_types/tierlist.types';

const targetAt = (handle: HTMLButtonElement | null, y: number) => {
  const rows = [
    ...(handle
      ?.closest('ol')
      ?.querySelectorAll<HTMLElement>('[data-tier-rank]') ?? []),
  ];
  const distance = (row: HTMLElement) => {
    const bounds = row.getBoundingClientRect();

    return Math.abs(y - bounds.top - bounds.height / 2);
  };

  return rows.reduce<HTMLElement | undefined>(
    (nearest, row) =>
      !nearest || distance(row) < distance(nearest) ? row : nearest,
    undefined,
  )?.dataset.tierRank as TierRank | undefined;
};

export const TierRankMove = ({
  rank,
  label,
}: {
  rank: TierRank;
  label: string;
}) => {
  const ranks = useAtomValue(enabledTierRanksAtom);
  const move = useSetAtom(moveRankAtom);
  const setTarget = useSetAtom(rankDropTargetAtom);
  const [dragging, setDragging] = useState(false);
  const handle = useRef<HTMLButtonElement>(null);
  const point = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!dragging) {
      return;
    }

    const tick = ({ delta }: { delta: number }) => {
      const board = handle.current?.closest<HTMLElement>(
        '[aria-label="Anime tierlist"]',
      );
      if (board && scrollTierDrag({ board, ...point.current, delta })) {
        setTarget(targetAt(handle.current, point.current.y) ?? null);
      }
    };
    frame.update(tick, true);

    return () => {
      cancelFrame(tick);
      setTarget(null);
    };
  }, [dragging, setTarget]);

  return (
    <motion.button
      ref={handle}
      type="button"
      aria-label={`Move ${label}`}
      title="Drag to move tier · Arrow keys to move"
      drag="y"
      dragSnapToOrigin
      dragMomentum={false}
      onDragStart={(_, info) => {
        point.current = info.point;
        setDragging(true);
      }}
      onDrag={(_, info) => {
        point.current = info.point;
        setTarget(targetAt(handle.current, info.point.y) ?? null);
      }}
      onDragEnd={(_, info) => {
        const target = targetAt(handle.current, info.point.y);
        setDragging(false);
        setTarget(null);
        if (target) {
          move({ rank, target });
        }
      }}
      onKeyDown={(event) => {
        const offset =
          Number(event.key === 'ArrowDown') - Number(event.key === 'ArrowUp');
        const target = ranks[ranks.indexOf(rank) + offset];
        if (offset && target) {
          event.preventDefault();
          move({ rank, target });
        }
      }}
      className="absolute left-0 top-1/2 z-40 flex size-6 -translate-y-1/2 touch-none cursor-grab items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 active:cursor-grabbing max-lg:opacity-60"
    >
      <GripVertical
        aria-hidden="true"
        className="size-[clamp(0.625rem,calc(var(--tier-size)*0.1),0.875rem)]"
      />
    </motion.button>
  );
};
