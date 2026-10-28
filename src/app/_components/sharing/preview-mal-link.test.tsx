import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

const resolve = vi.hoisted(() => vi.fn(async () => 28851));
vi.mock('@/app/_services/mal-anime.actions', () => ({
  resolveMalLink: resolve,
}));

import { PreviewMalLink } from './preview-mal-link';

it('opens known MAL entries safely without starting the poster drag', () => {
  const drag = vi.fn();
  render(
    <div onPointerDown={drag}>
      <PreviewMalLink
        item={{ id: 'mal-52991', label: 'Frieren', rank: 'S' }}
        style={{}}
      />
    </div>,
  );
  const link = screen.getByRole('link', {
    name: 'Open Frieren on MyAnimeList',
  });
  expect(link).toHaveAttribute('href', 'https://myanimelist.net/anime/52991');
  expect(link).toHaveAttribute('target', '_blank');
  expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  fireEvent.pointerDown(link);
  expect(drag).not.toHaveBeenCalled();
});

it('looks up custom labels lazily and preserves the same focused link element when ready', async () => {
  render(
    <PreviewMalLink
      item={{ id: 'custom-voice', label: 'A Silent Voice', rank: 'S' }}
      style={{}}
    />,
  );
  const link = screen.getByRole('link', {
    name: 'Unknown MAL link. Please add label',
  });
  expect(link).not.toHaveAttribute('href');
  expect(resolve).not.toHaveBeenCalled();
  fireEvent.focus(link);
  await waitFor(() =>
    expect(link).toHaveAttribute('href', 'https://myanimelist.net/anime/28851'),
  );
  expect(resolve).toHaveBeenCalledWith(['A Silent Voice']);
  expect(link).toHaveAttribute('aria-disabled', 'false');
});
