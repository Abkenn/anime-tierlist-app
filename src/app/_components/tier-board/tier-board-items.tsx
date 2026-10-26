'use client';

import { useAtomValue } from 'jotai';
import { motion } from 'motion/react';
import { useDeferredValue, useState } from 'react';
import {
  renamingItemIdAtom,
  tierFindQueryAtom,
} from '@/app/_atoms/tierlist/find.atoms';
import {
  editingItemIdAtom,
  menuItemIdAtom,
} from '@/app/_atoms/tierlist/interaction.atoms';
import { TierItem } from '@/app/_components/tier-item/tier-item';
import { TierItemSizing } from '@/app/_components/tier-item/tier-item-sizing';
import { useTierItemActions } from '@/app/_hooks/use-tier-item-actions';
import type { useTierItems } from '@/app/_hooks/use-tier-items';
import { useViewportWindow } from '@/app/_hooks/use-viewport-window';
import { getTrimmedImage } from '@/app/_lib/tier-image-trim';
import { TierItemActionsContext } from '@/app/_lib/tier-item-actions-context';
import {
  getTierItemLabel,
  matchesTierItemLabel,
} from '@/app/_lib/tier-item-label';

type TierBoardItemsProps = {
  interaction: Pick<
    ReturnType<typeof useTierItems>,
    | 'items'
    | 'posterLayout'
    | 'draggingId'
    | 'boardRef'
    | 'dropPosition'
    | 'position'
    | 'visibleRank'
    | 'updateItem'
    | 'start'
    | 'move'
    | 'drop'
    | 'cancel'
    | 'keyboardMove'
    | 'announcement'
  >;
};

export const TierBoardItems = ({ interaction }: TierBoardItemsProps) => {
  const window = useViewportWindow(interaction.boardRef);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const geometry = new Map(
    interaction.posterLayout.map((poster) => [poster.id, poster]),
  );
  const menuItemId = useAtomValue(menuItemIdAtom);
  const renamingItemId = useAtomValue(renamingItemIdAtom);
  const editingItemId = useAtomValue(editingItemIdAtom);
  const query = useDeferredValue(useAtomValue(tierFindQueryAtom));
  const actions = useTierItemActions(interaction);
  const priorityItem = interaction.items.find((item) => {
    const poster = geometry.get(item.id);

    return (
      item.image &&
      poster &&
      poster.y < window.bottom &&
      poster.y + poster.height >= window.top
    );
  });

  return (
    <TierItemActionsContext value={actions}>
      <p role="status" className="sr-only">
        {interaction.announcement}
      </p>

      <div
        className="pointer-events-none absolute inset-0"
        onFocusCapture={(event) =>
          setFocusedId(
            (event.target as HTMLElement).closest<HTMLElement>(
              '[data-tier-item-id]',
            )?.dataset.tierItemId ?? null,
          )
        }
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setFocusedId(null);
          }
        }}
      >
        {interaction.dropPosition && (
          <motion.div
            aria-hidden="true"
            data-drop-slot=""
            initial={false}
            animate={interaction.dropPosition}
            transition={{ duration: 0.12 }}
            className="absolute left-0 top-0 z-0 border border-dashed border-white/80 bg-white/15"
          />
        )}

        {interaction.items
          .filter((item) => {
            if (
              interaction.items.length <= 100 ||
              item.id === interaction.draggingId ||
              item.id === editingItemId ||
              item.id === menuItemId ||
              item.id === renamingItemId ||
              item.id === focusedId
            ) {
              return true;
            }

            const rect = geometry.get(item.id);

            return (
              rect &&
              rect.x + rect.width >= window.left &&
              rect.x <= window.right &&
              rect.y + rect.height >= window.top &&
              rect.y <= window.bottom
            );
          })
          .map((item) => {
            const position = interaction.position(item);
            const rank = interaction.visibleRank(item);

            return position && rank ? (
              <TierItem
                key={item.id}
                id={item.id}
                label={getTierItemLabel(item)}
                dimmed={
                  Boolean(query.trim()) && !matchesTierItemLabel(item, query)
                }
                rank={rank}
                editing={editingItemId === item.id}
                image={item.image}
                priority={item.id === priorityItem?.id}
                title={item.title}
                crop={item.crop}
                trim={item.trim}
                sizingControl={
                  <TierItemSizing
                    image={item.image && getTrimmedImage(item.image, item.trim)}
                    expansion={item.rowHeightExpansion ?? 1}
                    onChange={(rowHeightExpansion) =>
                      interaction.updateItem(item.id, { rowHeightExpansion })
                    }
                  />
                }
                position={position}
              />
            ) : null;
          })}
      </div>
    </TierItemActionsContext>
  );
};
