import { fireEvent, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import {
  pendingProjectKey,
  projectDropEvent,
} from '@/app/_lib/project-session';
import { useProjectDrop } from './use-project-drop';

const mocks = vi.hoisted(() => ({
  read: vi.fn(),
  push: vi.fn(),
  toast: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/app/_components/ui/toast', () => ({ toast: { add: mocks.toast } }));
vi.mock('@/app/_services/tierlist-download', () => ({
  readTierlistProject: mocks.read,
}));

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  sessionStorage.clear();
  window.history.replaceState(null, '', '/');
  mocks.read.mockResolvedValue('c'.repeat(64));
});

const drop = (name = 'tierlist.anime') =>
  fireEvent.drop(window, {
    dataTransfer: { types: ['Files'], files: [new File(['{}'], name)] },
  });

it('keeps the drop hint visible across nested targets and clears it on exit or drop', () => {
  const { result } = renderHook(useProjectDrop);
  const transfer = { dataTransfer: { types: ['Files'] } };
  fireEvent.dragEnter(window, transfer);
  fireEvent.dragEnter(window, transfer);
  fireEvent.dragLeave(window, transfer);
  expect(result.current).toBe(true);
  fireEvent.dragLeave(window, transfer);
  expect(result.current).toBe(false);
  fireEvent.dragEnter(window, transfer);
  drop('other.png');
  expect(result.current).toBe(false);
});

it('opens a project dropped anywhere on home without a picker or seed in the URL', async () => {
  const receive = vi.fn();
  window.addEventListener(projectDropEvent, receive, { once: true });
  renderHook(useProjectDrop);
  drop();
  await waitFor(() => expect(receive).toHaveBeenCalledOnce());
  expect(sessionStorage.getItem(pendingProjectKey)).toBe('c'.repeat(64));
  expect(window.location.search).toBe('');
  expect(mocks.push).not.toHaveBeenCalled();
});

it('reserves a tab during the drop gesture and hands the seed to that tab only', async () => {
  window.history.replaceState(null, '', '/abcd1234abcd1234');
  const tabStorage = new Map<string, string>();
  const tab = {
    sessionStorage: {
      setItem: (key: string, value: string) => tabStorage.set(key, value),
      removeItem: (key: string) => tabStorage.delete(key),
    },
    location: { replace: vi.fn() },
    close: vi.fn(),
    opener: window,
  };
  vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);
  const deferred = Promise.withResolvers<string>();
  mocks.read.mockReturnValue(deferred.promise);
  renderHook(useProjectDrop);
  drop();
  expect(window.open).toHaveBeenCalledWith('about:blank', '_blank');
  deferred.resolve('d'.repeat(64));
  await waitFor(() =>
    expect(tab.location.replace).toHaveBeenCalledWith(
      new URL('/', window.location.origin).href,
    ),
  );
  expect(tabStorage.get(pendingProjectKey)).toBe('d'.repeat(64));
  expect(sessionStorage.getItem(pendingProjectKey)).toBeNull();
  expect(tab.opener).toBeNull();
});

it('rejects unsupported files without navigating or touching the current list', async () => {
  renderHook(useProjectDrop);
  drop('other.png');
  await waitFor(() => expect(mocks.toast).toHaveBeenCalled());
  expect(mocks.read).not.toHaveBeenCalled();
  expect(sessionStorage.getItem(pendingProjectKey)).toBeNull();
});
