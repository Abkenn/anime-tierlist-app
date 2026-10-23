import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { type ComponentProps, useEffect, useState } from 'react';
import { fn } from 'storybook/test';
import { TierItemSizing } from './tier-item-sizing';

const Sandbox = ({
  expansion,
  onChange,
  ...props
}: ComponentProps<typeof TierItemSizing>) => {
  const [current, setCurrent] = useState(expansion);

  useEffect(() => {
    setCurrent(expansion);
  }, [expansion]);

  return (
    <div className="w-fit border border-divider bg-popover p-2">
      <TierItemSizing
        {...props}
        expansion={current}
        onChange={(value) => {
          setCurrent(value);
          onChange(value);
        }}
      />
    </div>
  );
};

const meta = {
  title: 'Tierlist/TierItemSizing',
  component: TierItemSizing,
  args: {
    image: {
      src: '/storybook/tier-landscape.svg',
      width: 16,
      height: 9,
      alt: 'Landscape poster',
    },
    expansion: 1,
    onChange: fn(),
  },
  render: (args) => <Sandbox {...args} />,
} satisfies Meta<typeof TierItemSizing>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Landscape: Story = {};
export const Portrait: Story = {
  args: {
    image: {
      src: '/storybook/tier-portrait.svg',
      width: 9,
      height: 16,
      alt: 'Portrait poster',
    },
  },
};
