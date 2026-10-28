import { expect, it } from 'vitest';
import { knownMalId, malLookupQueries, selectMalCandidate } from './mal-anime';
import { tierlistDocumentSchema } from './tierlist-sync';

const base = { id: 'custom', label: 'Unknown', rank: 'S' as const };
it('keeps API metadata, legacy MAL IDs and curated season-one links usable on existing boards', () => {
  expect(knownMalId({ ...base, malId: 52991 })).toBe(52991);
  expect(knownMalId({ ...base, id: 'mal-52991' })).toBe(52991);
  expect(
    knownMalId({ ...base, id: 'curated-frieren-beyond-journey-s-end' }),
  ).toBe(52991);
  expect(knownMalId({ ...base, label: 'Frieren' })).toBe(52991);
  expect(knownMalId({ ...base, label: 'Frieren Season 2' })).toBeUndefined();
  expect(
    tierlistDocumentSchema.parse({
      version: 1,
      items: [{ ...base, malId: 52991 }],
      ranks: ['S'],
      imageMode: 'natural',
    }).items[0].malId,
  ).toBe(52991);
});

it('uses custom text after an unknown or insufficient label without losing a requested season', () => {
  const title = {
    text: 'Oshi no Ko',
    wrap: true,
    position: 'bottom' as const,
    color: '#ffffff' as const,
  };
  expect(malLookupQueries({ ...base, title })).toEqual(['Oshi no Ko']);
  expect(
    malLookupQueries({ ...base, label: 'Oshi no Ko Season 2', title }),
  ).toEqual(['Oshi no Ko Season 2']);
  expect(malLookupQueries(base)).toEqual([]);
});

it('selects the requested season, tolerates one small typo and refuses loose or ambiguous matches', () => {
  const first = {
    mal_id: 52034,
    title: 'Oshi no Ko',
    title_english: '[Oshi No Ko]',
  };
  const second = {
    mal_id: 57635,
    title: 'Oshi no Ko 2nd Season',
    title_english: '[Oshi No Ko] Season 2',
    title_synonyms: ['Oshi no Ko'],
  };
  expect(selectMalCandidate('Oshi no Ko Season 2', [first, second])).toBe(
    57635,
  );
  expect(selectMalCandidate('Oshi no Ko', [second, first])).toBe(52034);
  expect(selectMalCandidate('Oshi no Lo', [second, first])).toBe(52034);
  expect(selectMalCandidate('Oshi', [first])).toBeNull();
  expect(selectMalCandidate('Oshi no Ko Season 3', [first, second])).toBeNull();
  expect(
    selectMalCandidate('Oshi no Ko', [first, { ...first, mal_id: 999 }]),
  ).toBeNull();
  expect(
    selectMalCandidate('Oshi no Ko', [
      {
        mal_id: 999,
        title: 'Oshi no Ko Recap',
        title_synonyms: ['Oshi no Ko'],
      },
    ]),
  ).toBeNull();
  expect(
    selectMalCandidate('One Piece', [
      {
        mal_id: 999,
        title: 'One Piece: Episode of Example',
        title_synonyms: ['One Piece'],
      },
    ]),
  ).toBeNull();
});
