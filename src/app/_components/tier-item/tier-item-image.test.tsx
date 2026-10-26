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
  expect(cdn.match(/crossorigin="(?:anonymous)?"/giu)).toHaveLength(1);
  expect(render('https://custom.example/poster.jpg')).not.toMatch(
    /crossorigin/iu,
  );
});
