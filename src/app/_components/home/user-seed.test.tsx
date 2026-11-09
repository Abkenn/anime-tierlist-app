import { Popover } from '@base-ui/react/popover';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { type ComponentProps, useState } from 'react';
import { expect, it, vi } from 'vitest';
import type { generateAnimeTierlist } from '@/app/_services/generate-anime-tierlist';
import { UserSeed } from './user-seed';

const malGeneration = vi.hoisted(() => vi.fn());
vi.mock('@/app/_services/anime-import-queue.actions', () => ({
  pollAnimeImportQueue: vi.fn(async () => ({
    ok: true,
    value: { position: 0 },
  })),
}));

vi.mock('@/app/_services/run-anime-import', () => ({
  runAnimeImport: malGeneration,
}));

const projectDownload = vi.hoisted(() => vi.fn());
vi.mock('@/app/_services/tierlist-download', () => ({
  downloadTierlistProject: projectDownload,
}));

const Fixture = ({
  onImport,
  onBackup,
  onReplaceDevice = async () => true,
  googleConnected = true,
  animeImport,
}: {
  onImport: () => Promise<boolean>;
  onBackup: () => Promise<string>;
  onReplaceDevice?: () => Promise<boolean>;
  googleConnected?: boolean;
  animeImport?: ComponentProps<typeof UserSeed>['animeImport'];
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
      animeImport={animeImport}
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

it('keeps MAL generation, username and results alive while switching tabs and closing the popover', async () => {
  const pending =
    Promise.withResolvers<Awaited<ReturnType<typeof generateAnimeTierlist>>>();
  let signal: AbortSignal | undefined;
  malGeneration.mockImplementationOnce(
    async (input: Parameters<typeof generateAnimeTierlist>[0]) => {
      signal = input.signal;
      input.onProgress({ phase: 'Checking seasons', percent: 42 });

      return pending.promise;
    },
  );
  const document = {
    version: 1 as const,
    items: [{ id: 'mal-1', malId: 1, label: 'Test', rank: 'A' as const }],
    ranks: ['A' as const],
    imageMode: 'natural' as const,
    posterSize: 'dynamic' as const,
  };
  const onApply = vi.fn(async () => {});
  render(
    <Fixture
      onImport={async () => true}
      onBackup={async () => ''}
      googleConnected={false}
      animeImport={{
        seed: 'a'.repeat(64),
        revision: 0,
        hasItems: false,
        onApply,
      }}
    />,
  );
  fireEvent.click(screen.getByRole('tab', { name: 'MAL/AniList' }));
  fireEvent.change(
    await screen.findByRole('textbox', { name: 'Public MAL username' }),
    { target: { value: 'Abkenn' } },
  );
  fireEvent.click(screen.getByRole('button', { name: 'Generate tierlist' }));
  expect(
    await screen.findByRole('progressbar', { name: 'Checking seasons' }),
  ).toHaveAttribute('aria-valuenow', '42');
  fireEvent.click(screen.getByRole('tab', { name: 'Save for later' }));
  fireEvent.click(screen.getByRole('tab', { name: 'MAL/AniList' }));
  expect(
    screen.getByRole('progressbar', { name: 'Checking seasons' }),
  ).toHaveAttribute('aria-valuenow', '42');
  fireEvent.click(screen.getByRole('button', { name: 'Save & import' }));
  await waitFor(() =>
    expect(
      screen.queryByRole('dialog', { name: 'Save and import tierlist' }),
    ).not.toBeInTheDocument(),
  );
  expect(signal?.aborted).toBe(false);
  await act(async () => {
    pending.resolve({
      document,
      series: [
        {
          id: 1,
          title: 'Test',
          score: 8,
          episodes: 12,
          seasons: 1,
          seasonIds: [1],
        },
      ],
      completed: 1,
      skipped: 0,
      unavailablePosters: 0,
    });
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save & import' }));
  expect(
    await screen.findByRole('button', { name: 'Use generated tierlist' }),
  ).toBeVisible();
  expect(
    screen.getByRole('textbox', { name: 'Public MAL username' }),
  ).toHaveValue('Abkenn');
  expect(malGeneration).toHaveBeenCalledOnce();
  expect(onApply).not.toHaveBeenCalled();
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

vi.mock('@/app/_services/local-tierlist', () => ({
  readLocalTierlist: vi.fn(async () => ({})),
}));

vi.mock('@/app/_services/anime-import-checkpoint', () => ({
  readAnimeImportCheckpoint: vi.fn(async () => undefined),
  clearAnimeImportCheckpoint: vi.fn(async () => {}),
}));
