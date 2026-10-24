import { Popover } from '@base-ui/react/popover';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { expect, it, vi } from 'vitest';
import { UserSeed } from './user-seed';

const Fixture = ({
  onImport,
  onShare,
}: {
  onImport: () => Promise<boolean>;
  onShare: () => Promise<string>;
}) => {
  const [handle] = useState(() => Popover.createHandle());
  const [open, setOpen] = useState(true);

  return (
    <UserSeed
      seed=""
      imported
      googleConnected
      canSignIn
      busy={false}
      open={open}
      handle={handle}
      onOpenChange={setOpen}
      onImport={onImport}
      onShare={onShare}
      onUseDevice={async () => {}}
      onGoogleSignIn={async () => {}}
      onGoogleSignOut={async () => {}}
    />
  );
};

it('offers a separate share seed and requires confirmation before replacing an account list', async () => {
  const onImport = vi.fn(async () => true);
  const onShare = vi.fn(async () => 'b'.repeat(64));

  render(<Fixture onImport={onImport} onShare={onShare} />);
  expect(
    screen.queryByRole('textbox', { name: 'Your user seed' }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Create share seed' }));
  await waitFor(() =>
    expect(screen.getByRole('textbox', { name: 'Share seed' })).toHaveValue(
      'b'.repeat(64),
    ),
  );
  fireEvent.change(screen.getByRole('textbox', { name: 'Seed to import' }), {
    target: { value: 'c'.repeat(64) },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Replace tierlist' }));
  expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  expect(onImport).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(onImport).not.toHaveBeenCalled();
  await waitFor(() =>
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument(),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Replace tierlist' }));
  const buttons = screen.getAllByRole('button', { name: 'Replace tierlist' });
  fireEvent.click(buttons[buttons.length - 1]);
  await waitFor(() =>
    expect(onImport).toHaveBeenCalledExactlyOnceWith('c'.repeat(64)),
  );
});
