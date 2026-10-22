import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { motion } from 'motion/react';
import { useState } from 'react';
import { fn } from 'storybook/test';
import { useTierItems } from '@/app/_hooks/use-tier-items';
import { defaultTierRanks } from '@/app/_lib/tier-ranks';
import type { TierImageMode } from '@/app/_types/tierlist.types';
import { TierBoardItems } from './tier-board-items';
import { TierBoardRows } from './tier-board-rows';
import { aspectRatioTierItems } from './tier-image.fixtures';
import { TierViewport } from './tier-viewport';

type SandboxProps = { imageMode: TierImageMode };

const Sandbox = ({ imageMode }: SandboxProps) => {
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const interaction = useTierItems({
    ranks: defaultTierRanks,
    initialItems: aspectRatioTierItems,
    imageMode,
  });

  const changeEditingItem = (id: string, editing: boolean) => {
    setEditingItemId((current) => {
      if (editing) {
        return id;
      }

      return current === id ? null : current;
    });
  };

  return (
    <TierViewport ref={interaction.viewportRef} scrollable>
      <motion.div
        ref={interaction.boardRef}
        className="relative min-w-full"
        animate={{ width: interaction.canvasWidth }}
        transition={{ duration: 0 }}
      >
        <TierBoardRows
          ranks={defaultTierRanks}
          layout="single-line"
          interaction={interaction}
        />

        <TierBoardItems
          interaction={interaction}
          imageMode={imageMode}
          editingItemId={editingItemId}
          onEditingChange={changeEditingItem}
          onDragStart={() => setEditingItemId(null)}
          onKeyboardModeChange={fn()}
        />
      </motion.div>
    </TierViewport>
  );
};

const meta = {
  title: 'Tierlist/TierBoardItems',
  component: Sandbox,
  args: { imageMode: 'contain' },
  argTypes: {
    imageMode: { control: 'select', options: ['contain', 'cover', 'natural'] },
  },
} satisfies Meta<typeof Sandbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const OriginalRatio: Story = { args: { imageMode: 'natural' } };
