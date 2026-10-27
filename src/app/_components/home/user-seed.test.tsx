import { Popover } from '@base-ui/react/popover';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { expect, it, vi } from 'vitest';
import { UserSeed } from './user-seed';

const Fixture = ({
  onImport,
  onShare,
  onReplaceDevice = async () => true,
  googleConnected = true,
}: {
  onImport: () => Promise<boolean>;
  onShare: () => Promise<string>;
  onReplaceDevice?: () => Promise<boolean>;
  googleConnected?: boolean;
}) => {
  const [handle] = useState(() => Popover.createHandle());
  const [open, setOpen] = useState(true);

  return (
    <UserSeed
      seed=""
      imported
      googleConnected={googleConnected}
      canSignIn
      busy={false}
      open={open}
      handle={handle}
      onOpenChange={setOpen}
      onImport={onImport}
      onShare={onShare}
      onUseDevice={async () => {}}
      onReplaceDevice={onReplaceDevice}
      onGoogleSignIn={async () => {}}
      onGoogleSignOut={async () => {}}
    />
  );
};

it('offers both local choices and confirms before adopting an imported copy', async () => {
  const onReplaceDevice = vi.fn(async () => true);
  render(
    <Fixture
      googleConnected={false}
      onImport={async () => true}
      onShare={async () => ''}
      onReplaceDevice={onReplaceDevice}
    />,
  );

  fireEvent.click(
    await screen.findByRole('button', { name: 'Replace local with this' }),
  );
  expect(
    screen.getByRole('button', { name: 'Go back to local', hidden: true }),
  ).toBeInTheDocument();
  expect(onReplaceDevice).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(onReplaceDevice).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole('button', { name: 'Replace local with this' }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Replace tierlist' }));
  await waitFor(() => expect(onReplaceDevice).toHaveBeenCalledOnce());
});

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
  const seedInput = screen.getByRole('textbox', { name: 'Seed to import' });
  fireEvent.change(seedInput, { target: { value: 'invalid-seed' } });
  expect(
    screen.getByRole('button', { name: 'Replace tierlist' }),
  ).toBeDisabled();
  await waitFor(() =>
    expect(screen.getByText('Enter a valid 64-character seed.')).toBeVisible(),
  );
  const form = seedInput.closest('form');
  if (!form) {
    throw new Error('Seed input must belong to its submission form.');
  }

  fireEvent.submit(form);
  await waitFor(() => expect(seedInput).not.toBeDisabled());
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  expect(onImport).not.toHaveBeenCalled();
  fireEvent.change(screen.getByRole('textbox', { name: 'Seed to import' }), {
    target: { value: 'c'.repeat(64) },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Replace tierlist' }));
  await screen.findByRole('alertdialog');
  expect(onImport).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(onImport).not.toHaveBeenCalled();
  await waitFor(() =>
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument(),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Replace tierlist' }));
  await screen.findByRole('alertdialog');
  const buttons = screen.getAllByRole('button', { name: 'Replace tierlist' });
  fireEvent.click(buttons[buttons.length - 1]);
  await waitFor(() =>
    expect(onImport).toHaveBeenCalledExactlyOnceWith('c'.repeat(64)),
  );
});
