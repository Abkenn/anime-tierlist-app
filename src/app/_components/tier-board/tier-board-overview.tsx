'use client';

import { useAtomValue } from 'jotai';
import { tierFindQueryAtom } from '@/app/_atoms/tierlist/find.atoms';
import { imageModeAtom } from '@/app/_atoms/tierlist/settings.atoms';
import { TierItemOverview } from '@/app/_components/tier-item/tier-item-overview';
import type { useTierItems } from '@/app/_hooks/use-tier-items';
import { useViewportWindow } from '@/app/_hooks/use-viewport-window';
import { getTierItemLabel, matchesTierItemLabel } from '@/app/_lib/tier-item-label';

type TierBoardOverviewProps = {
  interaction: Pick<
    ReturnType<typeof useTierItems>,
    'items' | 'posterLayout' | 'boardRef' | 'position'
  >;
};

export const TierBoardOverview = ({ interaction }: TierBoardOverviewProps) => {
  const viewport = useViewportWindow(interaction.boardRef);
  const mode = useAtomValue(imageModeAtom);
  const query = useAtomValue(tierFindQueryAtom);
  const geometry = new Map(interaction.posterLayout.map((poster) => [poster.id, poster]));
  const visible = interaction.items.filter((item) => {
    const poster = geometry.get(item.id);
    return (
      poster &&
      poster.x + poster.width >= viewport.left &&
      poster.x <= viewport.right &&
      poster.y + poster.height >= viewport.top &&
      poster.y <= viewport.bottom
    );
  });

  return (
    <div className="pointer-events-none absolute inset-0">
      {visible.map((item, index) => {
        const position = interaction.position(item);
        return position ? (
          <TierItemOverview
            key={item.id}
            id={item.id}
            label={getTierItemLabel(item)}
            image={item.image}
            trim={item.trim}
            crop={item.crop}
            mode={mode}
            position={position}
            priority={index < 3}
            dimmed={Boolean(query.trim()) && !matchesTierItemLabel(item, query)}
          />
        ) : null;
      })}
    </div>
  );
};
