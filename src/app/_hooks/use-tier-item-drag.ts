import {
  cancelFrame,
  frame,
  useAnimationControls,
  useReducedMotion,
} from 'motion/react';
import {
  type PointerEvent,
  type RefObject,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { TierItemPosition } from '@/app/_hooks/use-tier-items';

type TierItemDragInput = {
  itemRef: RefObject<HTMLButtonElement | null>;
  boardRef: RefObject<HTMLDivElement | null>;
  position: TierItemPosition;
  onStart: (clientX: number, clientY: number) => void;
  onMove: (clientX: number, clientY: number) => void;
  onDrop: (clientX: number, clientY: number) => TierItemPosition | null;
  onCancel: () => void;
};

type DragSession = {
  pointerId: number;
  x: number;
  y: number;
  grabX: number;
  grabY: number;
  stopFrame: (() => void) | null;
};

export const useTierItemDrag = ({
  itemRef,
  boardRef,
  position,
  onStart,
  onMove,
  onDrop,
  onCancel,
}: TierItemDragInput) => {
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

  const stop = () => {
    const pointerId = session.current?.pointerId;

    session.current?.stopFrame?.();
    session.current = null;

    if (
      pointerId !== undefined &&
      itemRef.current?.hasPointerCapture(pointerId)
    ) {
      itemRef.current.releasePointerCapture(pointerId);
    }

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

  const start = (event: PointerEvent<HTMLButtonElement>) => {
    if (!event.isPrimary || event.button !== 0 || session.current) {
      return;
    }

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

  const move = (event: PointerEvent<HTMLButtonElement>) => {
    const active = session.current;

    if (!active || active.pointerId !== event.pointerId) {
      return;
    }

    active.x = event.clientX;
    active.y = event.clientY;
    followPointer();
  };

  const end = (event: PointerEvent<HTMLButtonElement>) => {
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

  return { controls, dragging, start, move, end, cancel };
};
