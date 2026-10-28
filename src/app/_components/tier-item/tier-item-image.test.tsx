import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { TierItemImage } from './tier-item-image';

it('renders a prioritized custom-ratio poster without React DOM warnings', () => {
  const error = vi.spyOn(console, 'error').mockImplementation(() => {});

  try {
    const markup = renderToStaticMarkup(
      <TierItemImage
        image={{ src: '/poster.jpg', width: 600, height: 900, alt: 'Poster' }}
        mode="natural"
        crop={{ x: 0.5, y: 0.5 }}
        priority
      />,
    );

    expect(markup).toContain('fetchPriority="high"');
    expect(error).not.toHaveBeenCalled();
  } finally {
    error.mockRestore();
  }
});

it('uses anonymous CORS on CDN posters while preserving custom URLs', () => {
  const render = (src: string) =>
    renderToStaticMarkup(
      <TierItemImage
        image={{ src, width: 600, height: 900, alt: 'Poster' }}
        mode="natural"
        crop={{ x: 0.5, y: 0.5 }}
        priority
      />,
    );

  const cdn = render('https://cdn.myanimelist.net/images/anime/poster.jpg');
  const document = new DOMParser().parseFromString(cdn, 'text/html');
  const poster = document.querySelector('svg image');
  const preload = document.querySelector('link[rel="preload"][as="image"]');

  expect(poster?.getAttribute('crossorigin')).toBe('anonymous');
  expect(preload).not.toBeNull();
  expect(preload?.getAttribute('crossorigin')).toMatch(/^(anonymous)?$/u);
  expect(preload?.getAttribute('href')).toBe(poster?.getAttribute('href'));
  expect(preload?.getAttribute('fetchpriority')).toBe('high');
  expect(render('https://custom.example/poster.jpg')).not.toMatch(
    /crossorigin/iu,
  );
});
