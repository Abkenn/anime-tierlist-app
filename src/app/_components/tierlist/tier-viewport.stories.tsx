import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useRef } from 'react';
import { TierViewport } from './tier-viewport';

const ViewportSandbox = () => {
  const viewportRef = useRef<HTMLElement>(null);

  return (
    <div className="w-full max-w-86">
      <TierViewport viewportRef={viewportRef} twoLine>
        <div className="h-240 w-120 bg-charcoal p-4 text-cloud">
          Scroll horizontally or vertically
        </div>
      </TierViewport>
    </div>
  );
};

const meta = {
  title: 'Tierlist/TierViewport',
  component: ViewportSandbox,
} satisfies Meta<typeof ViewportSandbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {};
