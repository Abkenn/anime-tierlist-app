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
import { useTierBoardActions } from '@/app/_hooks/use-tier-board-actions';
import type { useTierItems } from '@/app/_hooks/use-tier-items';
import { useViewportWindow } from '@/app/_hooks/use-viewport-window';
import { getTrimmedImage } from '@/app/_lib/tier-image-trim';
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
  const { clearEditingItem } = useTierBoardActions();

  return (
    <>
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
                title={item.title}
                onTitleChange={(title) =>
                  interaction.updateItem(item.id, { title })
                }
                crop={item.crop}
                trim={item.trim}
                onTrimChange={(trim) =>
                  interaction.updateItem(item.id, { trim })
                }
                onCropChange={(crop) =>
                  interaction.updateItem(item.id, { crop })
                }
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
                boardRef={interaction.boardRef}
                onStart={(clientX, clientY) => {
                  clearEditingItem();
                  interaction.start(item.id, clientX, clientY);
                }}
                onMove={(clientX, clientY) =>
                  interaction.move(item.id, clientX, clientY)
                }
                onDrop={(clientX, clientY) =>
                  interaction.drop(item.id, clientX, clientY)
                }
                onCancel={interaction.cancel}
                onKeyboardMove={(move) =>
                  interaction.keyboardMove(item.id, move)
                }
              />
            ) : null;
          })}
      </div>
    </>
  );
};
