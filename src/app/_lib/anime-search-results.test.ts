import { expect, it } from 'vitest';
import { blendAnimeSearchResults } from './anime-search-results';

const result = (id: string) => ({ id, title: id, imageUrl: `/${id}.jpg` });

it('puts curated images after fetched choices, including small and empty result sets', () => {
  [0, 1, 2, 3, 5, 20].forEach((count) => {
    const fetched = Array.from({ length: count }, (_, index) =>
      result(`fetched-${index}`),
    );
    const blended = blendAnimeSearchResults([fetched], [result('curated')]);
    expect(blended.findIndex((item) => item.id === 'curated')).toBe(
      Math.min(4, count),
    );
    expect(blended.filter((item) => item.id !== 'curated')).toEqual(fetched);
  });
});

it('preserves the first-page placement when another page arrives and deduplicates fetched IDs', () => {
  const first = [result('one'), result('two')];
  const curated = [result('curated')];
  const before = blendAnimeSearchResults([first], curated);
  expect(blendAnimeSearchResults([[], first], curated)).toEqual(before);
  expect(
    blendAnimeSearchResults(
      [first, [result('three'), result('four')]],
      curated,
    ).slice(0, before.length),
  ).toEqual(before);
  expect(blendAnimeSearchResults([first], [first[0]])).toEqual(first);
});
