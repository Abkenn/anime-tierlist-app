import { expect, it, vi } from 'vitest';

const add = vi.hoisted(() => vi.fn());
vi.mock('@/app/_components/ui/toast', () => ({ toast: { add } }));

import { copyPreviewLink, watchPreviewClipboard } from './preview-clipboard';

it('copies during the click but waits for the preview content to mount before showing confirmation', async () => {
  sessionStorage.clear();
  window.history.replaceState(null, '', '/');
  const writeText = vi.fn(async () => {});
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
  await copyPreviewLink('http://localhost/preview', true);
  expect(writeText).toHaveBeenCalledWith('http://localhost/preview');
  expect(add).not.toHaveBeenCalled();
  window.history.replaceState(null, '', '/preview');
  const dispose = watchPreviewClipboard();
  expect(add).toHaveBeenCalledWith({
    title: 'Preview link copied to clipboard',
    timeout: 5000,
  });
  dispose();
  watchPreviewClipboard()();
  expect(add).toHaveBeenCalledOnce();
  window.history.replaceState(null, '', '/');
});
