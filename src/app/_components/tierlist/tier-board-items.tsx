import { motion } from 'motion/react';
import { TierItem } from '@/app/_components/tierlist/tier-item';
import type { useTierItems } from '@/app/_hooks/use-tier-items';
import type { TierImageMode } from '@/app/_types/tierlist.types';

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
  imageMode: TierImageMode;
  editingItemId: string | null;
  onEditingChange: (id: string, editing: boolean) => void;
  onDragStart: () => void;
  onKeyboardModeChange: (active: boolean) => void;
};

export const TierBoardItems = ({
  interaction,
  imageMode,
  editingItemId,
  onEditingChange,
  onDragStart,
  onKeyboardModeChange,
}: TierBoardItemsProps) => (
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
            label={item.label}
            rank={rank}
            editing={editingItemId === item.id}
            onEditingChange={(editing) => onEditingChange(item.id, editing)}
            image={item.image}
            imageMode={imageMode}
            crop={item.crop}
            rowHeightExpansion={item.rowHeightExpansion}
            onCropChange={(crop) => interaction.updateItem(item.id, { crop })}
            onRowHeightExpansionChange={(rowHeightExpansion) =>
              interaction.updateItem(item.id, { rowHeightExpansion })
            }
            position={position}
            boardRef={interaction.boardRef}
            onStart={(clientX, clientY) => {
              onDragStart();
              interaction.start(item.id, clientX, clientY);
            }}
            onMove={(clientX, clientY) =>
              interaction.move(item.id, clientX, clientY)
            }
            onDrop={(clientX, clientY) =>
              interaction.drop(item.id, clientX, clientY)
            }
            onCancel={interaction.cancel}
            onKeyboardModeChange={onKeyboardModeChange}
            onKeyboardMove={(move) => interaction.keyboardMove(item.id, move)}
          />
        ) : null;
      })}
    </div>
  </>
);
