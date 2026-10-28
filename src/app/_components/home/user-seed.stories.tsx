import { Popover } from '@base-ui/react/popover';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, waitFor, within } from 'storybook/test';
import { UserSeed } from './user-seed';

const AccountControls = () => {
  const [handle] = useState(() => Popover.createHandle());
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-96 items-start flex-wrap gap-4 p-4 text-xs">
      <p>
        Changes saved in{' '}
        <span className="font-medium text-foreground">Example (Google)</span>
      </p>
      <UserSeed
        seed=""
        imported={false}
        busy={false}
        open={open}
        handle={handle}
        onOpenChange={setOpen}
        googleConnected
        canSignIn
        onImport={async () => false}
        onBackup={async () => 'a'.repeat(64)}
        onUseDevice={async () => {}}
        onReplaceDevice={async () => true}
        onGoogleSignIn={async () => {}}
        onGoogleSignOut={async () => {}}
      />
    </div>
  );
};

const meta = {
  title: 'Home/Account controls',
  component: AccountControls,
  render: () => <AccountControls />,
} satisfies Meta<typeof AccountControls>;
export default meta;
export const DesktopAndMobile: StoryObj<typeof meta> = {
  play: async ({ canvas, canvasElement, userEvent }) => {
    const account = canvas.getByRole('button', { name: 'Save & import' });
    expect(getComputedStyle(account).textDecorationLine).toBe('underline');

    await userEvent.click(account);
    const popup = await within(
      canvasElement.ownerDocument.body,
    ).findByLabelText('Save and import tierlist');
    await waitFor(() => expect(getComputedStyle(popup).opacity).toBe('1'));
    await userEvent.keyboard('{Escape}');
  },
};
