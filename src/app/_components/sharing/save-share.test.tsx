import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { SaveShare } from './save-share';

const downloads = vi.hoisted(() => ({
  project: vi.fn(),
  png: vi.fn(async () => 0),
}));
vi.mock('@/app/_services/tierlist-download', () => ({
  downloadTierlistProject: downloads.project,
  downloadTierlistPng: downloads.png,
}));

it('opens with Ctrl+S, prepares the seed, prepares the preview automatically, and downloads the selected format', async () => {
  const document = {
    version: 1 as const,
    items: [],
    ranks: ['Watching' as const],
    imageMode: 'natural' as const,
  };
  const share = {
    seed: 'b'.repeat(64),
    ownerId: 'owner',
    revision: 1,
    document,
  };
  const prepare = vi.fn(async () => share);
  const publish = vi.fn(async () => 'https://example.com/abcd1234abcd1234');
  render(
    <SaveShare
      document={document}
      disabled={false}
      onPrepare={prepare}
      onPublish={publish}
    />,
  );
  fireEvent.keyDown(window, { code: 'KeyS', ctrlKey: true });
  expect(
    await screen.findByRole('textbox', { name: 'Tierlist seed' }),
  ).toHaveValue(share.seed);
  expect(prepare).toHaveBeenCalledOnce();
  const preview = await screen.findByRole('link', { name: 'Open Preview' });
  expect(publish).toHaveBeenCalledOnce();
  expect(preview).toHaveAttribute(
    'href',
    'https://example.com/abcd1234abcd1234',
  );
  expect(preview).not.toHaveAttribute('target');
  fireEvent.click(screen.getByRole('button', { name: 'Save project' }));
  await waitFor(() =>
    expect(downloads.project).toHaveBeenCalledWith(share.seed),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Download as PNG' }));
  await waitFor(() => expect(downloads.png).toHaveBeenCalledWith(document));
});
