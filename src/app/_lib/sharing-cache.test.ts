import { expect, it, vi } from 'vitest';
import { createSharingCache } from './sharing-cache';

it('reuses published previews until the local revision changes without preparing a recovery seed', async () => {
  const cache = createSharingCache();
  const onPublish = vi.fn(async () => '/preview');
  const input = { revision: 1, onPublish };
  await Promise.all([cache.preview(input), cache.preview(input)]);
  await cache.preview(input);
  expect(onPublish).toHaveBeenCalledOnce();
  await cache.preview({ ...input, revision: 2 });
  expect(onPublish).toHaveBeenCalledTimes(2);
});

it('reuses a recovered server preview and discards it after edits', async () => {
  const cache = createSharingCache();
  const onPublish = vi.fn(async () => '/new');
  const onFindPreview = vi.fn(async () => '/existing');
  const input = { revision: 1, onPublish, onFindPreview };
  expect(await cache.find(input)).toBe('/existing');
  expect(await cache.preview(input)).toBe('/existing');
  expect(onPublish).not.toHaveBeenCalled();
  expect(await cache.preview({ ...input, revision: 2 })).toBe('/new');
});
