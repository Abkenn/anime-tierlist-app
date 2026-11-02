import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { layoutExportBoard } from '@/app/_lib/tierlist-export-layout';
import type { TierlistDocument } from '@/app/_lib/tierlist-sync';
import { PreviewBoardSurface } from './preview-board-surface';

it('keeps a loaded poster visible while another poster in the same tier loads', () => {
  const document: TierlistDocument = {
    version: 1,
    imageMode: 'natural',
    ranks: ['S'],
    items: (['S', 'A'] as const).map((rank) => ({
      id: rank,
      rank: 'S',
      label: `Anime ${rank}`,
      image: {
        src: `/poster-${rank}.jpg`,
        width: 400,
        height: 600,
        alt: rank,
      },
    })),
  };
  const markup = renderToStaticMarkup(
    <PreviewBoardSurface
      {...layoutExportBoard(document)}
      mode="natural"
      pendingIds={new Set(['S'])}
    />,
  );
  const parsed = new DOMParser().parseFromString(markup, 'text/html');
  expect(
    parsed
      .querySelector('image[href="/poster-S.jpg"]')
      ?.closest('g[opacity]')
      ?.getAttribute('opacity'),
  ).toBe('0');
  expect(
    parsed
      .querySelector('image[href="/poster-A.jpg"]')
      ?.closest('g[opacity]')
      ?.getAttribute('opacity'),
  ).toBe('1');
});

it('renders only visible poster sources from a large preview without any export PNG', () => {
  const document: TierlistDocument = {
    version: 1,
    imageMode: 'natural',
    ranks: ['S'],
    items: Array.from({ length: 2500 }, (_, index) => ({
      id: String(index),
      label: `Anime ${index}`,
      rank: 'S',
      image: {
        src: `/poster-${index}.jpg`,
        width: 400,
        height: 600,
        alt: `Anime ${index}`,
      },
    })),
  };
  const markup = renderToStaticMarkup(
    <PreviewBoardSurface
      {...layoutExportBoard(document)}
      mode="natural"
      visibleIds={new Set(['0', '1'])}
    />,
  );
  const parsed = new DOMParser().parseFromString(markup, 'text/html');
  expect(parsed.querySelectorAll('image')).toHaveLength(2);
  expect(markup).toContain('/poster-0.jpg');
  expect(markup).not.toContain('/poster-2.jpg');
  expect(markup).not.toContain('/api/tierlist-preview/');
});
