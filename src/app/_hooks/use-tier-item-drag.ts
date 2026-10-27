import { useAtomValue } from 'jotai';
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
import { draggedRankAtom } from '@/app/_atoms/tierlist/layout.atoms';
import type { TierItemPosition } from '@/app/_hooks/use-tier-items';
import { scrollTierDrag } from '@/app/_lib/scroll-tier-drag';

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
  width: number;
  height: number;
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
  const rowDragging = useAtomValue(draggedRankAtom) !== null;
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

    // A transformed poster must not extend the scrollable board's bounds.
    const maxX = Math.max(0, bounds.width - active.width) / rem;
    const maxY = Math.max(0, bounds.height - active.height) / rem;

    controls.set({
      x: `${Math.min(maxX, (active.x - bounds.left) / rem - active.grabX)}rem`,
      y: `${Math.min(maxY, (active.y - bounds.top) / rem - active.grabY)}rem`,
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
      width: rect.width,
      height: rect.height,
      stopFrame: null,
    };
    setDragging(true);
    onStart(event.clientX, event.clientY);

    const tick = ({ delta }: { delta: number }) => {
      const active = session.current;

      if (!active) {
        return;
      }

      const board = boardRef.current;

      if (board) {
        scrollTierDrag({ board, x: active.x, y: active.y, delta });
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

    if (rowDragging) {
      controls.stop();
      controls.set({
        x: position.x,
        y: position.y,
        width: position.width,
        height: position.height,
      });
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
    rowDragging,
  ]);

  useLayoutEffect(() => () => session.current?.stopFrame?.(), []);

  return { controls, dragging, start, move, end, cancel };
};
