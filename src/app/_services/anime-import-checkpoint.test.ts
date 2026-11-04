import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import {
  clearAnimeImportCheckpoint,
  readAnimeImportCheckpoint,
  saveAnimeImportCheckpoint,
} from './anime-import-checkpoint';

it('persists private checkpoints separately for each seed and provider and expires old work', async () => {
  const checkpoint = {
    provider: 'mal' as const,
    username: 'Example',
    importedAt: Date.now(),
    catalog: [],
    posters: {},
    dimensions: {},
    entries: [],
    offset: 300,
    listComplete: false,
    complete: false,
  };
  await saveAnimeImportCheckpoint('first', checkpoint);
  expect((await readAnimeImportCheckpoint('first', 'mal'))?.offset).toBe(300);
  expect(await readAnimeImportCheckpoint('second', 'mal')).toBeUndefined();
  expect(await readAnimeImportCheckpoint('first', 'anilist')).toBeUndefined();
  await clearAnimeImportCheckpoint('first', 'mal');
  expect(await readAnimeImportCheckpoint('first', 'mal')).toBeUndefined();
  await saveAnimeImportCheckpoint('first', {
    ...checkpoint,
    importedAt: Date.now() - 86_400_001,
  });
  expect(await readAnimeImportCheckpoint('first', 'mal')).toBeUndefined();
});
