import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { type ComponentProps, useRef, useState } from 'react';
import { fn } from 'storybook/test';
import { defaultTierItemTitle } from '@/app/_lib/tier-item-title';
import { TierItemTitleEditor } from './tier-item-title-editor';

const Sandbox = (props: ComponentProps<typeof TierItemTitleEditor>) => {
  const anchor = useRef<HTMLButtonElement>(null);
  const [title, setTitle] = useState(props.title);
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        ref={anchor}
        type="button"
        className="min-h-11 border border-divider px-3"
        onClick={() => setOpen(true)}
      >
        Add text
      </button>

      {open && (
        <TierItemTitleEditor
          {...props}
          anchor={anchor}
          title={title}
          onChange={setTitle}
          onSave={() => {
            props.onSave();
            setOpen(false);
          }}
          onCancel={() => {
            props.onCancel();
            setOpen(false);
          }}
        />
      )}
    </>
  );
};

const meta = {
  title: 'Tierlist/TierItemTitleEditor',
  component: TierItemTitleEditor,
  args: {
    anchor: { current: null },
    title: defaultTierItemTitle,
    existing: false,
    onChange: fn(),
    onSave: fn(),
    onCancel: fn(),
    onRemove: fn(),
  },
  render: (args) => <Sandbox {...args} />,
} satisfies Meta<typeof TierItemTitleEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
