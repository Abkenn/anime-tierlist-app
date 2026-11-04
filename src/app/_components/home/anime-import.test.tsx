import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { AnimeImport } from './anime-import';

const generate = vi.hoisted(() => vi.fn());
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
  readLocalTierlist: vi.fn(async () => ({})),
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
