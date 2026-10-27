import { Popover } from '@base-ui/react/popover';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useRef, useState } from 'react';
import { expect, waitFor, within } from 'storybook/test';
import { TerminalText } from '@/app/_components/shell/terminal-text';
import { UserSeed } from './user-seed';

const AccountControls = () => {
  const [handle] = useState(() => Popover.createHandle());
  const [open, setOpen] = useState(false);
  const statusAnchor = useRef<HTMLButtonElement>(null);

  return (
    <div className="flex min-h-96 items-start justify-between gap-4 p-4 text-xs">
      <p>
        Changes saved in{' '}
        <Popover.Trigger
          handle={handle}
          ref={statusAnchor}
          className="cursor-pointer font-medium text-foreground underline decoration-current/70 underline-offset-4 transition-[color,text-decoration-color,opacity] hover:decoration-current active:opacity-60"
        >
          <TerminalText text="Example (Google)" />
        </Popover.Trigger>
      </p>
      <UserSeed
        seed=""
        imported={false}
        busy={false}
        open={open}
        handle={handle}
        onOpenChange={setOpen}
        statusAnchor={statusAnchor}
        googleConnected
        canSignIn
        onImport={async () => false}
        onShare={async () => 'a'.repeat(64)}
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
    const account = canvas.getByRole('button', { name: 'Example (Google)' });
    const visible = account.querySelector('span[aria-hidden="true"]');
    expect(visible).not.toBeNull();
    expect(getComputedStyle(visible as Element).textDecorationLine).toBe(
      'underline',
    );

    await userEvent.click(account);
    const popup = await within(
      canvasElement.ownerDocument.body,
    ).findByLabelText('Sign in and user seed');
    await waitFor(() => expect(getComputedStyle(popup).opacity).toBe('1'));
    await userEvent.keyboard('{Escape}');
  },
};
