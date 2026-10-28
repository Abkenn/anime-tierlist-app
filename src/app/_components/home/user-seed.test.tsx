import { Popover } from '@base-ui/react/popover';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { expect, it, vi } from 'vitest';
import { UserSeed } from './user-seed';

const projectDownload = vi.hoisted(() => vi.fn());
vi.mock('@/app/_services/tierlist-download', () => ({
  downloadTierlistProject: projectDownload,
}));

const Fixture = ({
  onImport,
  onBackup,
  onReplaceDevice = async () => true,
  googleConnected = true,
}: {
  onImport: () => Promise<boolean>;
  onBackup: () => Promise<string>;
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
      onBackup={onBackup}
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
      onBackup={async () => ''}
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
  const onBackup = vi.fn(async () => 'b'.repeat(64));

  render(<Fixture onImport={onImport} onBackup={onBackup} />);
  expect(
    screen.queryByRole('textbox', { name: 'Your user seed' }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Show copy seed' }));
  await waitFor(() =>
    expect(screen.getByRole('textbox', { name: 'Backup seed' })).toHaveValue(
      'b'.repeat(64),
    ),
  );
  fireEvent.click(screen.getByRole('tab', { name: /^Import$/ }));
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

it('opens saving with Ctrl+S and saves a project copy without publishing a public preview', async () => {
  const onBackup = vi.fn(async () => 'd'.repeat(64));
  render(<Fixture onImport={async () => true} onBackup={onBackup} />);
  fireEvent.click(screen.getByRole('tab', { name: /^Import$/ }));
  fireEvent.keyDown(window, { code: 'KeyS', ctrlKey: true });
  expect(screen.getByRole('tab', { name: 'Save for later' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  fireEvent.click(screen.getByRole('button', { name: 'Save project file' }));
  await waitFor(() =>
    expect(projectDownload).toHaveBeenCalledWith('d'.repeat(64)),
  );
  expect(onBackup).toHaveBeenCalledOnce();
});
