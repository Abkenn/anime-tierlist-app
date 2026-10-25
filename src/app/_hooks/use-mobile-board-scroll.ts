'use client';

import { animate, useReducedMotion } from 'motion/react';
import { type RefObject, useCallback, useEffect, useRef } from 'react';
import { getTouchScrollState } from '@/app/_lib/touch-scroll';

type MobileBoardScrollInput = {
  enabled: boolean;
  viewportRef: RefObject<HTMLDivElement | null>;
  boardRef: RefObject<HTMLDivElement | null>;
};

export const useMobileBoardScroll = ({
  enabled,
  viewportRef,
  boardRef,
}: MobileBoardScrollInput) => {
  const animation = useRef<{ stop: () => void } | null>(null);
  const reducedMotion = useReducedMotion();

  const getScroll = useCallback(() => {
    const viewport = viewportRef.current;
    const board = boardRef.current?.querySelector<HTMLElement>(
      '[data-tier-viewport]',
    );
    if (!viewport || !board) {
      return;
    }

    return getTouchScrollState(board, viewport);
  }, [viewportRef, boardRef]);

  const revealSearch = useCallback(() => {
    animation.current?.stop();
    const scroll = getScroll();
    if (!scroll) {
      return;
    }

    animation.current = animate(scroll.position, 0, {
      duration: reducedMotion ? 0 : 0.25,
      ease: 'easeOut',
      onUpdate: scroll.moveTo,
    });
  }, [getScroll, reducedMotion]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!enabled || !viewport) {
      return;
    }

    let gesture:
      | {
          x: number;
          y: number;
          time: number;
          velocity: number;
          vertical?: boolean;
        }
      | undefined;
    const start = (event: TouchEvent) => {
      animation.current?.stop();
      gesture = undefined;
      const target = event.target;
      if (
        event.touches.length !== 1 ||
        !(target instanceof Element) ||
        !target.closest('[data-tier-viewport]') ||
        target.closest(
          'button, input, textarea, select, a, [role="slider"], [data-slot="scroll-area-scrollbar"]',
        )
      ) {
        return;
      }

      const touch = event.touches[0];
      gesture = {
        x: touch.clientX,
        y: touch.clientY,
        time: event.timeStamp,
        velocity: 0,
      };
    };
    const move = (event: TouchEvent) => {
      if (!gesture || event.touches.length !== 1) {
        gesture = undefined;

        return;
      }

      const touch = event.touches[0];
      const delta = gesture.y - touch.clientY;
      gesture.vertical ??=
        Math.abs(delta) > Math.abs(gesture.x - touch.clientX);
      if (!gesture.vertical || !event.cancelable) {
        return;
      }

      event.preventDefault();
      const scroll = getScroll();
      scroll?.moveTo(Math.min(scroll.max, scroll.position + delta));
      gesture.velocity =
        (0.7 * delta) / Math.max(1, event.timeStamp - gesture.time) +
        0.3 * gesture.velocity;
      gesture.y = touch.clientY;
      gesture.time = event.timeStamp;
    };
    const end = (event: TouchEvent) => {
      const finished = gesture;
      gesture = undefined;
      const scroll = getScroll();
      if (
        !finished?.vertical ||
        !scroll ||
        reducedMotion ||
        event.timeStamp - finished.time > 90
      ) {
        return;
      }

      const velocity = Math.max(-3, Math.min(3, finished.velocity));
      const target = Math.max(
        0,
        Math.min(scroll.max, scroll.position + velocity * 160),
      );
      animation.current = animate(scroll.position, target, {
        duration: 0.24,
        ease: 'easeOut',
        onUpdate: scroll.moveTo,
      });
    };
    const cancel = () => {
      gesture = undefined;
    };
    viewport.addEventListener('touchstart', start, { passive: true });
    viewport.addEventListener('touchmove', move, { passive: false });
    viewport.addEventListener('touchend', end);
    viewport.addEventListener('touchcancel', cancel);

    return () => {
      animation.current?.stop();
      viewport.removeEventListener('touchstart', start);
      viewport.removeEventListener('touchmove', move);
      viewport.removeEventListener('touchend', end);
      viewport.removeEventListener('touchcancel', cancel);
    };
  }, [enabled, viewportRef, getScroll, reducedMotion]);

  return revealSearch;
};
