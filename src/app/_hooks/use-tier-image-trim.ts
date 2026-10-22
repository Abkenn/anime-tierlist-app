import { type PointerEvent, useRef, useState } from 'react';
import { resizeTierTrim, type TierTrimEdge } from '@/app/_lib/tier-image-trim';
import type { TierImageTrim } from '@/app/_types/tierlist.types';

type TrimInput = { trim: TierImageTrim };

export const useTierImageTrim = ({ trim }: TrimInput) => {
  const [draft, setDraft] = useState(trim);
  const [activeEdges, setActiveEdges] = useState<readonly TierTrimEdge[]>([]);
  const session = useRef<{
    edges: readonly TierTrimEdge[];
    x: number;
    y: number;
    pointerId: number;
    initial: TierImageTrim;
  } | null>(null);

  const start = (
    event: PointerEvent<SVGRectElement | HTMLButtonElement>,
    edges: readonly TierTrimEdge[],
  ) => {
    if (!event.isPrimary || event.button !== 0) {
      return;
    }

    const bounds = event.currentTarget
      .closest('[data-trim-viewport]')
      ?.getBoundingClientRect();

    if (!bounds?.width || !bounds.height) {
      return;
    }

    event.preventDefault();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    session.current = {
      edges,
      pointerId: event.pointerId,
      initial: draft,
      x: event.clientX,
      y: event.clientY,
    };
    setActiveEdges(edges);
  };

  const move = (event: PointerEvent<SVGRectElement | HTMLButtonElement>) => {
    const active = session.current;
    const bounds = event.currentTarget
      .closest('[data-trim-viewport]')
      ?.getBoundingClientRect();

    if (
      !active ||
      active.pointerId !== event.pointerId ||
      !bounds?.width ||
      !bounds.height
    ) {
      return;
    }

    const dx = (event.clientX - active.x) / bounds.width;
    const dy = (event.clientY - active.y) / bounds.height;
    setDraft(
      active.edges.reduce(
        (next, edge) =>
          resizeTierTrim(
            next,
            edge,
            active.initial[edge] +
              (edge === 'left' || edge === 'right' ? dx : dy),
          ),
        active.initial,
      ),
    );
  };

  const end = (event: PointerEvent<SVGRectElement | HTMLButtonElement>) => {
    if (session.current?.pointerId !== event.pointerId) {
      return;
    }

    session.current = null;
    setActiveEdges([]);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const cancel = () => {
    if (session.current) {
      setDraft(session.current.initial);
      session.current = null;
      setActiveEdges([]);
    }
  };

  const nudge = (edge: TierTrimEdge, delta: number) => {
    setDraft((current) => resizeTierTrim(current, edge, current[edge] + delta));
  };

  return { draft, activeEdges, setDraft, start, move, end, cancel, nudge };
};
