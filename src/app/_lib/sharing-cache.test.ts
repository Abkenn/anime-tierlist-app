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
