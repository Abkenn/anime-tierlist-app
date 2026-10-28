import { expect, it, vi } from 'vitest';

vi.mock('ky', () => ({
  default: {
    get: () => ({
      blob: async () => new Blob(['preview'], { type: 'image/png' }),
    }),
  },
}));

import { readPreviewHandoff, savePreviewHandoff } from './preview-handoff';

it('reuses only the matching local profile revision without replacing original image URLs', async () => {
  vi.stubGlobal(
    'URL',
    Object.assign(URL, {
      createObjectURL: vi.fn(() => 'blob:test-preview'),
      revokeObjectURL: vi.fn(),
    }),
  );
  const document = {
    version: 1 as const,
    imageMode: 'natural' as const,
    ranks: ['S' as const],
    items: [
      {
        id: 'one',
        label: 'One',
        rank: 'S' as const,
        image: {
          src: 'https://example.com/original.jpg',
          width: 100,
          height: 150,
          alt: 'One',
        },
      },
    ],
  };
  await savePreviewHandoff(document, 'local-seed', 4, 'a'.repeat(16));
  expect(
    readPreviewHandoff('local-seed', 4).get(document.items[0].image.src)?.src,
  ).toBe('blob:test-preview');
  expect(readPreviewHandoff('other-seed', 4).size).toBe(0);
  expect(readPreviewHandoff('local-seed', 5).size).toBe(0);
  expect(document.items[0].image.src).toBe('https://example.com/original.jpg');
  vi.unstubAllGlobals();
});
