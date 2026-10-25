'use client';

import { cn } from 'cn';
import { useAtomValue } from 'jotai';
import { tierItemsAtom } from '@/app/_atoms/tierlist/items.atoms';
import { posterLayoutAtom } from '@/app/_atoms/tierlist/layout.atoms';
import {
  imageModeAtom,
  rankDetailsAtom,
} from '@/app/_atoms/tierlist/settings.atoms';
import { TierItemImage } from '@/app/_components/tier-item/tier-item-image';
import { TierItemTitle } from '@/app/_components/tier-item/tier-item-title';
import type { OverviewRow } from '@/app/_hooks/use-tier-overview';
import { tierColorClasses, tierColors } from '@/app/_lib/tier-colors';

type TierBoardMinimapProps = {
  rows: Pick<OverviewRow, 'rank' | 'top' | 'height'>[];
  canvasHeight: number;
  labelWidth: number;
  scale: number;
  cropWidth: number;
};

export const TierBoardMinimap = ({
  rows,
  canvasHeight,
  labelWidth,
  scale,
  cropWidth,
}: TierBoardMinimapProps) => {
  const items = useAtomValue(tierItemsAtom);
  const mode = useAtomValue(imageModeAtom);
  const details = useAtomValue(rankDetailsAtom);
  const geometry = useAtomValue(posterLayoutAtom);
  const posters = geometry.filter((poster) => poster.x < cropWidth);
  const byId = new Map(items.map((item) => [item.id, item]));

  return (
    <div
      aria-hidden="true"
      inert
      data-tier-miniature=""
      className="pointer-events-none absolute left-0 top-0 origin-top-left overflow-hidden grayscale-20 border border-ink bg-charcoal text-cloud"
      style={{
        width: cropWidth,
        height: canvasHeight,
        transform: `scale(${scale})`,
      }}
    >
      {rows.map((row) => (
        <div
          key={details[row.rank]?.label ?? row.rank}
          className="absolute inset-x-0 border-b border-ink"
          style={{ top: `${row.top}%`, height: `${row.height}%` }}
        >
          <span
            className={cn(
              'absolute left-0 top-0 flex aspect-square items-center justify-center border-r border-ink text-sm text-graphite',
              tierColorClasses[tierColors[row.rank] ?? 'stone'],
            )}
            style={{
              width: labelWidth,
              backgroundColor: details[row.rank]?.color,
            }}
          >
            {details[row.rank]?.label ?? row.rank}
          </span>
        </div>
      ))}

      {posters.length > 400 && (
        <svg
          aria-hidden="true"
          width={cropWidth}
          height={canvasHeight}
          className="absolute inset-0 fill-cloud/25"
        >
          <path
            d={posters
              .map(
                (poster) =>
                  `M${poster.x},${poster.y}h${poster.width}v${poster.height}h${-poster.width}Z`,
              )
              .join('')}
          />
        </svg>
      )}

      {posters
        .filter(
          (_, index) =>
            index % Math.max(1, Math.ceil(posters.length / 400)) === 0,
        )
        .map((poster) => {
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
