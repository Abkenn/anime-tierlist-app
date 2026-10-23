import { type PointerEvent, useRef, useState } from 'react';
import { getTierTrimFrame, moveTierTrim } from '@/app/_lib/tier-image-trim';
import type {
  TierCrop,
  TierImage,
  TierImageTrim,
} from '@/app/_types/tierlist.types';

type TrimPositionInput = {
  image?: TierImage;
  trim: TierImageTrim;
  onChange?: (trim: TierImageTrim) => void;
};

export const useTierTrimPosition = ({
  image,
  trim,
  onChange,
}: TrimPositionInput) => {
  const [draft, setDraft] = useState(trim);
  const draftRef = useRef(trim);
  const session = useRef<{
    pointerId: number;
    x: number;
    y: number;
    width: number;
    height: number;
    trim: TierImageTrim;
  } | null>(null);

  const update = (next: TierImageTrim) => {
    draftRef.current = next;
    setDraft(next);
  };

  const begin = () => update(trim);

  const finish = (save: boolean) => {
    session.current = null;

    if (save) {
      onChange?.(draftRef.current);
    }
  };

  const startPan = (event: PointerEvent<HTMLButtonElement>) => {
    if (!image) {
      return;
    }

    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    const frame = getTierTrimFrame({
      bounds: event.currentTarget.getBoundingClientRect(),
      image,
      trim: draftRef.current,
    });
    session.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      width: frame.width,
      height: frame.height,
      trim: draftRef.current,
    };
  };

  const movePan = (event: PointerEvent<HTMLButtonElement>) => {
    const active = session.current;

    if (!active || active.pointerId !== event.pointerId) {
      return false;
    }

    update(
      moveTierTrim(active.trim, {
        x: -(event.clientX - active.x) / active.width,
        y: -(event.clientY - active.y) / active.height,
      }),
    );

    return true;
  };

  const endPan = (event: PointerEvent<HTMLButtonElement>) => {
    if (session.current?.pointerId !== event.pointerId) {
      return false;
    }

    session.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);

    return true;
  };

  const cancelPan = () => {
    if (session.current) {
      update(session.current.trim);
      session.current = null;
    }
  };

  const nudge = (offset: TierCrop) =>
    update(moveTierTrim(draftRef.current, offset));

  return {
    draft,
    update,
    begin,
    finish,
    startPan,
    movePan,
    endPan,
    cancelPan,
    nudge,
  };
};
