'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useRef, useState } from 'react';
import type { useTierOverview } from '@/app/_hooks/use-tier-overview';
import { TierBoardMiniature } from './tier-board-miniature';

type TierScrollOverviewProps = { overview: ReturnType<typeof useTierOverview> };

export const TierScrollOverview = ({ overview }: TierScrollOverviewProps) => {
  const reducedMotion = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragTop = useRef(0);
  const visible =
    overview.enabled &&
    overview.overflowing &&
    (overview.visible || hovered || focused || dragging);
  const scale = overview.viewportHeight / overview.canvasHeight;
  const scaleX = Math.min(scale, 240 / overview.canvasWidth);
  const frame = {
    left: overview.left * scaleX,
    top: (overview.top / 100) * overview.canvasHeight * scale,
    width: overview.viewportWidth * scaleX,
    height: overview.viewportHeight * scale,
  };

  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.nav
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
            width: overview.canvasWidth * scaleX,
            height: overview.viewportHeight,
          }}
          className="absolute right-4 top-0 z-30 overflow-hidden border border-divider/60 bg-popover/90 shadow-sm"
        >
          <TierBoardMiniature
            overview={overview}
            scale={scale}
            scaleX={scaleX}
          />

          {overview.rows.map((row) => (
            <button
              key={row.rank}
              type="button"
              aria-label={`Scroll to ${row.rank}`}
              title={`${row.rank} · ${row.count} items`}
              onClick={() => overview.jumpToRank(row.rank)}
              style={{ top: `${row.top}%`, height: `${row.height}%` }}
              className="absolute inset-x-0 cursor-pointer focus-visible:outline-1 focus-visible:-outline-offset-1"
            />
          ))}

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 backdrop-grayscale-25"
            style={{ height: frame.top }}
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 backdrop-grayscale-25"
            style={{ top: frame.top + frame.height }}
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-0 backdrop-grayscale-25"
            style={{ top: frame.top, height: frame.height, width: frame.left }}
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 backdrop-grayscale-25"
            style={{
              top: frame.top,
              height: frame.height,
              left: frame.left + frame.width,
            }}
          />

          <motion.div
            role="scrollbar"
            tabIndex={0}
            aria-label="Tierlist scroll position"
            aria-controls={overview.viewportId}
            aria-orientation="vertical"
            aria-valuemin={0}
            aria-valuemax={Math.max(
              0,
              overview.canvasHeight - overview.viewportHeight,
            )}
            aria-valuenow={Math.round(
              (overview.top / 100) * overview.canvasHeight,
            )}
            data-tier-overview-window=""
            onPointerDown={(event) => event.preventDefault()}
            onPanStart={() => {
              dragTop.current = overview.getScrollOffset();
              setDragging(true);
            }}
            onPan={(_, info) => {
              if (scale > 0) {
                overview.scrollToOffset(
                  dragTop.current + info.offset.y / scale,
                );
              }
            }}
            onPanEnd={() => {
              setDragging(false);
              overview.focusViewport();
            }}
            onKeyDown={(event) => {
              const offsets: Record<string, number> = {
                ArrowUp: -40,
                ArrowDown: 40,
                PageUp: -overview.viewportHeight * 0.85,
                PageDown: overview.viewportHeight * 0.85,
                Home: -overview.canvasHeight,
                End: overview.canvasHeight,
              };
              if (event.key in offsets) {
                event.preventDefault();
                event.stopPropagation();
                overview.scrollByOffset(offsets[event.key]);
              }
            }}
            className="absolute touch-none cursor-grab border border-foreground/40 shadow-[0_0_0_100vmax] shadow-ink/75 outline-none select-none active:cursor-grabbing focus-visible:ring-1 focus-visible:ring-foreground"
            style={frame}
          />
        </motion.nav>
      )}
    </AnimatePresence>
  );
};
