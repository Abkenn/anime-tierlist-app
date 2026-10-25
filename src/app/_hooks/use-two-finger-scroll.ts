'use client';

import { type MouseEvent, type TouchEvent, useEffect, useRef } from 'react';
import { getTouchScrollState } from '@/app/_lib/touch-scroll';

const center = (touches: ArrayLike<Pick<Touch, 'clientX' | 'clientY'>>) => ({
  x: (touches[0].clientX + touches[1].clientX) / 2,
  y: (touches[0].clientY + touches[1].clientY) / 2,
});

export const useTwoFingerScroll = () => {
  const stop = useRef<(() => void) | null>(null);
  const ignoreClickUntil = useRef(0);

  useEffect(() => () => stop.current?.(), []);

  return {
    onClickCapture: (event: MouseEvent<HTMLElement>) => {
      if (stop.current || Date.now() < ignoreClickUntil.current) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    onTouchStartCapture: (event: TouchEvent<HTMLElement>) => {
      const root = event.currentTarget;
      if (
        stop.current ||
        event.touches.length !== 2 ||
        Array.from(event.touches).some(
          (touch) =>
            !(touch.target instanceof Element) ||
            touch.target.closest('[data-slot="scroll-area"]') !== root,
        )
      ) {
        return;
      }

      const viewport = root.querySelector<HTMLElement>(
        '[data-slot="scroll-area-viewport"]',
      );
      if (!viewport) {
        return;
      }

      // End the first finger's drag before switching to a scrolling gesture.
      const targets = new Set(
        Array.from(event.touches, (touch) =>
          touch.target instanceof Element
            ? (touch.target.closest('button') ?? touch.target)
            : null,
        ),
      );
      targets.forEach((target) => {
        if (target) {
          target.dispatchEvent(
            new PointerEvent('pointercancel', {
              bubbles: true,
              pointerType: 'touch',
            }),
          );
        }
      });
      ignoreClickUntil.current = Date.now() + 300;
      let previous = center(event.touches);
      const move = (next: globalThis.TouchEvent) => {
        if (next.cancelable) {
          next.preventDefault();
        }
        next.stopPropagation();
        if (next.touches.length !== 2) {
          return;
        }

        const point = center(next.touches);
        const scroll = getTouchScrollState(viewport);
        scroll.moveTo(scroll.position + previous.y - point.y);
        viewport.scrollLeft += previous.x - point.x;
        previous = point;
      };
      const end = (next: globalThis.TouchEvent) => {
        if (next.cancelable) {
          next.preventDefault();
        }
        ignoreClickUntil.current = Date.now() + 300;
        if (!next.touches.length) {
          stop.current?.();
        }
      };
      const cleanup = () => {
        root.removeEventListener('touchmove', move, true);
        root.removeEventListener('touchend', end, true);
        root.removeEventListener('touchcancel', end, true);
        stop.current = null;
      };
      stop.current = cleanup;
      root.addEventListener('touchmove', move, {
        capture: true,
        passive: false,
      });
      root.addEventListener('touchend', end, { capture: true, passive: false });
      root.addEventListener('touchcancel', end, {
        capture: true,
        passive: false,
      });
    },
  };
};
