import 'fake-indexeddb/auto';
import { act, renderHook, waitFor } from '@testing-library/react';
import { clear, createStore as createDatabaseStore, get } from 'idb-keyval';
import { Provider } from 'jotai';
import type { PropsWithChildren } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import type { LocalTierlist } from '@/app/_lib/local-tierlist';
import {
  activateAccountTierlist,
  activateImportedTierlist,
  loadLocalTierlist,
} from '@/app/_services/local-tierlist';
import { useTierlistAccount } from './use-tierlist-account';

const mocks = vi.hoisted(() => ({
  session: {
    data: null as { user: { id: string } } | null,
    isPending: false,
    error: null as Error | null,
  },
  connect: vi.fn(),
  readAccount: vi.fn(),
}));

vi.mock('@/app/_lib/auth-client', () => ({
  authClient: {
    useSession: () => mocks.session,
    signOut: vi.fn(),
  },
}));
vi.mock('@/app/_services/google-auth.actions', () => ({
  readGoogleTierlist: mocks.readAccount,
}));
vi.mock('@/app/_services/tierlist.actions', () => ({
  connectTierlist: mocks.connect,
  syncTierlist: vi.fn(),
  createShareSeed: vi.fn(),
  disconnectTierlist: vi.fn(),
  replaceAccountFromSeed: vi.fn(),
}));

const device: LocalTierlist = {
  version: 1,
  seed: 'a'.repeat(64),
  revision: 0,
  items: [{ id: 'device', label: 'Device list', rank: 'Watching' }],
  ranks: ['Watching'],
  imageMode: 'natural',
};
const accountKey = 'b'.repeat(64);
const remote = {
  ownerId: '17a123b1-0b05-4702-a749-965faee5a5d4',
  revision: 2,
  document: {
    ...device,
    items: [
      {
        id: 'private',
        label: 'Private account list',
        rank: 'Watching' as const,
      },
    ],
  },
};
const database = createDatabaseStore('anime-tierlist', 'drafts');
const wrapper = ({ children }: PropsWithChildren) => (
  <Provider>{children}</Provider>
);

beforeEach(async () => {
  await clear(database);
  localStorage.clear();
  vi.clearAllMocks();
  mocks.session = { data: null, isPending: false, error: null };
  mocks.connect.mockResolvedValue({ ok: true, value: remote });
  await loadLocalTierlist(device);
});

it('restores the device list after confirmed sign-out without syncing the account draft', async () => {
  await activateAccountTierlist(accountKey, remote);
  const { result } = renderHook(() => useTierlistAccount(), { wrapper });

  await waitFor(() => expect(result.current.storage.seed).toBe(device.seed));
  expect(result.current.storage.snapshot?.items).toEqual(device.items);
  expect(mocks.connect).not.toHaveBeenCalled();
  expect(
    (await get<LocalTierlist>(`profile:${accountKey}`, database))?.items,
  ).toEqual(remote.document.items);
});

it('keeps an offline account draft without syncing it and restores the device when sign-out is confirmed', async () => {
  await activateAccountTierlist(accountKey, remote);
  mocks.session.error = new Error('Network unavailable');
  const { result, rerender } = renderHook(() => useTierlistAccount(), {
    wrapper,
  });

  await waitFor(() => expect(result.current.storage.seed).toBe(accountKey));
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 450));
  });
  expect(mocks.connect).not.toHaveBeenCalled();
  expect(result.current.accountUnavailable).toBe(false);
  mocks.session = { data: null, isPending: false, error: null };
  rerender();

  await waitFor(() => expect(result.current.storage.seed).toBe(device.seed));
});

it('returns an old unmarked account profile to the device list after authorization is rejected', async () => {
  await activateImportedTierlist(accountKey, remote);
  mocks.connect.mockResolvedValue({
    ok: false,
    code: 'unauthorized',
    message: 'This tierlist requires Google sign-in.',
  });
  const { result } = renderHook(() => useTierlistAccount(), { wrapper });

  await waitFor(() => expect(result.current.storage.seed).toBe(device.seed));
  expect(mocks.connect).toHaveBeenCalledTimes(1);
  expect(result.current.storage.snapshot?.items).toEqual(device.items);
  expect(
    (await get<LocalTierlist>(`profile:${accountKey}`, database))?.items,
  ).toEqual(remote.document.items);
});

it('hides and restores an open account list when its session signs out', async () => {
  await activateAccountTierlist(accountKey, remote);
  mocks.session.data = { user: { id: 'google-user' } };
  mocks.readAccount.mockResolvedValue({
    profileKey: accountKey,
    displayName: 'Account',
    remote,
  });
  const { result, rerender } = renderHook(() => useTierlistAccount(), {
    wrapper,
  });

  await waitFor(() =>
    expect(result.current.status.verifyingIdentity).toBe(false),
  );
  expect(result.current.storage.seed).toBe(accountKey);
  mocks.session = { data: null, isPending: false, error: null };
  rerender();
  expect(result.current.accountUnavailable).toBe(true);

  await waitFor(() => expect(result.current.storage.seed).toBe(device.seed));
  expect(result.current.accountUnavailable).toBe(false);
  expect(result.current.storage.snapshot?.items).toEqual(device.items);
});

it('does not retry rejected authorization on a timer, focus, reconnect or manual retry', async () => {
  mocks.connect.mockResolvedValue({
    ok: false,
    code: 'unauthorized',
    message: 'This tierlist requires Google sign-in.',
  });
  const { result } = renderHook(() => useTierlistAccount(), { wrapper });

  await waitFor(() => expect(result.current.sync.status).toBe('unauthorized'));
  expect(result.current.sync.retryAt).toBeUndefined();
  vi.useFakeTimers();

  try {
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      window.dispatchEvent(new Event('online'));
      result.current.sync.retry();
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(mocks.connect).toHaveBeenCalledTimes(1);
    expect(result.current.sync.status).toBe('unauthorized');
  } finally {
    vi.useRealTimers();
  }
});
