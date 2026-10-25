import { Popover } from '@base-ui/react/popover';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useRef, useState } from 'react';
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
          className="cursor-pointer underline"
        >
          Example (Google)
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
export const DesktopAndMobile: StoryObj<typeof meta> = {};
