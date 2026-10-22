'use client';

import { cn } from 'cn';
import {
  cancelFrame,
  frame,
  motion,
  useAnimationControls,
  useReducedMotion,
} from 'motion/react';
import { type RefObject, useLayoutEffect, useRef, useState } from 'react';
import type { TierItemPosition } from '@/app/_hooks/use-tier-items';

type TierItemProps = {
  label: string;
  rank: string;
  position: TierItemPosition;
  boardRef: RefObject<HTMLDivElement | null>;
  onStart: (clientX: number, clientY: number) => void;
  onMove: (clientX: number, clientY: number) => void;
  onDrop: (clientX: number, clientY: number) => TierItemPosition | null;
  onCancel: () => void;
  onKeyboardMove: (direction: number) => void;
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
}: TierItemProps) => {
  const controls = useAnimationControls();
  const reducedMotion = useReducedMotion();
  const session = useRef<DragSession | null>(null);
  const [dragging, setDragging] = useState(false);
  const settle = (target: TierItemPosition) =>
    controls.start({
      ...target,
      transition: reducedMotion
        ? { duration: 0 }
        : { type: 'spring', stiffness: 900, damping: 58, mass: 0.65 },
    });
  useLayoutEffect(() => {
    if (session.current) return;
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
  const stop = () => {
    session.current?.stopFrame?.();
    session.current = null;
    setDragging(false);
  };
  const cancel = () => {
    if (!session.current) return;
    stop();
    onCancel();
    void settle(position);
  };
  const followPointer = () => {
    const active = session.current;
    const board = boardRef.current;
    if (!active || !board) return;
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
  return (
    <motion.button
      type="button"
      aria-label={`Item ${label} in ${rank}`}
      aria-description="Drag to a highlighted slot. Arrow Up and Arrow Down move between tiers. Escape cancels dragging."
      data-tier-item={label}
      className={cn(
        'pointer-events-auto absolute left-0 top-0 flex touch-none items-center justify-center border border-[#aaa] bg-[#737373] text-xs text-white select-none focus-visible:outline-white',
        dragging ? 'z-30 cursor-grabbing' : 'z-10 cursor-grab',
      )}
      initial={position}
      animate={controls}
      onPointerDown={(event) => {
        if (!event.isPrimary || event.button !== 0 || session.current) return;
        event.preventDefault();
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
          if (!active) return;
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
            if (distance)
              viewport.scrollTop +=
                Math.max(-rem * 24, Math.min(rem * 24, distance * 8)) * elapsed;
          }
          followPointer();
        };
        session.current.stopFrame = () => cancelFrame(tick);
        frame.update(tick, true);
      }}
      onPointerMove={(event) => {
        const active = session.current;
        if (!active || active.pointerId !== event.pointerId) return;
        active.x = event.clientX;
        active.y = event.clientY;
        followPointer();
      }}
      onPointerUp={(event) => {
        if (session.current?.pointerId !== event.pointerId) return;
        const target = onDrop(event.clientX, event.clientY);
        stop();
        if (event.currentTarget.hasPointerCapture(event.pointerId))
          event.currentTarget.releasePointerCapture(event.pointerId);
        void settle(target ?? position);
      }}
      onPointerCancel={cancel}
      onLostPointerCapture={cancel}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          cancel();
        }
        if (
          !session.current &&
          (event.key === 'ArrowUp' || event.key === 'ArrowDown')
        ) {
          event.preventDefault();
          onKeyboardMove(event.key === 'ArrowUp' ? -1 : 1);
        }
      }}
    >
      {label}
    </motion.button>
  );
};
