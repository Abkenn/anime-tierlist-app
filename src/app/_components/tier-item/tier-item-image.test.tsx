import { render, screen, waitFor } from '@testing-library/react';
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
  expect(preload?.getAttribute('href')).toBe(poster?.getAttribute('href'));
  expect(preload?.getAttribute('crossorigin')).toBe('');
  expect(preload?.getAttribute('fetchpriority')).toBe('high');
  expect(poster?.getAttribute('fetchpriority')).toBe('high');
  expect(render('https://custom.example/poster.jpg')).not.toMatch(
    /crossorigin/iu,
  );
});

it('reveals cached natural posters after remount even without an SVG load event', async () => {
  const NativeImage = window.Image;
  const imageConstructor = vi.spyOn(window, 'Image').mockImplementation(
    class extends NativeImage {
      constructor() {
        super();
        Object.defineProperties(this, {
          complete: { value: true },
          naturalWidth: { value: 600 },
        });
      }
    },
  );
  const onReady = vi.fn();
  const mount = () =>
    render(
      <TierItemImage
        image={{
          src: '/cached.jpg',
          width: 600,
          height: 900,
          alt: 'Cached poster',
        }}
        mode="natural"
        crop={{ x: 0.5, y: 0.5 }}
        onReady={onReady}
      />,
    );
  try {
    const first = mount();
    await waitFor(() =>
      expect(
        screen.getByRole('img', { name: 'Cached poster' }),
      ).not.toHaveClass('invisible'),
    );
    expect(first.container.querySelector('[aria-busy="true"]')).toBeNull();
    first.unmount();
    const second = mount();
    await waitFor(() =>
      expect(
        screen.getByRole('img', { name: 'Cached poster' }),
      ).not.toHaveClass('invisible'),
    );
    expect(second.container.querySelector('[aria-busy="true"]')).toBeNull();
    expect(onReady).toHaveBeenCalledTimes(2);
    second.unmount();
  } finally {
    imageConstructor.mockRestore();
  }
});
