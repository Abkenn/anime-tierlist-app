import { type PointerEvent, useRef, useState } from 'react';
import { resizeTierTrim, type TierTrimEdge } from '@/app/_lib/tier-image-trim';
import type { TierImageTrim } from '@/app/_types/tierlist.types';

type TrimInput = { trim: TierImageTrim };

export const useTierImageTrim = ({ trim }: TrimInput) => {
  const [draft, setDraft] = useState(trim);
  const session = useRef<{
    edge: TierTrimEdge;
    pointerId: number;
    initial: TierImageTrim;
  } | null>(null);

  const start = (event: PointerEvent<SVGRectElement>, edge: TierTrimEdge) => {
    if (!event.isPrimary || event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    session.current = { edge, pointerId: event.pointerId, initial: draft };
  };

  const move = (event: PointerEvent<SVGRectElement>) => {
    const active = session.current;
    const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect();

    if (
      !active ||
      active.pointerId !== event.pointerId ||
      !bounds?.width ||
      !bounds.height
    ) {
      return;
    }

    const horizontal = active.edge === 'left' || active.edge === 'right';
    const value = horizontal
      ? (event.clientX - bounds.left) / bounds.width
      : (event.clientY - bounds.top) / bounds.height;
    setDraft((current) => resizeTierTrim(current, active.edge, value));
  };

  const end = (event: PointerEvent<SVGRectElement>) => {
    if (session.current?.pointerId !== event.pointerId) {
      return;
    }

    session.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const cancel = () => {
    if (session.current) {
      setDraft(session.current.initial);
      session.current = null;
    }
  };

  const nudge = (edge: TierTrimEdge, delta: number) => {
    setDraft((current) => resizeTierTrim(current, edge, current[edge] + delta));
  };

  return { draft, setDraft, start, move, end, cancel, nudge };
};
