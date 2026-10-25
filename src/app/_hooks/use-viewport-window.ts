'use client';

import { type RefObject, useEffect, useState } from 'react';

type ViewportWindow = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  columns: number;
  rem: number;
};

export const useViewportWindow = (content: RefObject<HTMLElement | null>) => {
  const [window, setWindow] = useState<ViewportWindow>({
    left: 0,
    right: 1600,
    top: 0,
    bottom: 1000,
    columns: 3,
    rem: 16,
  });

  useEffect(() => {
    const element = content.current;
    const viewport = element?.closest<HTMLElement>(
      '[data-slot="scroll-area-viewport"]',
    );
    if (!element || !viewport) {
      setWindow({
        left: 0,
        right: Infinity,
        top: 0,
        bottom: Infinity,
        columns: 3,
        rem: 16,
      });

      return;
    }

    let frame = 0;

    const measure = () => {
      const view = viewport.getBoundingClientRect();
      const bounds = element.getBoundingClientRect();
      const columns = getComputedStyle(element)
        .gridTemplateColumns.split(' ')
        .filter(Boolean).length;
      const next = {
        left: view.left - bounds.left - 300,
        right: view.right - bounds.left + 300,
        top: Math.max(0, view.top - bounds.top - 300),
        bottom: view.bottom - bounds.top + 300,
        columns,
        rem: Number.parseFloat(
          getComputedStyle(document.documentElement).fontSize,
        ),
      };
      setWindow((previous) =>
        Object.keys(next).every(
          (key) =>
            previous[key as keyof ViewportWindow] ===
            next[key as keyof ViewportWindow],
        )
          ? previous
          : next,
      );
    };

    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };

    const resize = new ResizeObserver(schedule);
    resize.observe(viewport);
    resize.observe(element);
    viewport.addEventListener('scroll', schedule, { passive: true });
    measure();

    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      viewport.removeEventListener('scroll', schedule);
    };
  }, [content]);

  return window;
};
