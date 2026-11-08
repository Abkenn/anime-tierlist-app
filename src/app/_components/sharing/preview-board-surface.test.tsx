import { render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { layoutExportBoard } from '@/app/_lib/tierlist-export-layout';
import type { TierlistDocument } from '@/app/_lib/tierlist-sync';
import { PreviewBoardSurface } from './preview-board-surface';

it('keeps a visible poster and its clipping identity stable when earlier posters leave the viewport', () => {
  const document: TierlistDocument = {
    version: 1,
    imageMode: 'natural',
    ranks: ['S'],
    items: ['first', 'second'].map((id) => ({
      id,
      label: id,
      rank: 'S',
      image: { src: `/${id}.jpg`, width: 100, height: 150, alt: id },
    })),
  };
  const board = layoutExportBoard(document);
  const { container, rerender } = render(
    <PreviewBoardSurface
      {...board}
      mode="natural"
      visibleIds={new Set(['first', 'second'])}
    />,
  );
  const image = container.querySelector('image[href="/second.jpg"]');
  const clip = image?.closest('g[clip-path]')?.getAttribute('clip-path');
  rerender(
    <PreviewBoardSurface
      {...board}
      mode="natural"
      visibleIds={new Set(['second'])}
    />,
  );
  expect(container.querySelector('image[href="/second.jpg"]')).toBe(image);
  expect(image?.closest('g[clip-path]')?.getAttribute('clip-path')).toBe(clip);
});

it('lets posters paint without waiting for React loading-state updates', () => {
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
      priorityIds={new Set(['S'])}
    />,
  );
  const parsed = new DOMParser().parseFromString(markup, 'text/html');
  expect(
    parsed
      .querySelector('image[href="/poster-S.jpg"]')
      ?.getAttribute('fetchpriority'),
  ).toBe('high');
  expect(
    parsed
      .querySelector('image[href="/poster-A.jpg"]')
      ?.hasAttribute('fetchpriority'),
  ).toBe(false);
  expect(
    parsed
      .querySelector('image[href="/poster-S.jpg"]')
      ?.closest('g[opacity]')
      ?.getAttribute('opacity'),
  ).toBeUndefined();
  expect(
    parsed
      .querySelector('image[href="/poster-A.jpg"]')
      ?.closest('g[opacity]')
      ?.getAttribute('opacity'),
  ).toBeUndefined();
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
        src: `/curated/poster-${index}.jpg`,
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
  expect(parsed.querySelector('image')?.getAttribute('href')).toContain(
    '/_next/image?',
  );
  expect(markup).toContain('poster-0.jpg');
  expect(markup).not.toContain('poster-2.jpg');
  expect(markup).not.toContain('/api/tierlist-preview/');
  const exported = renderToStaticMarkup(
    <PreviewBoardSurface {...layoutExportBoard(document)} mode="natural" />,
  );
  expect(exported).toContain('href="/curated/poster-0.jpg"');
  expect(exported).not.toContain('/_next/image?');
});
