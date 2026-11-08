import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { AnimeImport } from './anime-import';

const generate = vi.hoisted(() => vi.fn());
const metric = vi.hoisted(() =>
  vi.fn(async (_input: unknown) => ({ ok: true })),
);

vi.mock('@/app/_services/anime-import-queue.actions', () => ({
  pollAnimeImportQueue: metric,
}));

const readProfile = vi.hoisted(() => vi.fn(async () => ({})));
vi.mock('@/app/_services/run-anime-import', () => ({
  runAnimeImport: generate,
}));

it('reviews generated results before applying and requires explicit replacement confirmation', async () => {
  const document = {
    version: 1 as const,
    items: [{ id: 'mal-1', malId: 1, label: 'Test', rank: 'A' as const }],
    ranks: ['A' as const],
    imageMode: 'natural' as const,
  };
  generate.mockResolvedValue({
    document,
    series: [{ id: 1 }],
    completed: 3,
    skipped: 1,
  });
  const onApply = vi.fn(async () => {});
  const onApplied = vi.fn();
  render(
    <AnimeImport
      busy={false}
      seed={'a'.repeat(64)}
      revision={7}
      hasItems
      onApply={onApply}
      onApplied={onApplied}
    />,
  );
  fireEvent.change(
    screen.getByRole('textbox', { name: 'Public MAL username' }),
    { target: { value: 'Abkenn' } },
  );
  fireEvent.click(screen.getByRole('button', { name: 'Generate tierlist' }));
  const apply = await screen.findByRole('button', {
    name: 'Use generated tierlist',
  });
  expect(onApply).not.toHaveBeenCalled();
  expect(metric).not.toHaveBeenCalled();
  expect(apply).toBeDisabled();
  fireEvent.click(
    screen.getByRole('checkbox', { name: /Replace my current tierlist/u }),
  );
  fireEvent.click(apply);
  await waitFor(() => expect(onApplied).toHaveBeenCalledOnce());
  expect(onApply).toHaveBeenCalledWith(document, {
    seed: 'a'.repeat(64),
    revision: 7,
  });
  expect(metric).toHaveBeenCalledWith({
    seed: 'a'.repeat(64),
    ticket: expect.any(String),
    provider: 'mal',
    event: 'applied',
  });
  expect(
    screen.getByRole('textbox', { name: 'Public MAL username' }),
  ).toHaveValue('Abkenn');
  expect(
    screen.queryByText(
      /episode-weighted|Equal scores sort|Oversized rows|excluded/u,
    ),
  ).not.toBeInTheDocument();
});

vi.mock('@/app/_services/local-tierlist', () => ({
  readLocalTierlist: readProfile,
}));

it('switches providers, retains separate usernames and locks the selector during generation', async () => {
  const pending =
    Promise.withResolvers<
      Awaited<
        ReturnType<
          typeof import('@/app/_services/generate-anime-tierlist').generateAnimeTierlist
        >
      >
    >();
  generate.mockImplementationOnce(() => pending.promise);
  render(
    <AnimeImport
      busy={false}
      seed={'a'.repeat(64)}
      revision={0}
      hasItems={false}
      onApply={async () => {}}
      onApplied={() => {}}
    />,
  );
  fireEvent.change(
    screen.getByRole('textbox', { name: 'Public MAL username' }),
    { target: { value: 'MalName' } },
  );
  fireEvent.click(screen.getByRole('radio', { name: 'AniList' }));
  fireEvent.change(
    screen.getByRole('textbox', { name: 'Public AniList username' }),
    { target: { value: 'AnilistName' } },
  );
  fireEvent.click(screen.getByRole('radio', { name: 'MAL' }));
  expect(screen.getByRole('textbox')).toHaveValue('MalName');
  fireEvent.click(screen.getByRole('radio', { name: 'AniList' }));
  expect(screen.getByRole('textbox')).toHaveValue('AnilistName');
  fireEvent.click(screen.getByRole('button', { name: 'Generate tierlist' }));
  await waitFor(() =>
    expect(generate).toHaveBeenLastCalledWith(
      expect.objectContaining({ provider: 'anilist', username: 'AnilistName' }),
    ),
  );
  expect(screen.getByRole('radio', { name: 'MAL' })).toBeDisabled();
  pending.resolve({
    document: { version: 1, ranks: ['A'], items: [], imageMode: 'natural' },
    series: [],
    completed: 0,
    skipped: 0,
    unavailablePosters: 0,
  });
  await screen.findByRole('button', { name: 'Use generated tierlist' });
});

vi.mock('@/app/_services/anime-import-checkpoint', () => ({
  readAnimeImportCheckpoint: vi.fn(async () => undefined),
  clearAnimeImportCheckpoint: vi.fn(async () => {}),
}));

it('restores provider and both usernames from the current profile after remounting', async () => {
  readProfile.mockResolvedValue({
    animeImports: {
      mal: { username: 'MalAccount', importedAt: 1 },
      anilist: { username: 'AniAccount', importedAt: 2 },
    },
  });
  const mount = () =>
    render(
      <AnimeImport
        busy={false}
        seed={'b'.repeat(64)}
        revision={0}
        hasItems
        onApply={async () => {}}
        onApplied={() => {}}
      />,
    );
  const first = mount();
  await waitFor(() =>
    expect(
      screen.getByRole('textbox', { name: 'Public AniList username' }),
    ).toHaveValue('AniAccount'),
  );
  expect(screen.getByRole('radio', { name: 'AniList' })).toBeChecked();
  fireEvent.click(screen.getByRole('radio', { name: 'MAL' }));
  expect(screen.getByRole('textbox')).toHaveValue('MalAccount');
  first.unmount();
  mount();
  await waitFor(() =>
    expect(
      screen.getByRole('textbox', { name: 'Public AniList username' }),
    ).toHaveValue('AniAccount'),
  );
  expect(readProfile).toHaveBeenCalledWith('b'.repeat(64));
  readProfile.mockResolvedValue({});
});
