'use client';

import { useAtomValue } from 'jotai';
import { motion } from 'motion/react';
import { editingItemIdAtom } from '@/app/_atoms/tierlist/interaction.atoms';
import { TierItem } from '@/app/_components/tier-item/tier-item';
import { TierItemSizing } from '@/app/_components/tier-item/tier-item-sizing';
import { useTierBoardActions } from '@/app/_hooks/use-tier-board-actions';
import type { useTierItems } from '@/app/_hooks/use-tier-items';

type TierBoardItemsProps = {
  interaction: Pick<
    ReturnType<typeof useTierItems>,
    | 'items'
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
  const editingItemId = useAtomValue(editingItemIdAtom);
  const { clearEditingItem } = useTierBoardActions();

  return (
    <>
      <p role="status" className="sr-only">
        {interaction.announcement}
      </p>

      <div className="pointer-events-none absolute inset-0">
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

        {interaction.items.map((item) => {
          const position = interaction.position(item);
          const rank = interaction.visibleRank(item);

          return position && rank ? (
            <TierItem
              key={item.id}
              id={item.id}
              label={item.label}
              rank={rank}
              editing={editingItemId === item.id}
              image={item.image}
              crop={item.crop}
              onCropChange={(crop) => interaction.updateItem(item.id, { crop })}
              sizingControl={
                <TierItemSizing
                  image={item.image}
                  expansion={item.rowHeightExpansion ?? 0}
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
              onKeyboardMove={(move) => interaction.keyboardMove(item.id, move)}
            />
          ) : null;
        })}
      </div>
    </>
  );
};
