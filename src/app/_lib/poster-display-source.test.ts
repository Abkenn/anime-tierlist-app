import { expect, it } from 'vitest';
import { posterDisplaySource } from './poster-display-source';

it('optimizes MAL uploaded posters while leaving unrelated external URLs untouched', () => {
  const source =
    'https://cdn.myanimelist.net/s/common/uploaded_files/poster.jpeg';
  const optimized = new URL(posterDisplaySource(source), 'https://example.com');
  expect(optimized.pathname).toBe('/_next/image');
  expect(optimized.searchParams.get('url')).toBe(source);
  expect(optimized.searchParams.get('w')).toBe('256');
  expect(posterDisplaySource('https://example.com/poster.jpg')).toBe(
    'https://example.com/poster.jpg',
  );
  expect(
    posterDisplaySource('https://cdn.myanimelist.net/other/poster.jpg'),
  ).toBe('https://cdn.myanimelist.net/other/poster.jpg');
});
