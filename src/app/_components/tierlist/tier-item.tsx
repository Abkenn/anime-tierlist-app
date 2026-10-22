'use client';

import { cn } from 'cn';
import {
  cancelFrame,
  frame,
  motion,
  useAnimationControls,
  useReducedMotion,
} from 'motion/react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { type RefObject, useLayoutEffect, useRef, useState } from 'react';
import type { TierItemPosition } from '@/app/_hooks/use-tier-items';
import type { TierKeyboardMove } from '@/app/_types/tierlist.types';

type TierItemProps = {
  label: string;
  rank: string;
  position: TierItemPosition;
  boardRef: RefObject<HTMLDivElement | null>;
  onStart: (clientX: number, clientY: number) => void;
  onMove: (clientX: number, clientY: number) => void;
  onDrop: (clientX: number, clientY: number) => TierItemPosition | null;
  onCancel: () => void;
  onKeyboardMove: (move: TierKeyboardMove) => void;
  onKeyboardModeChange: (active: boolean) => void;
};
type DragSession = {
  pointerId: number;
  x: number;
  y: number;
  grabX: number;
  grabY: number;
  stopFrame: (() => void) | null;
};

export const TierItem = ({
  label,
  rank,
  position,
  boardRef,
  onStart,
  onMove,
  onDrop,
  onCancel,
  onKeyboardMove,
  onKeyboardModeChange,
}: TierItemProps) => {
  const controls = useAnimationControls();
  const reducedMotion = useReducedMotion();
  const session = useRef<DragSession | null>(null);
  const pointerOrigin = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [pointerFocus, setPointerFocus] = useState(false);

  const settle = (target: TierItemPosition) =>
    controls.start({
      ...target,
      transition: reducedMotion
        ? { duration: 0 }
        : { type: 'spring', stiffness: 900, damping: 58, mass: 0.65 },
    });

  const stop = () => {
    session.current?.stopFrame?.();
    session.current = null;
    setDragging(false);
  };

  const cancel = () => {
    if (!session.current) {
      return;
    }

    stop();
    onCancel();
    void settle(position);
  };

  const followPointer = () => {
    const active = session.current;
    const board = boardRef.current;

    if (!active || !board) {
      return;
    }

    const rem = Number.parseFloat(
      getComputedStyle(document.documentElement).fontSize,
    );
    const bounds = board.getBoundingClientRect();

    controls.set({
      x: `${String((active.x - bounds.left) / rem - active.grabX)}rem`,
      y: `${String((active.y - bounds.top) / rem - active.grabY)}rem`,
    });
    onMove(active.x, active.y);
  };

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (!event.isPrimary || event.button !== 0 || session.current) {
      return;
    }

    event.preventDefault();
    pointerOrigin.current = true;
    setPointerFocus(true);
    onKeyboardModeChange(false);
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    controls.stop();

    const rect = event.currentTarget.getBoundingClientRect();
    const rem = Number.parseFloat(
      getComputedStyle(document.documentElement).fontSize,
    );

    session.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      grabX: (event.clientX - rect.left) / rem,
      grabY: (event.clientY - rect.top) / rem,
      stopFrame: null,
    };
    setDragging(true);
    onStart(event.clientX, event.clientY);

    const tick = ({ delta }: { delta: number }) => {
      const active = session.current;

      if (!active) {
        return;
      }

      const viewport = boardRef.current?.closest<HTMLElement>(
        '[data-slot="scroll-area-viewport"]',
      );

      if (viewport) {
        const bounds = viewport.getBoundingClientRect();
        const edge = rem * 3;
        const distance =
          active.y < bounds.top + edge
            ? active.y - bounds.top - edge
            : Math.max(0, active.y - bounds.bottom + edge);
        const elapsed = Math.min(delta, 32) / 1000;

        if (distance) {
          viewport.scrollTop +=
            Math.max(-rem * 24, Math.min(rem * 24, distance * 8)) * elapsed;
        }
      }

      const horizontal = boardRef.current?.closest<HTMLElement>(
        '[data-tier-viewport]',
      );

      if (horizontal && horizontal.scrollWidth > horizontal.clientWidth) {
        const bounds = horizontal.getBoundingClientRect();
        const edge = rem * 2;
        const distance =
          active.x < bounds.left + edge
            ? active.x - bounds.left - edge
            : Math.max(0, active.x - bounds.right + edge);

        horizontal.scrollLeft +=
          (Math.max(-rem * 20, Math.min(rem * 20, distance * 8)) *
            Math.min(delta, 32)) /
          1000;
      }

      followPointer();
    };

    session.current.stopFrame = () => cancelFrame(tick);
    frame.update(tick, true);
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const active = session.current;

    if (!active || active.pointerId !== event.pointerId) {
      return;
    }

    active.x = event.clientX;
    active.y = event.clientY;
    followPointer();
  };

  const handlePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    if (session.current?.pointerId !== event.pointerId) {
      return;
    }

    const target = onDrop(event.clientX, event.clientY);

    stop();

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    void settle(target ?? position);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancel();
      event.currentTarget.blur();

      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      pointerOrigin.current = false;
      setPointerFocus(false);
      onKeyboardModeChange(true);

      return;
    }

    if (pointerOrigin.current || session.current) {
      return;
    }

    const directions: Record<string, TierKeyboardMove> = {
      w: { axis: 'row', direction: -1 },
      s: { axis: 'row', direction: 1 },
      a: { axis: 'column', direction: -1 },
      d: { axis: 'column', direction: 1 },
      ArrowUp: { axis: 'row', direction: -1 },
      ArrowDown: { axis: 'row', direction: 1 },
      ArrowLeft: { axis: 'column', direction: -1 },
      ArrowRight: { axis: 'column', direction: 1 },
    };
    const move =
      directions[event.key.length === 1 ? event.key.toLowerCase() : event.key];

    if (move) {
      event.preventDefault();
      onKeyboardModeChange(true);
      onKeyboardMove(move);
    }
  };

  useLayoutEffect(() => {
    if (session.current) {
      return;
    }

    void controls.start({
      x: position.x,
      y: position.y,
      width: position.width,
      height: position.height,
      transition: reducedMotion
        ? { duration: 0 }
        : { type: 'spring', stiffness: 900, damping: 58, mass: 0.65 },
    });
  }, [
    controls,
    position.x,
    position.y,
    position.width,
    position.height,
    reducedMotion,
  ]);

  useLayoutEffect(() => () => session.current?.stopFrame?.(), []);

  return (
    <motion.button
      type="button"
      aria-label={`Item ${label} in ${rank}`}
      aria-description="Tab to select, or press Enter after clicking. Up/Down or W/S move between tiers; Left/Right or A/D reorder within a tier. Escape exits keyboard mode or cancels a drag."
      data-tier-item={label}
      className={cn(
        'pointer-events-auto absolute left-0 top-0 flex touch-none items-center justify-center border border-silver bg-gray text-xs text-white select-none focus-visible:outline-white',
        dragging ? 'z-30 cursor-grabbing' : 'z-10 cursor-grab',
        pointerFocus && 'focus-visible:outline-none!',
      )}
      initial={position}
      animate={controls}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={cancel}
      onLostPointerCapture={cancel}
      onKeyDown={handleKeyDown}
      onFocus={(event) => {
        if (
          !pointerOrigin.current &&
          event.currentTarget.matches(':focus-visible')
        ) {
          onKeyboardModeChange(true);
        }
      }}
      onBlur={() => {
        pointerOrigin.current = false;
        setPointerFocus(false);
        onKeyboardModeChange(false);
      }}
    >
      {label}
    </motion.button>
  );
};
