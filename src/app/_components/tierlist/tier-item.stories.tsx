import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useRef } from 'react';
import { fn } from 'storybook/test';
import { TierItem } from './tier-item';

const meta = {
  title: 'Tierlist/TierItem',
  component: TierItem,
  args: {
    label: '1',
    rank: 'S+',
    position: { x: '1rem', y: '1rem', width: '4rem', height: '4rem' },
    boardRef: { current: null },
    onStart: fn(),
    onMove: fn(),
    onDrop: fn(() => null),
    onCancel: fn(),
    onKeyboardMove: fn(),
  },
  argTypes: { boardRef: { control: false } },
  render: (args) => {
    const boardRef = useRef<HTMLDivElement>(null);
    return (
      <div ref={boardRef} className="relative h-80 bg-[#1c1c1c]">
        <TierItem {...args} boardRef={boardRef} />
      </div>
    );
  },
} satisfies Meta<typeof TierItem>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
