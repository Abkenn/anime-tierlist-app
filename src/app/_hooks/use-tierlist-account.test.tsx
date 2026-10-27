import 'fake-indexeddb/auto';
import { act, renderHook, waitFor } from '@testing-library/react';
import { clear, createStore as createDatabaseStore, get } from 'idb-keyval';
import { Provider } from 'jotai';
import type { PropsWithChildren } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import type { LocalTierlist } from '@/app/_lib/local-tierlist';
import {
  pendingProjectKey,
  readProjectSession,
} from '@/app/_lib/project-session';
import { tierlistDocumentSchema } from '@/app/_lib/tierlist-sync';
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
  refetch: vi.fn(),
  connect: vi.fn(),
  readAccount: vi.fn(),
  replaceAccount: vi.fn(),
}));

vi.mock('@/app/_lib/auth-client', () => ({
  authClient: {
    useSession: () => ({ ...mocks.session, refetch: mocks.refetch }),
    signOut: vi.fn(),
  },
}));
vi.mock('@/app/_services/google-auth.actions', () => ({
  readGoogleTierlist: mocks.readAccount,
}));
vi.mock('@/app/_services/tierlist-share.actions', () => ({
  prepareShare: vi.fn(),
  publishShare: vi.fn(),
}));
vi.mock('@/app/_services/tierlist.actions', () => ({
  connectTierlist: mocks.connect,
  syncTierlist: vi.fn(),
  createShareSeed: vi.fn(),
  disconnectTierlist: vi.fn(),
  replaceAccountFromSeed: mocks.replaceAccount,
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
  sessionStorage.clear();
  vi.clearAllMocks();
  mocks.session = { data: null, isPending: false, error: null };
  mocks.connect.mockResolvedValue({ ok: true, value: remote });
  await loadLocalTierlist(device);
});

it('opens a dropped project temporarily, retains it on refresh, and returns to Google without signing out', async () => {
  const projectSeed = 'c'.repeat(64);
  const shared = {
    ...remote,
    ownerId: '27a123b1-0b05-4702-a749-965faee5a5d4',
    document: {
      ...remote.document,
      items: [
        { id: 'project', label: 'Project copy', rank: 'Watching' as const },
      ],
    },
  };
  await activateAccountTierlist(accountKey, remote);
  await activateImportedTierlist(projectSeed, shared, true);
  sessionStorage.setItem(pendingProjectKey, projectSeed);
  mocks.session.data = { user: { id: 'google-user' } };
  mocks.readAccount.mockResolvedValue({
    profileKey: accountKey,
    displayName: 'Account',
    remote,
  });
  const first = renderHook(() => useTierlistAccount(), { wrapper });
  await waitFor(() =>
    expect(first.result.current.storage.seed).toBe(projectSeed),
  );
  expect(readProjectSession()).toEqual({
    seed: projectSeed,
    returnSeed: accountKey,
    returnAccount: true,
  });
  expect((await loadLocalTierlist(device)).seed).toBe(accountKey);
  first.unmount();
  const second = renderHook(() => useTierlistAccount(), { wrapper });
  await waitFor(() =>
    expect(second.result.current.storage.seed).toBe(projectSeed),
  );
  await act(async () => {
    await second.result.current.actions.restoreDevice();
  });
  await waitFor(() =>
    expect(second.result.current.storage.seed).toBe(accountKey),
  );
  expect(second.result.current.storage.snapshot?.items).toEqual(
    remote.document.items,
  );
  expect(readProjectSession()).toBeNull();
  expect(mocks.session.data?.user.id).toBe('google-user');
});

it('replaces the Google document from a temporary project only through the explicit replace action', async () => {
  const projectSeed = 'c'.repeat(64);
  const shared = {
    ...remote,
    ownerId: '27a123b1-0b05-4702-a749-965faee5a5d4',
    document: {
      ...remote.document,
      items: [
        { id: 'project', label: 'Project copy', rank: 'Watching' as const },
      ],
    },
  };
  await activateAccountTierlist(accountKey, remote);
  await activateImportedTierlist(projectSeed, shared, true);
  sessionStorage.setItem(pendingProjectKey, projectSeed);
  mocks.session.data = { user: { id: 'google-user' } };
  mocks.readAccount.mockResolvedValue({
    profileKey: accountKey,
    displayName: 'Account',
    remote,
  });
  mocks.replaceAccount.mockResolvedValue({
    ok: true,
    value: { ...remote, revision: 3, document: shared.document },
  });
  const { result } = renderHook(() => useTierlistAccount(), { wrapper });
  await waitFor(() => expect(result.current.storage.seed).toBe(projectSeed));
  await waitFor(() => {
    expect(result.current.project?.seed).toBe(projectSeed);
    expect(result.current.busy).toBe(false);
  });
  expect(mocks.replaceAccount).not.toHaveBeenCalled();
  await act(async () => {
    expect(await result.current.actions.replaceDevice()).toBe(true);
  });
  await waitFor(() => expect(result.current.storage.seed).toBe(accountKey));
  expect(mocks.replaceAccount).toHaveBeenCalledOnce();
  expect(result.current.storage.snapshot).toMatchObject({
    accountOwnerId: remote.ownerId,
    items: shared.document.items,
    sync: { ownerId: remote.ownerId, serverRevision: 3 },
  });
  expect((await loadLocalTierlist(device)).seed).toBe(accountKey);
  expect(readProjectSession()).toBeNull();
  expect(mocks.session.data?.user.id).toBe('google-user');
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

it('keeps an explicitly chosen local copy open while preserving Google sign-in', async () => {
  window.history.replaceState(null, '', '/?profile=local');
  mocks.session.data = { user: { id: 'google-user' } };
  try {
    const { result } = renderHook(() => useTierlistAccount(), { wrapper });
    await waitFor(() =>
      expect(result.current.status.verifyingIdentity).toBe(false),
    );
    expect(result.current.storage.seed).toBe(device.seed);
    expect(result.current.googleConnected).toBe(false);
    expect(mocks.readAccount).not.toHaveBeenCalled();
    expect(mocks.session.data?.user.id).toBe('google-user');
  } finally {
    window.history.replaceState(null, '', '/');
  }
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
  expect(result.current.sync).not.toHaveProperty('retryAt');
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

it('re-verifies the same signed-in user after a failed account read when connectivity returns', async () => {
  await activateAccountTierlist(accountKey, remote);
  mocks.session.data = { user: { id: 'google-user' } };
  mocks.connect.mockResolvedValue({
    ok: true,
    value: {
      ...remote,
      document: tierlistDocumentSchema.parse(remote.document),
    },
  });
  mocks.readAccount.mockRejectedValueOnce(new TypeError('Network unavailable'));
  const { result } = renderHook(() => useTierlistAccount(), { wrapper });
  await waitFor(() => expect(mocks.readAccount).toHaveBeenCalledTimes(1));
  mocks.readAccount.mockResolvedValue({
    profileKey: accountKey,
    displayName: 'Recovered',
    remote,
  });
  act(() => {
    window.dispatchEvent(new Event('online'));
  });
  await waitFor(() => expect(mocks.readAccount).toHaveBeenCalledTimes(2));
  await waitFor(
    () =>
      expect({
        sync: result.current.sync.status,
        label: result.current.status.identityLabel,
        storage: result.current.storage.status,
      }).toMatchObject({ sync: 'saved' }),
    { timeout: 2000 },
  );
  expect(result.current.status.identityLabel).toBe('Recovered (Google)');
  expect(result.current.storage.seed).toBe(accountKey);
});
