'use client';

import { type RefObject, useLayoutEffect, useState } from 'react';
import { scrollBoardWheel } from '@/app/_lib/board-wheel-scroll';

type TierViewportInput = {
  viewport: HTMLElement | null;
  containerRef: RefObject<HTMLDivElement | null>;
};

export const useTierViewport = ({
  viewport,
  containerRef,
}: TierViewportInput) => {
  const [size, setSize] = useState<{
    height?: number;
    availableHeight?: number;
  }>({});

  useLayoutEffect(() => {
    const container = containerRef.current;
    const canvas = viewport?.querySelector<HTMLElement>('[data-tier-canvas]');
    if (!viewport || !container || !canvas) {
      return;
    }
    const measure = () => {
      const available = container.clientHeight;
      const gutter = viewport.scrollWidth > viewport.clientWidth + 1 ? 10 : 0;
      const content = Math.ceil(canvas.getBoundingClientRect().height) + gutter;
      if (available > 0 && content > 0) {
        setSize((current) =>
          current.height === Math.min(available, content) &&
          current.availableHeight === available
            ? current
            : {
                height: Math.min(available, content),
                availableHeight: available,
              },
        );
      }
    };
    let frame: number | undefined;
    const scheduleMeasure = () => {
      if (frame === undefined) {
        frame = requestAnimationFrame(() => {
          frame = undefined;
          measure();
        });
      }
    };
    const observer = new ResizeObserver(scheduleMeasure);
    observer.observe(container);
    observer.observe(canvas);
    observer.observe(viewport);
    scheduleMeasure();

    const desktop = window.matchMedia(
      '(min-width: 64rem) and (hover: hover) and (pointer: fine)',
    );
    const wheel = (event: WheelEvent) => {
      if (desktop.matches) {
        scrollBoardWheel({ viewport, event });
      }
    };
    viewport.addEventListener('wheel', wheel, { passive: false });
    return () => {
      observer.disconnect();
      if (frame !== undefined) {
        cancelAnimationFrame(frame);
      }
      viewport.removeEventListener('wheel', wheel);
    };
  }, [viewport, containerRef]);

  return size;
};
