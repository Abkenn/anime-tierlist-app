'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import type { useTierOverview } from '@/app/_hooks/use-tier-overview';
import { TierBoardMiniature } from './tier-board-miniature';

type TierScrollOverviewProps = { overview: ReturnType<typeof useTierOverview> };

export const TierScrollOverview = ({ overview }: TierScrollOverviewProps) => {
  const reducedMotion = useReducedMotion();
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const visible =
    overview.enabled &&
    overview.overflowing &&
    (overview.visible || hovered || focused);
  const scale = Math.min(
    size.width / overview.canvasWidth,
    size.height / overview.canvasHeight,
  );

  useEffect(() => {
    if (!element) {
      return;
    }
    const resize = new ResizeObserver(() =>
      setSize({ width: element.clientWidth, height: element.clientHeight }),
    );
    resize.observe(element);

    return () => resize.disconnect();
  }, [element]);

  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.nav
          ref={setElement}
          aria-label="Tierlist overview"
          aria-hidden={!visible}
          inert={!visible}
          data-tier-overview={visible ? 'visible' : 'hidden'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.55 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.18 }}
          onPointerEnter={(event) => {
            if (event.pointerType === 'mouse') {
              setHovered(true);
            }
          }}
          onPointerLeave={() => setHovered(false)}
          onFocus={() => setFocused(true)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setFocused(false);
            }
          }}
          style={{
            aspectRatio: `${overview.canvasWidth}/${overview.canvasHeight}`,
          }}
          className="absolute right-4 top-3 z-30 w-28 max-h-[calc(100%-1.5rem)] overflow-hidden border border-divider/60 bg-popover/90 shadow-sm sm:w-36"
        >
          <TierBoardMiniature overview={overview} scale={scale} />

          {overview.rows.map((row) => (
            <button
              key={row.rank}
              type="button"
              aria-label={`Scroll to ${row.rank}`}
              title={`${row.rank} · ${row.count} items`}
              onClick={() => overview.jumpToRank(row.rank)}
              style={{ top: `${row.top}%`, height: `${row.height}%` }}
              className="absolute inset-x-0 cursor-pointer hover:bg-foreground/8 focus-visible:outline-1 focus-visible:-outline-offset-1"
            />
          ))}

          <span
            aria-hidden="true"
            data-tier-overview-window=""
            className="pointer-events-none absolute border border-foreground/30 shadow-[0_0_0_100vmax] shadow-ink/60"
            style={{
              left: overview.left * scale,
              top: (overview.top / 100) * overview.canvasHeight * scale,
              width: overview.viewportWidth * scale,
              height: overview.viewportHeight * scale,
            }}
          />
        </motion.nav>
      )}
    </AnimatePresence>
  );
};
