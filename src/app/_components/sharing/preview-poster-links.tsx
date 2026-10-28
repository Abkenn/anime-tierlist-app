'use client';

import { useEffect, useRef, useState } from 'react';
import type { ExportPoster } from '@/app/_lib/tierlist-export-layout';
import { PreviewMalLink } from './preview-mal-link';

type PreviewPosterLinksProps = {
  posters: ExportPoster[];
  width: number;
  height: number;
};
export const PreviewPosterLinks = ({
  posters,
  width,
  height,
}: PreviewPosterLinksProps) => {
  const root = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState<ExportPoster[]>([]);

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
      const next = posters.filter(
        (poster) =>
          bounds.top + (poster.y + poster.height) * scaleY >= -100 &&
          bounds.top + poster.y * scaleY <= window.innerHeight + 100 &&
          bounds.left + (poster.x + poster.width) * scaleX >= -100 &&
          bounds.left + poster.x * scaleX <= window.innerWidth + 100,
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
    measure();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
    };
  }, [posters, width, height]);

  return (
    <div ref={root} className="pointer-events-none absolute inset-0">
      {visible.map((poster) => (
        <PreviewMalLink
          key={poster.item.id}
          item={poster.item}
          style={{
            left: `${(poster.x / width) * 100}%`,
            top: `${(poster.y / height) * 100}%`,
            width: `${(poster.width / width) * 100}%`,
            height: `${(poster.height / height) * 100}%`,
          }}
        />
      ))}
    </div>
  );
};
