'use client';

import { motion, useAnimationControls } from 'motion/react';
import Image from 'next/image';
import { useEffect, useEffectEvent, useId } from 'react';
import type { PreviewSpriteBox } from '@/app/_lib/preview-drag-layout';
import type { ExportRow } from '@/app/_lib/tierlist-export-layout';
import type { TierImageMode } from '@/app/_types/tierlist.types';
import { PreviewBoardSurface } from './preview-board-surface';

type PreviewSpriteProps = {
  box: PreviewSpriteBox;
  source?: string;
  rows: ExportRow[];
  mode: TierImageMode;
  visibleIds: ReadonlySet<string>;
  width: number;
  height: number;
  returning: boolean;
  held: boolean;
  reducedMotion: boolean;
  onReturn: () => void;
};

export const PreviewSprite = ({
  box,
  source,
  rows,
  mode,
  visibleIds,
  width,
  height,
  returning,
  held,
  reducedMotion,
  onReturn,
}: PreviewSpriteProps) => {
  const controls = useAnimationControls();
  const clipId = useId();
  const complete = useEffectEvent(onReturn);
  const x = returning ? '0%' : `${((box.targetX - box.x) / box.width) * 100}%`;
  const y = returning ? '0%' : `${((box.targetY - box.y) / box.height) * 100}%`;

  useEffect(() => {
    let cancelled = false;
    const move = async () => {
      await controls.start({
        x,
        y,
        transition:
          reducedMotion || (held && !returning)
            ? { duration: 0 }
            : { type: 'spring', stiffness: 550, damping: 44 },
      });
      if (returning && !cancelled) {
        complete();
      }
    };
    void move();

    return () => {
      cancelled = true;
      controls.stop();
    };
  }, [controls, x, y, reducedMotion, held, returning]);

  return (
    <motion.div
      aria-hidden="true"
      data-preview-displaced={box.id}
      className="pointer-events-none absolute overflow-hidden"
      style={{
        left: `${(box.x / width) * 100}%`,
        top: `${(box.y / height) * 100}%`,
        width: `${(box.width / width) * 100}%`,
        height: `${(box.height / height) * 100}%`,
        zIndex: held ? 2 : 1,
      }}
      initial={false}
      animate={controls}
    >
      {source ? (
        <Image
          src={source}
          alt=""
          width={width}
          height={height}
          unoptimized
          loading="eager"
          fetchPriority="high"
          draggable={false}
          className="absolute max-w-none"
          style={{
            left: `${(-box.x / box.width) * 100}%`,
            top: `${(-box.y / box.height) * 100}%`,
            width: `${(width / box.width) * 100}%`,
            height: `${(height / box.height) * 100}%`,
          }}
        />
      ) : (
        <PreviewBoardSurface
          rows={rows.filter(
            (row) => row.y < box.y + box.height && row.y + 160 > box.y,
          )}
          width={width}
          height={height}
          mode={mode}
          frame={box}
          visibleIds={box.x === 0 ? visibleIds : new Set([box.id])}
          clipPrefix={`sprite-${clipId}-`}
        />
      )}
    </motion.div>
  );
};
