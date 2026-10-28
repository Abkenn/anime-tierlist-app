'use client';

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
}: PreviewPosterLinksProps) => (
  <div className="pointer-events-none absolute inset-0">
    {posters.map((poster) => (
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
