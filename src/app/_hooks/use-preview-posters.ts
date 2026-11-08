'use client';

import { type RefObject, useEffect, useState } from 'react';
import type { ExportPoster } from '@/app/_lib/tierlist-export-layout';

export const usePreviewPosters = (
  root: RefObject<HTMLDivElement | null>,
  posters: ExportPoster[],
  width: number,
  height: number,
) => {
  const [visible, setVisible] = useState(() =>
    posters.filter((poster) => poster.x < 800 && poster.y < 1000),
  );

  useEffect(() => {
    const element = root.current;
    if (!element) {
      return;
    }

    let frame = 0;
    const measure = () => {
      const bounds = element.getBoundingClientRect();
      if (!bounds.width || !bounds.height) {
        return;
      }

      const scaleX = bounds.width / width;
      const scaleY = bounds.height / height;
      const viewport = window.visualViewport;
      const left = viewport?.offsetLeft ?? 0;
      const top = viewport?.offsetTop ?? 0;
      const right = left + (viewport?.width ?? window.innerWidth);
      const bottom = top + (viewport?.height ?? window.innerHeight);
      const next = posters.filter(
        (poster) =>
          bounds.top + (poster.y + poster.height) * scaleY >= top - 100 &&
          bounds.top + poster.y * scaleY <= bottom + 100 &&
          bounds.left + (poster.x + poster.width) * scaleX >= left - 100 &&
          bounds.left + poster.x * scaleX <= right + 100,
      );
      setVisible((previous) =>
        previous.length === next.length &&
        previous.every((poster, index) => poster === next[index])
          ? previous
          : next,
      );
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(element);
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('scroll', schedule);
    window.visualViewport?.addEventListener('resize', schedule);
    measure();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('scroll', schedule);
      window.visualViewport?.removeEventListener('resize', schedule);
    };
  }, [root, posters, width, height]);

  return visible;
};
