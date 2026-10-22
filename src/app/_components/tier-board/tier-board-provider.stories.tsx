import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useAtomValue } from 'jotai';
import { expect } from 'storybook/test';
import {
  editingItemIdAtom,
  keyboardModeAtom,
} from '@/app/_atoms/tierlist/interaction.atoms';
import { useTierBoardActions } from '@/app/_hooks/use-tier-board-actions';
import { TierBoardProvider } from '@/app/_providers/tier-board-provider';

const StoreControls = () => {
  const editingItemId = useAtomValue(editingItemIdAtom);
  const keyboardMode = useAtomValue(keyboardModeAtom);
  const { setEditingItem, clearEditingItem, setKeyboardMode } =
    useTierBoardActions();

  return (
    <div className="space-y-4 text-sm">
      <p>
        Editing:{' '}
        <output aria-label="Edited item">{editingItemId ?? 'none'}</output>
      </p>

      <p>
        Keyboard:{' '}
        <output aria-label="Keyboard state">
          {keyboardMode ? 'on' : 'off'}
        </output>
      </p>

      <div className="flex gap-4">
        <button
          type="button"
          className="min-h-11 underline"
          onClick={() => setEditingItem({ id: 'first', editing: true })}
        >
          Edit first
        </button>

        <button
          type="button"
          className="min-h-11 underline"
          onClick={clearEditingItem}
        >
          Clear editing
        </button>

        <button
          type="button"
          className="min-h-11 underline"
          onClick={() => setKeyboardMode(!keyboardMode)}
        >
          Toggle keyboard
        </button>
      </div>
    </div>
  );
};

const meta = {
  title: 'Tierlist/TierBoardProvider',
  component: TierBoardProvider,
  args: { children: <StoreControls /> },
} satisfies Meta<typeof TierBoardProvider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Edit first' }));
    await expect(canvas.getByLabelText('Edited item')).toHaveTextContent(
      'first',
    );
    await userEvent.click(
      canvas.getByRole('button', { name: 'Toggle keyboard' }),
    );
    await expect(canvas.getByLabelText('Keyboard state')).toHaveTextContent(
      'on',
    );
    await userEvent.click(
      canvas.getByRole('button', { name: 'Clear editing' }),
    );
    await expect(canvas.getByLabelText('Edited item')).toHaveTextContent(
      'none',
    );
  },
};
