import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { OfflineMode } from '@/app/_types/offline.types';
import { useOfflineReconnect } from './use-offline-reconnect';

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
const preview = vi.hoisted(() => ({ mode: 'offline' as OfflineMode }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('./use-offline-mode', () => ({ useOfflineMode: () => preview.mode }));

describe('offline recovery', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-24T12:00:00Z'));
    vi.clearAllMocks();
    preview.mode = 'offline';
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('checks immediately when opening an offline URL and returns to the live app', async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 200,
        headers: { 'X-Tierlist-Connection': 'online' },
      }),
    );
    vi.stubGlobal('fetch', fetch);
    const { result } = renderHook(useOfflineReconnect);

    await act(async () => {
      await Promise.resolve();
    });

    expect(fetch).toHaveBeenCalledOnce();
    expect(router.replace).toHaveBeenCalledOnce();
    expect(router.replace.mock.calls[0]?.[0]).not.toContain('offline');
    expect(result.current.retryAt).toBeUndefined();
  });

  it('uses the visible deadline for retries and resets it after a failed manual check', async () => {
    const fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetch);
    const { result } = renderHook(useOfflineReconnect);

    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.retryAt).toBe(Date.now() + 30_000);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(29_999);
    });
    expect(fetch).toHaveBeenCalledOnce();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(result.current.retryAt).toBe(Date.now() + 30_000);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
      await result.current.reconnect();
    });
    expect(result.current.retryAt).toBe(Date.now() + 30_000);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('keeps the temporary preview for thirty seconds before checking the connection', async () => {
    preview.mode = 'dev-temporary';
    const fetch = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 200,
        headers: { 'X-Tierlist-Connection': 'online' },
      }),
    );
    vi.stubGlobal('fetch', fetch);
    const { result } = renderHook(useOfflineReconnect);

    expect(result.current.retryAt).toBe(Date.now() + 30_000);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(29_999);
    });
    expect(fetch).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(fetch).toHaveBeenCalledOnce();
    expect(router.replace).toHaveBeenCalledOnce();
  });
});
