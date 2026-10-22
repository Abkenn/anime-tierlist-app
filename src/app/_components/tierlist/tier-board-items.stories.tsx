import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { motion } from 'motion/react';
import { useTierImageMode } from '@/app/_hooks/use-tier-image-mode';
import { useTierItems } from '@/app/_hooks/use-tier-items';
import { defaultTierRanks } from '@/app/_lib/tier-ranks';
import { TierBoardProvider } from '@/app/_providers/tier-board-provider';
import type { TierImageMode } from '@/app/_types/tierlist.types';
import { TierBoardItems } from './tier-board-items';
import { TierBoardRows } from './tier-board-rows';
import { aspectRatioTierItems } from './tier-image.fixtures';
import { TierViewport } from './tier-viewport';

type SandboxProps = { imageMode: TierImageMode };

const Sandbox = ({ imageMode }: SandboxProps) => {
  const { imageMode: currentImageMode } = useTierImageMode({
    value: imageMode,
  });
  const interaction = useTierItems({
    ranks: defaultTierRanks,
    initialItems: aspectRatioTierItems,
    imageMode: currentImageMode,
  });

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

        <TierBoardItems interaction={interaction} />
      </motion.div>
    </TierViewport>
  );
};

const meta = {
  title: 'Tierlist/TierBoardItems',
  component: Sandbox,
  decorators: [
    (Story) => (
      <TierBoardProvider>
        <Story />
      </TierBoardProvider>
    ),
  ],
  args: { imageMode: 'contain' },
  argTypes: {
    imageMode: { control: 'select', options: ['contain', 'cover', 'natural'] },
  },
} satisfies Meta<typeof Sandbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const OriginalRatio: Story = { args: { imageMode: 'natural' } };
