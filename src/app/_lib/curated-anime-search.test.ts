import { describe, expect, it } from 'vitest';
import { curatedAnimeImages } from './curated-anime';
import { searchCuratedAnime } from './curated-anime-search';

const titles = (query: string) =>
  searchCuratedAnime(curatedAnimeImages, query).map(({ title }) => title);

describe('curated anime matching', () => {
  it('finds partial titles, romanized aliases and small typos', () => {
    ['Frieren', 'friren', 'sousou no friren', 'soso no frieren'].forEach(
      (query) => {
        expect(titles(query)).toContain("Frieren: Beyond Journey's End");
      },
    );
    expect(titles('tongari boshi')).toContain('Witch Hat Atelier');
    expect(titles('Na Honjaman')).toContain('Solo Leveling');
  });

  it('supports short aliases and numbers without fuzzy abbreviation noise', () => {
    expect(titles('JJK')).toEqual(['Jujutsu Kaisen']);
    expect(titles('86')).toEqual(['86 Eighty-Six']);
    expect(titles('chi')).toContain('Orb: On the Movements of the Earth');
    expect(titles('chi')).not.toContain('ERASED');
    expect(titles('Steins Gate')).toContain('Steins;Gate');
    expect(titles('unrelated nonexistent anime')).toEqual([]);
  });
});
