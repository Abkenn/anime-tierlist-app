'use client';

import { GripVertical } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { type PointerEvent, useRef, useState } from 'react';
import {
  type PreviewSlot,
  type PreviewSpriteBox,
  previewDropSlot,
  previewPosterSprites,
} from '@/app/_lib/preview-drag-layout';
import { projectRankDrag } from '@/app/_lib/tier-rank-drag';
import {
  type ExportPoster,
  type ExportRow,
  exportPosterSize,
} from '@/app/_lib/tierlist-export-layout';
import { previewDragEndedEvent } from '@/app/_lib/tierlist-share-id';
import type { TierImageMode } from '@/app/_types/tierlist.types';
import { PreviewPosterLinks } from './preview-poster-links';
import { PreviewSprite } from './preview-sprite';

type PreviewDisplacementProps = {
  id: string;
  source?: string;
  mode: TierImageMode;
  visible: ExportPoster[];
  width: number;
  height: number;
  rows: ExportRow[];
};
type Origin = { x: number; y: number; token: number } & (
  | { kind: 'poster'; poster: ExportPoster }
  | { kind: 'row'; row: ExportRow }
);
type Drag = {
  origin: Origin;
  x: number;
  y: number;
  slot: PreviewSlot;
  returning: boolean;
  visitedRanks: string[];
};

export const PreviewDisplacement = ({
  id,
  source,
  mode,
  visible,
  width,
  height,
  rows,
}: PreviewDisplacementProps) => {
  const [drag, setDrag] = useState<Drag>();
  const start = useRef<Origin | null>(null);
  const active = useRef<Drag | undefined>(undefined);
  const sequence = useRef(0);
  const pending = useRef(new Set<string>());
  const root = useRef<HTMLDivElement>(null);
  const reducedMotion = Boolean(useReducedMotion());
  const posters = rows.flatMap((row) => row.posters);
  const point = (event: PointerEvent<HTMLElement>) => {
    const bounds = root.current?.getBoundingClientRect();

    return bounds
      ? {
          x: ((event.clientX - bounds.left) * width) / bounds.width,
          y: ((event.clientY - bounds.top) * height) / bounds.height,
        }
      : { x: 0, y: 0 };
  };
  const finish = () => {
    if (!start.current) {
      return;
    }
    start.current = null;
    const current = active.current;
    if (!current) {
      return;
    }
    pending.current = new Set(
      buildPreviewSprites(rows, current, width).map((box) => box.id),
    );
    active.current = { ...current, returning: true };
    setDrag(active.current);
  };
  const complete = (token: number) => {
    if (active.current?.origin.token === token) {
      active.current = undefined;
    }
    setDrag((current) =>
      current?.origin.token === token && current.returning
        ? undefined
        : current,
    );
  };
  const remind = () =>
    window.dispatchEvent(
      new CustomEvent(previewDragEndedEvent, { detail: id.split('.')[0] }),
    );
  const sprites = buildPreviewSprites(rows, drag, width);
  const maskPadding = drag?.origin.kind === 'poster' ? 1 : 0;
  const heldId =
    drag?.origin.kind === 'poster'
      ? drag.origin.poster.item.id
      : drag?.origin.row.rank;

  return (
    <div
      ref={root}
      className="absolute inset-0 touch-auto select-none"
      onPointerDown={(event) => {
        if (!event.isPrimary || event.button !== 0 || drag) {
          return;
        }
        const at = point(event);
        const poster = posters.find(
          (poster) =>
            at.x >= poster.x &&
            at.x <= poster.x + poster.width &&
            at.y >= poster.y &&
            at.y <= poster.y + poster.height,
        );
        if (!poster) {
          return;
        }
        start.current = {
          ...at,
          kind: 'poster',
          poster,
          token: ++sequence.current,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const origin = start.current;
        if (!origin) {
          return;
        }
        const at = point(event);
        const x = at.x - origin.x;
        const y = at.y - origin.y;
        const bounds = root.current?.getBoundingClientRect();
        if (
          !drag &&
          Math.hypot(x, y) * (bounds ? bounds.width / width : 1) < 6
        ) {
          return;
        }
        const slot =
          origin.kind === 'poster'
            ? previewDropSlot(rows, origin.poster, at.x, at.y)
            : { rank: origin.row.rank, index: 0 };
        const next: Drag = {
          origin,
          x,
          y:
            origin.kind === 'row'
              ? Math.max(
                  -origin.row.y,
                  Math.min(height - exportPosterSize - origin.row.y, y),
                )
              : y,
          slot,
          visitedRanks: [
            ...new Set([
              ...(active.current?.visitedRanks ?? []),
              origin.kind === 'poster'
                ? origin.poster.item.rank
                : origin.row.rank,
              slot.rank,
            ]),
          ],
          returning: false,
        };
        active.current = next;
        setDrag(next);
      }}
      onPointerUp={finish}
      onPointerCancel={() => {
        start.current = null;
        active.current = undefined;
        pending.current.clear();
        setDrag(undefined);
      }}
      onLostPointerCapture={finish}
    >
      {sprites.map((box) => (
        <div
          key={`mask-${box.id}`}
          aria-hidden="true"
          className="pointer-events-none absolute bg-[#1c1c1c]"
          style={{
            left: `${((box.x - maskPadding) / width) * 100}%`,
            top: `${((box.y - maskPadding) / height) * 100}%`,
            width: `${((box.width + maskPadding * 2) / width) * 100}%`,
            height: `${((box.height + maskPadding * 2) / height) * 100}%`,
          }}
        />
      ))}

      {sprites.map((box) => (
        <PreviewSprite
          key={box.id}
          box={box}
          source={source}
          rows={rows}
          mode={mode}
          visibleIds={new Set(visible.map((poster) => poster.item.id))}
          width={width}
          height={height}
          held={box.id === heldId}
          returning={Boolean(drag?.returning)}
          reducedMotion={reducedMotion}
          onReturn={() => {
            // Every displaced sprite must finish before removing any masks.
            const finished = pending.current.delete(box.id);
            if (finished && pending.current.size === 0 && drag) {
              complete(drag.origin.token);
              remind();
            }
          }}
        />
      ))}

      {!drag && (
        <PreviewPosterLinks posters={visible} width={width} height={height} />
      )}

      {!drag &&
        rows.map((row) => (
          <div
            key={row.rank}
            className="group absolute left-0"
            style={{
              top: `${(row.y / height) * 100}%`,
              width: `${(exportPosterSize / width) * 100}%`,
              height: `${(exportPosterSize / height) * 100}%`,
            }}
          >
            <button
              type="button"
              aria-label={`Drag preview tier ${row.label}`}
              className="pointer-events-auto absolute -left-6 top-1/2 flex h-8 w-6 -translate-y-1/2 touch-none cursor-grab items-center justify-center text-muted-foreground opacity-0 group-hover:opacity-70 hover:bg-accent focus-visible:opacity-100 pointer-coarse:opacity-70"
              onPointerDown={(event) => {
                event.stopPropagation();
                if (!event.isPrimary || event.button !== 0) {
                  return;
                }
                start.current = {
                  ...point(event),
                  kind: 'row',
                  row,
                  token: ++sequence.current,
                };
                root.current?.setPointerCapture(event.pointerId);
              }}
            >
              <GripVertical aria-hidden="true" className="size-3.5" />
            </button>
          </div>
        ))}
    </div>
  );
};

const buildPreviewSprites = (
  rows: ExportRow[],
  drag: Drag | undefined,
  width: number,
): PreviewSpriteBox[] => {
  if (!drag) {
    return [];
  }
  const origin = drag.origin;
  if (origin.kind === 'poster') {
    return previewPosterSprites(
      rows,
      origin.poster,
      drag.slot,
      drag.visitedRanks,
    ).map((box) =>
      box.id === origin.poster.item.id
        ? { ...box, targetX: box.x + drag.x, targetY: box.y + drag.y }
        : box,
    );
  }
  const offsets = projectRankDrag(
    rows.map((row) => ({
      rank: row.rank,
      top: row.y,
      height: exportPosterSize,
    })),
    origin.row.rank,
    drag.y,
  ).offsets;

  return rows.map((row) => ({
    id: row.rank,
    x: 0,
    y: row.y,
    width,
    height: exportPosterSize,
    targetX: 0,
    targetY:
      row.y +
      (row.rank === origin.row.rank ? drag.y : (offsets.get(row.rank) ?? 0)),
  }));
};
