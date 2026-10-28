'use client';

import { motion, useReducedMotion } from 'motion/react';
import { type PointerEvent, useRef, useState } from 'react';
import type { ExportPoster } from '@/app/_lib/tierlist-export-layout';
import { previewDragEndedEvent } from '@/app/_lib/tierlist-share-id';
import { PreviewPosterLinks } from './preview-poster-links';

type PreviewDisplacementProps = {
  id: string;
  source: string;
  width: number;
  height: number;
  posters: ExportPoster[];
};
type Drag = {
  from: number;
  to: number;
  x: number;
  y: number;
  returning: boolean;
};

export const PreviewDisplacement = ({
  id,
  source,
  width,
  height,
  posters,
}: PreviewDisplacementProps) => {
  const [drag, setDrag] = useState<Drag>();
  const start = useRef<{ x: number; y: number; from: number } | null>(null);
  const reducedMotion = useReducedMotion();
  const point = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) * width) / bounds.width,
      y: ((event.clientY - bounds.top) * height) / bounds.height,
    };
  };
  const finish = () => {
    start.current = null;
    if (
      drag &&
      !drag.returning &&
      Math.hypot(drag.x, drag.y) < 0.1 &&
      drag.from === drag.to
    ) {
      setDrag(undefined);
      window.dispatchEvent(
        new CustomEvent(previewDragEndedEvent, { detail: id.split('.')[0] }),
      );
      return;
    }
    setDrag((current) =>
      current ? { ...current, returning: true } : undefined,
    );
  };
  const moved = drag
    ? posters.flatMap((poster, index) => {
        const low = Math.min(drag.from, drag.to);
        const high = Math.max(drag.from, drag.to);
        if (index < low || index > high) {
          return [];
        }
        const destination =
          index === drag.from
            ? poster
            : posters[index + (drag.from < drag.to ? -1 : 1)];
        return [
          {
            poster,
            index,
            x: index === drag.from ? poster.x + drag.x : destination.x,
            y: index === drag.from ? poster.y + drag.y : destination.y,
          },
        ];
      })
    : [];

  return (
    <div
      className="absolute inset-0 touch-pan-y select-none"
      onPointerDown={(event) => {
        if (!event.isPrimary || event.button !== 0 || drag) {
          return;
        }
        const at = point(event);
        const from = posters.findIndex(
          (poster) =>
            at.x >= poster.x &&
            at.x <= poster.x + poster.width &&
            at.y >= poster.y &&
            at.y <= poster.y + poster.height,
        );
        if (from < 0) {
          return;
        }
        start.current = { ...at, from };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const initial = start.current;
        if (!initial) {
          return;
        }
        const at = point(event);
        const x = at.x - initial.x;
        const y = at.y - initial.y;
        if (!drag && Math.hypot(x, y) < 6) {
          return;
        }
        const to = posters.findIndex(
          (poster) =>
            at.x >= poster.x &&
            at.x <= poster.x + poster.width &&
            at.y >= poster.y &&
            at.y <= poster.y + poster.height,
        );
        setDrag({
          from: initial.from,
          to: to < 0 ? initial.from : to,
          x,
          y,
          returning: false,
        });
      }}
      onPointerUp={finish}
      onPointerCancel={() => {
        // Native touch scrolling cancels the gesture without a preview reminder.
        start.current = null;
        setDrag(undefined);
      }}
      onLostPointerCapture={finish}
    >
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${width} ${height}`}
        className="pointer-events-none absolute inset-0 size-full"
      >
        <rect width={width} height={height} fill="transparent" />

        {moved.map(({ poster }) => (
          <rect
            key={poster.item.id}
            x={poster.x}
            y={poster.y}
            width={poster.width}
            height={poster.height}
            fill="#1c1c1c"
          />
        ))}

        {moved
          .sort(
            (a, b) =>
              Number(a.index === drag?.from) - Number(b.index === drag?.from),
          )
          .map(({ poster, index, x, y }) => (
            <motion.svg
              key={poster.item.id}
              data-preview-displaced={poster.item.id}
              viewBox={`${poster.x} ${poster.y} ${poster.width} ${poster.height}`}
              width={poster.width}
              height={poster.height}
              initial={{ x: poster.x, y: poster.y }}
              animate={{
                x: drag?.returning ? poster.x : x,
                y: drag?.returning ? poster.y : y,
              }}
              transition={
                reducedMotion || (index === drag?.from && !drag.returning)
                  ? { duration: 0 }
                  : { type: 'spring', stiffness: 550, damping: 38 }
              }
              onAnimationComplete={() => {
                if (index === drag?.from && drag.returning) {
                  setDrag(undefined);
                  window.dispatchEvent(
                    new CustomEvent(previewDragEndedEvent, {
                      detail: id.split('.')[0],
                    }),
                  );
                }
              }}
            >
              <image href={source} width={width} height={height} />
            </motion.svg>
          ))}
      </svg>

      {!drag && (
        <PreviewPosterLinks posters={posters} width={width} height={height} />
      )}
    </div>
  );
};
