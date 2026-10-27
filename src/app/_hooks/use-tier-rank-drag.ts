'use client';

import { useAtomValue, useSetAtom, useStore } from 'jotai';
import {
  animate,
  cancelFrame,
  frame,
  type HTMLMotionProps,
  useReducedMotion,
} from 'motion/react';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import {
  draggedRankAtom,
  rankOffsetsAtom,
} from '@/app/_atoms/tierlist/layout.atoms';
import { moveRankAtom } from '@/app/_atoms/tierlist/ranks.atoms';
import { enabledTierRanksAtom } from '@/app/_atoms/tierlist/settings.atoms';
import { scrollTierDrag } from '@/app/_lib/scroll-tier-drag';
import { readTierRowTranslation } from '@/app/_lib/tier-board-geometry';
import {
  getRankOffset,
  projectRankDrag,
  type RankDragRow,
} from '@/app/_lib/tier-rank-drag';
import type { TierRank } from '@/app/_types/tierlist.types';

type RankDrag = {
  rows: RankDragRow[];
  startY: number;
  scrollTop: number;
  viewport: HTMLElement | null;
  order: TierRank[];
  targetOffset: number;
};

export const useTierRankDrag = (rank: TierRank) => {
  const offsets = useAtomValue(rankOffsetsAtom);
  const ranks = useAtomValue(enabledTierRanksAtom);
  const setRanks = useSetAtom(enabledTierRanksAtom);
  const setDragged = useSetAtom(draggedRankAtom);
  const move = useSetAtom(moveRankAtom);
  const store = useStore();
  const reducedMotion = useReducedMotion();
  const [dragging, setDragging] = useState(false);
  const handle = useRef<HTMLButtonElement>(null);
  const drag = useRef<RankDrag | null>(null);
  const point = useRef({ x: 0, y: 0 });

  const project = () => {
    const current = drag.current;
    const source = current?.rows.find((row) => row.rank === rank);
    if (!current || !source) {
      return;
    }

    const scroll = (current.viewport?.scrollTop ?? 0) - current.scrollTop;
    const last = current.rows.at(-1) ?? source;
    const delta = Math.max(
      current.rows[0].top - source.top,
      Math.min(
        last.top + last.height - source.height - source.top,
        point.current.y - current.startY + scroll,
      ),
    );
    const projected = projectRankDrag(current.rows, rank, delta);
    if (projected.order.join() !== current.order.join()) {
      projected.offsets.forEach((offset, id) => {
        if (id !== rank) {
          const value = getRankOffset(offsets, id);
          if (reducedMotion) {
            value.jump(offset);
            return;
          }

          void animate(value, offset, {
            type: 'spring',
            stiffness: 550,
            damping: 44,
          });
        }
      });
    }
    current.order = projected.order;
    current.targetOffset = projected.offsets.get(rank) ?? 0;
    getRankOffset(offsets, rank).set(delta);
  };

  const settle = async (commit: boolean) => {
    const current = drag.current;
    if (!current) {
      return;
    }

    drag.current = null;
    setDragging(false);
    if (commit) {
      await animate(getRankOffset(offsets, rank), current.targetOffset, {
        duration: reducedMotion ? 0 : 0.16,
        ease: 'easeOut',
      });
    } else {
      await Promise.all(
        [...offsets.values()].map((offset) =>
          animate(offset, 0, { duration: reducedMotion ? 0 : 0.16 }),
        ),
      );
    }
    if (store.get(draggedRankAtom) !== rank) {
      return;
    }

    if (commit) {
      const original = current.rows.map((row) => row.rank).join();
      if (
        store.get(enabledTierRanksAtom).join() === original &&
        current.order.join() !== original
      ) {
        setRanks(current.order);
        return;
      }
    }
    setDragged(null);
  };

  const tickDrag = useEffectEvent(({ delta }: { delta: number }) => {
    const board = handle.current?.closest<HTMLElement>(
      '[aria-label="Anime tierlist"]',
    );
    if (
      board &&
      drag.current &&
      scrollTierDrag({ board, ...point.current, delta })
    ) {
      project();
    }
  });
  const cancel = useEffectEvent(() => void settle(false));
  const rankKey = ranks.join();

  useEffect(() => {
    if (
      drag.current &&
      drag.current.rows.map((row) => row.rank).join() !== rankKey
    ) {
      cancel();
    }
  }, [rankKey]);

  useEffect(() => {
    if (!dragging) {
      return;
    }

    const tick = (time: { delta: number }) => tickDrag(time);
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        cancel();
      }
    };
    frame.update(tick, true);
    window.addEventListener('keydown', handleEscape);

    return () => {
      cancelFrame(tick);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [dragging]);

  useEffect(
    () => () => {
      if (store.get(draggedRankAtom) === rank) {
        offsets.forEach((offset) => {
          offset.jump(0);
        });
        store.set(draggedRankAtom, null);
      }
    },
    [offsets, rank, store],
  );

  const gestureProps: HTMLMotionProps<'button'> = {
    onPanStart: (_, info) => {
      if (store.get(draggedRankAtom)) {
        return;
      }

      const rows = [
        ...(handle.current
          ?.closest('ol')
          ?.querySelectorAll<HTMLElement>('[data-tier-rank]') ?? []),
      ].map((row) => {
        const bounds = row.getBoundingClientRect();
        const translation = readTierRowTranslation(row);

        return {
          rank: row.dataset.tierRank as TierRank,
          top: bounds.top - translation.y,
          height: bounds.height,
        };
      });
      const viewport =
        handle.current?.closest<HTMLElement>(
          '[data-slot="scroll-area-viewport"]',
        ) ?? null;
      drag.current = {
        rows,
        startY: info.point.y - info.offset.y,
        scrollTop: viewport?.scrollTop ?? 0,
        viewport,
        order: rows.map((row) => row.rank),
        targetOffset: 0,
      };
      point.current = info.point;
      setDragged(rank);
      setDragging(true);
      project();
    },
    onPan: (_, info) => {
      point.current = info.point;
      project();
    },
    onPanEnd: (event) => void settle(event.type !== 'pointercancel'),
    onPointerCancel: () => void settle(false),
    onKeyDown: (event) => {
      const offset =
        Number(event.key === 'ArrowDown') - Number(event.key === 'ArrowUp');
      const target = ranks[ranks.indexOf(rank) + offset];
      if (offset && target && !drag.current) {
        event.preventDefault();
        move({ rank, target });
      }
    },
  };

  return { handle, gestureProps };
};
