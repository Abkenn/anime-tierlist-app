'use client';

import { type RefObject, startTransition, useEffect, useState } from 'react';

type ViewportWindow = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  visible: { left: number; right: number; top: number; bottom: number };
  columns: number;
  rem: number;
};

export const useViewportWindow = (content: RefObject<HTMLElement | null>) => {
  const [viewportWindow, setWindow] = useState<ViewportWindow>({
    left: 0,
    right: 1600,
    top: 0,
    bottom: 1000,
    visible: { left: 0, right: 0, top: 0, bottom: 0 },
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
        visible: {
          left: 0,
          right: window.innerWidth,
          top: 0,
          bottom: window.innerHeight,
        },
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
      const visible = {
        left: Math.max(0, view.left) - bounds.left,
        right: Math.min(window.innerWidth, view.right) - bounds.left,
        top: Math.max(0, view.top) - bounds.top,
        bottom: Math.min(window.innerHeight, view.bottom) - bounds.top,
      };
      const next = {
        left: Math.floor(visible.left / 128) * 128 - 96,
        right: Math.ceil(visible.right / 128) * 128 + 96,
        top: Math.max(0, Math.floor(visible.top / 128) * 128 - 96),
        bottom: Math.ceil(visible.bottom / 128) * 128 + 96,
        visible,
        columns,
        rem: Number.parseFloat(
          getComputedStyle(document.documentElement).fontSize,
        ),
      };
      startTransition(() =>
        setWindow((previous) =>
          (['left', 'right', 'top', 'bottom', 'columns', 'rem'] as const).every(
            (key) => previous[key] === next[key],
          )
            ? previous
            : next,
        ),
      );
    };

    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };

    const resize = new ResizeObserver(schedule);
    resize.observe(viewport);
    resize.observe(element);
    window.addEventListener('scroll', schedule, {
      capture: true,
      passive: true,
    });
    window.addEventListener('resize', schedule);
    measure();

    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
    };
  }, [content]);

  return viewportWindow;
};
