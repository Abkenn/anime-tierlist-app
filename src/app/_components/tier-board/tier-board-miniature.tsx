'use client';

import { cn } from 'cn';
import { useAtomValue } from 'jotai';
import { tierItemsAtom } from '@/app/_atoms/tierlist/items.atoms';
import { imageModeAtom } from '@/app/_atoms/tierlist/settings.atoms';
import { TierItemImage } from '@/app/_components/tier-item/tier-item-image';
import { TierItemTitle } from '@/app/_components/tier-item/tier-item-title';
import type { useTierOverview } from '@/app/_hooks/use-tier-overview';
import { tierColorClasses, tierColors } from '@/app/_lib/tier-colors';

type TierBoardMiniatureProps = {
  overview: ReturnType<typeof useTierOverview>;
  scale: number;
};

export const TierBoardMiniature = ({
  overview,
  scale,
}: TierBoardMiniatureProps) => {
  const items = useAtomValue(tierItemsAtom);
  const mode = useAtomValue(imageModeAtom);
  const byId = new Map(items.map((item) => [item.id, item]));

  return (
    <div
      aria-hidden="true"
      inert
      data-tier-miniature=""
      className="pointer-events-none absolute left-0 top-0 origin-top-left overflow-hidden grayscale-35 border border-ink bg-charcoal text-cloud"
      style={{
        width: overview.canvasWidth,
        height: overview.canvasHeight,
        transform: `scale(${scale})`,
      }}
    >
      {overview.rows.map((row) => (
        <div
          key={row.rank}
          className="absolute inset-x-0 border-b border-ink"
          style={{ top: `${row.top}%`, height: `${row.height}%` }}
        >
          <span
            className={cn(
              'absolute left-0 top-0 flex aspect-square items-center justify-center border-r border-ink text-sm text-graphite',
              tierColorClasses[tierColors[row.rank]],
            )}
            style={{ width: overview.labelWidth }}
          >
            {row.rank}
          </span>
        </div>
      ))}

      {overview.posters.map((poster) => {
        const item = byId.get(poster.id);
        if (!item) {
          return null;
        }

        return (
          <div
            key={poster.id}
            data-tier-miniature-poster={poster.id}
            className="absolute overflow-hidden text-xs text-white"
            style={{
              left: poster.x,
              top: poster.y,
              width: poster.width,
              height: poster.height,
            }}
          >
            {item.image ? (
              <TierItemImage
                image={item.image}
                mode={mode}
                crop={item.crop ?? { x: 0.5, y: 0.5 }}
                trim={item.trim}
              />
            ) : (
              <span className="flex size-full items-center justify-center bg-gray">
                {item.label}
              </span>
            )}

            {item.title?.text && (
              <TierItemTitle
                title={item.title}
                image={item.image}
                mode={mode}
                trim={item.trim}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
